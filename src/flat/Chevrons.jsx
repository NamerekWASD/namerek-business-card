// The scroll cue at the foot of the ground floor. A snap-scroll page with no
// cue reads as a page with nothing below it, which is the single most common
// way this format fails.
function Chevrons() {
  return (
    <div className="chevrons" aria-hidden="true">
      {[0, 1].map((i) => (
        <svg key={i} width="26" height="12" viewBox="0 0 26 12" fill="none">
          <path d="M2 2 L13 10 L24 2" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      ))}
    </div>
  );
}

export default Chevrons;
