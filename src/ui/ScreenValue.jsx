function ScreenValue({ value, glow = true }) {
  return (
    <div
      style={{
        background: 'var(--screen)',
        borderRadius: 2,
        padding: '0.6rem 0',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(0,0,0,0.6)',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 22,
          color: 'var(--glow)',
          textShadow: glow ? '0 0 8px rgba(255,180,84,0.7), 0 0 2px rgba(255,180,84,0.9)' : 'none',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default ScreenValue;
