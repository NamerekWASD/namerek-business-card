function CornerRivets() {
  const pos = [{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, left: 6 }, { bottom: 6, right: 6 }];
  return pos.map((p, i) => (
    <span
      key={i}
      style={{
        position: 'absolute', width: 6, height: 6, borderRadius: '50%',
        background: 'var(--rivet)',
        boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06)',
        ...p,
      }}
    />
  ));
}

export default CornerRivets;
