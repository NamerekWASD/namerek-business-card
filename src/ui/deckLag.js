// The deck's inertia, as a transform any element on a deck can wear.
//
// While the cabin accelerates, the plates trail behind the motion and only
// settle a beat after the ride stops, which is what gives them apparent mass. A
// multiplier staggers that across a deck so they don't move as a block.
//
// It reads a custom property rather than taking a number, and that is the whole
// point of the file. The amount used to come down as a `lag` prop off React's
// throttled mirror of the ride, while the column these sit in was written to the
// DOM on every ticker frame — two clocks, and the plates juddered against their
// own deck as the brakes bit. `Dieselpunk` writes `--deck-lag` onto the content
// wrapper from the same ticker snapshot that moves the wrapper itself, so there
// is no second clock left to disagree with.
//
// The fallback matters: under the test runner and on the first paint nothing has
// written the property yet, and `calc()` on an undefined length is an invalid
// declaration that takes the whole rule with it.

/** @param {number} [k] how much of the deck's lag this element takes */
export const deckLag = (k = 1) => `translateY(calc(var(--deck-lag, 0px) * ${k}))`;

export default deckLag;
