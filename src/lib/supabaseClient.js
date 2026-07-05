const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Team Sync is entirely optional. With no env vars configured, the app
// stays 100% local-only (the default): this check needs no import of
// @supabase/supabase-js at all, so the ~everyone who hasn't opted in never
// downloads that code — it only loads (below) the moment sync is actually used.
export const isSyncAvailable = Boolean(url && anonKey);

export const CARDS_TABLE = 'surgeon_cards';

let clientPromise = null;

// Lazily imports & builds the Supabase client on first real use, keeping
// @supabase/supabase-js out of the main bundle for local-only users.
export function getSupabaseClient() {
  if (!isSyncAvailable) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(url, anonKey));
  }
  return clientPromise;
}
