import { LAYERS } from '../layers.js';
import { lightAt, LIGHT_AMBIENT } from '../model/lighting.js';
import {
  CAGE_NEAR, CAGE_FAR, CAGE_DEPTH, CAGE_ROOF_Y, CAGE_FLOOR_Y, CAGE_POST_Z, cageInset,
} from '../model/geometry.js';
import { useRenderer } from '../renderers/RendererContext.js';
import CageDeck from './CageDeck.jsx';
import CagePost from './CagePost.jsx';
import CageGate from './CageGate.jsx';
import CageRail from './CageRail.jsx';

// The cage draws in its own camera, in front of the content layer. Two
// `perspective` containers with identical parameters are the same camera, so the
// cage and the shaft line up exactly despite the flat content sandwiched between
// them. It carries no motion blur on purpose: the cage rides with us, so it
// staying sharp while the shaft smears is what sells the fact that we're in it.
function CageFront({ vw, vh, lamps }) {
  const { Stage } = useRenderer();
  const floorY = vh * CAGE_FLOOR_Y;
  const postH = floorY - CAGE_ROOF_Y;
  const inset = cageInset(vw);
  const midZ = (CAGE_NEAR + CAGE_FAR) / 2;
  const midY = CAGE_ROOF_Y + postH / 2;
  const railY = floorY - 300;

  // Every face of the cage now asks the lamps how bright it should be. The
  // numbers these replace (1.3 for a front face, 0.55 for an inboard one) were
  // the right *idea* — the inboard face is turned away — but they were frozen,
  // so nothing in the cage ever changed as the shaft moved past it. These do.
  const face = (p, n) => lightAt(p, n, lamps);
  const post = (x, z, dir) => ({
    front: face([x, midY, z], [0, 0, 1]),
    side: face([x, midY, z], [dir, 0, 0]),
  });

  // Where the light gathers on a horizontal deck. This is not a projection: the
  // bright spot of a point source on a plane is the foot of the perpendicular,
  // and for a lamp out at the far wall that foot lands well past the deck's own
  // far edge. So what reaches the floor is the shoulder of the falloff, pooled
  // along the lip you would step off — which is where light from a doorway
  // belongs, and is not somewhere I would have thought to paint it.
  const pool = (deckY, isRoof) => {
    if (!lamps.length) return null;
    const n = isRoof ? [0, 1, 0] : [0, -1, 0];
    const near = [...lamps].sort((a, b) => Math.abs(a.y - deckY) - Math.abs(b.y - deckY)).slice(0, 2);
    const layers = near.map((L) => {
      const lx = ((L.x - inset) / (vw - inset * 2)) * 100;
      const ly = (((isRoof ? CAGE_NEAR - L.z : L.z - CAGE_FAR) / CAGE_DEPTH) * 100);
          const i = Math.round(Math.min(0.62, Math.max(0, lightAt([L.x, deckY, L.z], n, [L]) - LIGHT_AMBIENT) * 0.3) * 100) / 100;
      return `radial-gradient(circle ${Math.round(CAGE_DEPTH * 2.1)}px at ${lx.toFixed(1)}% ${ly.toFixed(1)}%, rgba(255,208,146,${i.toFixed(3)}) 0%, rgba(255,168,80,${(i * 0.34).toFixed(3)}) 40%, rgba(0,0,0,0) 74%)`;
    });
    return { backgroundImage: layers.join(', '), backgroundBlendMode: 'screen', mixBlendMode: 'screen' };
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.cage, pointerEvents: 'none' }}>
      <Stage>
          <CageDeck kind="roof" y={CAGE_ROOF_Y} vw={vw} shade={face([vw / 2, CAGE_ROOF_Y, midZ], [0, 1, 0])} pool={pool(CAGE_ROOF_Y, true)} />
          <CageDeck kind="floor" y={floorY} vw={vw} shade={face([vw / 2, floorY, midZ], [0, -1, 0])} pool={pool(floorY, false)} />
          {CAGE_POST_Z.map((z) => {
            const s = post(inset, z, 1);
            return <CagePost key={`l${z}`} z={z} x={inset} top={CAGE_ROOF_Y} height={postH} dir={1} frontShade={s.front} sideShade={s.side} />;
          })}
          {CAGE_POST_Z.map((z) => {
            const s = post(vw - inset, z, -1);
            return <CagePost key={`r${z}`} z={z} x={vw - inset} top={CAGE_ROOF_Y} height={postH} dir={-1} frontShade={s.front} sideShade={s.side} />;
          })}
          <CageGate
            x={inset} top={CAGE_ROOF_Y} height={postH} dir={1}
            nearShade={face([inset, midY, CAGE_NEAR], [1, 0, 0])}
            farShade={face([inset, midY, CAGE_FAR], [1, 0, 0])}
          />
          <CageGate
            x={vw - inset} top={CAGE_ROOF_Y} height={postH} dir={-1}
            nearShade={face([vw - inset, midY, CAGE_NEAR], [-1, 0, 0])}
            farShade={face([vw - inset, midY, CAGE_FAR], [-1, 0, 0])}
          />
          <CageRail x={inset} y={railY} dir={1} sideShade={face([inset, railY, midZ], [1, 0, 0])} topShade={face([inset, railY, midZ], [0, -1, 0])} />
          <CageRail x={vw - inset} y={railY} dir={-1} sideShade={face([vw - inset, railY, midZ], [-1, 0, 0])} topShade={face([vw - inset, railY, midZ], [0, -1, 0])} />
      </Stage>
    </div>
  );
}

export default CageFront;
