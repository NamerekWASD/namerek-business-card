// A panel instrument. **The needle indicates nothing measurable and must never
// be read as one** — no percentage, no proficiency score. It sits at a
// plausible working position and the instrument is a frame for the label, the
// way a real panel meter labels a circuit rather than grading it. The caption
// under the board says so in as many words, because a dial invites exactly the
// reading it must not be given.
function Dial({ needle, unit }) {
  const deg = needle * 240;
  const ticks = Array.from({ length: 11 }, (_, i) => -120 + i * 24);

  return (
    <svg className="dial" viewBox="0 0 200 200" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="flatDialBezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d5231" />
          <stop offset="0.5" stopColor="#3a2b1b" />
          <stop offset="1" stopColor="#1d150e" />
        </linearGradient>
        <linearGradient id="flatDialSheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2d6" stopOpacity="0.22" />
          <stop offset="0.45" stopColor="#fff2d6" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="4" y="4" width="192" height="192" fill="url(#flatDialBezel)" rx="2" />
      <rect x="12" y="12" width="176" height="176" fill="#241a11" rx="2" />
      {[20, 180].map((x) => [20, 180].map((y) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#4a3623" stroke="#120c07" />
      )))}
      <circle cx="100" cy="104" r="72" fill="#100f0a" stroke="#0f0a06" strokeWidth="3" />

      {ticks.map((t, i) => (
        <line
          key={t}
          x1="100"
          y1="42"
          x2="100"
          y2={i % 5 === 0 ? 54 : 50}
          stroke="#d0b895"
          strokeOpacity={i % 5 === 0 ? 0.9 : 0.45}
          strokeWidth={i % 5 === 0 ? 2 : 1}
          transform={`rotate(${t} 100 104)`}
        />
      ))}
      <path d="M45 104 A55 55 0 0 1 155 104" fill="none" stroke="#c2903f" strokeOpacity="0.55" strokeWidth="1.5" />

      <text x="100" y="140" textAnchor="middle" fill="#d0b895" fontFamily="Space Mono, monospace" fontSize="11" letterSpacing="2">
        {unit}
      </text>

      <g className="needle" style={{ '--needle-deg': `${deg}deg` }}>
        <line x1="100" y1="104" x2="100" y2="46" stroke="#ffb454" strokeWidth="3" />
        <line x1="100" y1="104" x2="100" y2="118" stroke="#8b5e22" strokeWidth="3" />
      </g>
      <circle cx="100" cy="104" r="7" fill="#3a2b1b" stroke="#0f0a06" strokeWidth="2" />

      <rect x="12" y="12" width="176" height="176" fill="url(#flatDialSheen)" rx="2" />
    </svg>
  );
}

export default Dial;
