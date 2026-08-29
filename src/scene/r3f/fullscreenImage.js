import { createContext, useContext } from 'react';

// `LandingScreen` and `ProjectSlide` render inside the R3F `<Canvas>` tree,
// but the modal they open is a plain DOM overlay — see `FullscreenImageModal`
// — and a DOM element mounted from inside that tree isn't rendered by
// react-dom at all: it hits the three.js reconciler's own `createInstance`,
// which only knows THREE classes and throws ("Button is not part of the THREE
// namespace"). `ReactDOM.createPortal` doesn't route around this either — a
// portal still runs through whichever reconciler owns the component that
// called it, not the reconciler that owns its target container.
//
// So the setter lives here instead, provided once above the Canvas in
// `Dieselpunk`, and read down through R3F's context bridge (the same way
// `RideTickerContext` reaches `useRideMotion`). The modal itself renders as a
// DOM sibling of the Canvas, never as its descendant.
//
// ── the page travels the same road ──────────────────────────────────────────
// The modal's own PREV/NEXT page the console's counter, not a copy of it — the
// glass, the frame's counter plate and the modal all have to agree on which
// shot is loaded, and three owners for one number is exactly the bug
// `ScreenFrame`'s own doc warns against. So `page` (and `step` to move it) live
// here too, owned by `Dieselpunk`, the one component both sides of the Canvas
// boundary can reach. Closing the modal leaves `page` wherever it was left —
// that is the whole of "the screen shows the last photo you looked at".
const FullscreenImageContext = createContext(null);

export function useFullscreenGallery() {
  return useContext(FullscreenImageContext);
}

export const FullscreenImageProvider = FullscreenImageContext.Provider;
