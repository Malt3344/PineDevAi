"use client";

import { useEffect, useRef, useState } from "react";

/**
 * State that survives a reload, for layout preferences like panel widths
 * and whether a panel is collapsed.
 *
 * The stored value is read in an effect rather than during render: the
 * server has no localStorage, so reading it while rendering would produce
 * markup that disagrees with the server's and React would discard it.
 * Every access is guarded — Safari in private mode and browsers with site
 * data blocked throw on access rather than returning null, and a layout
 * preference is never worth breaking a page over.
 */
export function usePersistedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Unavailable storage: keep the fallback.
    }
    loaded.current = true;
  }, [key]);

  // Written from an effect, not from inside the state updater: React may
  // call an updater more than once for a single update, and it is meant to
  // be pure. The guard keeps the fallback from overwriting a real stored
  // preference before the read above has happened.
  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Unavailable storage: the preference just does not persist.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
