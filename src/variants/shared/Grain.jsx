const noiseSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;

export default function Grain({ opacity = 0.05 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        opacity,
        mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(noiseSvg)}")`,
        backgroundSize: '140px 140px',
      }}
    />
  );
}
