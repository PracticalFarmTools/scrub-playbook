const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Facility mode is optional. With no env vars the app stays personal and
// local. The client loads only when someone opens a configured facility.
export const isSyncAvailable = Boolean(url && anonKey);

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
