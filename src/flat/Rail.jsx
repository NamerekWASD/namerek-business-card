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
          // A real link to the section's own id, not a bare button: this is
          // the page's skip navigation as much as it is the lift's dial, and
          // it has to keep working with the click handler stripped out —
          // right-click-to-open-in-a-tab, a screen reader's link list, JS
          // disabled entirely. `goTo` is still what runs on a plain click, so
          // the ride keeps its own smooth-scroll and settle rather than
          // falling back to the browser's bare jump.
          <a
            key={floor.id}
            href={`#${floor.id}`}
            className="rail-mark"
            aria-current={active === floor.index ? 'true' : 'false'}
            onClick={(event) => {
              event.preventDefault();
              onSelect(floor.index);
            }}
          >
            <span className="enamel">{floor.code}</span>
            <span className="rail-mark-name">{floor.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

export default Rail;
