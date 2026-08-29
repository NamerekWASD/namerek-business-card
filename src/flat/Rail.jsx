import { FLOORS } from './floors.js';

// The lift, flattened. A fixed hoist guide down the edge with the building's
// four floor plates on it and a car that rides continuously with the scroll —
// continuously and not in steps, so the travel is visible while the snap is
// still animating. It is what stops this page reading as a generic snap-scroll
// landing page.
function Rail({ active, progress, onSelect }) {
  return (
    <nav className="rail" aria-label="Etagen">
      <p className="rail-title">Aufzug</p>
      <div className="rail-track">
        <div className="rail-guide" aria-hidden="true" />
        <div
          className="rail-shuttle"
          aria-hidden="true"
          style={{ transform: `translate3d(0, ${progress * 100}%, 0)` }}
        >
          <div className="rail-car" />
        </div>
        {FLOORS.map((floor) => (
          <button
            key={floor.id}
            type="button"
            className="rail-mark"
            aria-current={active === floor.index ? 'true' : 'false'}
            onClick={() => onSelect(floor.index)}
          >
            <span className="enamel">{floor.code}</span>
            <span className="rail-mark-name">{floor.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default Rail;
