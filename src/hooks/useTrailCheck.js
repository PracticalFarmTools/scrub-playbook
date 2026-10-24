import { useEffect, useState } from 'react';
import { checkTrail } from '../data/editTrail';

/** The check of a card's signed records, or null while it runs. */
export function useTrailCheck(procedure) {
  const [state, setState] = useState(/** @type {{ procedure: any, check: import('../data/editTrail').TrailCheck | null }} */ ({ procedure: null, check: null }));
  useEffect(() => {
    let alive = true;
    checkTrail(procedure).then(check => { if (alive) setState({ procedure, check }); });
    return () => { alive = false; };
  }, [procedure]);
  return state.procedure === procedure ? state.check : null;
}
