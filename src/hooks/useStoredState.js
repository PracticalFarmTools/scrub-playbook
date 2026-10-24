import { useCallback, useEffect, useState } from 'react';

/**
 * State kept in localStorage and shared by every tab of the app on this phone.
 * `update(change)` applies `change` to the value as stored right now, not to this tab's copy,
 * so one tab never writes over what another tab saved. Other tabs' writes arrive through the
 * storage event. `load` and `save` must be stable functions; `save` returns false when the phone
 * refused the write, and `update` passes that on so callers can say what was not kept.
 */
export function useStoredState(key, load, save) {
  const [value, setValue] = useState(load);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === key || event.key === null) setValue(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, load]);

  const update = useCallback((change) => {
    const next = change(load());
    const saved = save(next) !== false;
    setValue(next);
    return saved;
  }, [load, save]);

  return [value, update];
}
