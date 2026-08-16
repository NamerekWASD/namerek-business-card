import { describe, expect, it } from 'vitest';
import {
  LAMPS, LIGHT_AMBIENT, lampsAt, lightAt, roomLightAt,
} from './lighting.js';

const lampAt = (x, y, z) => ({ id: 't', x, y, z });

describe('lightAt', () => {
  it('falls back to ambient where no lamp reaches', () => {
    expect(lightAt([0, 0, 0], [0, 0, 1], [])).toBeCloseTo(LIGHT_AMBIENT);
  });

  it('quantises to fiftieths', () => {
    // Not cosmetic. A shade becomes a colour and a new colour is a repaint, so a
    // continuously sliding brightness repaints every lit face in the scene on
    // every frame. In fiftieths most frames come out byte-identical. Losing this
    // would not change the picture at all — only the frame rate — which is
    // exactly the kind of regression a refactor hides.
    const lamps = [lampAt(30, -40, 120)];
    for (let d = 0; d < 400; d += 7) {
      const v = lightAt([d, d * 0.3, -d], [0, 0, 1], lamps);
      expect(Math.abs(v * 50 - Math.round(v * 50))).toBeLessThan(1e-9);
    }
  });

  it('dims with distance', () => {
    const lamps = [lampAt(0, 0, 500)];
    const near = lightAt([0, 0, 0], [0, 0, 1], lamps);
    const far = lightAt([0, 0, -1500], [0, 0, 1], lamps);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThanOrEqual(LIGHT_AMBIENT);
  });

  it('gives a face turned toward the lamp more than one turned away', () => {
    // Lambert's cosine term is the whole of what makes a solid read as solid,
    // and it is precisely the term this scene used to guess.
    const lamps = [lampAt(0, 0, 500)];
    const facing = lightAt([0, 0, 0], [0, 0, 1], lamps);
    const away = lightAt([0, 0, 0], [0, 0, -1], lamps);
    expect(facing).toBeGreaterThan(away);
  });

  it('never goes below ambient, whatever direction a face is held at', () => {
    const lamps = [lampAt(120, -200, 300), lampAt(-80, 400, 100)];
    for (const n of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      expect(lightAt([0, 0, 0], n, lamps)).toBeGreaterThanOrEqual(LIGHT_AMBIENT);
    }
  });

  it('drops a lamp from the shading of its own fixture', () => {
    // The distance there is a few pixels and an inverse square would blow up.
    const own = lampAt(0, 0, 0);
    expect(lightAt([0, 0, 0], [0, 0, 1], [own], own)).toBeCloseTo(LIGHT_AMBIENT);
  });
});

describe('lampsAt', () => {
  it('places one fixture per floor on the left-hand wall', () => {
    const lamps = lampsAt(1600, 900, 0, 900);
    expect(lamps.length).toBeGreaterThan(0);
    for (const L of lamps) expect(L.x).toBeLessThan(1600 / 2);
  });

  it('spaces them one floor apart', () => {
    const pitch = 900;
    const lamps = lampsAt(1600, 900, 1.5, pitch);
    const ys = lamps.map((L) => L.y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i += 1) {
      expect(Math.abs(ys[i] - ys[i - 1])).toBeCloseTo(pitch * LAMPS.every);
    }
  });

  it('scrolls the fixtures past as the car climbs', () => {
    // The lamps are bolted to the shaft, so on screen they must move opposite
    // the car — if they tracked it, nothing would ever brighten or dim.
    const a = lampsAt(1600, 900, 0, 900).find((L) => L.id === '0L');
    const b = lampsAt(1600, 900, 0.5, 900).find((L) => L.id === '0L');
    expect(b.y).toBeGreaterThan(a.y);
  });

  it('gives every fixture a stable id, so React keeps the one it built', () => {
    const ids = lampsAt(1600, 900, 2, 900).map((L) => L.id);
    expect(new Set(ids).size).toBe(ids.length);
    const again = lampsAt(1600, 900, 2, 900).map((L) => L.id);
    expect(again).toEqual(ids);
  });
});

describe('roomLightAt', () => {
  it('is brightest held into the corridor light and dimmest turned from it', () => {
    const up = roomLightAt([0, -1, 0]);
    const down = roomLightAt([0, 1, 0]);
    expect(up).toBeGreaterThan(down);
  });

  it('stays inside the range the enamel colours were authored against', () => {
    for (const n of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const v = roomLightAt(n);
      expect(v).toBeGreaterThanOrEqual(0.6);
      expect(v).toBeLessThanOrEqual(2.2);
    }
  });

  it('puts a face square to the wall near the enamel reference', () => {
    expect(roomLightAt([0, 0, 1])).toBeCloseTo(1.48, 1);
  });
});
