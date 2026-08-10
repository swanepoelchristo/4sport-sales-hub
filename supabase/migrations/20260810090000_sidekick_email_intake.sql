-- Extend the existing guarded Sidekick delivery queue for read-only email intake.
alter table public.sidekick_delivery_outbox
  drop constraint if exists sidekick_delivery_outbox_channel_check;

alter table public.sidekick_delivery_outbox
  add constraint sidekick_delivery_outbox_channel_check
  check (channel in ('sales_hub_whatsapp', 'sales_hub_gmail', 'sales_hub_afrihost'));
