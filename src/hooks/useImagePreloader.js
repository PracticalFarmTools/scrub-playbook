/**
 * useImagePreloader — Pre-fetches instrument photos for active trays
 *
 * When a surgeon's active procedure has assigned trays, this hook
 * pre-loads all instrument photos in the background so they display
 * instantly when the count sheet opens.
 *
 * Usage in App.jsx:
 *   useImagePreloader(hospitalTrays);
 */
import { useEffect, useRef } from 'react';
import { getInstrumentPhoto } from '../data/instrumentPhotos';

/**
 * Pre-load all instrument photos for the given trays.
 * Runs once per tray set change. Uses Image() constructor
 * for zero-DOM-footprint background fetching.
 *
 * @param {Array} trays — array of tray objects with .instruments[]
 */
export function useImagePreloader(trays) {
  const loadedRef = useRef(new Set());

  useEffect(() => {
    if (!trays || trays.length === 0) return;

    // Collect all unique instrument names across all active trays
    const names = new Set();
    for (const tray of trays) {
      if (!tray.instruments) continue;
      for (const inst of tray.instruments) {
        if (inst.name && !loadedRef.current.has(inst.name)) {
          names.add(inst.name);
        }
      }
    }

    // Pre-fetch each image in the background
    for (const name of names) {
      const url = getInstrumentPhoto(name);
      if (!url) continue;

      const img = new Image();
      img.src = url;
      loadedRef.current.add(name);
    }
  }, [trays]);
}
