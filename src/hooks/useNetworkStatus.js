import { useState, useEffect } from 'react';

/**
 * Hook that tracks online/offline status.
 * Returns { isOnline, wasEverOffline }
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasEverOffline, setWasEverOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => {
      setIsOnline(false);
      setWasEverOffline(true);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return { isOnline, wasEverOffline };
}
