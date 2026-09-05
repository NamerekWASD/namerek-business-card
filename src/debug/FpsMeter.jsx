import { useEffect, useState } from 'react';

// A frame meter, so the cost of a change is a number rather than an impression.
// It keeps its own state and updates twice a second, which is the whole point:
// it must not be able to re-render the scene it is measuring.
function FpsMeter({ hiDpr }) {
  const [read, setRead] = useState({ fps: 0, worst: 0 });
  useEffect(() => {
    let id;
    let last = 0;
    let n = 0;
    let sum = 0;
    let worst = 0;
    let since = performance.now();
    const tick = (now) => {
      if (last) {
        const dt = now - last;
        n += 1;
        sum += dt;
        if (dt > worst) worst = dt;
      }
      last = now;
      if (now - since > 500 && n) {
        setRead({ fps: Math.round(1000 / (sum / n)), worst: Math.round(worst) });
        n = 0; sum = 0; worst = 0; since = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  const bad = read.fps > 0 && read.fps < 45;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: bad ? '#ff9d5c' : '#8de08d' }}>
      {/* whether the canvases are still being built at the full dpr is stated,
          not implied — when the frame rate suddenly changes, the first thing
          worth knowing is whether the auto-downgrade did it */}
      <span>frame · dpr {hiDpr ? 'hi' : 'lo'}</span>
      <span>{read.fps} fps · worst {read.worst}ms</span>
    </div>
  );
}

export default FpsMeter;
