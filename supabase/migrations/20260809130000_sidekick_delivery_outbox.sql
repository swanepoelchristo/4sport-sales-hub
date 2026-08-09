-- Reliable, server-only delivery queue from Sales Hub WhatsApp to Christo Sidekick.
create table if not exists public.sidekick_delivery_outbox (
  id uuid primary key default gen_random_uuid(),
  source_event_id text not null unique,
  channel text not null check (channel in ('sales_hub_whatsapp')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'delivering', 'delivered', 'dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sidekick_delivery_outbox_due_idx
  on public.sidekick_delivery_outbox (status, next_attempt_at)
  where status in ('pending', 'delivering');

alter table public.sidekick_delivery_outbox enable row level security;

-- No browser policies are created. The webhook and retry worker use the server-only
-- service role, which bypasses RLS. This queue must never be exposed to anonymous clients.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sidekick-evidence',
  'sidekick-evidence',
  false,
  25000000,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain',
    'audio/mpeg', 'audio/ogg', 'audio/wav',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
