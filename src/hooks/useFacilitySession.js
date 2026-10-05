import { useCallback, useEffect, useState } from 'react';
import { isSyncAvailable } from '../lib/supabaseClient';
import {
  client,
  procedureToRow,
  readCache,
  rowToProcedure,
  rowToSurgeon,
  signInWithEmail,
  signOut as apiSignOut,
  writeCache,
} from '../lib/facilityApi';
import { detectConflict, withConfirmation } from '../data/trust';
import { validateProcedure } from '../data/validate';

function activeMembership(rows, userId) {
  const now = Date.now();
  return (rows || []).find(row => {
    if (row.user_id !== userId) return false;
    if (row.facilities?.closed_at) return false;
    if (row.expires_at && new Date(row.expires_at).getTime() < now) return false;
    return true;
  }) || null;
}

export function useFacilitySession() {
  const [status, setStatus] = useState(isSyncAvailable ? 'loading' : 'unconfigured');
  const [view, setView] = useState('personal');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [sessionUser, setSessionUser] = useState(null);
  const [membership, setMembership] = useState(null);
  const [facility, setFacility] = useState(null);
  const [book, setBook] = useState({ version: 1, surgeons: [], procedures: [] });
  const [board, setBoard] = useState([]);
  const [formulary, setFormulary] = useState([]);
  const [conflict, setConflict] = useState(null);

  const applySnapshot = useCallback((snapshot) => {
    setBook({ version: 1, surgeons: snapshot.surgeons || [], procedures: snapshot.procedures || [] });
    setBoard(snapshot.board || []);
    setFormulary(snapshot.formulary || []);
  }, []);

  const refresh = useCallback(async (user, member) => {
    const supabase = await client();
    const fid = member.facility_id;
    if (!navigator.onLine) {
      const cached = readCache(fid);
      if (cached) applySnapshot(cached);
      setStatus(member.facilities?.baa_attested_at ? 'ready' : 'needs-baa');
      return;
    }
    const [surgeonsRes, proceduresRes, boardRes, formularyRes] = await Promise.all([
      supabase.from('surgeons').select('*').eq('facility_id', fid),
      supabase.from('procedures').select('*').eq('facility_id', fid),
      supabase.from('board_items').select('*').eq('facility_id', fid).order('starts_at', { ascending: true }),
      supabase.from('formulary').select('*').eq('facility_id', fid),
    ]);
    if (surgeonsRes.error || proceduresRes.error) {
      setError(surgeonsRes.error?.message || proceduresRes.error?.message);
      const cached = readCache(fid);
      if (cached) applySnapshot(cached);
      return;
    }
    const snapshot = {
      surgeons: (surgeonsRes.data || []).map(rowToSurgeon),
      procedures: (proceduresRes.data || []).map(rowToProcedure),
      board: boardRes.data || [],
      formulary: formularyRes.data || [],
    };
    writeCache(fid, snapshot);
    applySnapshot(snapshot);
    setStatus(member.facilities?.baa_attested_at ? 'ready' : 'needs-baa');
    setSessionUser(user);
  }, [applySnapshot]);

  const loadMembership = useCallback(async (user) => {
    const supabase = await client();
    const { data, error: memberError } = await supabase
      .from('memberships')
      .select('*, facilities(*)')
      .eq('user_id', user.id);
    if (memberError) {
      setError(memberError.message);
      setStatus('signed-out');
      return;
    }
    const member = activeMembership(data, user.id);
    setSessionUser(user);
    if (!member) {
      setMembership(null);
      setFacility(null);
      setStatus('signed-in');
      return;
    }
    setMembership(member);
    setFacility(member.facilities);
    setView('facility');
    await refresh(user, member);
  }, [refresh]);

  useEffect(() => {
    if (!isSyncAvailable) return undefined;
    let ignore = false;
    let subscription;
    (async () => {
      const supabase = await client();
      const { data } = await supabase.auth.getSession();
      if (ignore) return;
      if (data.session?.user) await loadMembership(data.session.user);
      else setStatus('signed-out');
      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        if (next?.user) loadMembership(next.user);
        else {
          setSessionUser(null);
          setMembership(null);
          setStatus('signed-out');
          setView('personal');
        }
      });
      subscription = sub.subscription;
    })();
    return () => {
      ignore = true;
      subscription?.unsubscribe();
    };
  }, [loadMembership]);

  const requireReady = useCallback(() => {
    if (!facility?.baa_attested_at) {
      setError('Cards stay locked until the educator attests that this project is covered by a business associate agreement.');
      return false;
    }
    return true;
  }, [facility]);

  const saveProcedure = useCallback(async (procedure) => {
    if (!requireReady()) return procedure;
    const problems = validateProcedure(procedure);
    if (problems.length) {
      setError(problems[0]);
      return procedure;
    }
    const next = { ...procedure, dirty: true, updatedAt: new Date().toISOString() };
    setBook(prev => ({
      ...prev,
      procedures: prev.procedures.some(p => p.id === next.id)
        ? prev.procedures.map(p => p.id === next.id ? next : p)
        : [next, ...prev.procedures],
    }));
    if (!navigator.onLine) {
      setError('Saved on this device. It will sync when you are back online.');
      return next;
    }
    const supabase = await client();
    const { data: remote } = await supabase.from('procedures').select('updated_at').eq('id', next.id).maybeSingle();
    if (remote && detectConflict(next, remote.updated_at)) {
      setConflict({ local: next, remoteUpdatedAt: remote.updated_at });
      return next;
    }
    const { error: writeError } = await supabase.from('procedures').upsert(procedureToRow(next, facility.id));
    if (writeError) setError(writeError.message);
    else await refresh(sessionUser, membership);
    return next;
  }, [facility, membership, refresh, requireReady, sessionUser]);

  const addSurgeon = useCallback(async (partial) => {
    if (!requireReady()) return null;
    const supabase = await client();
    const { data, error: writeError } = await supabase.from('surgeons').insert({
      facility_id: facility.id,
      name: partial.name.trim(),
      specialty: partial.specialty,
    }).select().single();
    if (writeError) {
      setError(writeError.message);
      return null;
    }
    const surgeon = rowToSurgeon(data);
    setBook(prev => ({ ...prev, surgeons: [surgeon, ...prev.surgeons] }));
    return surgeon;
  }, [facility, requireReady]);

  const confirmProcedure = useCallback(async (id) => {
    const procedure = book.procedures.find(p => p.id === id);
    if (!procedure || !sessionUser) return;
    const name = sessionUser.email?.split('@')[0] || 'Staff';
    const next = withConfirmation(procedure, {
      name,
      userId: sessionUser.id,
      mode: 'facility',
    });
    await saveProcedure({ ...next, dirty: true });
  }, [book.procedures, saveProcedure, sessionUser]);

  const keepLocal = useCallback(async () => {
    if (!conflict) return;
    const forced = { ...conflict.local, baseUpdatedAt: conflict.remoteUpdatedAt, dirty: true };
    setConflict(null);
    const supabase = await client();
    await supabase.from('procedures').upsert(procedureToRow(forced, facility.id));
    await refresh(sessionUser, membership);
  }, [conflict, facility, membership, refresh, sessionUser]);

  const keepRemote = useCallback(async () => {
    setConflict(null);
    await refresh(sessionUser, membership);
  }, [membership, refresh, sessionUser]);

  return {
    configured: isSyncAvailable,
    status,
    view,
    setView,
    emailSent,
    error,
    clearError: () => setError(''),
    sessionUser,
    membership,
    facility,
    book,
    board,
    formulary,
    conflict,
    role: membership?.role || null,
    ready: status === 'ready' && view === 'facility',
    signIn: async (email) => {
      setError('');
      const { error: authError } = await signInWithEmail(email);
      if (authError) setError(authError.message);
      else setEmailSent(true);
    },
    signOut: async () => {
      await apiSignOut();
      setView('personal');
    },
    consumeInvite: async (token) => {
      const supabase = await client();
      const { error: inviteError } = await supabase.rpc('consume_invite', { raw: token.trim() });
      if (inviteError) setError(inviteError.message);
      else if (sessionUser) await loadMembership(sessionUser);
    },
    createFacility: async (name) => {
      const supabase = await client();
      const { error: createError } = await supabase.rpc('create_facility', { facility_name: name });
      if (createError) setError(createError.message);
      else if (sessionUser) await loadMembership(sessionUser);
    },
    attestBaa: async () => {
      const supabase = await client();
      const { error: attestError } = await supabase.rpc('attest_baa', { fid: facility.id });
      if (attestError) setError(attestError.message);
      else if (sessionUser) await loadMembership(sessionUser);
    },
    closeFacility: async () => {
      const supabase = await client();
      const { error: closeError } = await supabase.rpc('close_facility', { fid: facility.id });
      if (closeError) setError(closeError.message);
      else if (sessionUser) await loadMembership(sessionUser);
    },
    createInvite: async (role, memberDays) => {
      const supabase = await client();
      const { data, error: inviteError } = await supabase.rpc('create_invite', {
        fid: facility.id,
        invite_role: role,
        member_days: memberDays,
      });
      if (inviteError) {
        setError(inviteError.message);
        return null;
      }
      return data;
    },
    linkSurgeon: async (surgeonId, userId) => {
      const supabase = await client();
      const { error: linkError } = await supabase.from('surgeon_links').insert({
        facility_id: facility.id,
        surgeon_id: surgeonId,
        user_id: userId,
      });
      if (linkError) setError(linkError.message);
    },
    markMismatch: async (procedureId) => {
      const supabase = await client();
      const { error: mismatchError } = await supabase.rpc('mark_mismatch', { pid: procedureId });
      if (mismatchError) setError(mismatchError.message);
      else await refresh(sessionUser, membership);
    },
    addSurgeon,
    saveProcedure,
    confirmProcedure,
    deleteProcedure: async (id) => {
      if (!requireReady()) return;
      const supabase = await client();
      const { error: deleteError } = await supabase.from('procedures').delete().eq('id', id).eq('facility_id', facility.id);
      if (deleteError) setError(deleteError.message);
      else setBook(prev => ({ ...prev, procedures: prev.procedures.filter(p => p.id !== id) }));
    },
    deleteSurgeon: async (id) => {
      if (!requireReady()) return;
      const supabase = await client();
      const { error: deleteError } = await supabase.from('surgeons').delete().eq('id', id).eq('facility_id', facility.id);
      if (deleteError) setError(deleteError.message);
      else setBook(prev => ({
        ...prev,
        surgeons: prev.surgeons.filter(s => s.id !== id),
        procedures: prev.procedures.filter(p => p.surgeonId !== id),
      }));
    },
    disputeProcedure: async (id) => {
      const procedure = book.procedures.find(p => p.id === id);
      if (!procedure) return;
      await saveProcedure({ ...procedure, disputed: true, dirty: true });
    },
    addBoardItem: async (item) => {
      const supabase = await client();
      const { error: boardError } = await supabase.from('board_items').insert({ ...item, facility_id: facility.id });
      if (boardError) setError(boardError.message);
      else await refresh(sessionUser, membership);
    },
    addFormulary: async (item) => {
      const supabase = await client();
      const { error: formError } = await supabase.from('formulary').insert({ ...item, facility_id: facility.id });
      if (formError) setError(formError.message);
      else await refresh(sessionUser, membership);
    },
    keepLocal,
    keepRemote,
  };
}
