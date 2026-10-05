-- Scrub Playbook facility tenant.
-- Do not use a shared facility code or an anon policy.
-- Apply this in a Supabase project that is covered by a business associate
-- agreement before any real operating-room card is entered.
-- The previous surgeon_cards table and its open "anon full access" policy
-- must not be reused. Drop them if they exist in a project you control.

create extension if not exists pgcrypto;

create table if not exists facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stale_after_days integer not null default 90,
  baa_attested_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  facility_id uuid not null references facilities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('tech', 'circulator', 'spd', 'educator', 'charge', 'surgeon_viewer')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (facility_id, user_id)
);

create table if not exists surgeons (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities (id) on delete cascade,
  name text not null,
  specialty text not null default 'Other',
  created_at timestamptz not null default now()
);

create table if not exists surgeon_links (
  facility_id uuid not null references facilities (id) on delete cascade,
  surgeon_id uuid not null references surgeons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (surgeon_id, user_id)
);

create table if not exists procedures (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities (id) on delete cascade,
  surgeon_id uuid not null references surgeons (id) on delete cascade,
  name text not null,
  body jsonb not null,
  confirmations jsonb not null default '[]'::jsonb,
  last_confirmed_at timestamptz,
  disputed boolean not null default false,
  reported boolean not null default false,
  report_note text,
  official_label text,
  official_reviewed_at timestamptz,
  official_note text,
  updated_at timestamptz not null default now()
);

create table if not exists board_items (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities (id) on delete cascade,
  procedure_id uuid references procedures (id) on delete set null,
  starts_at timestamptz,
  room text,
  surgeon_name text not null,
  procedure_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists formulary (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities (id) on delete cascade,
  vendor_name text not null,
  item_label text not null,
  override_url text,
  created_at timestamptz not null default now(),
  constraint formulary_https check (override_url is null or override_url ~* '^https://')
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities (id) on delete cascade,
  actor_id uuid not null references auth.users (id),
  procedure_id uuid,
  action text not null,
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists invite_tokens (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities (id) on delete cascade,
  token_hash text not null unique,
  role text not null check (role in ('tech', 'circulator', 'spd', 'educator', 'charge', 'surgeon_viewer')),
  member_expires_at timestamptz,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid not null references auth.users (id)
);

create index if not exists procedures_facility_idx on procedures (facility_id);
create index if not exists memberships_user_idx on memberships (user_id);

alter table facilities enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table surgeons enable row level security;
alter table surgeon_links enable row level security;
alter table procedures enable row level security;
alter table board_items enable row level security;
alter table formulary enable row level security;
alter table audit_events enable row level security;
alter table invite_tokens enable row level security;

revoke all on facilities, profiles, memberships, surgeons, surgeon_links, procedures, board_items, formulary, audit_events, invite_tokens from anon;
grant select, insert, update, delete on facilities, profiles, memberships, surgeons, surgeon_links, procedures, board_items, formulary, audit_events to authenticated;

create or replace function is_active_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    join facilities f on f.id = m.facility_id
    where m.facility_id = fid
      and m.user_id = auth.uid()
      and f.closed_at is null
      and (m.expires_at is null or m.expires_at > now())
  );
$$;

create or replace function member_role(fid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from memberships m
  join facilities f on f.id = m.facility_id
  where m.facility_id = fid
    and m.user_id = auth.uid()
    and f.closed_at is null
    and (m.expires_at is null or m.expires_at > now())
  limit 1;
$$;

create or replace function cards_open(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from facilities f
    where f.id = fid
      and f.closed_at is null
      and f.baa_attested_at is not null
      and is_active_member(fid)
  );
$$;

create or replace function reject_sensitive_procedure()
returns trigger
language plpgsql
as $$
begin
  if new.body::text ~* '"(patient|patients|mrn|dob|ssn|dose|doses|lot|serial|photo|photos|price|pricing)"\s*:' then
    raise exception 'procedure body contains a field this app does not store';
  end if;
  if tg_op = 'UPDATE' and member_role(new.facility_id) is distinct from 'educator' then
    new.official_label := old.official_label;
    new.official_reviewed_at := old.official_reviewed_at;
    new.official_note := old.official_note;
  end if;
  if tg_op = 'INSERT' and member_role(new.facility_id) is distinct from 'educator' then
    new.official_label := null;
    new.official_reviewed_at := null;
    new.official_note := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists procedures_guard on procedures;
create trigger procedures_guard
  before insert or update on procedures
  for each row execute function reject_sensitive_procedure();

create or replace function create_facility(facility_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if length(trim(facility_name)) < 2 then
    raise exception 'facility name required';
  end if;
  insert into facilities (id, name) values (fid, trim(facility_name));
  insert into memberships (facility_id, user_id, role) values (fid, auth.uid(), 'educator');
  return fid;
end;
$$;

create or replace function attest_baa(fid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if member_role(fid) is distinct from 'educator' then
    raise exception 'educator required';
  end if;
  update facilities set baa_attested_at = coalesce(baa_attested_at, now()) where id = fid;
end;
$$;

create or replace function close_facility(fid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if member_role(fid) is distinct from 'educator' then
    raise exception 'educator required';
  end if;
  update facilities set closed_at = now() where id = fid;
end;
$$;

create or replace function create_invite(fid uuid, invite_role text, member_days integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  raw text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if member_role(fid) is distinct from 'educator' then
    raise exception 'educator required';
  end if;
  if invite_role not in ('tech', 'circulator', 'spd', 'educator', 'charge', 'surgeon_viewer') then
    raise exception 'unknown role';
  end if;
  raw := '';
  for i in 1..8 loop
    raw := raw || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
  end loop;
  insert into invite_tokens (facility_id, token_hash, role, member_expires_at, expires_at, created_by)
  values (
    fid,
    encode(digest(raw, 'sha256'), 'hex'),
    invite_role,
    case when member_days is null then null else now() + make_interval(days => member_days) end,
    now() + interval '7 days',
    auth.uid()
  );
  return raw;
end;
$$;

create or replace function consume_invite(raw text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  row invite_tokens%rowtype;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  select * into row
  from invite_tokens
  where token_hash = encode(digest(trim(raw), 'sha256'), 'hex')
    and used_at is null
    and expires_at > now();
  if row.id is null then
    raise exception 'invite not valid';
  end if;
  insert into memberships (facility_id, user_id, role, expires_at)
  values (row.facility_id, auth.uid(), row.role, row.member_expires_at)
  on conflict (facility_id, user_id) do update
    set role = excluded.role,
        expires_at = excluded.expires_at;
  update invite_tokens set used_at = now() where id = row.id;
  return row.facility_id;
end;
$$;

create or replace function mark_mismatch(pid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  proc procedures%rowtype;
begin
  select * into proc from procedures where id = pid;
  if proc.id is null then
    raise exception 'not found';
  end if;
  if member_role(proc.facility_id) is distinct from 'surgeon_viewer' then
    raise exception 'surgeon view required';
  end if;
  if not exists (
    select 1 from surgeon_links
    where surgeon_id = proc.surgeon_id and user_id = auth.uid()
  ) then
    raise exception 'not your card';
  end if;
  update procedures
    set confirmations = '[]'::jsonb,
        last_confirmed_at = null,
        disputed = false
    where id = pid;
end;
$$;

grant execute on function create_facility(text) to authenticated;
grant execute on function attest_baa(uuid) to authenticated;
grant execute on function close_facility(uuid) to authenticated;
grant execute on function create_invite(uuid, text, integer) to authenticated;
grant execute on function consume_invite(text) to authenticated;
grant execute on function mark_mismatch(uuid) to authenticated;

-- Profiles
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Facilities: members can read; only the creating educator path inserts via RPC.
create policy facilities_read on facilities
  for select using (is_active_member(id) or created_at is not null and exists (
    select 1 from memberships m where m.facility_id = facilities.id and m.user_id = auth.uid()
  ));

-- Memberships
create policy memberships_read on memberships
  for select using (is_active_member(facility_id) or user_id = auth.uid());

-- Surgeons and procedures require an open, attested facility for card rows.
create policy surgeons_read on surgeons
  for select using (is_active_member(facility_id) and (
    member_role(facility_id) is distinct from 'surgeon_viewer'
    or exists (select 1 from surgeon_links l where l.surgeon_id = surgeons.id and l.user_id = auth.uid())
  ));

create policy surgeons_write on surgeons
  for all using (
    cards_open(facility_id)
    and member_role(facility_id) in ('tech', 'circulator', 'spd', 'educator')
  ) with check (
    cards_open(facility_id)
    and member_role(facility_id) in ('tech', 'circulator', 'spd', 'educator')
  );

create policy procedures_read on procedures
  for select using (is_active_member(facility_id) and (
    member_role(facility_id) is distinct from 'surgeon_viewer'
    or exists (select 1 from surgeon_links l where l.surgeon_id = procedures.surgeon_id and l.user_id = auth.uid())
  ));

create policy procedures_write on procedures
  for all using (
    cards_open(facility_id)
    and member_role(facility_id) in ('tech', 'circulator', 'spd', 'educator')
  ) with check (
    cards_open(facility_id)
    and member_role(facility_id) in ('tech', 'circulator', 'spd', 'educator')
  );

create policy links_read on surgeon_links
  for select using (is_active_member(facility_id));

create policy links_write on surgeon_links
  for all using (cards_open(facility_id) and member_role(facility_id) = 'educator')
  with check (cards_open(facility_id) and member_role(facility_id) = 'educator');

create policy board_read on board_items
  for select using (is_active_member(facility_id));

create policy board_write on board_items
  for all using (cards_open(facility_id) and member_role(facility_id) in ('charge', 'educator'))
  with check (cards_open(facility_id) and member_role(facility_id) in ('charge', 'educator'));

create policy formulary_read on formulary
  for select using (is_active_member(facility_id));

create policy formulary_write on formulary
  for all using (cards_open(facility_id) and member_role(facility_id) = 'educator')
  with check (cards_open(facility_id) and member_role(facility_id) = 'educator');

create policy audit_read on audit_events
  for select using (is_active_member(facility_id));

create policy audit_insert on audit_events
  for insert with check (cards_open(facility_id) and actor_id = auth.uid());

-- Invite rows are only touched by security-definer functions.
revoke all on invite_tokens from authenticated;
