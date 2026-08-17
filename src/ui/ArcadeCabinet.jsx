import { motion } from 'framer-motion';
import namerekLogo from '../assets/logo-namerek-animated.svg';
import { roomLightAt } from '../scene/model/lighting.js';
import { shadedRgb } from '../scene/model/materials.js';
import { ironFace, steelFace } from '../scene/renderers/css3d/surfaceStyle.js';
import ContactShadow from '../scene/objects/ContactShadow.jsx';
import { useRenderer } from '../scene/renderers/RendererContext.js';
import CornerRivets from './CornerRivets.jsx';

// The picture frame's replacement: a standing cabinet rather than a thing
// bolted to the wall, because that is the one shape this scene does not
// already have. Every other object in the shaft is a plane — a wall, a
// door, a plate — held square or turned a few degrees for a corner. A
// cabinet is a box on legs with a face that leans back and a shelf that
// leans forward, and it earns the extra geometry because it is the object
// the logo lives on, seen close and often mid-frame.
//
// It stands on the floor rather than hanging on the wall on purpose — see
// the corridor's own props (`PropBody.jsx`) for the same rule applied to
// everything else that isn't a fixture: an object with a footprint gets a
// `ContactShadow` and stays off the wall, an object with none gets bolted to
// it. A cabinet has feet.
const JOY_BUTTONS = [
  { x: 108, colour: '#c23a2c' },
  { x: 130, colour: '#d9942f' },
  { x: 152, colour: '#3a7a52' },
];

function ControlPanel({ w, shade }) {
  const face = shadedRgb('#4a4038', shade);
  const faceDeep = shadedRgb('#241f1a', shade);
  return (
    <div
      style={{
        position: 'absolute', left: (w - 190) / 2, top: 174, width: 190, height: 54,
        transformOrigin: '50% 0%',
        transform: 'translateZ(109px) rotateX(33deg)',
        background: `linear-gradient(180deg, ${face} 0%, ${faceDeep} 100%)`,
        borderRadius: '3px 3px 0 0',
        boxShadow: '0 6px 12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* the stick: a shaft and a ball, the cheapest way to say "joystick"
          without modelling one */}
      <div style={{ position: 'absolute', left: 34, top: 10, width: 4, height: 18, background: 'linear-gradient(180deg,#2a2622,#0c0a08)', borderRadius: 2 }} />
      <div
        style={{
          position: 'absolute', left: 26, top: 2, width: 20, height: 20, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #e94b34, #7a1f14 78%)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
        }}
      />
      {JOY_BUTTONS.map((b) => (
        <div
          key={b.x}
          style={{
            position: 'absolute', left: b.x, top: 12, width: 16, height: 16, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${b.colour}, rgba(0,0,0,0.55))`,
            boxShadow: '0 2px 3px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.4)',
          }}
        />
      ))}
    </div>
  );
}

// The screen: the one part of this object that used to be the whole of it.
// It keeps the picture frame's trick — the mark stays a flat vector, lit as
// a screen rather than redrawn as one — but the case around it now reads as
// something the mark is *displayed on*, not framed by.
function Screen({ w }) {
  return (
    <div
      style={{
        position: 'absolute', left: (w - 176) / 2, top: 18, width: 176, height: 148,
        borderRadius: 4,
        background: '#0c0d0a',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6), inset 0 0 24px rgba(0,0,0,0.85), 0 0 22px rgba(255,176,90,0.22)',
      }}
    >
      <CornerRivets />
      {/* the phosphor wash behind the mark — dim at the glass edge, warmest
          where the mark sits, which is what sells "lit from within" rather
          than "printed on" */}
      <div
        style={{
          position: 'absolute', inset: 6, borderRadius: 2,
          background: 'radial-gradient(60% 60% at 50% 46%, rgba(255,196,120,0.22) 0%, rgba(120,80,40,0.1) 55%, rgba(0,0,0,0) 78%)',
        }}
      />
      {/* scanlines: cheap, static, and the one texture that reads as CRT
          rather than as backlit signage at a glance */}
      <div
        style={{
          position: 'absolute', inset: 6, borderRadius: 2,
          backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.img
          src={namerekLogo}
          alt="Namerek"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: 'block', width: 118, height: 'auto',
            filter: 'drop-shadow(0 0 9px rgba(255,180,96,0.55)) drop-shadow(0 0 2px rgba(255,214,160,0.5))',
          }}
        />
      </div>
      {/* the glass: one shallow sweep, same rule as every other lit face in
          this scene — a full gloss reads as plastic */}
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: 4,
          background: 'linear-gradient(128deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 24%, rgba(255,255,255,0) 42%)',
        }}
      />
    </div>
  );
}

function ArcadeCabinet({ pitch = -2 }) {
  const { Solid } = useRenderer();
  const W = 224;
  const D = 88;
  const bodyTop = 66;
  const bodyH = 258;
  const marqueeShade = roomLightAt([0, -0.3, 0.95]);
  const bodyShade = roomLightAt([0, 0, 1]);
  const kickShade = roomLightAt([0, 0.7, 0.7]);

  return (
    <div style={{ width: W, height: bodyTop + bodyH, perspective: 1600 }}>
      <div style={{ position: 'relative', width: W, height: bodyTop + bodyH, transformStyle: 'preserve-3d', transform: `rotateX(${pitch}deg)` }}>
        {/* cast on the floor it stands on, not on the cabinet itself, so it
            holds still while the pitch above tips the case */}
        <ContactShadow w={W * 1.5} h={100} opacity={0.95} bottom={-50} />

        {/* the marquee: proud, backlit, a hair wider than the case below it —
            an overhang is what tells the eye it is a separate lit part and
            not a taller cabinet */}
        <Solid left={-10} top={0} w={W + 20} h={72} d={108} yaw={7} tex={steelFace} scale={44} tint={1.12}>
          <div
            style={{
              position: 'absolute', inset: 8, borderRadius: 2,
              background: `linear-gradient(180deg, ${shadedRgb('#3a2f1c', marqueeShade)}, ${shadedRgb('#171208', marqueeShade)})`,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                position: 'absolute', inset: 3, borderRadius: 1,
                background: 'var(--screen)',
                boxShadow: 'inset 0 0 14px rgba(255,176,90,0.5)',
              }}
            />
            <div
              style={{
                position: 'absolute', inset: 3, borderRadius: 1,
                background: 'radial-gradient(60% 120% at 50% 50%, rgba(255,196,120,0.55) 0%, rgba(255,150,70,0.18) 55%, rgba(0,0,0,0) 80%)',
              }}
            />
          </div>
        </Solid>

        {/* the case: the screen, the coin door and the kickplate all live on
            its front face; the control panel is bolted on as `extras` so it
            inherits the case's own yaw and stand-off instead of carrying its
            own copy of both */}
        <Solid
          left={0} top={bodyTop} w={W} h={bodyH} d={D} yaw={7} tex={ironFace} scale={62} tint={0.94}
          extras={<ControlPanel w={W} shade={bodyShade} />}
        >
          <Screen w={W} />
          {/* the coin door: a slot is the one detail that says "machine you
              put something into" rather than "cabinet with a screen in it" */}
          <div
            style={{
              position: 'absolute', left: (W - 46) / 2, top: 232, width: 46, height: 28, borderRadius: 2,
              background: `linear-gradient(180deg, ${shadedRgb('#3a3128', bodyShade)}, ${shadedRgb('#161209', bodyShade)})`,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ position: 'absolute', left: '50%', top: 6, width: 3, height: 15, transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', boxShadow: '0 1px 0 rgba(255,255,255,0.08)' }} />
          </div>
          {/* the kickplate, dark steel worn by feet rather than hands */}
          <div
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, height: 20,
              background: `linear-gradient(180deg, ${shadedRgb('#302a24', kickShade)}, ${shadedRgb('#100d0a', kickShade)})`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
            }}
          />
        </Solid>
      </div>
    </div>
  );
}

export default ArcadeCabinet;
