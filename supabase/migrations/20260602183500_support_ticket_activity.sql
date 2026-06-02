create table if not exists public.support_ticket_activity (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  action_type text not null,
  field_name text,
  old_value text,
  new_value text,
  actor_name text default 'System',
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_activity_ticket_id_created_at_idx
on public.support_ticket_activity(ticket_id, created_at desc);

alter table public.support_ticket_activity enable row level security;

drop policy if exists "Support activity select allowed" on public.support_ticket_activity;
create policy "Support activity select allowed"
on public.support_ticket_activity
for select
using (true);

drop policy if exists "Support activity insert allowed" on public.support_ticket_activity;
create policy "Support activity insert allowed"
on public.support_ticket_activity
for insert
with check (true);
