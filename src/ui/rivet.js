// One rivet, drawn once, used by every plate in both renderings of the card.
//
// NBC-65: what was here before — in the flat page's CSS, and as a
// radial-gradient in `CornerRivets` — was a *dot*: a disc of brass with a
// darker disc behind it, repeated along every edge of a panel. Repeating it
// was the first mistake and enlarging it would have been the second, because
// the thing that reads as a rivet is not its size. It is that the head is a
// small sphere sitting on a plate, and a sphere needs four separate facts to
// be one:
//
// - **the dome**, lit from up and to the left, the way every lamp in this
//   building is — bright brass at the crown falling to almost black at the
//   lower right edge, and falling *fast*, because a hemisphere turns away from
//   its light much more sharply than a flat disc suggests;
// - **the specular**, a tight bright spot near the crown. This is the single
//   cue that says "curved metal" rather than "printed circle";
// - **the bounce**, a dim warm crescent along the bottom-right edge — light
//   coming back off the plate below it. Without it the dark side of the head
//   merges into its own shadow and the rivet reads as a hole;
// - **the contact shadow**, offset down and to the right, sitting on the plate.
//   That is what puts the head *proud* of the surface instead of flush in it.
//
// An SVG rather than stacked CSS gradients because the flat page wants these
// as one background layer per corner in a stylesheet that has no build step,
// and because the scene's DOM plates want the same head at a different size.
// Both get one string from here.

const TONES = {
  // The bolts on lit plates: cast brass, polished by hands and by weather.
  brass: {
    crown: '%23f4dfaf',
    light: '%23d8ae66',
    mid: '%23a97f39',
    dark: '%23664819',
    edge: '%23201603',
    bounce: '%23c2903f',
  },
  // Structural steel: the beams, and anything that was never meant to be seen.
  iron: {
    crown: '%23bcae94',
    light: '%23877a67',
    mid: '%235a5142',
    dark: '%23342c23',
    edge: '%23110d08',
    bounce: '%2360553f',
  },
};

/**
 * How much of the asset's box the head itself takes up. The rest is the room
 * its shadow needs: a caller placing a rivet by its *head* — which is the only
 * measurement anyone thinks in — sizes the box `size / RIVET_HEAD` and centres
 * it on where the head belongs. `panelWear` paints the corrosion weeping out
 * of these heads and has to agree with that arithmetic exactly.
 */
export const RIVET_HEAD = 22 / 32;

/**
 * The head sits in a 32-unit box with room around it for its own shadow, so a
 * caller only ever has to say how wide the *rivet* is: `background-size: 20px`
 * puts a 13px head on the plate with its shadow already accounted for. There
 * is no size baked into the file — one asset serves the 7px bolts on the
 * scene's deck plates and the 20px ones on the flat page's floor plates.
 *
 * @param {keyof typeof TONES} tone
 * @returns {string} a `data:` URL, already percent-encoded for `url()`
 */
export function rivetURL(tone = 'brass') {
  const t = TONES[tone];
  // A tone that does not exist would otherwise render as a transparent square
  // — a plate with no bolts at all, and nothing in the console to say why.
  if (!t) throw new Error(`rivet: no tone ${tone}`);

  const svg = [
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>`,
    `<defs>`,
    // The shadow the head casts on the plate. Not centred under the head:
    // offset down-right, away from the lamp, which is what makes the offset
    // readable as height rather than as a soft outline.
    `<radialGradient id='s'>`,
    `<stop offset='.45' stop-color='%23000' stop-opacity='.62'/>`,
    `<stop offset='1' stop-color='%23000' stop-opacity='0'/>`,
    `</radialGradient>`,
    // The dome. `fx`/`fy` up and left of centre is the whole lighting model:
    // everything else here follows from where this focus sits.
    `<radialGradient id='d' cx='.5' cy='.5' r='.62' fx='.34' fy='.28'>`,
    `<stop offset='0' stop-color='${t.crown}'/>`,
    `<stop offset='.3' stop-color='${t.light}'/>`,
    `<stop offset='.66' stop-color='${t.mid}'/>`,
    `<stop offset='.88' stop-color='${t.dark}'/>`,
    `<stop offset='1' stop-color='${t.edge}'/>`,
    `</radialGradient>`,
    `<radialGradient id='h'>`,
    `<stop offset='0' stop-color='%23fff8e6' stop-opacity='.75'/>`,
    `<stop offset='1' stop-color='%23fff8e6' stop-opacity='0'/>`,
    `</radialGradient>`,
    `<radialGradient id='b'>`,
    `<stop offset='.55' stop-color='${t.bounce}' stop-opacity='0'/>`,
    `<stop offset='1' stop-color='${t.bounce}' stop-opacity='.5'/>`,
    `</radialGradient>`,
    `</defs>`,
    `<ellipse cx='17.8' cy='18' rx='12.8' ry='12.2' fill='url(%23s)'/>`,
    // The ring where the plate is drawn down around the shank. A rivet is set
    // *into* something; skip this and the head reads as a bead glued on.
    `<circle cx='16' cy='16' r='12.4' fill='%23000' opacity='.28'/>`,
    `<circle cx='16' cy='16' r='11' fill='url(%23d)'/>`,
    `<circle cx='16' cy='16' r='11' fill='url(%23b)'/>`,
    `<circle cx='16' cy='16' r='11' fill='none' stroke='${t.edge}' stroke-opacity='.9' stroke-width='1.2'/>`,
    // The swage mark the rivet set leaves just inside the rim of the head.
    // Small, and the difference between a bolt and a bead of solder.
    `<circle cx='16' cy='16' r='9' fill='none' stroke='${t.crown}' stroke-opacity='.13' stroke-width='.9'/>`,
    `<ellipse cx='12.4' cy='12' rx='3.4' ry='2.3' transform='rotate(-38 12.4 12)' fill='url(%23h)'/>`,
    `</svg>`,
  ].join('');

  // Only the characters `url()` and the data URL grammar actually choke on.
  // Colours arrive pre-encoded above, because `#` is the one that fails
  // silently rather than loudly.
  return `data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E')}`;
}

/**
 * The same thing wrapped for a `background-image` layer. Quoted, because the
 * URL carries commas and an unquoted one would be read as two layers.
 *
 * @param {keyof typeof TONES} tone
 */
export function rivetImage(tone = 'brass') {
  return `url("${rivetURL(tone)}")`;
}
