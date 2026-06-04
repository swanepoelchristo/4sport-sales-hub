alter table public.support_tickets
add column if not exists queue_type text default 'Support';

update public.support_tickets
set queue_type = coalesce(queue_type, 'Support');

create index if not exists support_tickets_queue_type_idx
on public.support_tickets(queue_type);
