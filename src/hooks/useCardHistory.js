import { useCallback, useEffect, useState } from 'react';
import { loadHistory, onHistoryChange } from '../data/history';

/**
 * The card history on this phone, kept current as this tab saves and when the app comes back
 * into view, since another tab may have saved meanwhile. Null until it has been read.
 */
export function useCardHistory() {
  const [history, setHistory] = useState(/** @type {import('../data/history').History | null} */ (null));

  const refresh = useCallback(() => {
    let alive = true;
    loadHistory().then(next => { if (alive) setHistory(next); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const stop = refresh();
    const off = onHistoryChange(setHistory);
    const onShow = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onShow);
    return () => {
      stop();
      off();
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [refresh]);

  return { history, refresh };
}
