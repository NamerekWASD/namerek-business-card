import { memo } from 'react';

// The hazard lip and the rivet rows on the cage floor. Forty-five elements that
// have never once changed — the cage rides with us, so nothing about it moves —
// and were being rebuilt on every frame regardless. It takes no props at all,
// which is the cheapest possible memo.
const DeckPlating = memo(function DeckPlating() {
  return (
    <>
      {/* the lip of the floor, at the far edge where you'd step off */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: 11,
          backgroundImage: 'repeating-linear-gradient(45deg, #d9a531 0px, #d9a531 12px, #241a10 12px, #241a10 24px)',
          opacity: 0.85,
        }}
      />
      {[0.26, 0.7].map((r) => (
        <div key={r} style={{ position: 'absolute', left: 0, right: 0, top: `${r * 100}%`, height: 7 }}>
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              style={{
                position: 'absolute', left: `${(i + 0.5) * 4.55}%`, top: 0, width: 7, height: 7,
                borderRadius: '50%', background: 'var(--rivet)',
                boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07)',
              }}
            />
          ))}
        </div>
      ))}
    </>
  );
});

export default DeckPlating;
