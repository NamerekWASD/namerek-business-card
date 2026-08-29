// The card's own copy, as plain data, apart from the components that render
// it — so a change of wording never means opening a JSX file.
//
// It is also the treaty between the two pages. The scene and the flat card are
// two renderings of one business card, and the only thing keeping them from
// drifting apart is that every fact on both is read from here. The chrome is
// allowed to differ; the facts are not.

/**
 * The person the card is about. The name is split in two because the display
 * face sets it on two lines, and the halves need different treatment when the
 * line has to wrap; everything else is one string because it is one line of
 * copy.
 *
 * `portrait` is a URL under `public/` when there is one and `null` when there
 * is not. The pass photo on the flat card's entrance plaque is drawn only if
 * this is set, so an absent portrait is a layout the page already handles
 * rather than a broken image it shows.
 */
export const PERSON = {
  given: 'Mykolai',
  family: 'Tymchenko',
  role: '.NET / C# — Backend & Fullstack',
  intro: [
    'Baue Systeme, die tragen — von der Datenbank bis zur Oberfläche.',
    'Offen für neue Aufgaben im Ruhrgebiet / NRW.',
  ],
  greeting: 'Lust auf ein Gespräch?',
  city: 'Duisburg',
  availability: 'Verfügbar ab sofort',
  email: 'nykolai.tymchenko@gmail.com',
  linkedin: 'https://linkedin.com/in/mykolai-tymchenko',
  github: 'https://github.com/NamerekWASD',
  portrait: null,
};

export const PROJECT_STATS = [
  { value: '06', label: 'Entwickler' },
  { value: '40%', label: 'Performance' },
  { value: '20%', label: 'Tempo' },
  { value: '03', label: 'Releases' },
];

export const SKILL_GROUPS = [
  { label: 'Backend', tech: 'ASP.NET Core · EF Core' },
  { label: 'Frontend', tech: 'React · TypeScript' },
  { label: 'Daten', tech: 'MSSQL · MongoDB' },
  { label: 'Architektur', tech: 'N-Tier · DDD · REST' },
];

// ── where the Projekte console's own content went ────────────────────────────
// `PROJECT_PAGES` and `GITHUB_URL` stood here: a constant six pages the counter
// counted to, and one address for the whole archive. Both are gone into
// `projects.js`, which is now the single file to edit when a project appears —
// the counter's length is the archive's own length, and the LINK button goes
// wherever the loaded project goes. See the note at the head of that file.
