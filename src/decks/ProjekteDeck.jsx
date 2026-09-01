import RivettedPanel from '../ui/RivettedPanel.jsx';
import { WEAR_SEED } from '../ui/panelWear.js';
import { SLIDES } from './projects.js';
import { useFullscreenGallery } from '../scene/r3f/fullscreenImage.js';

// ── 2. UG, the left half ─────────────────────────────────────────────────────
// This deck used to be a PROJEKTE heading, four statistics badges and a plate
// reading "Referenzen" that said projects were in preparation while the console
// beside it was already showing them. All of that went, and what it left was an
// actual hole: a visitor looking at a screenshot of a Paperless webhook config
// with nothing anywhere in the room to say what the thing is or why it exists.
//
// What stands there now is a works notice — one plate, screwed to the plaster,
// carrying the description of whatever job is on the glass. Prose, and nothing
// but: the room shows one project on three surfaces at once and each of them
// answers exactly one question. `projects.js` has the whole table and the
// reason `blurb` is forbidden from opening with the project's name.
//
// ── why it reads a page number and not a project ─────────────────────────────
// The console pages *shots*, not projects — six pictures of one job are six
// presses of NEXT (again, `projects.js`). So the notice follows the same
// counter and lands on the same project for all six of them, which is what
// makes it stand still while the pictures change under it. The number itself
// lives above the `<Canvas>` in `Dieselpunk`, because the fullscreen modal
// pages it too; `fullscreenImage.js` is why it cannot live anywhere else.
//
// ── and why it is DOM ────────────────────────────────────────────────────────
// 3D text was considered for the landings and turned down: text drawn into the
// scene cannot be selected, copied or read by a screen reader, and a
// description nobody can copy out of a business card is a description that
// does not do its job. This is a paragraph.

function ProjekteDeck() {
  const gallery = useFullscreenGallery();
  const slide = SLIDES[gallery?.page ?? 0] ?? null;

  // An empty archive is a painted state, not a crash — the glass shows a test
  // card and every control on the console stays dark. A plate with nothing on
  // it would be the one thing in the room still insisting there is something
  // to read, so there is no plate either.
  if (!slide?.blurb) return null;

  return (
    // Capped at the same measure `StartDeck`'s paragraph is capped at, which is
    // what stops the full 48% column turning a notice into a banner. A plate
    // twice as wide as it is tall reads as signage; this one reads as a sheet
    // in a frame, which is what it is.
    <RivettedPanel
      seed={WEAR_SEED.projekte}
      style={{ padding: '1.15rem 1.25rem', maxWidth: 340 }}
    >
      {/* Keyed by project so the paragraph is replaced rather than having its
          text node rewritten underneath a selection someone is halfway through
          making. It only ever changes when the picture crosses into a
          different job, which is why nothing here is cross-faded. */}
      <p
        key={slide.project}
        style={{
          fontSize: 15, lineHeight: 1.75, color: 'var(--muted)', margin: 0,
          textWrap: 'pretty',
        }}
      >
        {slide.blurb}
      </p>
    </RivettedPanel>
  );
}

export default ProjekteDeck;
