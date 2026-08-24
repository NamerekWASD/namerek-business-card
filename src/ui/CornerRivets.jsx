// The four bolts holding a plate to the wall.
//
// Domed, not dotted. A flat disc of one colour is a bullet point; what makes a
// bolt read is that its head is a little sphere lit from the same side as
// everything else in the room — a highlight up and left, brass falling away to
// dark down and right, and a shadow underneath it on the plate. Three
// declarations, and it is the difference between a rivet and a decoration.
//
// The two numbers are exported because a second file needs them: the corrosion
// weeping out of these heads is painted onto the plate's own canvas by
// `panelWear`, and a bolt whose rust is somewhere else is worse than a bolt
// with no rust at all.
export const RIVET_INSET = 8;
export const RIVET_SIZE = 7;

function CornerRivets({ inset = RIVET_INSET, size = RIVET_SIZE }) {
  const pos = [
    { top: inset, left: inset }, { top: inset, right: inset },
    { bottom: inset, left: inset }, { bottom: inset, right: inset },
  ];
  return pos.map((p, i) => (
    <span
      key={i}
      style={{
        position: 'absolute', width: size, height: size, borderRadius: '50%',
        background: 'radial-gradient(circle at 32% 28%, #b28c46 0%, #7b5c28 48%, #35270f 100%)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.8), inset 0 -1px 1px rgba(0,0,0,0.45)',
        ...p,
      }}
    />
  ));
}

export default CornerRivets;
