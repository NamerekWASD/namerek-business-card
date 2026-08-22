import bronzeWorn from '../assets/textures/bronze-worn.jpg';
import { DECKS } from '../lift/decks.js';
import ContactShadow from '../scene/objects/ContactShadow.jsx';
import EnamelPlate from './EnamelPlate.jsx';

// The half-round indicator that sits over the doors of every old lift. It is
// the one place an analogue dial earns its keep here: big enough for the
// texture to actually read, and it does a job — the needle sweeps continuously
// with the cabin instead of decorating the wall.
// It used to be a brass bezel round a black face with an amber needle glowing
// out of it, which is a Victorian instrument — the same object you would find on
// a steam gauge, and the single loudest reason this scene read as steampunk. The
// interwar workshop instrument is the other way round: a moulded black case,
// a cream printed face, black marks, and a needle that is a needle rather than a
// light source. It is also more legible, which is the usual reward for building
// the thing the period actually built.
function FloorDial({ pos, size = 260 }) {
  const SPAN = 68;
  const angle = -SPAN + (pos / (DECKS.length - 1)) * SPAN * 2;
  const toRadians = (a) => ((a - 90) * Math.PI) / 180;
  const tickX = (a, r) => 100 + r * Math.cos(toRadians(a));
  const tickY = (a, r) => 100 + r * Math.sin(toRadians(a));
  // an arc of the face, swept clockwise, for the limit bands past the end marks
  const arcPath = (a0, a1, r) =>
    `M ${tickX(a0, r).toFixed(2)} ${tickY(a0, r).toFixed(2)} A ${r} ${r} 0 0 1 ${tickX(a1, r).toFixed(2)} ${tickY(a1, r).toFixed(2)}`;
  return (
    <div style={{ position: 'relative', width: size, height: size * 0.5 + 48 }}>
      {/* the case: moulded phenolic, so no tile — it is the one smooth thing in
          the frame, and that contrast is most of what makes it read as an
          instrument rather than as another piece of the building */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: size * 0.5 + 14,
          borderRadius: `${size / 2}px ${size / 2}px 5px 5px`,
          background: 'linear-gradient(158deg, #2b2724 0%, #16130f 46%, #0a0807 100%)',
          boxShadow: '0 14px 26px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -2px 6px rgba(0,0,0,0.8)',
        }}
      />
      {/* the printed face */}
      <div
        style={{
          position: 'absolute', left: 13, right: 13, top: 13, height: size * 0.5 - 10,
          borderRadius: `${size / 2}px ${size / 2}px 3px 3px`,
          backgroundImage: `radial-gradient(120% 150% at 50% 100%, #efe6cf 0%, #ded0ac 62%, #c4b28c 100%), url(${bronzeWorn})`,
          backgroundSize: `auto, ${Math.round(size * 0.9)}px ${Math.round(size * 0.9)}px`,
          // the tile only ages the card; at soft-light it grubbies it without
          // turning it back into metal
          backgroundBlendMode: 'soft-light',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(40,32,24,0.55)',
        }}
      />
      <svg
        viewBox="0 0 200 108"
        style={{ position: 'absolute', left: 13, right: 13, top: 13, width: size - 26, height: (size - 26) * 0.54 }}
      >
        {/* Past the end marks the car is in the overrun, and on a real indicator
            that is where the red goes. Information, not decoration — it is the
            only red on the face and it means something. */}
        <path d={arcPath(-86, -72, 72)} stroke="var(--enamel-red)" strokeWidth="7" fill="none" opacity="0.85" />
        <path d={arcPath(72, 86, 72)} stroke="var(--enamel-red)" strokeWidth="7" fill="none" opacity="0.85" />
        {DECKS.map((d, i) => {
          const a = -SPAN + (i / (DECKS.length - 1)) * SPAN * 2;
          const here = Math.max(0, 1 - Math.abs(pos - i) * 1.6);
          return (
            <g key={d.id}>
              {/* numerals sit outside the ticks, clear of the needle's sweep —
                  inside, the needle parked on a floor covered its own label */}
              <line
                x1={tickX(a, 78)} y1={tickY(a, 78)} x2={tickX(a, 65)} y2={tickY(a, 65)}
                stroke="#2a231c" strokeWidth={here > 0.5 ? 3.4 : 2.2}
              />
              <text
                x={tickX(a, 91)} y={tickY(a, 91) + 4.5}
                textAnchor="middle" fontFamily="var(--display)" fontSize="12"
                fill="#241d17" opacity={(0.5 + 0.5 * here).toFixed(2)}
              >
                {d.tick}
              </text>
            </g>
          );
        })}
        {/* the needle, with the counterweighted tail every one of these has */}
        <line
          x1={tickX(angle + 180, 15)} y1={tickY(angle + 180, 15)}
          x2={tickX(angle, 60)} y2={tickY(angle, 60)}
          stroke="#17120e" strokeWidth="3.4" strokeLinecap="round"
        />
        <line
          x1="100" y1="100" x2={tickX(angle + 180, 14)} y2={tickY(angle + 180, 14)}
          stroke="var(--enamel-red)" strokeWidth="5.5" strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="7" fill="#17120e" stroke="rgba(233,223,198,0.5)" strokeWidth="1.2" />
      </svg>
      {/* the glass: one shallow sweep across the upper left, nothing more. A
          full gloss on a half-round face reads as plastic */}
      <div
        style={{
          position: 'absolute', left: 13, right: 13, top: 13, height: size * 0.5 - 10,
          borderRadius: `${size / 2}px ${size / 2}px 3px 3px`,
          background: 'linear-gradient(128deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 26%, rgba(255,255,255,0) 47%)',
          pointerEvents: 'none',
        }}
      />
      <ContactShadow w={92} opacity={0.3} bottom={-6} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center' }}>
        <EnamelPlate colour="green" size={9} style={{ letterSpacing: 3, padding: '4px 12px' }}>
          FAHRKORB I
        </EnamelPlate>
      </div>
    </div>
  );
}

export default FloorDial;
