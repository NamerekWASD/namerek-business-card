import { memo } from 'react';
import { roomLightAt } from '../model/lighting.js';
import { shadedRgb, shadedRgba } from '../model/materials.js';
import { LANDING_SETBACK } from '../model/geometry.js';

// The corridor's own fitting — the industrial dome pendant: a chain off the
// cornice `ShaftBack.jsx` runs along the top of this wall, a finned cast crown,
// a wide spun shade, and a caged glass hanging under it.
//
// It is built as a stack of ellipses in depth order rather than as one drawn
// picture, because the whole read of this fixture is *which edge is in front of
// which*. Back to front: the shade's body; the warm inside of that shade seen
// through the opening; the glass; the shade's near lip crossing the glass; and
// the wire guard last of all, in front of everything, so the ribs are metal
// standing in front of a light rather than a pattern printed on one.
//
// The two arcs are what sell it. The shade's bottom edge is the *far* rim, so
// the interior shows below it; the lip is the *near* rim, so it is an ellipse
// with its top half cut away — thick under the middle, tapering to nothing at
// the sides. That is the only cue in the whole thing that says we are standing
// below this lamp and looking up into it.
//
// ── cost ─────────────────────────────────────────────────────────────────────
// This mounts and unmounts mid-ride (`furnished` in `ShaftBack.jsx` drops the
// corridor's contents as soon as its door is shut), which makes mount cost the
// only cost that matters here — once it is up it never re-renders, and it moves
// with the whole far wall on a single composited transform.
//
// So: no `filter`, no `mixBlendMode`, no tiled `ironFace` (that is three
// background layers, two blend modes and an image decode per element), no
// shadow wider than a few pixels, and nothing animated. Every style object is
// built once per width and shared by every fixture on screen, so mounting one
// is React walking seventeen elements that already have their styles — no
// colour arithmetic, no gradient strings assembled per floor. The old version
// rebuilt about fifteen of those strings on every mount and reached for
// `ironFace` on top of that.
const RIBS = [
  // fraction across the guard, and how heavy the wire reads. The two outer
  // ones are the guard's silhouette seen edge-on, so they are the thickest.
  [0.06, 1.15], [0.27, 0.85], [0.5, 1], [0.73, 0.85], [0.94, 1.15],
];

function build(w) {
  const u = (f) => Math.round(w * f * 10) / 10;
  const px = (v) => Math.max(1, Math.round(v * (w / 104) * 10) / 10);

  // Three attitudes to the corridor light, which comes from above and a little
  // in front: the tops of things, the crown half turned up to it, and the
  // shade's flank standing nearly square to us.
  const up = roomLightAt([0, -1, 0.1]);
  const cast = roomLightAt([0, -0.6, 0.6]);
  const side = roomLightAt([0, -0.2, 0.95]);

  const crest = shadedRgb('#4c463a', side);
  const body = shadedRgb('#2e2921', side);
  const deep = shadedRgb('#17130e', side);
  // the shade's lower flank, picking the bulb back up off its own inside
  const bounce = shadedRgb('#3b2e1e', side);
  const sheen = shadedRgba('#5f5849', 0.42, up);
  const lipHi = shadedRgb('#8f8062', side);
  const castHi = shadedRgb('#4a4234', cast);
  const castLo = shadedRgb('#1b1710', cast);

  const domeTop = u(0.4);

  return {
    wrap: {
      position: 'absolute', width: 0, height: 0, transformStyle: 'preserve-3d',
      // just enough forward of the cornice to read as a solid standing off the
      // wall, not so far it loses the thing it is hanging from
      transform: `translateZ(${LANDING_SETBACK * 0.22}px)`,
    },

    // What the fitting throws on the wall behind it. Flat alpha rather than
    // `screen`: a blend mode costs a separate compositing pass, and over a
    // corridor this dark the two are the same picture.
    spill: {
      position: 'absolute', left: -u(0.95), top: u(0.17), width: u(1.9), height: u(1.7),
      borderRadius: '50%', pointerEvents: 'none',
      background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,182,102,0.17) 0%, rgba(255,150,66,0.07) 42%, rgba(0,0,0,0) 74%)',
    },

    // the ceiling plate, at the cornice
    canopy: {
      position: 'absolute', left: -u(0.09), top: 0, width: u(0.18), height: u(0.045),
      borderRadius: `${px(3)}px ${px(3)}px ${px(1)}px ${px(1)}px`,
      background: `linear-gradient(180deg, ${shadedRgb('#4f4736', up)}, ${shadedRgb('#241e15', up)})`,
      boxShadow: `0 ${px(2)}px ${px(3)}px rgba(0,0,0,0.6)`,
    },
    // the chain. Links, not a rod: the rhythm of light and dark down a narrow
    // strip is the whole of what reads as chain at this size.
    chain: {
      position: 'absolute', left: -u(0.028), top: u(0.035), width: u(0.056), height: u(0.205),
      borderRadius: px(2),
      backgroundImage: `repeating-linear-gradient(180deg, ${shadedRgb('#6d6047', cast)} 0 ${px(1)}px, ${shadedRgb('#1d1811', cast)} ${px(1)}px ${px(4)}px, ${shadedRgb('#514734', cast)} ${px(4)}px ${px(5)}px, ${shadedRgb('#0f0c08', cast)} ${px(5)}px ${px(8)}px)`,
    },
    // the junction box the chain lands on, and the finned cast crown under it.
    // Stepped rather than tapered — the house profile, and two plain boxes are
    // cheaper than a clip-path besides.
    jbox: {
      position: 'absolute', left: -u(0.06), top: u(0.232), width: u(0.12), height: u(0.062),
      background: `linear-gradient(180deg, ${castHi}, ${castLo})`,
      boxShadow: `inset 0 ${px(1)}px 0 rgba(255,235,200,0.14)`,
    },
    crownUp: {
      position: 'absolute', left: -u(0.1), top: u(0.29), width: u(0.2), height: u(0.052),
      background: `linear-gradient(180deg, ${castHi}, ${castLo})`,
      boxShadow: `inset 0 ${px(1)}px 0 rgba(255,235,200,0.16)`,
    },
    // the fins. The reference fitting is a ribbed casting, and the ribs are the
    // one detail that says the top of this thing is heavy.
    crownLo: {
      position: 'absolute', left: -u(0.165), top: u(0.338), width: u(0.33), height: u(0.076),
      backgroundImage: [
        `repeating-linear-gradient(90deg, rgba(255,240,210,0.13) 0 ${px(1)}px, rgba(0,0,0,0.42) ${px(1)}px ${px(4)}px)`,
        `linear-gradient(180deg, ${castHi}, ${castLo})`,
      ].join(', '),
      boxShadow: `inset 0 ${px(1)}px 0 rgba(255,235,200,0.18), 0 ${px(2)}px ${px(3)}px rgba(0,0,0,0.5)`,
    },

    // the shade. Flat-bottomed on purpose: that edge is the far rim, and the
    // ellipses below cover the line it makes. The lateral darkening is what
    // makes it read as spun rather than stamped — without it a dome shaded
    // top-to-bottom alone is a flat disc with a gradient on it.
    dome: {
      position: 'absolute', left: -u(0.48), top: domeTop, width: u(0.96), height: u(0.3),
      borderRadius: '50% 50% 0 0 / 76% 76% 0 0',
      backgroundImage: [
        `radial-gradient(46% 42% at 33% 16%, ${sheen} 0%, rgba(0,0,0,0) 68%)`,
        'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.6) 100%)',
        `linear-gradient(180deg, ${crest} 0%, ${body} 46%, ${deep} 82%, ${bounce} 100%)`,
      ].join(', '),
      boxShadow: `0 ${px(5)}px ${px(9)}px rgba(0,0,0,0.6)`,
    },
    // The inside of the shade, seen through the opening — and the piece the
    // whole fitting is built around, because this one ellipse draws both rims
    // at once. Its top arc is the far rim: it is laid over the shade, so the
    // shade's visible bottom edge becomes that arc, highest at the middle and
    // dropping away at the sides, which is what standing under a lamp looks
    // like. Its bottom arc is the near rim, and the lip below traces it.
    //
    // Which is also why it is a hair wider than the shade rather than
    // narrower: a rolled rim overhangs the body it is rolled onto. Getting
    // this backwards is what hung a second saucer under the first.
    //
    // Lit copper, not glass: a surface catching the bulb, brightest where the
    // bulb is and gone by the edges.
    interior: {
      position: 'absolute', left: -u(0.5), top: u(0.67), width: u(1), height: u(0.1),
      borderRadius: '50%',
      backgroundImage: [
        // the inner surface turning away as it comes down to the rim. Without
        // it the copper runs at full strength straight into the lip and the
        // two meet in a hard bright line all the way across.
        'linear-gradient(180deg, rgba(0,0,0,0) 52%, rgba(0,0,0,0.5) 100%)',
        'radial-gradient(38% 60% at 50% 36%, rgb(178,120,60) 0%, rgb(104,64,29) 38%, rgb(44,27,14) 72%, rgb(20,13,8) 100%)',
      ].join(', '),
    },
    // the glass, and its bloom. A small bright thing bleeds in any lens.
    glass: {
      position: 'absolute', left: -u(0.14), top: u(0.68), width: u(0.28), height: u(0.29),
      borderRadius: '30% 30% 46% 46% / 14% 14% 42% 42%',
      backgroundImage: 'radial-gradient(56% 50% at 50% 40%, rgba(255,252,240,1) 0%, rgba(255,224,168,0.94) 30%, rgba(240,164,78,0.8) 62%, rgba(146,84,30,0.62) 100%)',
      boxShadow: `0 0 ${px(6)}px rgba(255,236,196,0.6), 0 0 ${px(15)}px ${px(4)}px rgba(255,176,94,0.34)`,
    },

    // the wire guard, and the hoops behind its ribs
    cage: {
      position: 'absolute', left: -u(0.15), top: u(0.68), width: u(0.3), height: u(0.3),
      borderRadius: '16% 16% 46% 46% / 7% 7% 44% 44%',
      overflow: 'hidden',
      backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0 4%, rgba(14,11,8,0.8) 4% 10%, rgba(0,0,0,0) 10% 48%, rgba(14,11,8,0.75) 48% 53%, rgba(0,0,0,0) 53% 84%, rgba(14,11,8,0.88) 84% 100%)',
    },
    ribs: RIBS.map(([f, weight]) => {
      const bar = px(1.3) * weight;
      return {
        position: 'absolute', top: 0, height: '100%', width: bar,
        left: Math.round((u(0.3) * f - bar / 2) * 10) / 10,
        backgroundImage: 'linear-gradient(180deg, rgba(146,118,80,0.8) 0%, rgba(20,15,10,0.95) 44%, rgba(54,41,26,0.9) 100%)',
      };
    }),
  };
}

// Built once per width and shared by every fixture on screen. Nothing in here
// depends on the ride, the floor or the lamps — the corridor light is a fixed
// direction — so a fixture coming into view costs no arithmetic at all.
const CACHE = new Map();
function stylesFor(w) {
  let s = CACHE.get(w);
  if (!s) {
    s = build(w);
    CACHE.set(w, s);
  }
  return s;
}

const CorridorFixture = memo(function CorridorFixture({ x, y, w = 104 }) {
  const s = stylesFor(w);
  return (
    <div style={{ ...s.wrap, left: x, top: y }}>
      <div style={s.spill} />
      <div style={s.canopy} />
      <div style={s.chain} />
      <div style={s.jbox} />
      <div style={s.crownUp} />
      <div style={s.crownLo} />
      <div style={s.dome} />
      <div style={s.interior} />
      <div style={s.glass} />
      <div style={s.cage}>
        {s.ribs.map((rib, i) => <div key={i} style={rib} />)}
      </div>
    </div>
  );
});

export default CorridorFixture;
