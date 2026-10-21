// The card's own copy, as plain data, apart from the components that render
// it — so a change of wording never means opening a JSX file.
//
// It is also the treaty between the two pages. The scene and the flat card are
// two renderings of one business card, and the only thing keeping them from
// drifting apart is that every fact on both is read from here. The chrome is
// allowed to differ; the facts are not.
//
// ── NBC-85: a fact is either a proper noun or four sentences ────────────────
// A field that is a plain string — `given`, `email`, `github` — is the same
// in every language: a name and an address do not translate. A field that
// varies is `{ de, en, uk, ru }`, and a component reads it with `usePick()`
// from `i18n/LocaleContext.jsx` rather than a locale check of its own —
// `pick()` treats the two shapes the same way, so a caller never needs to ask
// which one a field is before reading it.

/**
 * The person the card is about. The name is split in two because the display
 * face sets it on two lines, and the halves need different treatment when the
 * line has to wrap; everything else is one string (or one translated fact)
 * because it is one line of copy.
 *
 * `portrait` is a URL under `public/` when there is one and `null` when there
 * is not. The pass photo on the flat card's entrance plaque is drawn only if
 * this is set, so an absent portrait is a layout the page already handles
 * rather than a broken image it shows.
 */
export const PERSON = {
  given: 'Mykolai',
  family: 'Tymchenko',
  role: {
    de: '.NET / C# — Backend & Fullstack',
    en: '.NET / C# — Backend & Fullstack Developer',
    uk: '.NET / C# — Backend та Fullstack розробник',
    ru: '.NET / C# — Backend и Fullstack разработчик',
  },
  // The second line — open to work, and where — moved onto the nameplate
  // below (NBC-106), which says it as two rows rather than a sentence.
  intro: {
    de: ['Baue Systeme, die tragen — von der Datenbank bis zur Oberfläche.'],
    en: ['I build systems that hold — from the database to the interface.'],
    uk: ['Будую системи, які тримають навантаження — від бази даних до інтерфейсу.'],
    ru: ['Строю системы, которые выдерживают нагрузку — от базы данных до интерфейса.'],
  },
  greeting: {
    de: 'Lust auf ein Gespräch?', en: 'Up for a conversation?', uk: 'Є бажання поговорити?', ru: 'Есть желание пообщаться?',
  },
  city: { de: 'Duisburg', en: 'Duisburg', uk: 'Дуйсбург', ru: 'Дуйсбург' },
  availability: {
    de: 'Verfügbar ab sofort', en: 'Available immediately', uk: 'Доступний одразу', ru: 'Доступен сразу',
  },
  email: 'nykolai.tymchenko@gmail.com',
  linkedin: 'https://www.linkedin.com/in/mykolai-tymchenko-ab3ab724a/',
  github: 'https://github.com/NamerekWASD',
  portrait: null,
};

/**
 * NBC-106: the entrance's nameplate — the "in short" a visitor reads in five
 * seconds. Rows, not a sentence, because a machine's plate is a list of
 * ratings. The role headline above stays .NET on purpose; what the work looks
 * like lately is a row here, and it says plainly that agents write the code.
 */
export const BRIEF = [
  {
    label: { de: 'Zuletzt', en: 'Lately', uk: 'Останнім часом', ru: 'Последнее время' },
    value: {
      de: 'Führe KI-Agenten, die den Code schreiben — TypeScript / Node, Unity (C#)',
      en: 'Directing AI agents that write the code — TypeScript / Node, Unity (C#)',
      uk: 'Керую ШІ-агентами, які пишуть код — TypeScript / Node, Unity (C#)',
      ru: 'Руковожу ИИ-агентами, которые пишут код — TypeScript / Node, Unity (C#)',
    },
  },
  {
    label: { de: 'Gesucht', en: 'Looking for', uk: 'Шукаю', ru: 'Ищу' },
    value: {
      de: 'Backend / Fullstack · remote oder hybrid',
      en: 'Backend / fullstack · remote or hybrid',
      uk: 'Backend / Fullstack · віддалено або гібрид',
      ru: 'Backend / Fullstack · удалённо или гибрид',
    },
  },
  {
    label: { de: 'Region', en: 'Region', uk: 'Регіон', ru: 'Регион' },
    value: {
      de: 'Duisburg · Ruhrgebiet / NRW',
      en: 'Duisburg · Ruhr area / NRW',
      uk: 'Дуйсбург · Рурська область / NRW',
      ru: 'Дуйсбург · Рурская область / NRW',
    },
  },
  {
    label: { de: 'Arbeitserlaubnis', en: 'Work permit', uk: 'Дозвіл на роботу', ru: 'Разрешение на работу' },
    value: { de: 'unbeschränkt', en: 'unrestricted', uk: 'без обмежень', ru: 'без ограничений' },
  },
];

/**
 * NBC-106: the logbook — where it started and what it went through, one dated
 * line each. Not a CV: three entries, the year is the whole date, and where it
 * has arrived is the nameplate's "lately" row rather than a fourth line here.
 */
export const LOG = [
  {
    year: '2020',
    text: {
      de: 'Studium Software Engineering, Kyjiw',
      en: 'Studied software engineering in Kyiv',
      uk: 'Інженерія ПЗ, навчання в Києві',
      ru: 'Программная инженерия, учёба в Киеве',
    },
  },
  {
    year: '2022',
    text: {
      de: '.NET-Entwickler: Aufträge, Lager, Rechnungen',
      en: '.NET developer: orders, stock, invoicing',
      uk: '.NET-розробник: замовлення, склад, рахунки',
      ru: '.NET-разработчик: заказы, склад, счета',
    },
  },
  {
    year: '2024',
    text: {
      de: 'Lead Engineer, Team von sechs',
      en: 'Lead engineer, a team of six',
      uk: 'Lead engineer, команда з шести',
      ru: 'Lead engineer, команда из шести',
    },
  },
];

export const SKILL_GROUPS = [
  { label: { de: 'Backend', en: 'Backend', uk: 'Бекенд', ru: 'Бэкенд' }, tech: 'ASP.NET Core · EF Core' },
  { label: { de: 'Frontend', en: 'Frontend', uk: 'Фронтенд', ru: 'Фронтенд' }, tech: 'React · TypeScript' },
  { label: { de: 'Daten', en: 'Data', uk: 'Дані', ru: 'Данные' }, tech: 'MSSQL · MongoDB' },
  { label: { de: 'Architektur', en: 'Architecture', uk: 'Архітектура', ru: 'Архитектура' }, tech: 'N-Tier · DDD · REST' },
];

// ── where the Projekte console's own content went ────────────────────────────
// `PROJECT_PAGES` and `GITHUB_URL` stood here: a constant six pages the counter
// counted to, and one address for the whole archive. Both are gone into
// `projects.js`, which is now the single file to edit when a project appears —
// the counter's length is the archive's own length, and the LINK button goes
// wherever the loaded project goes. See the note at the head of that file.
