import useArrival from './useArrival.js';

// One floor of the building: a full-viewport snap section with the floor's own
// enamel number bolted to the corner. `is-lit` is what the arrival hangs on —
// the lamp strikes and everything on the floor is lit by it. See `flat.css`.
//
// NBC-63: the light is a layer of its own now, and that is the whole of the
// fix. What was here animated `.floor-inner`'s own opacity from 0.18 through
// four hard steps, which read as the *content* blinking — a page still
// loading — rather than as a room being lit, and at five changes over 1.15s it
// sat the wrong side of the three-flashes-a-second line that exists for
// photosensitive visitors. A floor's text is now drawn at full strength from
// its first frame and what changes is the dark over it.
function Floor({ meta, children }) {
  const { ref, arrived } = useArrival();

  return (
    <section
      id={meta.id}
      ref={ref}
      aria-label={`${meta.code} — ${meta.label}`}
      className={`floor${arrived ? ' is-lit' : ''}`}
    >
      <div className="floor-tag">
        <span className="enamel enamel--lg">{meta.code}</span>
      </div>
      <div className="floor-inner">{children}</div>
      <div className="floor-lamp" aria-hidden="true" />
    </section>
  );
}

export default Floor;
