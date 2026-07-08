-- Arkadas sistemi: her kullaniciya benzersiz kod
alter table public.profiles add column friend_code text unique;

-- Mevcut kullanicilar icin kod olustur
update public.profiles set friend_code = upper(substr(md5(id::text), 1, 6)) where friend_code is null;

-- Arkadasliklar tablosu
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(user_id, friend_id)
);

-- Basarimlar tablosu
create table public.achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_key text not null,
  unlocked_at timestamp with time zone default now(),
  unique(user_id, achievement_key)
);

-- RLS
alter table public.friendships enable row level security;
alter table public.achievements enable row level security;

create policy "Arkadasliklari herkes gorebilir" on public.friendships
  for select using (true);

create policy "Kendi arkadasligini ekleyebilir" on public.friendships
  for insert with check (auth.uid() = user_id);

create policy "Kendi arkadasligini silebilir" on public.friendships
  for delete using (auth.uid() = user_id);

create policy "Basarimlari herkes gorebilir" on public.achievements
  for select using (true);

create policy "Sistem basarim ekleyebilir" on public.achievements
  for insert with check (auth.uid() = user_id);
