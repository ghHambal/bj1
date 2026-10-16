alter table public.exam_payments
  add column if not exists approval_token uuid default gen_random_uuid(),
  add column if not exists review_note text;

update public.exam_payments
set approval_token = gen_random_uuid()
where approval_token is null;

alter table public.exam_payments
  alter column approval_token set not null;

create unique index if not exists exam_payments_approval_token_key
  on public.exam_payments (approval_token);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-slips',
  'payment-slips',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_slips_insert_own on storage.objects;
create policy payment_slips_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'payment-slips'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists payment_slips_select_own_or_admin on storage.objects;
create policy payment_slips_select_own_or_admin
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment-slips'
    and (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or (select public.is_exam_admin())
    )
  );
