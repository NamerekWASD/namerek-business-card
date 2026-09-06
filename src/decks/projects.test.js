import { describe, expect, it } from 'vitest';
import { LOCALES } from '../i18n/locale.js';
import { PROJECTS, localized, projectSlides } from './projects.js';

// The archive is hand-edited data, which is the whole point of it — and the
// thing hand-edited data does is arrive slightly wrong. Everything below fails
// *silently* on the wall rather than throwing: a counter one short of the
// pictures, a name plate blank over a photograph, a project that swallowed the
// one after it.

const fixture = [
  {
    id: 'one',
    title: 'Eins',
    url: 'https://example.org',
    blurb: 'Was das erste Ding ist.',
    stack: 'ASP.NET CORE',
    shots: ['/a.jpg'],
  },
  {
    id: 'two',
    title: 'Zwei',
    blurb: 'Was das zweite Ding ist.',
    stack: 'PYTHON',
    shots: ['/b.jpg', { src: '/c.jpg', caption: 'Datenmodell' }, '/d.jpg'],
  },
];

describe('the archive, flattened', () => {
  it('walks pictures rather than projects', () => {
    // Four pictures across two projects. This is the counter's own length, and
    // it is what makes NEXT move it on every press — see `projects.js`.
    expect(projectSlides(fixture)).toHaveLength(4);
  });

  it('carries the project down onto every one of its shots', () => {
    // The name plate stands still while the pictures change under it, which it
    // can only do if the title is on each slide rather than looked up.
    const [, ...rest] = projectSlides(fixture);
    for (const slide of rest.slice(0, 3)) expect(slide.title).toBe('Zwei');
    for (const slide of projectSlides(fixture)) expect(slide.title).toBeTruthy();
  });

  it('carries the wall notice and the crate stencil down with it', () => {
    // The two halves of NBC-22/NBC-28's split: `blurb` is what the works notice
    // on the wall says, `stack` is what is sprayed on the crate under it. Both
    // ride the slide for the same reason `title` does — the surfaces that show
    // them cannot look a project up, they only ever hold a page number.
    const [, second] = projectSlides(fixture);
    expect(second.blurb).toBe('Was das zweite Ding ist.');
    expect(second.stack).toBe('PYTHON');
  });

  it('leaves both blank rather than undefined when a project has neither', () => {
    // A wall that renders `undefined` is worse than a wall with nothing on it.
    const [slide] = projectSlides([{ id: 'bare', title: 'Bloß', shots: ['/a.jpg'] }]);
    expect(slide.blurb).toBe('');
    expect(slide.stack).toBe('');
  });

  it('numbers a shot within its own project, not within the run', () => {
    const slides = projectSlides(fixture);
    // the glass prints `shot / shots`, and it answers "is this the same job?"
    expect(slides.map((s) => `${s.shot}/${s.shots}`))
      .toEqual(['1/1', '1/3', '2/3', '3/3']);
  });

  it('keeps the LINK button honest about which projects have an address', () => {
    const slides = projectSlides(fixture);
    expect(slides[0].url).toBe('https://example.org');
    // absent, not undefined — the button tests it, and `undefined` and `null`
    // read the same there only by luck
    expect(slides[1].url).toBeNull();
  });

  it('drops a project with no picture instead of paging to a blank screen', () => {
    const slides = projectSlides([...fixture, { id: 'three', title: 'Drei', shots: [] }]);
    expect(slides).toHaveLength(4);
    expect(slides.some((s) => s.project === 'three')).toBe(false);
  });

  it('gives every slide a key of its own', () => {
    const keys = projectSlides(fixture).map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('is empty and legal with an empty archive', () => {
    // The state this ships in. The glass shows a test card and every control
    // stays dark; nothing downstream may throw on it.
    expect(projectSlides([])).toEqual([]);
  });
});

// And the real archive, whatever is in it by the time anyone reads this.
describe('the archive itself', () => {
  it('names every project once', () => {
    const ids = PROJECTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every picture somewhere a browser can fetch', () => {
    for (const slide of projectSlides()) {
      expect(slide.src).toMatch(/^(\/|https?:|data:|blob:)/);
    }
  });

  it('gives every project both a wall notice and a crate stencil', () => {
    // The deck's left half is empty without the first and the crate is
    // anonymous freight without the second, and neither failure throws.
    for (const project of PROJECTS) {
      expect(project.blurb, `${project.id} has no blurb`).toBeTruthy();
      expect(project.stack, `${project.id} has no stack`).toBeTruthy();
    }
  });

  it('keeps the wall notice out of the business of naming the project, in every language', () => {
    // The name is already on the console's plate under the glass, and the
    // stencil on the crate says it a second time. A blurb that opens with it
    // says it a third — see NBC-22's collision with NBC-28. Checked across all
    // four locales: NBC-85 gave `blurb` a translation for each, and a name
    // repeated only in the English one would be exactly as silent a bug.
    for (const project of PROJECTS) {
      for (const { id } of LOCALES) {
        expect(localized(project.blurb, project.blurbI18n, id).toLowerCase())
          .not.toContain(project.title.toLowerCase());
      }
    }
  });
});

describe('translated fields (NBC-85)', () => {
  it('leaves German the canonical value untouched, so the canvas texture reads that use it directly do not regress', () => {
    // `NoticeScreen.jsx` and `gallery.js` read `slide.blurb` / `slide.caption`
    // straight, with no `localized()` call — that is NBC-90, not this ticket
    // — so `blurb`/`caption` themselves must keep meaning "German" exactly as
    // they did before this file grew a sidecar.
    expect(localized('German text', undefined, 'de')).toBe('German text');
    expect(localized('German text', { en: 'English text' }, 'de')).toBe('German text');
  });

  it('reads the sidecar for the other three locales, falling back to German for a hole', () => {
    expect(localized('German text', { en: 'English text' }, 'en')).toBe('English text');
    expect(localized('German text', { en: 'English text' }, 'ru')).toBe('German text');
    expect(localized('German text', undefined, 'ru')).toBe('German text');
  });

  it('gives every project a full blurb translation, and every captioned shot a full caption translation', () => {
    const locales = LOCALES.map((l) => l.id).filter((id) => id !== 'de');
    for (const project of PROJECTS) {
      for (const id of locales) {
        expect(project.blurbI18n?.[id], `${project.id}.blurbI18n.${id}`).toBeTruthy();
      }
      for (const shot of project.shots) {
        if (typeof shot === 'string' || !shot.caption) continue;
        for (const id of locales) {
          expect(shot.captionI18n?.[id], `${project.id} shot "${shot.caption}".captionI18n.${id}`).toBeTruthy();
        }
      }
    }
  });

  it('carries the sidecar down onto the slide, the same way blurb and caption already ride it', () => {
    const [slide] = projectSlides(PROJECTS);
    expect(slide.blurbI18n).toBe(PROJECTS[0].blurbI18n);
  });
});
