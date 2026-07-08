-- ============================================
-- ADIM 1: Sigara sayisi azaltma fonksiyonu (marker silme icin)
-- ============================================
create or replace function public.decrement_smoke_count(uid uuid)
returns void as $$
begin
  update public.profiles
  set total_smokes = greatest(total_smokes - 1, 0)
  where id = uid;
end;
$$ language plpgsql security definer;

-- ============================================
-- ADIM 2: Notifications tablosu
-- ============================================
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- ============================================
-- ADIM 3: Index
-- ============================================
create index idx_notifications_user on public.notifications(user_id, created_at desc);

-- ============================================
-- ADIM 4: RLS
-- ============================================
alter table public.notifications enable row level security;

-- ============================================
-- ADIM 5: Policies
-- ============================================
create policy "Kendi bildirimlerini gorebilir" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Kendi bildirimlerini guncelleyebilir" on public.notifications
  for update using (auth.uid() = user_id);

create policy "Sistem bildirim olusturabilir" on public.notifications
  for insert with check (true);

-- ============================================
-- ADIM 6: Realtime
-- ============================================
alter publication supabase_realtime add table public.notifications;
