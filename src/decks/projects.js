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
 * @typedef {{ src: string, caption?: string }} Shot
 * @typedef {{ id: string, title: string, url?: string | null, shots: Array<string | Shot> }} Project
 */

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
    shots: [
      { src: '/projects/game-store/1.png', caption: 'Homepage' },
      { src: '/projects/game-store/2.png', caption: 'Game details' },
      { src: '/projects/game-store/3.png', caption: 'Authorization' },
      { src: '/projects/game-store/4.png', caption: 'Payment' },
      { src: '/projects/game-store/5.png', caption: 'Order confirmation' },
      { src: '/projects/game-store/6.png', caption: 'Game managment page' },
    ],
  },
  {
    id: 'paperless-ocr-cascade',
    title: 'Paperless OCR Cascade',
    url: 'https://github.com/NamerekWASD/PaperSorter',
    shots: [
      { src: '/projects/paperless-ocr-cascade/1.png', caption: 'Paperless webhook config' },
      { src: '/projects/paperless-ocr-cascade/2.png', caption: 'Logs' },
    ],
  }
];

/**
 * @typedef {{
 *   key: string, project: string, title: string, url: string | null,
 *   src: string, caption: string, shot: number, shots: number,
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
      src: shot.src,
      caption: shot.caption ?? '',
      shot: i + 1,
      shots: shots.length,
    }));
  }
  return slides;
}

/** Derived once: the archive does not change while the page is open. */
export const SLIDES = projectSlides();
