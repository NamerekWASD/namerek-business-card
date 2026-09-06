import { useCallback, useRef } from 'react';
import RivettedPanel from './RivettedPanel.jsx';
import Flag from './Flag.jsx';
import { LOCALES } from '../i18n/locale.js';
import { WEAR_SEED } from './panelWear.js';

// The language switch: a four-position selector on a bolted strip.
//
// A dropdown would have done the job and would have been the one control on
// this card that came from a different century than the building around it.
// The card is a lift in a 1930s works, and the way that building selects one
// of four things is a switch with its positions marked on the panel and
// something that visibly *moves* to the one in use.
//
// ── Why it lies down ────────────────────────────────────────────────────────
// The first build of this was a rotary — a knob with a pointer and the four
// positions in a 150° arc around it — and it was wrong for the one place it
// has to live. A round instrument is as tall as it is wide, and the switch's
// home in the scene is the cabin's head panel: a bar whose height is the whole
// budget, because anything taller than the works plate already bolted to it
// pushes the panel down over the doorway. So the sweep was laid flat.
// Positions in a row, a groove under them, a carriage running along it — which
// is the flat card's own rail, a shaft with a car travelling in it, turned on
// its side. Width is free in both hosts; height is not.
//
// ── Why the positions carry flags ───────────────────────────────────────────
// A flag names a *country*, not a language, and the four here are not four
// countries — English is not Britain's, and the pair Russian/Ukrainian is a
// pair a flag cannot label neutrally. So the flag is the thing you find at a
// glance, the stencilled code under it is the thing that is actually true, and
// the accessible name of each position is neither: it is the endonym, the
// language naming itself in itself. A screen reader announcing "United
// Kingdom" where the switch means English would be the same mistake as the
// emoji, only quieter.
//
// ── What it does not do ─────────────────────────────────────────────────────
// It does not answer the wheel. A control you can move by scrolling over it is
// one that moves while somebody is scrolling *past* it, and the cost of that
// accident is the visitor's language changing under them in a corner of the
// screen they were not looking at. Click, arrow keys, Home/End.

// The strip, in its own units. Everything below is hung off `PITCH`: the
// positions are evenly spaced across the full width, the badges sit centred on
// them, and the groove runs between the first and the last and no further — a
// scale that overshoots its own end marks is the detail that reads as wrong
// before anyone works out why.
const VIEW_W = 200;
const PITCH = VIEW_W / LOCALES.length;
const BADGE = { w: 34, h: 23 };
const BADGE_Y = 27;
const CODE_Y = 58;
const GROOVE_Y = 70;
// The hit areas are the full pitch and nearly the full height of the strip:
// on a handset these four are the only targets on the page that are not a
// whole floor, and a gap between them buys nothing but a missed tap.
const HIT = { w: PITCH, h: 54 };

const SEAT = LOCALES.map((_, i) => PITCH / 2 + i * PITCH);
const RUN = SEAT[SEAT.length - 1] - SEAT[0];

/**
 * Two boxes over one drawing. The plate is bolted to two panels of very
 * different size — a corner of the flat card, and a slot on the cabin's head
 * panel beside the floor buttons — and the small one cannot carry the stencil:
 * at that width `SPRACHWAHL` would be six pixels tall, which is not a smaller
 * label but a smudge. `compact` crops the band it stood in rather than merely
 * hiding it, so the plate loses that height instead of wearing an empty margin.
 */
const BOX = {
  full: { x: 0, y: 0, w: VIEW_W, h: 78 },
  compact: { x: 0, y: 20, w: VIEW_W, h: 58 },
};

const pct = (v, origin, total) => `${((v - origin) / total) * 100}%`;

/**
 * @param {{
 *   value: import('../i18n/locale.js').LocaleId,
 *   onChange: (id: import('../i18n/locale.js').LocaleId) => void,
 *   compact?: boolean,
 *   disabled?: boolean,
 *   style?: import('react').CSSProperties,
 * }} props
 *
 * The plate carries no position of its own: the scene bolts it to the cabin's
 * head panel and the flat card hangs it in a fixed corner, and those are the
 * hosts' facts. A host that has to *place* it wraps it — the panel's own
 * `position: relative` is an inline style and no class can outrank it.
 */
function LanguageSelector({ value, onChange, compact = false, disabled = false, style }) {
  const groupRef = useRef(null);
  const index = Math.max(0, LOCALES.findIndex((l) => l.id === value));
  const box = compact ? BOX.compact : BOX.full;

  const select = useCallback((i) => {
    const next = LOCALES[i];
    // A move to where the switch already is is not a move. Reporting it would
    // make every click a state write, and every re-render of the card a thing
    // a click could cause for no reason.
    if (disabled || !next || next.id === LOCALES[index].id) return;
    onChange(next.id);
  }, [disabled, index, onChange]);

  // The flat card steers its floors from a `keydown` on `document`, so an
  // ArrowLeft that left this control would change the language *and* ride a
  // floor. Everything the switch understands stops here; everything else —
  // ArrowUp, PageDown, the floor keys — is left alone to reach the page.
  const onKeyDown = useCallback((event) => {
    const last = LOCALES.length - 1;
    const to = {
      ArrowRight: Math.min(last, index + 1),
      ArrowLeft: Math.max(0, index - 1),
      Home: 0,
      End: last,
    }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    select(to);
    // The group has one tab stop and it is the live position, so focus has to
    // travel with the selection — left behind on the position just vacated, it
    // would be sitting on the one button in the group that is no longer
    // reachable by Tab.
    groupRef.current?.querySelectorAll('.lang-pos')[to]?.focus();
  }, [index, select]);

  return (
    <RivettedPanel
      seed={WEAR_SEED.console + 3}
      wear="handled"
      // The bolts are sized for a deck plate. On a strip this small the stock
      // heads are four brass balls the size of the flags, so this plate is
      // fastened with screws rather than rivets.
      rivets={{ inset: 5, size: 4 }}
      style={{
        padding: compact ? '4px 6px' : '6px 8px 5px',
        borderRadius: 3,
        // NBC-90. Dimmed rather than hidden or greyed out: this is a switch
        // with the current off it for a second, not a control that has gone
        // away, and the position it is standing on stays readable throughout.
        opacity: disabled ? 0.58 : 1,
        transition: 'opacity 180ms ease',
        ...style,
      }}
    >
      <div
        ref={groupRef}
        className="lang"
        role="radiogroup"
        aria-label="Sprache · Language"
        onKeyDown={onKeyDown}
      >
        <svg
          className="lang-face"
          viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="langBezel" x1="0.25" y1="0" x2="0.75" y2="1">
              <stop offset="0" stopColor="#d8b06a" />
              <stop offset="0.42" stopColor="#8e6a2e" />
              <stop offset="1" stopColor="#3a2a12" />
            </linearGradient>
            {/* The lamp behind the live position. It is a glow on the plate,
                not a light on the flag: enamel does not emit. */}
            <radialGradient id="langLamp" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffb454" stopOpacity="0.42" />
              <stop offset="0.6" stopColor="#ffb454" stopOpacity="0.12" />
              <stop offset="1" stopColor="#ffb454" stopOpacity="0" />
            </radialGradient>
            {/* One raking highlight down the enamel, the same place on all
                four — they are four plates screwed to one panel under one
                lamp, so they cannot each catch it somewhere else. */}
            <linearGradient id="langSheen" x1="0" y1="0" x2="0.7" y2="1">
              <stop offset="0" stopColor="#fff6e0" stopOpacity="0.22" />
              <stop offset="0.55" stopColor="#fff6e0" stopOpacity="0.04" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
            </linearGradient>
          </defs>

          {!compact && (
            <text
              className="lang-title"
              x={VIEW_W / 2}
              y="13"
              textAnchor="middle"
              fill="#c2903f"
              fillOpacity="0.85"
              fontFamily="var(--mono, monospace)"
              fontSize="9"
              letterSpacing="2.6"
            >
              SPRACHWAHL
            </text>
          )}

          {LOCALES.map((locale, i) => {
            const cx = SEAT[i];
            const live = i === index;
            const bx = cx - BADGE.w / 2;
            return (
              <g key={locale.id} className={live ? 'lang-mark is-live' : 'lang-mark'}>
                {live && (
                  <circle cx={cx} cy={BADGE_Y + BADGE.h / 2} r="25" fill="url(#langLamp)" />
                )}
                <g className="lang-enamel">
                  <Flag name={locale.flag} x={bx} y={BADGE_Y} w={BADGE.w} h={BADGE.h} />
                  <rect x={bx} y={BADGE_Y} width={BADGE.w} height={BADGE.h} fill="url(#langSheen)" />
                </g>
                <rect
                  x={bx - 1}
                  y={BADGE_Y - 1}
                  width={BADGE.w + 2}
                  height={BADGE.h + 2}
                  fill="none"
                  stroke={live ? 'url(#langBezel)' : '#5a4523'}
                  strokeOpacity={live ? 1 : 0.9}
                  strokeWidth="2"
                />
                <text
                  x={cx}
                  y={CODE_Y}
                  textAnchor="middle"
                  fill={live ? '#ffb454' : '#d0b895'}
                  fillOpacity={live ? 1 : 0.45}
                  fontFamily="var(--mono, monospace)"
                  fontSize="10"
                  letterSpacing="1.4"
                >
                  {locale.code}
                </text>
              </g>
            );
          })}

          {/* The groove the carriage runs in — a slot milled in the plate, so
              it is a dark line with the plate's own lit edge under it rather
              than a stroke drawn on top of it — and a detent mark under each
              position. */}
          <rect x={SEAT[0]} y={GROOVE_Y - 2.5} width={RUN} height="5" rx="2.5" fill="#0b0704" fillOpacity="0.85" />
          <rect x={SEAT[0]} y={GROOVE_Y + 1} width={RUN} height="1" rx="0.5" fill="#9b7739" fillOpacity="0.35" />
          {SEAT.map((cx) => (
            <line key={cx} x1={cx} y1={GROOVE_Y - 7} x2={cx} y2={GROOVE_Y - 4} stroke="#c2903f" strokeOpacity="0.5" strokeWidth="1.4" />
          ))}

          {/* The carriage. It is the one part that moves, and it moves the way
              the lift does — thrown a little past its detent and settling back
              into it, which is what the easing in `index.css` is. */}
          <g className="lang-pointer" style={{ '--sel-x': `${SEAT[index] - SEAT[0]}px` }}>
            <g transform={`translate(${SEAT[0]} 0)`}>
              <path d={`M -5 ${GROOVE_Y - 8} L 5 ${GROOVE_Y - 8} L 0 ${GROOVE_Y - 3} Z`} fill="#ffb454" />
              <rect x="-9" y={GROOVE_Y - 3.5} width="18" height="8" rx="2" fill="url(#langBezel)" stroke="#120c06" strokeWidth="0.8" />
              <rect x="-8" y={GROOVE_Y - 2.6} width="16" height="2" rx="1" fill="#ffe0ac" fillOpacity="0.45" />
            </g>
          </g>
        </svg>

        {/* The hit areas are HTML buttons laid over the drawing rather than
            roles hung on SVG groups: a real button is what brings the focus
            ring, the keyboard and the accessible name with it, and the drawing
            underneath stays a drawing. They are placed in percentages of the
            same viewBox the badges are drawn in, so the two scale together and
            there is only one set of coordinates in this file. */}
        {LOCALES.map((locale, i) => (
          <button
            key={locale.id}
            type="button"
            role="radio"
            aria-checked={i === index}
            aria-label={locale.endonym}
            title={`${locale.endonym} · ${locale.code}`}
            tabIndex={i === index ? 0 : -1}
            disabled={disabled}
            className="lang-pos"
            style={{
              left: pct(SEAT[i] - HIT.w / 2, box.x, box.w),
              top: pct(BADGE_Y - 6, box.y, box.h),
              width: pct(HIT.w, 0, box.w),
              height: pct(HIT.h, 0, box.h),
            }}
            onClick={() => select(i)}
          />
        ))}
      </div>
    </RivettedPanel>
  );
}

export default LanguageSelector;
