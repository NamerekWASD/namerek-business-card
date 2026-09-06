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

/**
 * @typedef {Partial<Record<'en' | 'uk' | 'ru', string>>} I18nSidecar
 * @typedef {{ src: string, caption?: string, captionI18n?: I18nSidecar }} Shot
 * @typedef {{
 *   id: string, title: string, url?: string | null,
 *   blurb?: string, blurbI18n?: I18nSidecar, stack?: string, shots: Array<string | Shot>,
 * }} Project
 */

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
  }
];

/**
 * @typedef {{
 *   key: string, project: string, title: string, url: string | null,
 *   blurb: string, blurbI18n?: I18nSidecar, stack: string,
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
