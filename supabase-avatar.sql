-- Profiles tablosuna avatar_url ekle
alter table public.profiles add column avatar_url text;

-- Supabase Storage'da avatars bucket olustur
-- Bu SQL ile olmaz, Supabase Dashboard > Storage > New Bucket > "avatars" > Public bucket olarak olustur
