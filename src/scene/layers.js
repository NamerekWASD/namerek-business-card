// The order the scene stacks in, which is not a styling detail — it is the
// physical model. Nearer the camera means higher, and every one of these
// numbers used to be a bare literal sitting in a style object several hundred
// lines away from the next one.
//
// That mattered more than it looks. `Grain` was on 2, the same layer as the
// content, and which of the two won was decided purely by their order in the
// tree — so moving a component between files, which is exactly what this
// refactor does, could have silently reordered them. Stated once, it cannot.
//
// The gaps are deliberate: there is room to slip a layer between two of these
// without renumbering the rest.
export const LAYERS = {
  /** the shaft: walls, far end, counterweight, lamps — furthest away */
  shaft: 1,
  /** the film grain, over the shaft but under everything readable */
  grain: 2,
  /** the decks, clipped to the doorway and sitting on the landing */
  content: 3,
  /** the landing doors, in front of the content because they must cover it */
  doorways: 4,
  /** the cage, which rides with us and is therefore nearer than the landing */
  cage: 5,
  /** haze, vignette and door spill — light, not surfaces */
  lighting: 6,
  /** the floor selector, mounted on the cage's rear frame */
  selector: 7,
  /** the debug panel, which is not part of the scene at all */
  debug: 200,
  /** the boot screen, over everything including the debug panel — while it is
      up there is no scene yet to debug */
  boot: 300,
};
