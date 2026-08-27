import { describe, expect, it } from 'vitest';
import { PROJECTS, projectSlides } from './projects.js';

// The archive is hand-edited data, which is the whole point of it — and the
// thing hand-edited data does is arrive slightly wrong. Everything below fails
// *silently* on the wall rather than throwing: a counter one short of the
// pictures, a name plate blank over a photograph, a project that swallowed the
// one after it.

const fixture = [
  { id: 'one', title: 'Eins', url: 'https://example.org', shots: ['/a.jpg'] },
  {
    id: 'two',
    title: 'Zwei',
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
});
