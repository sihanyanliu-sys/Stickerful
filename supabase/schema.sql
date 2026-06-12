-- Stickerful cloud records setup
-- Run this in Supabase SQL Editor after signing in to the Stickerful project.

create table if not exists public.records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,

  shop_id text,
  shop_name text not null,
  city text,
  visit_date date,
  rating integer not null default 0 check (rating >= 0 and rating <= 5),
  note text,
  emoji text,

  photo_path text,
  cutout_path text,
  cutout_provider text,

  provider text,
  poi_id text,
  place_id text,
  adcode text,
  coord_type text,
  lat double precision,
  lng double precision,

  dish_name text,
  calories numeric not null default 0,
  carbs numeric not null default 0,
  protein numeric not null default 0,
  fat numeric not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, id)
);

create index if not exists records_user_visit_date_idx
  on public.records (user_id, visit_date desc, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists records_set_updated_at on public.records;
create trigger records_set_updated_at
before update on public.records
for each row
execute function public.set_updated_at();

alter table public.records enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.records to authenticated;

drop policy if exists "Users can read own records" on public.records;
create policy "Users can read own records"
on public.records
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own records" on public.records;
create policy "Users can insert own records"
on public.records
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own records" on public.records;
create policy "Users can update own records"
on public.records
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own records" on public.records;
create policy "Users can delete own records"
on public.records
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'record-images',
  'record-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own record images" on storage.objects;
create policy "Users can read own record images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'record-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own record images" on storage.objects;
create policy "Users can upload own record images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'record-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own record images" on storage.objects;
create policy "Users can update own record images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'record-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'record-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own record images" on storage.objects;
create policy "Users can delete own record images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'record-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
