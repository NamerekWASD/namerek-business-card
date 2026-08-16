import { motion } from 'framer-motion';
import namerekLogo from '../assets/logo-namerek-animated.svg';
import { SURFACES } from '../scene/model/materials.js';
import { surfaceStyle, ironFace } from '../scene/renderers/css3d/surfaceStyle.js';
import ContactShadow from '../scene/objects/ContactShadow.jsx';
import { useRenderer } from '../scene/renderers/RendererContext.js';
import CornerRivets from './CornerRivets.jsx';

function NamerekLogo({ width = 220 }) {
  return (
    <motion.img
      src={namerekLogo}
      alt="Namerek"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      style={{ display: 'block', width, height: 'auto' }}
    />
  );
}

// A vertical tilt for a `Solid` — its top edge brought nearer the camera, its
// bottom pushed back — composed as an outer rotation rather than a parameter
// on `Solid` itself. Every other prop in the scene calls `Solid` untilted, and
// a parameter added to that shared component is one every one of those call
// sites would suddenly have to reason about. Wrapping it here gets the same
// picture without going anywhere near it.
function TiltedBox({ pitch = 0, shadow, children, ...boxProps }) {
  const { Solid } = useRenderer();
  return (
    <div style={{ transformStyle: 'preserve-3d', transform: `rotateX(${pitch}deg)`, boxShadow: shadow }}>
      <Solid {...boxProps}>{children}</Solid>
    </div>
  );
}

// The logo stays its own flat vector mark — see NamerekLogo above — so the
// depth here has to come from an actual object, the same way every other
// solid in this scene gets its volume: real faces at real angles, shaded by
// `roomLightAt`, not a filter or a painted-on bevel. `Solid` already knows how
// to build that; this is a picture standing on its own, off to the side of the
// shaft, so it gets its own small `perspective` rather than the corridor's.
function LogoFrame({ pitch = -3 }) {
  const W = 240;
  const H = 280;
  const D = 16;
  return (
    <div style={{ width: W, height: H, perspective: 1600 }}>
      <div
        style={{
          position: 'relative', width: W, height: H,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Flat on purpose — it is cast on the wall behind the frame, not on
            the frame itself, so it stays put while `pitch` tips the picture. */}
        <ContactShadow w={W * 1.38} h={104} opacity={0.82} />
        <TiltedBox
          pitch={pitch}
          left={0} top={0} w={W} h={H} d={D} yaw={0} tex={ironFace} scale={70}
        >
          <div
            style={{
              position: 'absolute', inset: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)',
              ...surfaceStyle(SURFACES.paper),
            }}
          >
            <CornerRivets />
            <NamerekLogo width={W - 70} />
          </div>
        </TiltedBox>
      </div>
    </div>
  );
}

export default LogoFrame;
