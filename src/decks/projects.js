import { t } from '../i18n/strings.js';

// ── the project archive ──────────────────────────────────────────────────────
// Everything the Projekte console shows, as plain data. It is the one file to
// edit when a project appears:
//
//   1. drop the pictures into `public/projects/` — a file there is served at
//      `/projects/<name>`, needs no import and stays out of the bundle;
//   2. add an entry below.
//
// ```js
// {
//   id: 'medienarchiv',
//   title: 'Medienarchiv',
//   url: 'https://example.org',        // optional — the LINK button's address
//   blurb: 'Was es ist, in einem Satz.',
//   stack: 'ASP.NET CORE · REACT',
//   shots: [
//     '/projects/medienarchiv-1.jpg',
//     { src: '/projects/medienarchiv-2.jpg', caption: 'Datenmodell' },
//   ],
// }
// ```
//
// A shot is a bare URL when there is nothing to say about it and an object when
// there is. `src` is only ever a URL, so `import shot from '...'` works too —
// the folder is simply the path of least resistance.
//
// ── one fact, one surface ───────────────────────────────────────────────────
// `blurb` and `stack` look like two ways of saying the same thing and are not:
// they are the two halves of a split that NBC-22 and NBC-28 were about to make
// into a collision. The room shows one project on three surfaces at once, and
// the rule that keeps it from stuttering is that each surface answers one
// question and no question is answered twice:
//
//   the glass       — what it looks like            the picture and its caption
//   the console     — which job this picture is     `title`, on its own plate
//   the wall        — what it is and why            `blurb`, as selectable text
//   the crate       — what was shipped              `stack`, sprayed on plywood
//
// So `blurb` is prose and must not open with the project's name — the plate
// under the glass already said it, and the stencil on the crate says it again.
// `stack` is a stencil and must stay short enough to spray through a card:
// three words, upper case, separated by middots. `projects.test.js` holds both
// of those to it.
//
// ── why the console pages shots and not projects ─────────────────────────────
// One project is often several pictures, and a counter that sits on "02 / 05"
// through three presses of NEXT is a counter that looks stuck. So PREV and NEXT
// walk a flat list of *shots* — every press moves the counter — and the thing
// that stops three pictures of one job reading as three different jobs is that
// the project's name is on its own plate on the console, standing still while
// the pictures change under it. That plate is why `title` is carried down onto
// every slide rather than looked up by the frame: see `ScreenFrame.jsx`.
//
// The shot's own place in its project (`shot` of `shots`) is printed on the
// glass, under the picture, where it answers the same question a second time
// for anyone who reads captions rather than plates.

// ── when it shipped ─────────────────────────────────────────────────────────
// The despatch label on the crate always said "a name, what it runs on, who
// shipped it and when" and printed only the first three. `release` is the
// fourth, and its place is reserved: a project with no date is stamped as
// open rather than left blank, so every crate and every batten has one shape.
//
//   release: { shipped: '2023' }       already out — a year, or 'YYYY-MM'
//   release: { due: '2026-10' }        planned — prefer a month to a day, so a
//                                      slip of a few days does not make it lie
//   (no release)                       open
//
// The crate is a prop and stays German (`releaseStamp(r, 'de')`); the flat
// card's batten is read as content and follows the visitor's locale.

/**
 * @typedef {Partial<Record<'en' | 'uk' | 'ru', string>>} I18nSidecar
 * @typedef {{ src: string, caption?: string, captionI18n?: I18nSidecar }} Shot
 * @typedef {{ shipped?: string, due?: string }} Release
 * @typedef {{
 *   id: string, title: string, url?: string | null,
 *   blurb?: string, blurbI18n?: I18nSidecar, stack?: string, release?: Release,
 *   shots: Array<string | Shot>,
 * }} Project
 */

/** 'YYYY' stays as it is; 'YYYY-MM' prints as 'MM/YYYY'. */
function stampDate(value) {
  const [year, month] = value.split('-');
  return month ? `${month}/${year}` : year;
}

/**
 * @param {Release | undefined} release
 * @param {import('../i18n/locale.js').LocaleId} locale
 * @returns {string}
 */
export function releaseStamp(release, locale) {
  if (release?.shipped) return t('archive.release.shipped', locale, { date: stampDate(release.shipped) });
  if (release?.due) return t('archive.release.due', locale, { date: stampDate(release.due) });
  return t('archive.release.open', locale);
}

// ── NBC-85: `blurb`/`caption` stay German, translations ride beside them ────
// `blurb` and `caption` are also read by canvas texture code — the wall
// notice (`NoticeScreen.jsx`) and the picture-tube glass (`gallery.js`) —
// that NBC-90 has not yet taught to redraw itself per locale. So neither
// field changed shape: `blurb`/`caption` still mean "the German text",
// exactly as they did before this ticket, and a translation for the other
// three languages sits in a sibling field, `blurbI18n`/`captionI18n`, that
// only the DOM side (`FloorProjekte.jsx`, `FullscreenImageModal.jsx`) reads.
// When NBC-90 lands, the canvas side switches to the same `localized()` below
// rather than getting a second copy of these strings.
//
// @param {string} base @param {I18nSidecar | undefined} i18n
// @param {import('../i18n/locale.js').LocaleId} locale @returns {string}
export function localized(base, i18n, locale) {
  if (locale === 'de') return base;
  return i18n?.[locale] ?? base;
}

/**
 * The archive itself. Empty is a legitimate state and a painted one: the glass
 * shows a test card and every control on the console stays dark, which is what
 * a machine with nothing loaded honestly looks like. See `paintStandby`.
 *
 * @type {Project[]}
 */
export const PROJECTS = [
  {
    id: 'even-keel',
    title: 'Even Keel',
    url: 'https://github.com/NamerekT/even-keel',
    blurb: 'Ein Staffellauf für KI-Agenten: der Backlog läuft Aufgabe für Aufgabe nach Abhängigkeiten, '
      + 'jede in eigener Claude-Code-Sitzung — in drei Wochen schloss die Kette 421 von 428 Aufgaben.',
    blurbI18n: {
      en: 'A relay race for AI coding agents: the backlog runs one task at a time in dependency order, '
        + 'each in its own Claude Code session — in three weeks the chain closed 421 of 428 tasks.',
      uk: 'Естафета для ШІ-агентів: беклог іде по одній задачі в порядку залежностей, '
        + 'кожна — у власній сесії Claude Code; за три тижні ланцюжок закрив 421 із 428 задач.',
      ru: 'Эстафета для ИИ-агентов: бэклог идёт по одной задаче в порядке зависимостей, '
        + 'каждая — в своей сессии Claude Code; за три недели цепочка закрыла 421 из 428 задач.',
    },
    stack: 'TYPESCRIPT · NODE · REACT',
    release: { shipped: '2026-10' },
    shots: [
      {
        src: '/projects/even-keel/chain.png', caption: 'Die Kette eines Projekts',
        captionI18n: { en: "A project's chain", uk: 'Ланцюжок проєкту', ru: 'Цепочка проекта' },
      },
      {
        src: '/projects/even-keel/question.png', caption: 'Rückfrage des Agenten im Chat',
        captionI18n: { en: 'The agent asks a question in chat', uk: 'Питання агента в чаті', ru: 'Вопрос агента в чате' },
      },
      {
        src: '/projects/even-keel/limit.png', caption: 'Warten aufs Limit, Cache warm',
        captionI18n: { en: 'Waiting out a limit, cache warm', uk: 'Чекає ліміт, кеш теплий', ru: 'Ждёт лимит, кэш тёплый' },
      },
      {
        src: '/projects/even-keel/stats.png', caption: 'Statistikseite',
        captionI18n: { en: 'Stats page', uk: 'Сторінка статистики', ru: 'Страница статистики' },
      },
    ],
  },
  {
    id: 'paperless-ocr-cascade',
    title: 'Paperless OCR Cascade',
    url: 'https://github.com/NamerekWASD/PaperSorter',
    blurb: 'Ein Fließband für Papier: jeder Scan läuft durch eine Texterkennung '
      + 'in Stufen, wird eingeordnet, auf Fristen gelesen und beschriftet abgelegt.',
    blurbI18n: {
      en: 'A conveyor belt for paper: every scan runs through OCR in stages, gets '
        + 'classified, checked against deadlines and filed under a label.',
      uk: 'Конвеєр для паперу: кожен скан поетапно проходить розпізнавання тексту, '
        + 'класифікується, перевіряється на дедлайни та підписаний архівується.',
      ru: 'Конвейер для бумаги: каждый скан поэтапно проходит распознавание текста, '
        + 'классифицируется, проверяется на сроки и архивируется с подписью.',
    },
    stack: 'PYTHON · FASTAPI · DOCKER',
    release: { shipped: '2026-08' },
    shots: [
      {
        src: '/projects/paperless-ocr-cascade/1.png', caption: 'Paperless webhook config',
        captionI18n: { en: 'Paperless webhook config', uk: 'Налаштування webhook Paperless', ru: 'Настройка webhook Paperless' },
      },
      {
        src: '/projects/paperless-ocr-cascade/2.png', caption: 'Logs',
        captionI18n: { en: 'Logs', uk: 'Логи', ru: 'Логи' },
      },
    ],
  },
  {
    id: 'coldbloom',
    title: 'Coldbloom',
    url: null,
    blurb: 'Eine Sonde auf einem toten Planeten baut Kopien von sich selbst, und aus einer wird '
      + 'ein Schwarm. Aufbaustrategie ohne Wellen und Quests: wohin er wächst, entscheidet der Spieler.',
    blurbI18n: {
      en: 'A lone probe on a dead planet builds copies of itself, and one becomes a swarm. '
        + 'An automation strategy game with no waves and no quests: where it grows is up to the player.',
      uk: 'Самотній зонд на мертвій планеті будує власні копії — і з одного виростає рій. '
        + 'Стратегія автоматизації без хвиль і квестів: куди рости, вирішує гравець.',
      ru: 'Одинокий зонд на мёртвой планете строит копии самого себя — и из одного вырастает рой. '
        + 'Стратегия автоматизации без волн и квестов: куда расти, решает игрок.',
    },
    stack: 'UNITY · DOTS · C#',
    shots: [
      {
        src: '/projects/coming-soon.png', caption: 'Screenshots folgen',
        captionI18n: { en: 'Screenshots coming soon', uk: 'Скриншоти згодом', ru: 'Скриншоты скоро' },
      },
    ],
  },
  {
    id: 'game-store',
    title: 'Game Store',
    url: 'https://github.com/NamerekWASD/GameStore',
    blurb: 'Ein Laden für Spiele: Katalog, Warenkorb, echte Bezahlung — und ein '
      + 'Pult im Rücken, an dem der Betreiber seine Titel selbst pflegt.',
    blurbI18n: {
      en: 'A store for games: catalogue, cart, real payment — and a back office '
        + 'where the owner maintains their own titles.',
      uk: 'Магазин ігор: каталог, кошик, справжня оплата — і панель адміністратора, '
        + 'де власник сам веде свої тайтли.',
      ru: 'Магазин игр: каталог, корзина, настоящая оплата — и панель администратора, '
        + 'где владелец сам ведёт свои тайтлы.',
    },
    stack: 'ASP.NET CORE · REACT',
    release: { shipped: '2023' },
    shots: [
      {
        src: '/projects/game-store/1.png', caption: 'Homepage',
        captionI18n: { en: 'Homepage', uk: 'Головна сторінка', ru: 'Главная страница' },
      },
      {
        src: '/projects/game-store/2.png', caption: 'Game details',
        captionI18n: { en: 'Game details', uk: 'Деталі гри', ru: 'Детали игры' },
      },
      {
        src: '/projects/game-store/3.png', caption: 'Authorization',
        captionI18n: { en: 'Authorization', uk: 'Авторизація', ru: 'Авторизация' },
      },
      {
        src: '/projects/game-store/4.png', caption: 'Payment',
        captionI18n: { en: 'Payment', uk: 'Оплата', ru: 'Оплата' },
      },
      {
        src: '/projects/game-store/5.png', caption: 'Order confirmation',
        captionI18n: { en: 'Order confirmation', uk: 'Підтвердження замовлення', ru: 'Подтверждение заказа' },
      },
      {
        src: '/projects/game-store/6.png', caption: 'Game managment page',
        captionI18n: { en: 'Game management page', uk: 'Сторінка керування іграми', ru: 'Страница управления играми' },
      },
    ],
  },
];

/**
 * @typedef {{
 *   key: string, project: string, title: string, url: string | null,
 *   blurb: string, blurbI18n?: I18nSidecar, stack: string, release: Release,
 *   src: string, caption: string, captionI18n?: I18nSidecar, shot: number, shots: number,
 * }} Slide
 */

/**
 * The flat run of pictures the console walks, in the order the archive lists
 * them. A project with no pictures is not a slide — there would be nothing to
 * put on the glass — and it is dropped here rather than guarded against three
 * components downstream.
 *
 * @param {Project[]} [projects]
 * @returns {Slide[]}
 */
export function projectSlides(projects = PROJECTS) {
  /** @type {Slide[]} */
  const slides = [];
  for (const project of projects) {
    const shots = (project.shots ?? [])
      .map((s) => (typeof s === 'string' ? { src: s } : s))
      .filter((s) => s && s.src);
    shots.forEach((shot, i) => slides.push({
      key: `${project.id}:${i}`,
      project: project.id,
      title: project.title,
      url: project.url ?? null,
      blurb: project.blurb ?? '',
      blurbI18n: project.blurbI18n,
      stack: project.stack ?? '',
      release: project.release ?? {},
      src: shot.src,
      caption: shot.caption ?? '',
      captionI18n: shot.captionI18n,
      shot: i + 1,
      shots: shots.length,
    }));
  }
  return slides;
}

/** Derived once: the archive does not change while the page is open. */
export const SLIDES = projectSlides();
