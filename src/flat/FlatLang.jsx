import { useCallback, useEffect, useId, useRef, useState } from 'react';
import LanguageSelector from '../ui/LanguageSelector.jsx';
import Flag from '../ui/Flag.jsx';
import { LOCALES } from '../i18n/locale.js';

// The flat card's corner switch: a badge, and the strip in a drawer behind it.
//
// The strip used to hang open up there, and the corner it hangs in is not its
// own — every floor bolts its enamel number to the same one. Two plates, one
// corner, and the switch is `position: fixed` while the tag rides the floor, so
// the tag went *under* it on the way past. NBC-96.
//
// Two things follow from that, and only the first is obvious. The strip is shut
// by default and opens on a press; and the badge that opens it does not take
// the tag's place, it stands beside it — `--lang-badge` in `flat.css` is the
// lane the tag's `right` keeps clear, so the two read as a pair of plates on
// one line rather than as one plate over another.
//
// The badge wears the live language's flag and nothing else. It cannot carry
// the code as well at this size without becoming a second strip, and of the two
// the flag is the one that is found at a glance — the codes are inside, under
// the flags, where the switch says what it actually means (see
// `ui/LanguageSelector.jsx` on why the pair is not interchangeable).
//
// ── Why it is not a `<details>`, and not unmounted ──────────────────────────
// The drawer slides out from under the badge, which means it has to be laid out
// while it is still hidden — a panel that is `display: none` until the press
// has nowhere to slide *from*, and arrives instead of opening. So it stays
// mounted and clipped, and `inert` is what makes "clipped" and "shut" the same
// fact: no tab stop, no pointer, nothing for a screen reader, while the plate
// keeps its box and its transition.
function FlatLang({ value, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const badgeRef = useRef(null);
  const drawerRef = useRef(null);
  const drawerId = useId();
  const locale = LOCALES.find((l) => l.id === value) ?? LOCALES[0];

  // `refocus` is not a detail of the animation, it is the difference between
  // two kinds of closing. Escape, a second press and a language chosen are all
  // the visitor addressing this control, and the keyboard belongs back on it; a
  // press somewhere else is that other thing's press, and taking the focus off
  // it would be this switch answering a click it never received.
  const close = useCallback((refocus) => {
    setOpen(false);
    if (refocus) badgeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    // The strip has one tab stop and it is the live position — the same one the
    // carriage is parked under, so the keyboard opens where the eye already is.
    drawerRef.current?.querySelector('.lang-pos[tabindex="0"]')?.focus();

    const onDocumentDown = (event) => {
      if (drawerRef.current?.closest('.flat-lang')?.contains(event.target)) return;
      close(false);
    };
    // `pointerdown`, not `click`: a press that starts outside should shut the
    // drawer before whatever it landed on has acted, not after.
    document.addEventListener('pointerdown', onDocumentDown);
    return () => document.removeEventListener('pointerdown', onDocumentDown);
  }, [close, open]);

  const onKeyDown = useCallback((event) => {
    if (event.key !== 'Escape' || !open) return;
    // Kept off `document`: the card steers its floors from a listener up there,
    // and an Escape that closed the drawer *and* reached the page would be one
    // press doing two things.
    event.preventDefault();
    event.stopPropagation();
    close(true);
  }, [close, open]);

  const choose = useCallback((id) => {
    onChange(id);
    close(true);
  }, [close, onChange]);

  return (
    <div className={open ? 'flat-lang is-open' : 'flat-lang'} onKeyDown={onKeyDown}>
      <button
        type="button"
        ref={badgeRef}
        className="flat-lang-badge"
        aria-expanded={open}
        aria-controls={drawerId}
        // Named by what it does and what it is standing on, in both the card's
        // languages of record: the flag inside is a picture and a picture of a
        // country is not the name of a language.
        aria-label={`Sprache · Language — ${locale.endonym}`}
        data-flag={locale.flag}
        onClick={() => (open ? close(true) : setOpen(true))}
      >
        <svg viewBox="0 0 40 36" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="flatLangBezel" x1="0.25" y1="0" x2="0.75" y2="1">
              <stop offset="0" stopColor="#d8b06a" />
              <stop offset="0.42" stopColor="#8e6a2e" />
              <stop offset="1" stopColor="#3a2a12" />
            </linearGradient>
            <linearGradient id="flatLangSheen" x1="0" y1="0" x2="0.7" y2="1">
              <stop offset="0" stopColor="#fff6e0" stopOpacity="0.22" />
              <stop offset="0.55" stopColor="#fff6e0" stopOpacity="0.04" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
            </linearGradient>
          </defs>
          <Flag name={locale.flag} x={3} y={3} w={34} h={23} />
          <rect x="3" y="3" width="34" height="23" fill="url(#flatLangSheen)" />
          <rect x="2" y="2" width="36" height="25" fill="none" stroke="url(#flatLangBezel)" strokeWidth="2" />
          {/* The one part that says the plate opens, and the one part that
              moves when it has. */}
          <path className="flat-lang-caret" d="M15 30 L20 34 L25 30" fill="none" stroke="#c2903f" strokeWidth="2" strokeLinecap="square" />
        </svg>
      </button>

      <div
        className="flat-lang-drawer"
        id={drawerId}
        ref={drawerRef}
        inert={!open}
      >
        <LanguageSelector value={value} onChange={choose} compact={compact} />
      </div>
    </div>
  );
}

export default FlatLang;
