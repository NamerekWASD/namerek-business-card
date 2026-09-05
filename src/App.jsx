import { useMemo } from 'react';
import Dieselpunk from './variants/Dieselpunk';
import FlatCard from './flat/FlatCard.jsx';
import SceneErrorBoundary from './scene/SceneErrorBoundary.jsx';
import { webglAvailable } from './scene/renderers/flag.js';
import { chooseView } from './view/choice.js';
import { LocaleProvider } from './i18n/LocaleContext.jsx';

// Two renderings of one card, and the decision of who gets which.
//
// `?flat` / `?scene` force a path for testing without needing a GPU-less
// machine — and, since NBC-56, they are also how a visitor states a
// preference: arriving with one writes it down, and a later visit with no flag
// honours it. `view/choice.js` holds that rule and the reasoning; what matters
// here is that the capability probe stays a floor under the preference and not
// a default it replaces, so no remembered choice can ever end in
// `WebGLRenderer` throwing in its constructor and taking the whole root down.
//
// The width is the second floor under the same default, and NBC-56's answer:
// under `SCENE_MIN_WIDTH` the scene clips its own card, so the flat one is
// what a phone gets — with the despatch desk's link back up to the scene for
// anyone who came for it.
//
// The error boundary is the second belt: a context that is granted and then
// lost, or any other render-time throw inside the scene, lands on the flat
// card rather than on white.
function App() {
  const search = typeof window === 'undefined' ? '' : window.location.search;
  // Read once, at mount — neither answer changes while the tab is open, and
  // re-probing on every render would mean a fresh throwaway canvas each time.
  const view = useMemo(
    () => chooseView({
      search,
      storage: typeof window === 'undefined' ? null : window.localStorage,
      capable: webglAvailable(),
      width: typeof window === 'undefined' ? null : window.innerWidth,
    }),
    [search],
  );

  // The language sits above the choice of rendering, not inside one: a visitor
  // who picks Ukrainian and then drops from the scene to the flat card — by
  // the corner link, or by the error boundary below catching a lost context —
  // must not be spoken to in a different language on the way down.
  return (
    <LocaleProvider>
      {view === 'flat' ? <FlatCard /> : (
        <SceneErrorBoundary fallback={<FlatCard />}>
          <Dieselpunk />
        </SceneErrorBoundary>
      )}
    </LocaleProvider>
  );
}

export default App;
