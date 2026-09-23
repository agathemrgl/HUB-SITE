import { db } from './db';
import { supabase } from '../lib/supabaseClient';
import { noteToRow, folderToRow } from './rows';

const MIGRATION_FLAG_KEY = 'hub-notes-cloud-migration-done-v1';

// Migration unique : reprend les notes/dossiers/réglages qui existaient en local
// (IndexedDB, avant le passage au stockage Supabase) et les pousse vers le cloud —
// seulement s'il n'y a encore rien côté Supabase pour ce compte, pour ne jamais
// dupliquer. Un drapeau localStorage évite de la relancer à chaque chargement.
export async function migrateLocalDbToSupabase(userId) {
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return;

  const [{ count: notesCount }, { count: foldersCount }] = await Promise.all([
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('folders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  if (notesCount > 0 || foldersCount > 0) {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    return;
  }

  const [localNotes, localFolders, metaRows] = await Promise.all([
    db.notes.toArray(),
    db.folders.toArray(),
    db.meta.toArray(),
  ]);

  if (localNotes.length) {
    await supabase.from('notes').insert(localNotes.map((n) => noteToRow(n, userId)));
  }
  if (localFolders.length) {
    await supabase.from('folders').insert(localFolders.map((f) => folderToRow(f, userId)));
  }

  const meta = Object.fromEntries(metaRows.map((r) => [r.key, r.value]));
  if (meta.sortKey || meta.passcode) {
    await supabase
      .from('notes_meta')
      .upsert({ user_id: userId, sort_key: meta.sortKey || 'updated', passcode: meta.passcode || null });
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}
