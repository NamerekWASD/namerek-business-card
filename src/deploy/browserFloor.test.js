import { transformSync } from 'rolldown/utils';
import { build } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';

// NBC-89. NBC-87 shipped a white page to every iPhone below Safari 16.4: three.js
// writes class static blocks, older Safari rejects them while *parsing*, and
// nothing in the bundle runs — not the error boundary, not the flat card. No
// browser available here is old enough to see it, so the floor is checked on
// the bundle itself: lower it to the floor and to `esnext` with the same
// transformer Vite uses, and any difference is syntax newer than the floor.
//
// The floor is pinned here, not read from `vite.config.js`: a config that
// loses its `build.target` must fail this test, not quietly move it.

/** The oldest browsers the site promises to parse in. */
const FLOOR = ['safari14', 'ios14'];

/** Built once, in memory — the same bundle `npm run build` would write. */
let files;

beforeAll(async () => {
  const result = await build({
    mode: 'production',
    logLevel: 'silent',
    build: { write: false },
  });
  files = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output);
}, 60_000);

const lower = (name, code, target) => {
  const out = transformSync(name, code, { target });
  expect(out.errors, `${name} at ${target}`).toEqual([]);
  return out.code;
};

/** Lines only the newest output has — the syntax itself, not the helpers the
 *  lowering hoists to the top, which make the two differ from the first byte. */
const newerSyntax = (atFloor, atNewest) => {
  const kept = new Set(atFloor.split('\n'));
  return atNewest.split('\n').filter((l) => !kept.has(l)).slice(0, 5)
    .map((l) => l.trim().slice(0, 160)).join('\n');
};

describe('the bundle parses on the oldest supported Safari', () => {
  it('builds at least one script', () => {
    expect(files.filter((f) => f.type === 'chunk').length).toBeGreaterThan(0);
  });

  it('no script carries syntax newer than the floor', () => {
    for (const chunk of files.filter((f) => f.type === 'chunk')) {
      const atFloor = lower(chunk.fileName, chunk.code, FLOOR);
      const atNewest = lower(chunk.fileName, chunk.code, 'esnext');
      if (atFloor !== atNewest) {
        expect.fail(`${chunk.fileName} needs lowering for ${FLOOR}:\n${newerSyntax(atFloor, atNewest)}`);
      }
    }
  });
});

describe('the built CSS keeps its viewport fallbacks', () => {
  // NBC-88: `dvh`/`svh`/`lvh` are Safari 15.4+. Below that the declaration is
  // dropped whole, so each needs a plain `vh` twin before it in the same rule —
  // and the risk is the minifier merging the pair as a duplicate, so it is the
  // built CSS that is read, not the source.
  const NEW_UNIT = /\d[dsl]vh\b/;

  it('every dynamic viewport unit follows a fallback of the same property', () => {
    const sheets = files.filter((f) => f.type === 'asset' && f.fileName.endsWith('.css'));
    expect(sheets.length).toBeGreaterThan(0);

    const bare = [];
    for (const sheet of sheets) {
      const css = String(sheet.source);
      for (const [, body] of css.matchAll(/\{([^{}]*)\}/g)) {
        const decls = body.split(';').map((d) => d.split(':').map((s) => s.trim()));
        decls.forEach(([prop, value], i) => {
          if (!value || !NEW_UNIT.test(value)) return;
          const fallback = decls.slice(0, i).some(([p, v]) => p === prop && v && !NEW_UNIT.test(v));
          if (!fallback) bare.push(`${sheet.fileName}: ${prop}:${value}`);
        });
      }
    }
    expect(bare).toEqual([]);
  });
});
