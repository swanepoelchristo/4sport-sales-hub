-- PR #8: simplify Lead Candidate approval flow.
-- Old flow: needs_check -> checked_once -> checked_twice -> converted
-- New flow: needs_check -> checked_once -> converted
--
-- Do not edit the old applied migration. This migration safely updates the live rule.

-- Convert any old in-progress checked_twice rows back to checked_once.
update public.lead_candidates
set verification_status = 'checked_once',
    check_1_at = coalesce(check_1_at, check_2_at, now()),
    check_1_note = coalesce(check_1_note, 'Previously double-checked; migrated to one-check approval flow.')
where verification_status = 'checked_twice';

-- Drop the old verification_status CHECK constraint, whatever Postgres named it.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.lead_candidates'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%verification_status%'
  loop
    execute format('alter table public.lead_candidates drop constraint if exists %I', constraint_row.conname);
  end loop;
end $$;

-- Add the new allowed status list without checked_twice.
alter table public.lead_candidates
add constraint lead_candidates_verification_status_check
check (
  verification_status in (
    'draft',
    'needs_check',
    'checked_once',
    'approved',
    'rejected',
    'converted'
  )
);

-- Tighten the call-centre review policy so checked_twice is no longer part of the app flow.
drop policy if exists "Call centre agents can review lead candidates" on public.lead_candidates;

create policy "Call centre agents can review lead candidates"
on public.lead_candidates
for update
to authenticated
using (
  public.is_active_call_center_agent()
  and verification_status in ('draft', 'needs_check', 'checked_once')
)
with check (
  public.is_active_call_center_agent()
  and verification_status in ('draft', 'needs_check', 'checked_once', 'rejected')
);
