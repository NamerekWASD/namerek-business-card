import RivettedPanel from '../ui/RivettedPanel.jsx';
import EnamelPlate from '../ui/EnamelPlate.jsx';
import DeckHeading from '../ui/DeckHeading.jsx';
import { WEAR_SEED } from '../ui/panelWear.js';
import { SKILL_GROUPS, WRITINGS } from './content.js';
import { useFitToWall } from './fitToWall.js';
import { DECKS } from '../lift/decks.js';
import { usePick } from '../i18n/LocaleContext.jsx';

// The marking above the writings: a German stencil in every language, the
// same one the entrance's nameplate and logbook carry.
const MARK = {
  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase',
  color: 'rgba(226,192,132,0.85)', textShadow: '0 1px 0 rgba(0,0,0,0.7)', margin: 0,
};

// Four plates in two ranks, which is the reference's own arrangement and not an
// arbitrary one: a single column of four reads as a list, and a list of skills
// is a CV. Two by two reads as a board of instrument labels, which is what the
// room is furnished to look like.
//
// Two fixed tracks rather than `auto-fit`, and `minmax(0, 1fr)` rather than
// `1fr`: the column this sits in is 48% of the doorway aperture and narrows with
// the viewport, and an auto-fitted track has a floor it will not go under — so
// at the widths either side of that floor the tech line ran out of its own
// plate. Tracks that may collapse to nothing let the line wrap instead, which is
// the failure worth having.
function LeistungenDeck() {
  const pick = usePick();
  // NBC-108: the writings made this column the second one tall enough to run
  // out of its doorway on a short window, so it yields the entrance's way.
  const fitRef = useFitToWall();
  return (
    <div ref={fitRef}>
      <DeckHeading>{pick(DECKS[1].label)}</DeckHeading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
        {SKILL_GROUPS.map((g, i) => (
          <RivettedPanel key={g.tech} seed={WEAR_SEED.leistungen + i} style={{ padding: '0.9rem 0.85rem' }}>
            {/* the category is a fixed marking on a fixed panel, so it is a
                plate — the same rule the corridor props follow */}
            <EnamelPlate colour="green" size={10} style={{ letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 9px' }}>
              {pick(g.label)}
            </EnamelPlate>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--glow)', marginTop: 9,
              textShadow: '0 0 6px rgba(255,180,84,0.4)',
            }}
            >
              {g.tech}
            </div>
          </RivettedPanel>
        ))}
      </div>

      {/* NBC-108: the published texts, ruled on the wall under the plates the
          way the entrance's logbook is — a brass line, no panel of its own. */}
      <div data-writings="" style={{ marginTop: '0.8rem', paddingLeft: '0.9rem', borderLeft: '2px solid rgba(212,172,104,0.35)' }}>
        <p style={MARK}>Schriften</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {WRITINGS.map((text) => (
            <li key={text.url} style={{ marginTop: '0.3rem' }}>
              {/* One line: the band between the plates and the bench is about
                  that tall on a laptop, so the gist rides on the link's title. */}
              <a
                href={text.url}
                target="_blank" rel="noreferrer noopener"
                lang={text.lang}
                title={`${text.title} — ${pick(text.gist)}`}
                style={{
                  display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.4, color: 'var(--glow)', textDecoration: 'none',
                  textShadow: '0 0 6px rgba(255,180,84,0.35)',
                }}
              >
                {text.title}
              </a>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--muted)', margin: '0.15rem 0 0' }}>
                {text.venue}
                {' · '}
                <time dateTime={text.date}>{text.date}</time>
                <span aria-hidden="true"> ↗</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default LeistungenDeck;
