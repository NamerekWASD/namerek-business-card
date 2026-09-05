import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// NBC-81. Two contracts that break silently rather than loudly.
//
// The workflow calls npm scripts by name. Rename one in `package.json` and
// nothing here fails — the failure happens on a push, in a log nobody reads,
// on the one run that was supposed to gate a deploy.
//
// `_headers` is worse, because a wrong rule is *served*. Vite hashes what it
// writes into `assets/`, so a year of `immutable` is correct there and nowhere
// else: put the same rule on `index.html` and a visitor who has been to the
// site holds the old page until their cache evicts it, with no way for anyone
// to push a fix to them.

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const headers = readFileSync('public/_headers', 'utf8');
const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;

/** Every `npm run <name>` and `npm ci`/`npm install` the workflow issues. */
const RUNS = /\bnpm run ([a-z:]+)/g;

describe('the pipeline calls things that exist', () => {
  it('every npm script the workflow runs is declared', () => {
    const called = [...workflow.matchAll(RUNS)].map((m) => m[1]);
    expect(called.length).toBeGreaterThan(0);
    expect(called.filter((name) => !(name in scripts))).toEqual([]);
  });

  it('the workflow builds before it deploys', () => {
    expect(workflow.indexOf('npm run build')).toBeLessThan(workflow.indexOf('pages deploy'));
  });
});

describe('the cache rules match what Vite writes', () => {
  /** `/path\n  Header: value` — the two-space continuation is the file's format. */
  const ruleFor = (path) => {
    const at = headers.indexOf(`\n${path}\n`);
    if (at < 0) return null;
    const rest = headers.slice(at + path.length + 2);
    const end = rest.search(/\n\S/);
    return end < 0 ? rest : rest.slice(0, end);
  };

  it('hashed assets are immutable for a year', () => {
    const rule = ruleFor('/assets/*');
    expect(rule).toMatch(/max-age=31536000/);
    expect(rule).toMatch(/immutable/);
  });

  it('nothing unhashed is immutable', () => {
    for (const path of ['/', '/index.html', '/projects/*']) {
      const rule = ruleFor(path);
      if (rule !== null) expect(rule).not.toMatch(/immutable/);
    }
  });
});
