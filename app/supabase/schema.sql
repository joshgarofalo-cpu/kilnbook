-- Kilnbook database, phase 1 (inventory and pickups).
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- Every table has a studio_id so one database can serve many studios later.
-- Row-level security (RLS) makes sure people only ever see their own studio's rows,
-- even though the app talks to the database directly from the phone.

-- ---------- studios and who belongs to them ----------

create table studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table studio_members (
  studio_id uuid not null references studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (studio_id, user_id)
);

-- "Is the signed-in person a member of this studio?" Used by every security rule below.
-- security definer lets it read studio_members without tripping that table's own rule.
create function is_studio_member(p_studio_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from studio_members
    where studio_id = p_studio_id and user_id = auth.uid()
  );
$$;

-- ---------- bisque inventory ----------

create table items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,                -- "Coffee mug"
  singular_label text not null,      -- "mug"
  plural_label text not null,        -- "mugs"
  cost numeric(10,2) not null default 0,   -- what the studio pays per piece
  price numeric(10,2) not null default 0,  -- what the customer pays
  qty integer not null default 0 check (qty >= 0),
  reorder_point integer not null default 0,
  case_size integer not null default 6,    -- reorders round up to this
  supplier text,
  created_at timestamptz not null default now()
);
create index on items (studio_id);

-- ---------- pickup tickets ----------

create table tickets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  customer_name text not null,
  phone text,
  note text,                         -- "Birthday party"
  shelf text,                        -- "B3"
  status text not null default 'painted'
    check (status in ('painted', 'kiln', 'ready', 'picked_up')),
  painted_at timestamptz not null default now(),
  kiln_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  last_reminder_at timestamptz,
  created_at timestamptz not null default now()
);
create index on tickets (studio_id, status);

create table ticket_lines (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  item_id uuid not null references items(id),
  qty integer not null default 1 check (qty > 0)
);
create index on ticket_lines (ticket_id);

-- Log of every text message sent (ready for pickup, 30-day reminders).
create table texts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  ticket_id uuid references tickets(id) on delete set null,
  type text not null check (type in ('ready', 'reminder')),
  body text not null,
  sent_at timestamptz not null default now(),
  delivery_status text
);
create index on texts (ticket_id);

-- ---------- security rules ----------

-- Let signed-in users reach these tables at all (the policies below then narrow it to their studio).
-- Signed-out visitors ("anon") get nothing.
grant select on studios, studio_members, texts to authenticated;
grant select, insert, update, delete on items, tickets, ticket_lines to authenticated;

alter table studios enable row level security;
alter table studio_members enable row level security;
alter table items enable row level security;
alter table tickets enable row level security;
alter table ticket_lines enable row level security;
alter table texts enable row level security;

create policy "members see their studio" on studios
  for select using (is_studio_member(id));

create policy "members see their studio's members" on studio_members
  for select using (is_studio_member(studio_id));

create policy "members manage items" on items
  for all using (is_studio_member(studio_id)) with check (is_studio_member(studio_id));

create policy "members manage tickets" on tickets
  for all using (is_studio_member(studio_id)) with check (is_studio_member(studio_id));

create policy "members manage ticket lines" on ticket_lines
  for all using (is_studio_member(studio_id)) with check (is_studio_member(studio_id));

create policy "members see texts" on texts
  for select using (is_studio_member(studio_id));
-- Texts are written by the server (SMS step, later), not by the phone app.

-- ---------- inventory logic ----------

-- The + / − buttons. Adds delta in one step so two phones can't overwrite each other.
-- Never goes below zero. Returns the new count.
create function adjust_item_qty(p_item_id uuid, p_delta integer) returns integer
language plpgsql security invoker set search_path = public as $$
declare new_qty integer;
begin
  update items set qty = greatest(qty + p_delta, 0)
  where id = p_item_id
  returning qty into new_qty;
  if new_qty is null then raise exception 'Item not found'; end if;
  return new_qty;
end;
$$;

-- When a painter checks in (a piece is added to a ticket), take it out of inventory.
-- If a line is removed (a mistake fixed), put it back.
create function sync_inventory_from_ticket_lines() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update items set qty = qty + old.qty where id = old.item_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update items set qty = greatest(qty - new.qty, 0) where id = new.item_id;
  end if;
  return null;
end;
$$;

create trigger ticket_lines_inventory
after insert or update or delete on ticket_lines
for each row execute function sync_inventory_from_ticket_lines();

-- Only signed-in users can call the functions.
revoke execute on function is_studio_member(uuid), adjust_item_qty(uuid, integer) from public, anon;
grant execute on function is_studio_member(uuid), adjust_item_qty(uuid, integer) to authenticated;
