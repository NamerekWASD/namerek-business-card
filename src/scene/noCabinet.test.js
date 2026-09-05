import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// NBC-82. The arcade cabinet was a hero prop that stopped being wanted, and it
// was expensive in a way nothing in the source makes visible: a 6.7 MB GLB and
// 2.6 MB of Poly Haven plates, referenced only from a module nothing imported.
// Rollup drops an unreachable module and everything it pulls in, so the weight
// never showed up in `dist` and never showed up in a review either.
//
// The rule this guards is therefore about the repository, not the bundle: no
// mesh file ships in it, and nothing that was only ever the cabinet's comes
// back by being pasted from history.

const DEAD = /ArcadeCabinet|CABINET_H|marqueeGlow|marqueeUV|cabinet(?:Case|Flank|Rust)\b/;

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('the arcade cabinet is gone', () => {
  it('no source file still names it', () => {
    const left = walk('src')
      .filter((p) => /\.jsx?$/.test(p) && !p.endsWith('noCabinet.test.js'))
      .filter((p) => DEAD.test(readFileSync(p, 'utf8')));
    expect(left).toEqual([]);
  });

  it('no mesh file is tracked anywhere in the repository', () => {
    const meshes = ['src', 'public', '_attic']
      .flatMap(walk)
      .filter((p) => /\.(glb|gltf|fbx)$/i.test(p));
    expect(meshes).toEqual([]);
  });
});
