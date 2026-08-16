import ContactShadow from '../objects/ContactShadow.jsx';
import { useRenderer } from '../renderers/RendererContext.js';
import { ironFace, steelFace } from '../renderers/css3d/surfaceStyle.js';
import { roomLightAt } from '../model/lighting.js';
import EnamelPlate from '../../ui/EnamelPlate.jsx';
import Stencil from '../../ui/Stencil.jsx';

// How far each landing's object is turned on its own axis, in degrees, EG first.
// This is the lever for "is it facing me or looking off sideways", and it is
// worth knowing exactly what it trades.
//
// The corridor sits about four hundred pixels behind a camera fourteen hundred
// out, so the projection there is very nearly orthographic: a box square to the
// wall converges by around three percent, which is a side face a few pixels
// wide. Yaw buys that corner back, and the arithmetic is simple — the side face
// is `d · sin(yaw)` across. On a 56-deep box that is 28px at 30°, 9px at 9°, and
// nothing worth having below about 5°.
//
// So the pairing to remember: **shallow yaw wants more depth**. If you want
// something squarer to the camera, drop its yaw and raise its `d` rather than
// turning it further — that keeps the corner without making the object look like
// it is addressing the wall. A negative yaw turns it the other way and the
// visible side swaps over on its own.
const PROP_YAW = [0, 0, 15, 3];

/**
 * The prop standing on one landing: workbench, crates, post box, or the EG
 * floor plate, chosen by `idx`. Rendered through `useRenderer()`'s `Solid` so
 * the same description works under any renderer backend.
 * @param {{ idx: number }} props — the deck index, 0 = EG
 */
function PropBody({ idx }) {
  const { Solid } = useRenderer();
  const yaw = PROP_YAW[idx] ?? 0;

  // A workbench, and the one deliberately held square to the camera. Its yaw is
  // small, so the corner it would otherwise get from turning has to come from
  // depth instead — hence the deep carcass and the slab overhanging it by a long
  // way. The slab is the piece doing the work: a horizontal surface is the only
  // thing in this corridor the eye can measure the room against.
  if (idx === 1) {
    return (
      <div style={{ position: 'relative', width: 172, height: 128, transformStyle: 'preserve-3d' }}>
        <ContactShadow w={450} x={86} opacity={0.7} />
        {/* the board on the wall, and what hangs off it */}
        <div style={{ position: 'absolute', left: 18, top: -76, width: 124, height: 52, ...ironFace(50, roomLightAt([0, 0, 1]) * 0.8), boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.5)' }}>
          {[12, 40, 66, 96].map((x, i) => (
            <div
              key={x}
              style={{
                position: 'absolute', left: x, top: 12, width: i % 2 ? 6 : 9, height: 26 + (i % 3) * 8,
                background: 'linear-gradient(180deg, #8b949b, #2b3034)', borderRadius: 2,
                boxShadow: '1px 2px 4px rgba(0,0,0,0.6)',
              }}
            />
          ))}
        </div>
        <Solid left={0} top={26} w={172} h={82} d={116} yaw={yaw} scale={52} tint={0.85}  />
        {/* the top slab, overhanging the carcass on every side */}
        <Solid left={-6} top={16} w={184} h={12} d={130} yaw={yaw} tex={steelFace} scale={40} tint={1.05} />
        {/* The bench is a fixture of the building, so it is signed rather than
            stencilled — the crates below get the spray-through card, because a
            crate is consumable and its mark only has to survive one journey. */}
        <EnamelPlate
          colour="green"
          shade={roomLightAt([0, 0, 1])}
          size={11}
          style={{ position: 'absolute', left: 24, top: 40, padding: '4px 9px', transform: 'translateZ(130px)' }}
        >
          WERKBANK II
        </EnamelPlate>
      </div>
    );
  }

  // Crates. Three boxes at three depths, which is the cheapest legible object
  // there is: the moment two of them overlap with their tops lit, the stack has
  // an order and the corridor has a floor.
  if (idx === 2) {
    return (
      <div style={{ position: 'relative', width: 190, height: 150, transformStyle: 'preserve-3d' }}>
        <ContactShadow w={175} x={90} bottom={4} />
        <Solid left={0} top={62} w={104} h={88} d={80} yaw={yaw} scale={64} tint={0.92}>
          <Stencil style={{ left: 10, top: 12 }}>MT / 04</Stencil>
          <div style={{ position: 'absolute', left: '8%', right: '8%', top: '52%', height: 3, background: 'rgba(216,178,110,0.35)' }} />
        </Solid>
        <Solid left={104} top={86} w={82} h={64} d={60} yaw={yaw} scale={54} tint={0.8}>
          <Stencil style={{ left: 8, top: 9 }} size={10}>MT / 11</Stencil>
        </Solid>
        <Solid left={20} top={0} w={74} h={56} d={62} yaw={yaw} scale={48} tint={1.08}>
          <Stencil style={{ left: 8, top: 8 }} size={10}>MT / 02</Stencil>
        </Solid>
      </div>
    );
  }

  // A post box. It replaced a pneumatic chute, which was a pipe
  // with three rings round it — legible only if you already knew what it was
  // meant to be. A slot at hand height and a hood over it is not ambiguous.
  if (idx === 3) {
    return (
      <div style={{ position: 'relative', width: 116, height: 200, transformStyle: 'preserve-3d' }}>
        <ContactShadow w={300} h={300} x={358} bottom={70} opacity={0.9} />
        <Solid
          left={316} top={-94} w={125} h={136} d={78} yaw={yaw} tex={steelFace} scale={50} tint={0.95}
          extras={
            // The hood, hinged just above the slot and tipped out so it hangs
            // over it — which is the whole point of a hood and what the reference
            // shows. It rides *inside* the box rather than beside it: as a
            // sibling it carried its own hand-set translateZ and yaw, so every
            // time either changed on the box it drifted off somewhere on its own.
            // Bolted on here it cannot.
            <div
              style={{
                position: 'absolute', left: 8, top: 16, width: 104, height: 26,
                transformOrigin: '50% 0%',
                transform: 'translateZ(79px) rotateX(-34deg)',
                ...steelFace(34, roomLightAt([0, -0.82, 0.57]) * 1.1),
                borderRadius: '2px 2px 0 0',
                boxShadow: '0 4px 9px rgba(0,0,0,0.7)',
              }}
            />
          }
        >
          <div
            style={{
              position: 'absolute', left: '14%', right: '14%', top: '30%', height: 13,
              background: 'rgba(0,0,0,0.86)',
              boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.9), 0 1px 0 rgba(232,196,132,0.28)',
            }}
          />
          <EnamelPlate
            colour="red"
            shade={roomLightAt([0, 0, 1]) * 0.95}
            size={11}
            style={{ position: 'absolute', left: '16%', bottom: 10, padding: '4px 10px' }}
          >
            POST
          </EnamelPlate>
        </Solid>
      </div>
    );
  }

  // EG — the floor plate. This one already read, so it keeps its face and only
  // gains the thickness it always implied.
  //
  // The wrapper is not decoration. Every other prop has one; without it this
  // branch returned a bare absolutely-positioned box, and since the anchor above
  // shrinks to fit and an abspos child contributes nothing to that, the plate
  // hung off the anchor point rightwards and spent most of its width inside the
  // corridor's dark end. All that showed was the sliver that missed it.
  return (
    <div style={{ position: 'relative', width: 132, height: 88, transformStyle: 'preserve-3d' }}>
      {/* No yaw on this one. It is a plate bolted flat to the wall, so turning
          it would be wrong even where it helps — and it does not help: a sign
          reads by its face, not by its corner. */}
      <ContactShadow w={110} opacity={0.3} bottom={4} />
      <Solid left={0} top={0} w={132} h={88} d={14} yaw={PROP_YAW[0]} scale={56} tint={1.1}>
        {/* Enamel on an iron backing, which is what a floor marker in this
            building would actually be — and it is the one place in the corridor
            colour can go without arguing with the light model, because a fired
            glass field does not weather the way the steel around it does. */}
        <EnamelPlate
          colour="green"
          shade={roomLightAt([0, 0, 1]) * 1.1}
          size={30}
          style={{ position: 'absolute', inset: 7, letterSpacing: 5 }}
        >
          EG
        </EnamelPlate>
      </Solid>
    </div>
  );
}

export default PropBody;
