-- smoke_markers tablosuna team_id ekle (marker eklendigindeki takim kaydedilsin)
alter table public.smoke_markers add column team_id uuid references public.teams(id) on delete set null;
