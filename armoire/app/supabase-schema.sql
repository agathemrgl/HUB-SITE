-- Armoire : coller TOUT ce fichier dans le dashboard Supabase (SQL Editor → New query → Run).
-- Le script peut être relancé sans risque (if not exists / drop policy if exists).
-- Tout est privé : chaque compte ne voit et ne modifie que ses propres vêtements, tenues et jours.

create table if not exists public.armoire_vetements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom text not null default '',
  categorie text not null default 'hauts',   -- hauts, bas, robes, vestes, chaussures, sacs, accessoires
  couleurs text[] not null default '{}',
  saisons text[] not null default '{}',      -- printemps, ete, automne, hiver
  marque text,
  tags text[] not null default '{}',
  notes text,
  favori boolean not null default false,
  photo text,                                -- chemin dans le bucket « armoire »
  created_at timestamptz not null default now()
);

-- composition : [{ "v": <id vêtement>, "x": 0..1, "y": 0..1, "l": 0..1 (largeur), "z": int }]
-- (positions en fractions du canvas, pour que la tenue garde sa forme à toutes les tailles d'écran)
create table if not exists public.armoire_tenues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom text not null default '',
  tags text[] not null default '{}',
  composition jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un jour = une tenue (prévue si le jour est à venir, portée s'il est passé)
create table if not exists public.armoire_jours (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  jour date not null,
  tenue_id uuid references public.armoire_tenues (id) on delete set null,
  note text,
  primary key (user_id, jour)
);

alter table public.armoire_vetements enable row level security;
alter table public.armoire_tenues enable row level security;
alter table public.armoire_jours enable row level security;

drop policy if exists "vetements_proprietaire" on public.armoire_vetements;
create policy "vetements_proprietaire" on public.armoire_vetements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tenues_proprietaire" on public.armoire_tenues;
create policy "tenues_proprietaire" on public.armoire_tenues
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "jours_proprietaire" on public.armoire_jours;
create policy "jours_proprietaire" on public.armoire_jours
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Photos : bucket public en lecture (adresses aléatoires, non listables), écriture limitée
-- au dossier du compte : <user_id>/<fichier>.webp
insert into storage.buckets (id, name, public) values ('armoire', 'armoire', true)
on conflict (id) do nothing;

drop policy if exists "armoire_photos_ajout" on storage.objects;
create policy "armoire_photos_ajout" on storage.objects
  for insert with check (bucket_id = 'armoire' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "armoire_photos_modif" on storage.objects;
create policy "armoire_photos_modif" on storage.objects
  for update using (bucket_id = 'armoire' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "armoire_photos_suppression" on storage.objects;
create policy "armoire_photos_suppression" on storage.objects
  for delete using (bucket_id = 'armoire' and (storage.foldername(name))[1] = auth.uid()::text);
