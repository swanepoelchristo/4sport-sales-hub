alter table public.support_tickets
add column if not exists assigned_to_name text default 'Unassigned',
add column if not exists handled_by_name text default 'Unassigned',
add column if not exists last_updated_by_name text default 'System';

update public.support_tickets
set
  assigned_to_name = coalesce(assigned_to_name, 'Unassigned'),
  handled_by_name = coalesce(handled_by_name, 'Unassigned'),
  last_updated_by_name = coalesce(last_updated_by_name, 'System');
