import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient, isSyncAvailable, CARDS_TABLE } from '../lib/supabaseClient';

const SYNC_CODE_KEY = 'scrubplaybook_sync_code';

/**
 * Optional facility-level Team Sync — the fix for the QR/paste-share
 * stopgap not scaling past a couple of people. Entirely inert if Supabase
 * isn't configured (isSyncAvailable === false), so local-only stays the
 * default experience for everyone who hasn't opted in — and the
 * @supabase/supabase-js library itself is only ever downloaded once a
 * facility code is actually active (see getSupabaseClient).
 *
 * `onRemoteCard(surgeonData)` is called whenever a teammate's card arrives
 * (initial pull, or a live realtime insert/update) — the caller merges it
 * into local state using its own last-write-wins logic.
 */
export function useFacilitySync({ onRemoteCard, onRemoteDelete } = {}) {
  const [syncCode, setSyncCode] = useState(() => localStorage.getItem(SYNC_CODE_KEY) || '');
  const [status, setStatus] = useState(syncCode ? 'connecting' : 'off');
  const channelRef = useRef(null);
  const onRemoteCardRef = useRef(onRemoteCard);
  const onRemoteDeleteRef = useRef(onRemoteDelete);
  useEffect(() => {
    onRemoteCardRef.current = onRemoteCard;
    onRemoteDeleteRef.current = onRemoteDelete;
  }, [onRemoteCard, onRemoteDelete]);

  // (Re)subscribe whenever the active facility code changes.
  useEffect(() => {
    if (!isSyncAvailable || !syncCode) return undefined;

    let cancelled = false;
    let channel = null;

    (async () => {
      setStatus('connecting');
      const supabase = await getSupabaseClient();
      if (cancelled) return;

      const { data, error } = await supabase
        .from(CARDS_TABLE)
        .select('*')
        .eq('facility_code', syncCode);

      if (cancelled) return;
      if (error) { setStatus('error'); return; }

      data.forEach(row => onRemoteCardRef.current?.(row.data, row.updated_at));
      setStatus('connected');

      channel = supabase
        .channel(`facility-${syncCode}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: CARDS_TABLE, filter: `facility_code=eq.${syncCode}` },
          (payload) => {
            if (payload.eventType === 'DELETE') {
              onRemoteDeleteRef.current?.(payload.old.id);
            } else {
              onRemoteCardRef.current?.(payload.new.data, payload.new.updated_at);
            }
          }
        )
        .subscribe();
      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        getSupabaseClient().then(supabase => supabase?.removeChannel(channelRef.current));
        channelRef.current = null;
      }
    };
  }, [syncCode]);

  const enableSync = useCallback((code) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    localStorage.setItem(SYNC_CODE_KEY, trimmed);
    setSyncCode(trimmed);
  }, []);

  const disableSync = useCallback(() => {
    localStorage.removeItem(SYNC_CODE_KEY);
    setSyncCode('');
    setStatus('off');
  }, []);

  // Called by the app after a local add/edit — no-ops silently if sync is off.
  const pushCard = useCallback(async (surgeon) => {
    if (!isSyncAvailable || !syncCode) return;
    const supabase = await getSupabaseClient();
    const updated_at = new Date().toISOString();
    await supabase.from(CARDS_TABLE).upsert({
      id: surgeon.id, facility_code: syncCode, data: surgeon, updated_at,
    });
  }, [syncCode]);

  const pushBulk = useCallback(async (surgeonList) => {
    if (!isSyncAvailable || !syncCode || surgeonList.length === 0) return;
    const supabase = await getSupabaseClient();
    const rows = surgeonList.map(s => ({
      id: s.id, facility_code: syncCode, data: s, updated_at: new Date().toISOString(),
    }));
    await supabase.from(CARDS_TABLE).upsert(rows);
  }, [syncCode]);

  const pushDelete = useCallback(async (id) => {
    if (!isSyncAvailable || !syncCode) return;
    const supabase = await getSupabaseClient();
    await supabase.from(CARDS_TABLE).delete().eq('id', id);
  }, [syncCode]);

  return { syncCode, status, enableSync, disableSync, pushCard, pushBulk, pushDelete };
}
