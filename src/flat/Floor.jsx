import useArrival from './useArrival.js';

// One floor of the building: a full-viewport snap section with the floor's own
// enamel number bolted to the corner. `is-lit` is what the arrival hangs on —
// the lamp strikes and everything on the floor is lit by it. See `flat.css`.
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
    </section>
  );
}

export default Floor;
