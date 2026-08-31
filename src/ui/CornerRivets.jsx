import { RIVET_HEAD, rivetImage } from './rivet.js';

// The four bolts holding a plate to the wall.
//
// The head itself is drawn by `rivet.js` — dome, specular, bounce and contact
// shadow — and this file is only where the four of them go. It used to carry
// its own radial-gradient, which is why the flat page grew a second, worse
// copy of the same idea; NBC-65 pulled both onto one asset.
//
// The two numbers are exported because a second file needs them: the corrosion
// weeping out of these heads is painted onto the plate's own canvas by
// `panelWear`, and a bolt whose rust is somewhere else is worse than a bolt
// with no rust at all. They describe the **head** — `inset` to its box, `size`
// across it — and the element underneath is larger than that, because the
// asset carries the head's shadow in its own margin. Hence the arithmetic
// below rather than four plain offsets.
export const RIVET_INSET = 8;
export const RIVET_SIZE = 7;

const HEAD = rivetImage();

function CornerRivets({ inset = RIVET_INSET, size = RIVET_SIZE }) {
  const box = size / RIVET_HEAD;
  const off = inset - (box - size) / 2;
  const pos = [
    { top: off, left: off }, { top: off, right: off },
    { bottom: off, left: off }, { bottom: off, right: off },
  ];
  return pos.map((p, i) => (
    <span
      key={i}
      style={{
        position: 'absolute', width: box, height: box,
        backgroundImage: HEAD, backgroundSize: '100% 100%',
        ...p,
      }}
    />
  ));
}

export default CornerRivets;
