import { memo } from 'react';

// The headboard. Chevrons painted across the ceiling at its far end, over the
// opening — the one piece of pure period styling in the cage, as opposed to
// period hardware. Everything else in this scene is a thing that does a job;
// this does none, and that is the point. The machine age decorated its machines,
// and a lift built in 1936 that carried no ornament at all would be the odd one.
//
// They sit at the far edge because that is the strip of ceiling you can actually
// see: the near edge is behind the camera's top rail. Painted in local pixels
// rather than screen ones, so the projection foreshortens them the way it
// foreshortens the ribs — which is what stops them reading as an overlay.
//
// Takes no props, like the floor's plating, and is memoized for the same reason:
// the cage rides with us, so nothing about it ever moves.
const HeadChevrons = memo(function HeadChevrons() {
  return (
    <div
      style={{
        position: 'absolute', left: '6%', right: '6%', bottom: 6, height: 124,
        display: 'flex', alignItems: 'stretch', justifyContent: 'space-between',
      }}
    >
      {Array.from({ length: 13 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 32,
            background: 'rgba(233,223,198,0.32)',
            clipPath: 'polygon(0 0, 46% 0, 100% 50%, 46% 100%, 0 100%, 54% 50%)',
          }}
        />
      ))}
    </div>
  );
});

export default HeadChevrons;
