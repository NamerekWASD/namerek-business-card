import { Component } from 'react';

// The second belt under the gate. `webglAvailable()` catches a machine that
// never had a context to begin with, but a context can also be granted and
// then lost mid-session, or the scene can throw for any other render-time
// reason — a texture that failed to decode, a ref that came back null on a
// GPU that stalls differently than the one this was built on. Before NAM-48
// any of those took the whole page down to white, because nothing above the
// scene ever caught a throw.
//
// A class component because that is still the only way React lets anything
// catch a render error — there is no hook for this.
export default class SceneErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Scene failed after mount; falling back to the flat card.', error, info);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
