// The four flags, drawn rather than typed.
//
// The obvious way to put a flag on a page is the emoji, and it does not work:
// Windows ships no glyphs for regional indicator pairs at all, so `🇩🇪` renders
// there as the letters `DE` — on the majority platform for this card's readers,
// the flags would simply not exist. Every other route (an image per flag, an
// icon font) is a network request for four rectangles of flat colour.
//
// So they are geometry, laid out on a 60×40 grid and stretched to whatever box
// the caller gives them: one badge size for all four keeps the switch's arc
// even, which matters more here than the 2:1 the Union Flag would like.
//
// The palette is pulled a little off the official colours — pure #FFF becomes
// the same cream the rest of the card is printed in, and the reds and blues
// are dropped a step — because these sit on a bolted plate in a 1930s lift
// cabin, and four saturated web-safe rectangles would be the only things in the
// building that had never been rained on. The switch dims the inactive ones
// further; this is only the enamel they start from.

const CREAM = '#e6dcc6';

const DE = ['#141210', '#c01f22', '#e0ae1c'];
const RU = [CREAM, '#1a4fa0', '#bf1e28'];
const UA = ['#1a63b4', '#e3c022'];
const GB = { field: '#0e2f68', cross: '#bf1e28' };

/**
 * @param {{ name: 'de' | 'gb' | 'ua' | 'ru', x: number, y: number, w: number, h: number }} props
 */
function Flag({ name, x, y, w, h }) {
  return (
    <svg x={x} y={y} width={w} height={h} viewBox="0 0 60 40" preserveAspectRatio="none">
      {name === 'de' && DE.map((fill, i) => (
        <rect key={fill} x="0" y={i * (40 / 3)} width="60" height={40 / 3} fill={fill} />
      ))}

      {name === 'ru' && RU.map((fill, i) => (
        <rect key={fill} x="0" y={i * (40 / 3)} width="60" height={40 / 3} fill={fill} />
      ))}

      {name === 'ua' && UA.map((fill, i) => (
        <rect key={fill} x="0" y={i * 20} width="60" height="20" fill={fill} />
      ))}

      {/* The Union Flag, in the order it is actually built: the saltires go
          down first and the cross of St George over them, which is why the
          diagonals are broken by the cross and not the other way round. The
          counterchange — the half-width step in the red saltire — is dropped:
          at 34px wide it is under a pixel, and drawing it costs four polygons
          that would read as noise. */}
      {name === 'gb' && (
        <>
          <rect x="0" y="0" width="60" height="40" fill={GB.field} />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke={CREAM} strokeWidth="9" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke={GB.cross} strokeWidth="4" />
          <path d="M30 0 V40 M0 20 H60" stroke={CREAM} strokeWidth="14" />
          <path d="M30 0 V40 M0 20 H60" stroke={GB.cross} strokeWidth="8" />
        </>
      )}
    </svg>
  );
}

export default Flag;
