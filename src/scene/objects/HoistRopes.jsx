// Ropes run from the sheave at the top of the shaft down to the crosshead and
// stop there — drawn past it they read as the block dangling from below.
function HoistRopes({ bottom, vh, dim = 1 }) {
  // Bounded to a little either side of the viewport. These were eight thousand
  // pixels tall and their height was rewritten every frame — and they sit inside
  // the subtree the motion blur filters, so that height is not just a big
  // element, it is the size of the texture the blur has to rasterise before it
  // can convolve anything. A rope you cannot see is still a rope the compositor
  // has to draw.
  const TOP = -320;
  const end = Math.min(bottom, vh + 240);
  const height = Math.max(0, end - TOP);
  if (height <= 0) return null;
  const dimmed = (c) => Math.round(c * dim);
  return [-16, 0, 16].map((dx) => (
    <div
      key={dx}
      style={{
        position: 'absolute', top: TOP, height, left: dx - 2, width: 4,
        transform: 'translateZ(22px)',
        // A rope is the one thing here that is genuinely a line, so it keeps its
        // painted highlight — there is no third face on a 4px cable to find.
        background: `linear-gradient(90deg, rgb(${dimmed(20)},${dimmed(23)},${dimmed(26)}), rgb(${dimmed(152)},${dimmed(163)},${dimmed(171)}) 50%, rgb(${dimmed(20)},${dimmed(23)},${dimmed(26)}))`,
      }}
    />
  ));
}

export default HoistRopes;
