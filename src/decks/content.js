// Content for the Projekte and Leistungen decks. Kept as plain data, apart
// from the components that render it, so the copy can change without
// touching JSX.

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

// How many pages the Projekte console's PREV/NEXT run through. The plate above
// them has read "01 / 06" since the frame was built; this is that six, made
// live, so the two cannot drift apart. The gallery those pages will show is
// still in preparation — what pages today is the counter itself, which is the
// part that decides whether a button lights: PREV is lit while there is a page
// behind you and NEXT while there is one ahead. See `buttonPulse.js`.
export const PROJECT_PAGES = 6;

// Where the console's GITHUB button goes. Null until there is an address to
// send anyone to — the button still presses and still advertises itself, it
// simply does not navigate, which is the honest state of it rather than a link
// to a profile that may not be the right one.
export const GITHUB_URL = null;
