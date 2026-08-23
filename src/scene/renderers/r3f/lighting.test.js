import { describe, expect, it } from 'vitest';
import { lampsAt } from '../../model/lighting.js';
import {
  cageCentre, lampFalloff, lampRangePx, landingLight, light, lightRig, maxLights, pendantAt, shaftLights,
} from './lighting.js';

const vw = 2048;
const vh = 962;
const floorPitch = vh * 1.4;
const at = cageCentre(vw, vh);

describe('the shaft lights', () => {
  const range = lampRangePx(floorPitch);

  it('stands each light exactly on a fitting', () => {
    for (let pos = 0; pos <= 3; pos += 0.17) {
      const lamps = lampsAt(vw, vh, pos, floorPitch);
      for (const light of shaftLights(lamps, at, range)) {
        const lamp = lamps.find((L) => L.id === light.id);
        expect(light.position).toEqual([lamp.x, lamp.y, lamp.z]);
      }
    }
  });

  // The reason the rig was rebuilt. One light standing for the row had to
  // travel between fittings as they passed, and no way of travelling was
  // invisible. A light glued to its fitting can only move the way the fitting
  // moves — which is the shaft sliding past us, exactly one step of travel per
  // step of the ride, and never a pixel more.
  it('moves each light only as far as its own fitting moves', () => {
    const step = floorPitch / 256;
    let previous = new Map();
    let compared = 0;
    for (let pos = 0; pos <= 3; pos += 1 / 256) {
      const now = new Map();
      for (const light of shaftLights(lampsAt(vw, vh, pos, floorPitch), at, range)) {
        const before = previous.get(light.id);
        if (before) {
          expect(Math.abs(light.position[1] - before[1])).toBeLessThanOrEqual(step + 1e-6);
          expect(light.position[0]).toBeCloseTo(before[0], 9);
          expect(light.position[2]).toBeCloseTo(before[2], 9);
          compared += 1;
        }
        now.set(light.id, light.position);
      }
      previous = now;
    }
    // and it really did watch fittings come and go rather than comparing nothing
    expect(compared).toBeGreaterThan(500);
  });

  // Brightness is the only thing a ride is allowed to change here, so it is the
  // only thing that could flicker. It may not.
  // Measured at two sampling rates, because "smooth" is not a number.
  // Halving the step of a continuous curve roughly halves the largest jump
  // between neighbouring samples; a genuine discontinuity does not care how
  // finely it is looked at and stays the same size. So the assertion is the
  // *ratio* between the two, which is a property of the curve rather than of
  // any particular brightness.
  //
  // The previous version asserted a flat five percent per sample, and it began
  // failing the moment the lamp reach was retuned on the bench — a steeper
  // falloff genuinely does change more per step without being one bit less
  // continuous. It was measuring the tuning, not the smoothness.
  it('changes brightness smoothly and never steps', () => {
    const worstJump = (steps) => {
      let previous = new Map();
      let worst = 0;
      for (let i = 0; i <= steps * 3; i += 1) {
        const now = new Map();
        for (const light of shaftLights(lampsAt(vw, vh, i / steps, floorPitch), at, range)) {
          const before = previous.get(light.id);
          if (before > 0) worst = Math.max(worst, Math.abs(light.intensity - before) / before);
          now.set(light.id, light.intensity);
        }
        previous = now;
      }
      return worst;
    };
    const coarse = worstJump(256);
    const fine = worstJump(512);
    // and it really is measuring a changing brightness rather than a flat one
    expect(fine).toBeGreaterThan(0);
    // 0.5 for a smooth curve, 1.0 for a step; anything under 0.7 is a curve
    expect(fine).toBeLessThan(coarse * 0.7);
  });

  // The taper may discount a fitting at the far edge of the row — that is what
  // stops one popping in — but it may never add, or the two backends are lit
  // differently and the comparison the migration rests on is worthless.
  it('delivers no more than the CSS model would, from each fitting it keeps', () => {
    const lamps = lampsAt(vw, vh, 1.3, floorPitch);
    const ratios = shaftLights(lamps, at, range).map((lit) => {
      const lamp = lamps.find((L) => L.id === lit.id);
      const d = Math.hypot(lamp.x - at[0], lamp.y - at[1], lamp.z - at[2]);
      const css = light().lampPower * lampFalloff(d);
      const delivered = lit.intensity / (d * d) / light().keyGain;
      expect(delivered).toBeLessThanOrEqual(css + 1e-9);
      return delivered / css;
    });
    // and the rig is not passing by delivering nothing: the fitting it ranks
    // first is well inside the taper and arrives essentially undiscounted.
    // Demanding that of *every* kept fitting, as this once did, is a claim about
    // how wide the taper is rather than about the rig, and it broke the first
    // time the reach was tuned.
    expect(Math.max(...ratios)).toBeGreaterThan(0.9);
  });

  it('has nothing to say when the lamps are switched off', () => {
    expect(shaftLights([], at, range)).toEqual([]);
  });
});

// The source budget, held as a property rather than as something to count in a
// scene graph after the fact. The plan called for two; it is now two fittings
// plus the room, because one roving light could not pass a lamp without
// visibly jumping. The number matters less than the fact that it is bounded and
// checked. It is checked
// across every floor, both directions of travel and the whole range of door
// closure, because the failure it guards against is not "somebody adds a light"
// — it is "some combination of states produces one more than expected".
describe('the source budget', () => {
  // Exactly this many, not at most: see `lightRig`. A budget that is merely
  // bounded is met by a rig that swings between three lights and four, and that
  // swing is a full shader recompile of the room on whichever frame it happens
  // — which, since the thing that swung it was the landing light, was always
  // the frame a door started to open.
  it('asks for the same lights in every state, however far the doors are open', () => {
    let sawKey = false;
    let sawLanding = false;
    for (let pos = -0.5; pos <= 3.5; pos += 1 / 32) {
      for (const closure of [0, 0.25, 0.5, 0.75, 1]) {
        const rig = lightRig({
          vw,
          vh,
          lamps: lampsAt(vw, vh, pos, floorPitch),
          floorPitch,
          deckTop: 30,
          closure,
        });
        expect(rig.length).toBe(maxLights());
        expect(new Set(rig.map((l) => l.id)).size).toBe(rig.length);
        sawKey ||= rig.some((l) => l.kind === 'shaft');
        sawLanding ||= rig.some((l) => l.kind === 'landing');
      }
    }
    // and the limit is not being met by simply having no lights
    expect(sawKey).toBe(true);
    expect(sawLanding).toBe(true);
  });

  // The bug this exists for: the rig was handed the floor pitch under a name it
  // did not read, so every number in the key light came out `NaN`. three.js
  // says nothing about a NaN light — it contributes no illumination and the
  // scene simply renders flat, which is the hardest kind of wrong to see.
  it('never produces a number that is not a number', () => {
    const finite = (value, path) => {
      if (typeof value === 'number') expect(Number.isFinite(value), path).toBe(true);
      else if (Array.isArray(value)) value.forEach((v, i) => finite(v, `${path}[${i}]`));
    };
    for (const pos of [0, 1.5, 3]) {
      for (const closure of [0, 0.5, 1]) {
        const rig = lightRig({
          vw, vh, lamps: lampsAt(vw, vh, pos, floorPitch), floorPitch, deckTop: 30, closure,
        });
        for (const light of rig) {
          for (const [key, value] of Object.entries(light)) finite(value, `${light.kind}.${key}`);
        }
      }
    }
  });

  // The rig used to drop the landing light behind a shut door, and that one
  // line was the door-opening hitch. three.js compiles the light count into
  // every shader (`numPointLights` is part of the program cache key), so a rig
  // that grows by one on the frame a door starts to part invalidates every
  // program in the room and blocks on the driver relinking them. So: same
  // number of sources in every state, and a shut door is a source at zero.
  it('keeps the landing light in the rig, dark, behind a shut door', () => {
    const shut = lightRig({
      vw, vh, lamps: lampsAt(vw, vh, 1, floorPitch), floorPitch, deckTop: 30, closure: 1,
    });
    const landing = shut.filter((l) => l.kind === 'landing');
    expect(landing).toHaveLength(1);
    expect(landing[0].intensity).toBe(0);
  });
});

describe('the landing light', () => {
  it('dies with the doors — down to nothing, but never away', () => {
    expect(landingLight(vw, vh, 30, 1).intensity).toBe(0);
    const open = landingLight(vw, vh, 30, 0);
    const half = landingLight(vw, vh, 30, 0.5);
    expect(half.intensity).toBeCloseTo(open.intensity / 2, 6);
  });

  // It aims nowhere on purpose. A spot lays a hard cone on the wall behind it,
  // which is a stage lamp rather than a shaded pendant; the shade sends light
  // down and sideways and the room fills. So there is no target to check — what
  // there is to check is that it hangs where the fixture does, because a light
  // and its fitting disagreeing is the whole class of bug this rig keeps having.
  it('comes from the fitting and nowhere else', () => {
    const light = landingLight(vw, vh, 30, 0);
    expect(light.position).toEqual(pendantAt(vw, vh, 30));
    expect(light.target).toBeUndefined();
  });
});
