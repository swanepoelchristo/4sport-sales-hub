-- Final production-readiness additions for rep evidence and the signed commission model.

alter table public.signups
  add column if not exists paying_student_count integer not null default 0
  check (paying_student_count >= 0);

create table if not exists public.rep_documents (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.reps(id) on delete cascade,
  document_type text not null check (document_type in ('NDA','Sales Representative Agreement','Addendum','Compliance','Other')),
  file_name text not null,
  file_path text not null unique,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  effective_date date,
  expiry_date date,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.rep_documents enable row level security;

drop policy if exists rep_documents_admin_all on public.rep_documents;
create policy rep_documents_admin_all on public.rep_documents
for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists rep_documents_rep_read_own on public.rep_documents;
create policy rep_documents_rep_read_own on public.rep_documents
for select to authenticated
using (rep_id = public.current_rep_id());

insert into storage.buckets (id, name, public)
values ('rep-documents', 'rep-documents', false)
on conflict (id) do update set public = false;

drop policy if exists rep_documents_storage_admin_all on storage.objects;
create policy rep_documents_storage_admin_all on storage.objects
for all to authenticated
using (bucket_id = 'rep-documents' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'rep-documents' and public.has_role(auth.uid(), 'admin'));

drop policy if exists rep_documents_storage_rep_read_own on storage.objects;
create policy rep_documents_storage_rep_read_own on storage.objects
for select to authenticated
using (
  bucket_id = 'rep-documents'
  and split_part(name, '/', 1) = public.current_rep_id()::text
);

create index if not exists rep_documents_rep_id_created_at_idx
  on public.rep_documents(rep_id, created_at desc);
