import { useMemo } from 'react';
import Dieselpunk from './variants/Dieselpunk';
import FlatCard from './flat/FlatCard.jsx';
import SceneErrorBoundary from './scene/SceneErrorBoundary.jsx';
import { webglAvailable } from './scene/renderers/flag.js';

// Two renderings of one card, and the decision of who gets which.
//
// `?flat` / `?scene` force a path for testing without needing a GPU-less
// machine. Absent an override, the capability probe decides: a browser that
// cannot grant a WebGL context — enterprise GPO, GPU blocklist, an exhausted
// context budget, a phone this project hasn't yet judged (NAM-56) — gets the
// flat card instead of `WebGLRenderer` throwing in its constructor and taking
// the whole root down with it.
//
// The error boundary is the second belt: a context that is granted and then
// lost, or any other render-time throw inside the scene, lands on the flat
// card rather than on white.
function readOverride(search) {
  const params = new URLSearchParams(search);
  if (params.has('flat')) return 'flat';
  if (params.has('scene')) return 'scene';
  return null;
}

function App() {
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const override = readOverride(search);
  // Read once, at mount — the answer does not change while the tab is open,
  // and re-probing on every render would mean a fresh throwaway canvas each
  // time.
  const capable = useMemo(() => webglAvailable(), []);
  const wantsFlat = override === 'flat' || (override !== 'scene' && !capable);

  if (wantsFlat) return <FlatCard />;
  return (
    <SceneErrorBoundary fallback={<FlatCard />}>
      <Dieselpunk />
    </SceneErrorBoundary>
  );
}

export default App;
