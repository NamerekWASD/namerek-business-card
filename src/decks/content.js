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

// ── where the Projekte console's own content went ────────────────────────────
// `PROJECT_PAGES` and `GITHUB_URL` stood here: a constant six pages the counter
// counted to, and one address for the whole archive. Both are gone into
// `projects.js`, which is now the single file to edit when a project appears —
// the counter's length is the archive's own length, and the LINK button goes
// wherever the loaded project goes. See the note at the head of that file.
