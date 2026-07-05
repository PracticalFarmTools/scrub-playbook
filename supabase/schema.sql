-- ScrubPlaybook Team Sync — optional, opt-in schema.
-- Run this once in your own Supabase project's SQL editor.
--
-- Security model (read before enabling in production):
-- Access control here is a shared "facility code" (like a Google Doc link),
-- NOT per-user authentication. Anyone with your Supabase URL + anon key +
-- facility code can read/write that facility's cards. This is intentional
-- and appropriate for a small trusted team opting in to share their own
-- personal reference notes — it is NOT designed to hold anything sensitive
-- beyond what already lives in the local-only version of the app (no PHI,
-- ever — see in-app disclaimer). Do not point this at a shared database
-- you don't control.

create table if not exists surgeon_cards (
  id uuid primary key,
  facility_code text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists surgeon_cards_facility_code_idx
  on surgeon_cards (facility_code);

alter table surgeon_cards enable row level security;

-- Anon-key access, scoped only by knowing the facility_code value itself
-- (enforced client-side via .eq('facility_code', code), not by RLS —
-- RLS here just gates "do you have the anon key at all").
drop policy if exists "anon full access" on surgeon_cards;
create policy "anon full access" on surgeon_cards
  for all
  using (true)
  with check (true);

-- Enable Realtime so teammates see updates live without polling.
-- (In the Supabase dashboard: Database -> Replication -> toggle this table on,
-- or run: alter publication supabase_realtime add table surgeon_cards;)
