-- À exécuter une fois dans le dashboard Supabase : SQL Editor → New query → coller → Run.
-- Crée les tables qui remplacent le stockage local (IndexedDB) des notes, avec RLS pour
-- que chaque compte ne voie/modifie que ses propres données.

create table public.notes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content text not null default '',
  created_at bigint not null,
  updated_at bigint not null,
  pinned boolean not null default false,
  locked boolean not null default false,
  folder_id text,
  deleted boolean not null default false,
  deleted_at bigint,
  apple_id text
);

create table public.folders (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  parent_id text,
  position integer not null default 0,
  expanded boolean not null default true
);

create table public.notes_meta (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  sort_key text not null default 'updated',
  passcode text,
  last_folder_id text
);

alter table public.notes enable row level security;
alter table public.folders enable row level security;
alter table public.notes_meta enable row level security;

create policy "notes_owner" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "folders_owner" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notes_meta_owner" on public.notes_meta
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ajouté après coup (mémorisation du dernier dossier ouvert) : si la table notes_meta
-- existe déjà sans cette colonne, exécuter juste la ligne suivante.
-- alter table public.notes_meta add column if not exists last_folder_id text;
