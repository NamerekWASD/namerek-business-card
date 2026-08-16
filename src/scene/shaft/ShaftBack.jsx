import { SURFACES } from '../model/materials.js';
import { surfaceStyle } from '../renderers/css3d/surfaceStyle.js';
import { CAM_ORIGIN_Y, SHAFT_DEPTH } from '../model/camera.js';
import { DOORWAY_W_FRAC, DOORWAY_H_FRAC, BACK_OVERSCAN, LANDING_SETBACK } from '../model/geometry.js';
import { LIGHTS } from '../effects/lightSwitches.js';
import { CorridorLamp } from '../objects/Lamp.jsx';
import LandingProp from '../landing/LandingProp.jsx';
import { DECKS } from '../../lift/decks.js';
import { doorClosureAt } from '../../lift/ride.js';

// The far end of the shaft. The blind wall is cut into piers and spandrels rather
// than drawn as one plane, because the landing is genuinely behind it and a solid
// plane would simply occlude it. Both are now the same family of surface, so the
// cut is invisible — which is the whole trick: a continuous wall to the eye, an
// actual hole to the compositor.
function ShaftBack({ vw, vh, pos, floorPx, ride, deck, intro }) {
  const travelY = pos * floorPx;
  const overscan = vh * BACK_OVERSCAN;
  const w = vw * DOORWAY_W_FRAC;
  const h = vh * DOORWAY_H_FRAC;
  const left = (vw - w) / 2;
  const here = Math.round(pos);
  const slots = [here - 2, here - 1, here, here + 1, here + 2];
  // No `travelY` in here any more. The whole stack of floors is carried by one
  // transform on the group below, so the openings, spandrels and corridors hold
  // still relative to each other and the browser moves them as a finished
  // picture. Writing a new `top` to each of them was a layout and a repaint of
  // every blended surface at the far end, on every frame — the rest of a ride's
  // cost, once the render was dealt with. Transforms are composited; `top` is
  // not, and that is the whole of the difference.
  const doorTop = (f) => overscan - f * floorPx + vh * CAM_ORIGIN_Y - h / 2;
  const wall = surfaceStyle(SURFACES.backWall);

  return (
    <div
      style={{
        position: 'absolute', left: 0, top: -overscan, width: vw, height: vh + overscan * 2,
        transform: `translateZ(${-SHAFT_DEPTH}px)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* the piers, running the full height either side of every opening */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: left, height: '100%', ...wall, boxShadow: 'inset -50px 0 70px rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'absolute', left: left + w, top: 0, width: vw - left - w, height: '100%', ...wall, boxShadow: 'inset 50px 0 70px rgba(0,0,0,0.6)' }} />

      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `translate3d(0, ${travelY.toFixed(1)}px, 0)` }}>
      {slots.map((f) => {
        const isDeck = f >= 0 && f < DECKS.length;
        // The masonry runs two floors either way so nothing pops in at speed.
        // The furniture does not: a corridor is only ever seen through an open
        // door, so a shut one is a wall and everything behind it is work done
        // for nobody. Mid-ride that is every floor at once, which is exactly the
        // stretch that could least afford it.
        const shut = ride ? doorClosureAt(f, ride, deck) : Math.max(doorClosureAt(f, null, deck), f === deck ? intro : 1);
        const furnished = Math.abs(f - pos) < 1.25 && shut < 0.985;
        const top = doorTop(f);
        return (
          <div key={f} style={{ transformStyle: 'preserve-3d' }}>
            {/* the spandrel between this opening and the one above it */}
            <div style={{ position: 'absolute', left, top: top + h, width: w, height: floorPx - h, ...wall, boxShadow: 'inset 0 40px 60px rgba(0,0,0,0.55)' }} />
            {isDeck ? (
              <div style={{ position: 'absolute', left, top, width: w, height: h, transformStyle: 'preserve-3d' }}>
                {/* the landing, set back and lit on its own terms */}
                <div
                  style={{
                    // preserve-3d rather than overflow:hidden. The clip was
                    // flattening everything in the corridor into the wall, so
                    // nothing standing on that floor could have a side to it.
                    position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
                    transform: `translateZ(${-LANDING_SETBACK}px)`,
                    ...surfaceStyle(SURFACES.landing),
                    // the shadow the head of the opening throws into the room
                    boxShadow: 'inset 0 70px 90px -30px rgba(0,0,0,0.85), inset 0 0 130px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* the skirting, running out of sight both ways — one straight
                      line at a known height is what tells you the floor keeps
                      going after the light stops */}
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: '13%', height: 9, ...surfaceStyle(SURFACES.landing, 1.5), boxShadow: '0 2px 6px rgba(0,0,0,0.6)' }} />
                  {/* The corridor's own fitting. It used to be a bare radial
                      pinned to the corner where the ceiling meets the back wall,
                      which is nowhere a lamp goes — light with no source, and it
                      showed. Same fixture as the shaft, smaller, lit from the
                      room instead of from the lamps it cannot see, and its own
                      pool on the wall is now the light in here. */}
                  {LIGHTS.landing && furnished && <CorridorLamp x={w * 0.5} y={h * 0.14} />}
                  {furnished && <LandingProp idx={f} />}
                  {/* the two branches. There is no wall at either end, so the
                      corridor simply runs out of light — which is the only thing
                      that ever tells you a passage continues rather than stops. */}
                  <div
                    style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background:
                        'linear-gradient(90deg, rgba(4,3,2,0.97) 0%, rgba(4,3,2,0.8) 6%, rgba(4,3,2,0) 24%, rgba(4,3,2,0) 80%, rgba(4,3,2,0.8) 95%, rgba(4,3,2,0.97) 100%)',
                    }}
                  />
                </div>
                {/* The reveal into the corridor: head and floor only. The jambs
                    are gone on purpose — with all four faces this was a room the
                    size of a doorway, and a lift that opens into a cupboard has
                    nowhere to go. */}
                <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: LANDING_SETBACK, transformOrigin: '50% 0%', transform: 'rotateX(-90deg)', ...surfaceStyle(SURFACES.landing, 0.3) }} />
                <div style={{ position: 'absolute', left: 0, top: h, width: w, height: LANDING_SETBACK, transformOrigin: '50% 0%', transform: 'rotateX(-90deg)', ...surfaceStyle(SURFACES.landing, 0.85) }} />
              </div>
            ) : (
              // dead shaft above the top floor and below the bottom one
              <div style={{ position: 'absolute', left, top, width: w, height: h, ...wall }} />
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default ShaftBack;
