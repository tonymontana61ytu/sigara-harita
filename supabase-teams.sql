-- Takım Sistemi - Bu SQL'i Supabase SQL Editor'de calistir

-- Teams tablosu
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  color text not null, -- hex renk kodu (#ff0000 gibi)
  owner_id uuid references public.profiles(id) on delete set null,
  member_count integer default 1,
  created_at timestamp with time zone default now()
);

-- Profiles tablosuna team_id ekle
alter table public.profiles add column team_id uuid references public.teams(id) on delete set null;

-- Eski team kolonunu kaldir (artik kullanmiyoruz)
alter table public.profiles drop column if exists team;

-- Teams RLS
alter table public.teams enable row level security;

create policy "Teams herkes okuyabilir" on public.teams
  for select using (true);

create policy "Giris yapmis kullanici takim kurabilir" on public.teams
  for insert with check (auth.uid() = owner_id);

create policy "Takim sahibi duzenleyebilir" on public.teams
  for update using (auth.uid() = owner_id);

create policy "Takim sahibi silebilir" on public.teams
  for delete using (auth.uid() = owner_id);

-- Takima katilma fonksiyonu (member_count gunceller)
create or replace function public.join_team(tid uuid)
returns void as $$
begin
  -- Eski takimdan cik
  update public.teams
  set member_count = member_count - 1
  where id = (select team_id from public.profiles where id = auth.uid())
  and member_count > 0;

  -- Yeni takima katil
  update public.profiles
  set team_id = tid
  where id = auth.uid();

  -- Yeni takimin sayisini artir
  update public.teams
  set member_count = member_count + 1
  where id = tid;
end;
$$ language plpgsql security definer;

-- Takimdan ayrilma fonksiyonu
create or replace function public.leave_team()
returns void as $$
begin
  update public.teams
  set member_count = member_count - 1
  where id = (select team_id from public.profiles where id = auth.uid())
  and member_count > 0;

  update public.profiles
  set team_id = null
  where id = auth.uid();
end;
$$ language plpgsql security definer;
