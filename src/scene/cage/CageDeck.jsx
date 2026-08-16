import { SURFACES } from '../model/materials.js';
import { surfaceStyle, ironFace } from '../renderers/css3d/surfaceStyle.js';
import { CAGE_NEAR, CAGE_FAR, CAGE_DEPTH, cageInset } from '../model/geometry.js';
import HeadChevrons from './HeadChevrons.jsx';
import DeckPlating from './DeckPlating.jsx';

// A horizontal deck — roof or floor. Hinged at one end and swung 90°, so its CSS
// height becomes depth and its local y axis reads as distance from the viewer.
function CageDeck({ y, vw, kind, shade, pool }) {
  const isRoof = kind === 'roof';
  const ribs = [0.16, 0.38, 0.6, 0.82];
  const inset = cageInset(vw);
  return (
    <div
      style={{
        position: 'absolute',
        top: y, left: inset, width: vw - inset * 2, height: CAGE_DEPTH,
        transformOrigin: '50% 0%',
        // the roof hangs from its near edge and runs back; the floor is hinged at
        // its far edge and runs toward us, so each one faces the viewer
        transform: isRoof
          ? `translateZ(${CAGE_NEAR}px) rotateX(-90deg)`
          : `translateZ(${CAGE_FAR}px) rotateX(90deg)`,
        ...surfaceStyle(isRoof ? SURFACES.cageRoof : SURFACES.cageFloor, shade),
        boxShadow: isRoof
          ? 'inset 0 0 80px rgba(0,0,0,0.8)'
          : 'inset 0 0 80px rgba(0,0,0,0.55)',
      }}
    >
      {/* the pool the lamps lay on this deck, drawn under the ironwork so the
          ribs sit in it rather than on top of it */}
      {pool && <div style={{ position: 'absolute', inset: 0, ...pool }} />}
      {/* cross members: evenly spaced in depth, so on screen they bunch up toward
          the far end. Nothing else in the scene shows recession this plainly. */}
      {ribs.map((r) => (
        <div
          key={r}
          style={{
            position: 'absolute', left: 0, right: 0, top: `${r * 100}%`, height: 9,
            // multiplied by the deck's own shade explicitly. It used to come for
            // free because a filter on the parent applies to its descendants;
            // now that the shade is in the colours, nothing is inherited.
            ...ironFace(40, (isRoof ? 0.92 : 1.35) * shade),
            boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
          }}
        />
      ))}
      {isRoof ? <HeadChevrons /> : <DeckPlating />}
    </div>
  );
}

export default CageDeck;
