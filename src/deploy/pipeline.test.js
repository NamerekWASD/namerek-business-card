import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// NBC-81. Three contracts that break silently rather than loudly.
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

/** Both files are checked out CRLF here and LF on the runner. */
const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const workflow = read('.github/workflows/ci.yml');
/** What the workflow runs. Its own comments name the commands it does *not*
 *  use, and a rule read off the prose is a rule about the prose. */
const steps = workflow.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const headers = read('public/_headers');
const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;

/** Every `npm run <name>` the workflow issues. */
const RUNS = /\bnpm run ([a-z:]+)/g;

describe('the pipeline calls things that exist', () => {
  it('every npm script the workflow runs is declared', () => {
    const called = [...steps.matchAll(RUNS)].map((m) => m[1]);
    expect(called.length).toBeGreaterThan(0);
    expect(called.filter((name) => !(name in scripts))).toEqual([]);
  });

  it('the workflow builds before it deploys', () => {
    expect(steps.indexOf('npm run build')).toBeLessThan(steps.indexOf('pages deploy'));
  });
});

describe('the install is reproducible', () => {
  // `npm install` resolves the semver ranges in `package.json` afresh, so a
  // patch release upstream can redden a green branch with no commit behind it —
  // on a scene whose look rides on a three.js minor, that is not theoretical.
  // `npm ci` installs the resolved tree exactly, which is only possible if the
  // lockfile is in the repository at all: `npm ci` and setup-node's cache both
  // refuse without one, and `.gitignore` used to hide it.

  it('the workflow installs from the lockfile', () => {
    expect(steps).toMatch(/\bnpm ci\b/);
    expect(steps).not.toMatch(/\bnpm install\b/);
  });

  it('the lockfile is tracked, not ignored', () => {
    const tracked = execFileSync('git', ['ls-files', '--', 'package-lock.json'], { encoding: 'utf8' });
    expect(tracked.trim()).toBe('package-lock.json');
  });

  it('the lockfile agrees with package.json', () => {
    // What `npm ci` checks before it will install anything, and the one way
    // this arrangement breaks: a dependency edited by hand, committed without
    // the lockfile beside it, and CI stops dead on the next push.
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const root = JSON.parse(readFileSync('package-lock.json', 'utf8')).packages[''];
    expect(root.dependencies ?? {}).toEqual(pkg.dependencies ?? {});
    expect(root.devDependencies ?? {}).toEqual(pkg.devDependencies ?? {});
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
