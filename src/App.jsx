import { useMemo } from 'react';
import Dieselpunk from './variants/Dieselpunk';
import FlatCard from './flat/FlatCard.jsx';
import SceneErrorBoundary from './scene/SceneErrorBoundary.jsx';
import { webglAvailable } from './scene/renderers/flag.js';
import { chooseView } from './view/choice.js';

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
    }),
    [search],
  );

  if (view === 'flat') return <FlatCard />;
  return (
    <SceneErrorBoundary fallback={<FlatCard />}>
      <Dieselpunk />
    </SceneErrorBoundary>
  );
}

export default App;
