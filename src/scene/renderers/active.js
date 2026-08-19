import { useSyncExternalStore } from 'react';
import { R3F } from './flag.js';

// Which backend is drawing *right now*, as opposed to which one was asked for.
//
// These are not the same thing and the difference is the whole point of keeping
// the CSS scene: a WebGL context can be taken away mid-session — a driver reset,
// too many contexts across tabs — and when it is, the frame has to carry on
// rather than go black. So the answer is a small store rather than a constant,
// and it can only ever move one way: from WebGL to CSS, never back. Trying to
// re-acquire a context that was just lost is how a page ends up flickering
// between two renderers.
//
// It is a store rather than a React context because half its readers live under
// a `<Canvas>`, on the other side of a second reconciler, and a deck body reads
// it too. One module, one subscription, no plumbing.

let lost = false;
/** @type {Set<() => void>} */
const listeners = new Set();

/** Called when a canvas reports its context gone. One way only. */
export function markContextLost() {
  if (lost) return;
  lost = true;
  for (const notify of listeners) notify();
}

/** @returns {boolean} */
export const isR3F = () => R3F && !lost;

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Whether the WebGL backend is drawing. Server-side and before hydration the
 * answer is `false` — the CSS scene is the one that needs no context.
 */
export function useIsR3F() {
  return useSyncExternalStore(subscribe, isR3F, () => false);
}
