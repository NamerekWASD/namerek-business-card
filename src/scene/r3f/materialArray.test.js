import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ── a row of bare material children is one material ──────────────────────────
// R3F attaches every `<meshStandardMaterial>` child to `material`, so a mesh
// given six of them wears the *last* one on all six faces and the other five
// are never seen. Nothing throws, nothing warns, and the symptom — "the texture
// that was painted is simply never seen" — is indistinguishable from a lighting
// problem, which is why it has now been found twice by reading the live scene
// graph rather than by looking at the prop (the crates, and then NBC-67's post
// box). `attach="material-n"` is what actually builds the array.
//
// So this sweeps the scene for the shape of the mistake instead of waiting for
// the third one. It reads the source rather than the scene because mounting
// these props wants a WebGL context — which makes it a lint, and the one thing
// a lint of this shape must not do is cry wolf:
//
//   - a *slot* is counted, not a tag. `{art ? <A/> : <B/>}` is two tags and one
//     material, and four props in here are written exactly that way;
//   - a helper that attaches for you is fine, an inline one that does not is a
//     material in disguise — `PostBox`'s `panel` hid six of them in plain sight;
//   - a mesh inside another mesh's children owns its own material;
//   - a `.map` that renders materials without attach is the bug by definition,
//     however many the source happens to show.

const SCENE = 'src/scene';

function jsxFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return jsxFiles(path);
    return e.isFile() && e.name.endsWith('.jsx') ? [path] : [];
  });
}

/** Index of the `>` that closes the tag opening at `from`, braces and strings skipped. */
function tagEnd(src, from) {
  let depth = 0;
  let quote = null;
  for (let i = from; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0) return i;
  }
  return -1;
}

/** Index of the bracket closing the one at `from`. */
function pairEnd(src, from, open, shut) {
  let depth = 0;
  for (let i = from; i < src.length; i += 1) {
    if (src[i] === open) depth += 1;
    else if (src[i] === shut) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return src.length - 1;
}

const braceEnd = (src, from) => pairEnd(src, from, '{', '}');
const parenEnd = (src, from) => pairEnd(src, from, '(', ')');

/** Every `<mesh>` that has children, as the span those children occupy. */
function meshBlocks(src) {
  const re = /<mesh(?=[\s>])|<\/mesh>/g;
  const stack = [];
  const blocks = [];
  let m = re.exec(src);
  while (m) {
    if (m[0] === '</mesh>') {
      const open = stack.pop();
      if (open) blocks.push({ ...open, end: m.index });
    } else {
      const close = tagEnd(src, m.index);
      if (close >= 0) {
        if (src[close - 1] !== '/') stack.push({ open: m.index, start: close + 1 });
        re.lastIndex = close + 1;
      }
    }
    m = re.exec(src);
  }
  return blocks;
}

/**
 * Local helpers that hand back a material element, and whether they attach it
 * themselves. `PostBox`'s `panel` is one, and the call site shows no material
 * at all — which is how six of them went unread for a month.
 */
function materialHelpers(src) {
  const helpers = new Map();
  const re = /const (\w+) = \([^)]*\) =>\s*/g;
  let m = re.exec(src);
  while (m) {
    // The arrow's own body and no further. A fixed window instead swept up
    // whatever JSX happened to follow the declaration, which made `hold` — a
    // ref setter standing above a row of meshes — look like a material.
    const from = m.index + m[0].length;
    const open = src[from];
    let body = src.slice(from, src.indexOf('\n', from));
    if (open === '(' || open === '{') {
      body = src.slice(from, (open === '(' ? parenEnd : braceEnd)(src, from) + 1);
    }
    if (/<mesh\w*Material\b/.test(body)) helpers.set(m[1], /\battach=/.test(body));
    m = re.exec(src);
  }
  return helpers;
}

/** How many materials one child slot puts on `material` without saying which face. */
function unattachedIn(slot, bare) {
  let count = 0;
  const re = /<mesh\w*Material\b/g;
  let m = re.exec(slot);
  while (m) {
    const close = tagEnd(slot, m.index);
    if (!/\battach=/.test(slot.slice(m.index, close < 0 ? undefined : close))) count += 1;
    m = re.exec(slot);
  }
  // Only in an expression slot: a helper named inside an element's attributes
  // — `ref={hold(i)}` — is not a child of anything.
  if (bare.length && slot[0] === '{') {
    const calls = new RegExp(String.raw`(?:^|[\s{(,])(?:${bare.join('|')})\(`, 'g');
    count += (slot.match(calls) ?? []).length;
  }
  return count;
}

/** The mesh's children, one slot at a time: an element, or a `{…}` expression. */
function slots(children) {
  const out = [];
  let i = 0;
  while (i < children.length) {
    const c = children[i];
    if (c === '{') {
      const end = braceEnd(children, i);
      out.push(children.slice(i, end + 1));
      i = end + 1;
    } else if (c === '<' && /[A-Za-z]/.test(children[i + 1] ?? '')) {
      const close = tagEnd(children, i);
      if (close < 0) break;
      if (children[close - 1] === '/') {
        out.push(children.slice(i, close + 1));
        i = close + 1;
      } else {
        const name = children.slice(i + 1).match(/^\w+/)?.[0] ?? '';
        const shut = children.indexOf(`</${name}>`, close);
        const end = shut < 0 ? children.length : shut + name.length + 3;
        out.push(children.slice(i, end));
        i = end;
      }
    } else i += 1;
  }
  return out;
}

/** How many materials this mesh writes to `material` without naming a face. */
function unnamedFaces(children, helpers) {
  const bare = [...helpers].filter(([, attaches]) => !attaches).map(([name]) => name);
  let count = 0;
  for (const slot of slots(children)) {
    const found = unattachedIn(slot, bare);
    if (!found) continue;
    // A `.map` is the one slot that can render more materials than it shows.
    if (/\.map\(/.test(slot)) return count + 2;
    // Only one branch of a ternary is ever rendered, so it is one material.
    count += /\?[\s\S]*:/.test(slot) ? 1 : found;
  }
  return count;
}

// A lint nobody has watched fail is a lint that passes because it is broken.
describe('the sweep itself', () => {
  const face = (src) => unnamedFaces(src, materialHelpers(`const panel = (art) => (art
    ? <meshStandardMaterial {...art} />
    : <meshStandardMaterial {...fallback} />);`));

  it('counts a bare row of six as six materials on one slot', () => {
    expect(face(`{panel(a)}{panel(b)}{panel(c)}{panel(d)}{panel(e)}{panel(f)}`)).toBe(6);
  });

  it('counts a row that names its faces as none', () => {
    expect(face(`<meshStandardMaterial attach="material-0" />
      <meshStandardMaterial attach="material-1" />`)).toBe(0);
  });

  it('counts a ternary as the one material it renders', () => {
    expect(face(`{art ? <meshStandardMaterial {...art} /> : <meshStandardMaterial />}`)).toBe(1);
  });

  it('flags a map that renders materials without naming their faces', () => {
    expect(face(`{arts.map((a) => <meshStandardMaterial {...a} />)}`)).toBeGreaterThan(1);
  });
});

describe('every multi-face prop says which face each material is for', () => {
  it.each(jsxFiles(SCENE))('%s', (file) => {
    const src = readFileSync(file, 'utf8');
    const helpers = materialHelpers(src);
    const blocks = meshBlocks(src);
    const offenders = [];
    for (const block of blocks) {
      // A mesh sitting inside this one's children is its own mesh, and its
      // material is nothing to do with this one's.
      let children = src.slice(block.start, block.end);
      for (const inner of blocks) {
        if (inner.open <= block.start || inner.end > block.end) continue;
        const from = inner.open - block.start;
        const to = inner.end - block.start;
        children = children.slice(0, from) + ' '.repeat(to - from) + children.slice(to);
      }
      if (unnamedFaces(children, helpers) > 1) {
        offenders.push(`${file}:${src.slice(0, block.open).split('\n').length}`);
      }
    }
    expect(offenders, 'needs attach="material-n" — see Workbench in LandingProps.jsx').toEqual([]);
  });
});
