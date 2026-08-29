import Dieselpunk from './variants/Dieselpunk';
import FlatCard from './flat/FlatCard.jsx';

// Two renderings of one card. `?flat` is the switch for now, and only that: the
// capability gate that decides *for* a visitor — no WebGL context, an error
// thrown inside the scene, possibly a phone — is NAM-48 and does not exist yet.
// Until it does, the scene remains what everyone gets.
function App() {
  const flat = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).has('flat');
  return flat ? <FlatCard /> : <Dieselpunk />;
}

export default App;
