-- Sigara Harita - Database Schema
-- Bu SQL'i Supabase SQL Editor'de calistir

-- Profiles tablosu
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  team text check (team in ('blue', 'red')),
  total_smokes integer default 0,
  created_at timestamp with time zone default now()
);

-- Smoke markers tablosu
create table public.smoke_markers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  latitude decimal not null,
  longitude decimal not null,
  smoked_at timestamp with time zone default now(),
  photo_url text,
  created_at timestamp with time zone default now()
);

-- Indexler
create index idx_smoke_markers_user on public.smoke_markers(user_id);
create index idx_smoke_markers_location on public.smoke_markers(latitude, longitude);
create index idx_smoke_markers_time on public.smoke_markers(smoked_at desc);

-- Sigara sayisi artirma fonksiyonu
create or replace function public.increment_smoke_count(uid uuid)
returns void as $$
begin
  update public.profiles
  set total_smokes = total_smokes + 1
  where id = uid;
end;
$$ language plpgsql security definer;

-- RLS (Row Level Security) politikalari
alter table public.profiles enable row level security;
alter table public.smoke_markers enable row level security;

-- Profiles: herkes okuyabilir, sadece kendi profilini duzenleyebilir
create policy "Profiles herkes okuyabilir" on public.profiles
  for select using (true);

create policy "Kendi profilini duzenleyebilir" on public.profiles
  for update using (auth.uid() = id);

create policy "Kayit sirasinda profil olusturabilir" on public.profiles
  for insert with check (auth.uid() = id);

-- Smoke markers: herkes okuyabilir, sadece kendi marker'ini ekleyebilir
create policy "Markers herkes okuyabilir" on public.smoke_markers
  for select using (true);

create policy "Kendi markerini ekleyebilir" on public.smoke_markers
  for insert with check (auth.uid() = user_id);

create policy "Kendi markerini silebilir" on public.smoke_markers
  for delete using (auth.uid() = user_id);

-- Realtime'i aktif et
alter publication supabase_realtime add table public.smoke_markers;
