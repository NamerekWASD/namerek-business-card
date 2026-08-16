import { ENAMEL_REFERENCE_LIGHT } from '../scene/model/lighting.js';
import { ENAMEL } from '../theme/tokens.js';
import { shadedRgb, shadedRgba } from '../scene/model/materials.js';

// A vitreous enamel plate: the counterpart to the stencil above, and the
// distinction between them is not decorative. A crate gets stencilled, because
// a crate is consumable and the mark is sprayed through a card. A doorway, a
// machine or a letter box gets an enamel plate, because the mark has to outlive
// the paint around it. Using one where the other belongs is the quickest way to
// make a set of props look art-directed rather than used.
//
// `shade` multiplies the colours instead of filtering the element, for the same
// reason every other surface in this file does: a filter would collapse the 3D
// context the plate is standing in.
function EnamelPlate({ children, colour = 'green', shade = ENAMEL_REFERENCE_LIGHT, size = 13, style }) {
  const field = ENAMEL[colour];
  const k = shade / ENAMEL_REFERENCE_LIGHT;
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '5px 11px',
        fontFamily: 'var(--display)', fontSize: size, letterSpacing: 2,
        color: shadedRgb(ENAMEL.cream, Math.min(1.06, k)),
        background: `linear-gradient(168deg, ${shadedRgb(field, k * 1.22)}, ${shadedRgb(field, k * 0.74)})`,
        boxShadow: [
          // the keyline printed just inside the edge, which every one of these
          // plates has and which is most of why they read as enamel at a glance
          `inset 0 0 0 1px ${shadedRgba(ENAMEL.cream, 0.5, k)}`,
          // the rolled edge, where the glass thins and the steel comes through
          `inset 0 0 0 4px ${shadedRgba(field, 0.85, k * 0.55)}`,
          `0 2px 5px rgba(0,0,0,0.6)`,
        ].join(', '),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default EnamelPlate;
