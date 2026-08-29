import { createContext, useContext } from 'react';

// The seam that gets a ride ticker (see `rideTicker.js`) from the one place
// that owns it (`useLift`, called once in `Dieselpunk`) down to whichever
// components need to read it every animation frame without re-rendering for
// it: a singleton the scene needs everywhere, threaded once.
const RideTickerContext = createContext(null);

export function useRideTicker() {
  return useContext(RideTickerContext);
}

export const RideTickerProvider = RideTickerContext.Provider;
