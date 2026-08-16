// Directional (vertical-only) blur. A plain CSS blur smears sideways too and
// instantly reads as "out of focus" rather than "moving fast", so the shaft
// gets an SVG filter with the horizontal deviation pinned to zero.
function MotionBlurDef({ amount, contentAmount }) {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden>
      <defs>
        {/* The regions were 120%×160% and 110%×140% of the filtered subtree —
            nearly twice the viewport rastered and convolved per frame for a
            smear that never reaches past a few dozen pixels. A vertical-only
            blur needs no horizontal margin at all. */}
        <filter id="shaftBlur" x="0%" y="-6%" width="100%" height="112%">
          <feGaussianBlur stdDeviation={`0 ${amount}`} />
        </filter>
        <filter id="deckBlur" x="0%" y="-4%" width="100%" height="108%">
          <feGaussianBlur stdDeviation={`0 ${contentAmount}`} />
        </filter>
      </defs>
    </svg>
  );
}

export default MotionBlurDef;
