// The stencil every one of these carries, so the landings belong to the same
// building rather than each being a separate still life.
function Stencil({ children, size = 11, style }) {
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: 'var(--mono)', fontSize: size, letterSpacing: 1.5,
        color: 'rgba(226,192,132,0.5)', textShadow: '0 1px 0 rgba(0,0,0,0.7)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Stencil;
