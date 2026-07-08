-- ============================================
-- ADIM 1: Bunu calistir
-- ============================================
alter table public.profiles add column friend_code text unique;

-- ============================================
-- ADIM 2: Bunu calistir
-- ============================================
update public.profiles set friend_code = upper(substr(md5(id::text), 1, 6)) where friend_code is null;

-- ============================================
-- ADIM 3: Bunu calistir
-- ============================================
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(user_id, friend_id)
);

-- ============================================
-- ADIM 4: Bunu calistir
-- ============================================
create table public.achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_key text not null,
  unlocked_at timestamp with time zone default now(),
  unique(user_id, achievement_key)
);

-- ============================================
-- ADIM 5: Bunu calistir
-- ============================================
alter table public.friendships enable row level security;

-- ============================================
-- ADIM 6: Bunu calistir
-- ============================================
alter table public.achievements enable row level security;

-- ============================================
-- ADIM 7: Bunu calistir
-- ============================================
create policy "Arkadasliklari herkes gorebilir" on public.friendships for select using (true);

-- ============================================
-- ADIM 8: Bunu calistir
-- ============================================
create policy "Kendi arkadasligini ekleyebilir" on public.friendships for insert with check (auth.uid() = user_id);

-- ============================================
-- ADIM 9: Bunu calistir
-- ============================================
create policy "Kendi arkadasligini silebilir" on public.friendships for delete using (auth.uid() = user_id);

-- ============================================
-- ADIM 10: Bunu calistir
-- ============================================
create policy "Basarimlari herkes gorebilir" on public.achievements for select using (true);

-- ============================================
-- ADIM 11: Bunu calistir
-- ============================================
create policy "Sistem basarim ekleyebilir" on public.achievements for insert with check (auth.uid() = user_id);
