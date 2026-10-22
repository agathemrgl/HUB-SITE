-- À exécuter une fois dans le dashboard Supabase : SQL Editor → New query → coller → Run.
-- Puis exécuter supabase-seed.sql pour importer les recettes existantes.
--
-- Lecture : tout le monde (le carnet est public).
-- Écriture : seulement les comptes listés dans `editeurs`, et chacun uniquement ses propres recettes.
-- Pour ouvrir l'écriture à quelqu'un d'autre plus tard : ajouter son compte dans `editeurs`.

create table public.editeurs (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.recettes (
  id text primary key,                -- adresse de la page : #/recette/<id>
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titre text not null,
  sous_titre text,
  date date not null default current_date,
  tags text[] not null default '{}',
  art text,                           -- traits, ronds, rayons, petales, feuillage, vague (null = au hasard)
  infos jsonb not null default '[]',  -- [["Préparation", "15 minutes"], …]
  histoire text[] not null default '{}',
  ingredients text[] not null default '{}',
  etapes text[] not null default '{}',
  faq jsonb not null default '[]',    -- [{"question": "…", "reponse": "…"}, …]
  lien text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.editeurs enable row level security;
alter table public.recettes enable row level security;

-- Chacun peut savoir s'il est éditeur (et rien de plus)
create policy "editeurs_lecture_soi" on public.editeurs
  for select using (auth.uid() = user_id);

create policy "recettes_lecture_publique" on public.recettes
  for select using (true);

create policy "recettes_ajout_editeurs" on public.recettes
  for insert with check (
    auth.uid() = user_id and exists (select 1 from public.editeurs e where e.user_id = auth.uid())
  );

create policy "recettes_modif_editeurs" on public.recettes
  for update using (
    auth.uid() = user_id and exists (select 1 from public.editeurs e where e.user_id = auth.uid())
  ) with check (auth.uid() = user_id);

create policy "recettes_suppression_editeurs" on public.recettes
  for delete using (
    auth.uid() = user_id and exists (select 1 from public.editeurs e where e.user_id = auth.uid())
  );

-- Ton compte comme premier éditeur : remplacer TON_EMAIL par l'email de connexion du hub.
insert into public.editeurs (user_id)
select id from auth.users where email = 'agathe.margely@ikmail.com';
