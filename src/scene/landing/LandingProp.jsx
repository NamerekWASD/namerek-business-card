import { memo } from 'react';
import PropBody from './PropBody.jsx';

// One identifying object per landing, so a floor is somewhere rather than a
// number. Parked low and to one side, clear of the centred content.
// Parked low and to one side, clear of the centred content, and lit well above
// the wall around it — a prop the eye can't find is not a landmark. The
// brightness lives on this wrapper because `ironFace` sets `filter` itself, and
// spreading it over the base style silently ate the value.
//
// Memoized on the floor number, which is the only thing it depends on. These are
// static objects standing in a static room; they were being rebuilt at sixty
// hertz because their parent was.
const LandingProp = memo(function LandingProp({ idx }) {
  return (
    // no `filter` on this wrapper any more: it flattens the 3D context of
    // everything below it, which would quietly turn every box back into the
    // decal it used to be. The brightness lives in each face's own shade.
    <div style={{ position: 'absolute',
        left: idx === 0 ?  '80%' : idx === 1 ? '30%' : '10%',
        bottom: idx === 0 ? '20%' : '10%',
        transformStyle: 'preserve-3d' }}>
      <PropBody idx={idx} />
    </div>
  );
});

export default LandingProp;
