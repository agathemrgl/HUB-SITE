// Sauvegarde complète des notes stockées dans Supabase, en vue de la migration vers Kermimi.
//
// Usage (depuis notes/app/) :
//   node scripts/export-supabase-backup.mjs [dossier-de-sortie]
//
// Se connecte avec l'email/mot de passe du compte (comme l'appli) : les règles RLS donnent
// déjà accès à toutes ses propres lignes, donc pas besoin de la clé service_role. Les
// identifiants peuvent aussi être passés via NOTES_EMAIL / NOTES_PASSWORD.
//
// Par défaut la sauvegarde est écrite HORS du repo (le repo est servi tel quel par GitHub
// Pages : des notes perso commitées par erreur seraient publiques).
//
// Produit :
//   notes-backup.json   lignes brutes des 3 tables, colonnes et valeurs telles quelles
//   manifest.json       compteurs + empreinte SHA-256 de notes-backup.json
//   lisible/            une page HTML par note, rangée par dossier (copie de secours lisible)

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';

const SUPABASE_URL = 'https://ngbadmsmgnzopdsromqd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_N8uKDD5t8Fp0uKCaPplTOQ_lG1NrzLU';

// Toutes les colonnes de `notes` sauf `content`, chargé à part par petits lots : certaines
// notes contiennent des images en base64 et tout charger d'un coup dépasse le timeout.
const NOTE_COLUMNS_WITHOUT_CONTENT =
  'id, user_id, created_at, updated_at, pinned, locked, folder_id, deleted, deleted_at, apple_id, preview';
const PAGE_SIZE = 500;
const CONTENT_BATCH_SIZE = 10;

function ask(question, { hidden = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    rl._writeToOutput = (str) => {
      if (str.startsWith(question)) rl.output.write(question);
    };
  }
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    })
  );
}

async function fetchAllPages(query) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

function plainText(html) {
  return (html || '')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|pre)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function safeFileName(name) {
  return (name || 'Sans titre').replace(/[/\\:*?"<>|\n\r\t]/g, '-').trim().slice(0, 80) || 'Sans titre';
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function writeReadableCopy(outDir, notes, folders) {
  const folderNames = new Map(folders.map((f) => [f.id, f.name]));
  const usedPaths = new Set();

  for (const note of notes) {
    const dir = note.deleted
      ? 'Récemment supprimées'
      : safeFileName(folderNames.get(note.folder_id) || 'Sans dossier');
    const title = plainText(note.content).split('\n').map((l) => l.trim()).find(Boolean) || 'Nouvelle note';
    let base = join(outDir, 'lisible', dir, safeFileName(title));
    let path = base + '.html';
    for (let i = 2; usedPaths.has(path); i++) path = `${base} (${i}).html`;
    usedPaths.add(path);

    const meta = [
      `Créée : ${new Date(note.created_at).toLocaleString('fr-FR')}`,
      `Modifiée : ${new Date(note.updated_at).toLocaleString('fr-FR')}`,
      note.pinned ? 'Épinglée' : null,
      note.locked ? 'Verrouillée' : null,
      `id : ${note.id}`,
    ].filter(Boolean).join(' · ');

    await mkdir(join(outDir, 'lisible', dir), { recursive: true });
    await writeFile(
      path,
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
        `<style>body{font-family:-apple-system,sans-serif;max-width:700px;margin:2em auto;padding:0 1em;line-height:1.5}` +
        `img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #888;padding:4px 8px}` +
        `.meta{color:#777;font-size:13px;border-bottom:1px solid #ddd;padding-bottom:.5em}</style></head>` +
        `<body><p class="meta">${escapeHtml(meta)}</p>${note.content || ''}</body></html>`
    );
  }
}

async function main() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const outDir =
    process.argv[2] || join(homedir(), 'Documents', 'PERSO', 'DIGITA_CODAM', `SAUVEGARDE-NOTES-${stamp}`);

  const email = process.env.NOTES_EMAIL || (await ask('Email : '));
  const password = process.env.NOTES_PASSWORD || (await ask('Mot de passe : ', { hidden: true }));

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw new Error('Connexion impossible : ' + authError.message);
  const userId = auth.user.id;
  console.log(`Connectée en tant que ${auth.user.email} (${userId})`);

  const folders = await fetchAllPages(() =>
    supabase.from('folders').select('*').eq('user_id', userId).order('id')
  );
  const { data: notesMeta, error: metaError } = await supabase
    .from('notes_meta')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (metaError) throw metaError;

  const notes = await fetchAllPages(() =>
    supabase.from('notes').select(NOTE_COLUMNS_WITHOUT_CONTENT).eq('user_id', userId).order('id')
  );
  console.log(`${folders.length} dossier(s), ${notes.length} note(s). Chargement du contenu…`);

  const contentById = new Map();
  for (let i = 0; i < notes.length; i += CONTENT_BATCH_SIZE) {
    const ids = notes.slice(i, i + CONTENT_BATCH_SIZE).map((n) => n.id);
    const { data, error } = await supabase.from('notes').select('id, content').in('id', ids);
    if (error) throw error;
    data.forEach((row) => contentById.set(row.id, row.content));
    process.stdout.write(`\r  ${Math.min(i + CONTENT_BATCH_SIZE, notes.length)}/${notes.length}`);
  }
  process.stdout.write('\n');

  const missing = notes.filter((n) => !contentById.has(n.id));
  if (missing.length) throw new Error(`Contenu manquant pour ${missing.length} note(s) : ${missing.map((n) => n.id).join(', ')}`);
  const fullNotes = notes.map((n) => ({ ...n, content: contentById.get(n.id) }));

  const { count: serverCount, error: countError } = await supabase
    .from('notes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (countError) throw countError;
  if (serverCount !== fullNotes.length) {
    throw new Error(`Incohérence : ${serverCount} notes côté serveur, ${fullNotes.length} exportées.`);
  }

  const backup = {
    format: 'hub-notes-supabase-backup',
    format_version: 1,
    exported_at: new Date().toISOString(),
    source: {
      supabase_project: 'ngbadmsmgnzopdsromqd',
      user_id: userId,
      email: auth.user.email,
    },
    // Rappels de format pour l'import : voir le prompt d'import Kermimi.
    conventions: {
      timestamps: 'bigint, millisecondes depuis epoch (created_at, updated_at, deleted_at)',
      content: 'HTML produit par TipTap v3 ; images collées en data URI base64 dans <img src>',
      folder_id_null: 'note sans dossier (affichée dans « Toutes les notes »)',
      pseudo_folders: "'all' et 'trash' sont des vues de l'interface, pas des dossiers (peuvent apparaître dans notes_meta.last_folder_id)",
    },
    folders,
    notes_meta: notesMeta,
    notes: fullNotes,
  };

  await mkdir(outDir, { recursive: true });
  const json = JSON.stringify(backup, null, 2);
  const jsonPath = join(outDir, 'notes-backup.json');
  await writeFile(jsonPath, json);

  // Relecture du fichier écrit pour vérifier qu'il est complet et parsable.
  const reread = JSON.parse(await readFile(jsonPath, 'utf8'));
  if (reread.notes.length !== fullNotes.length || reread.folders.length !== folders.length) {
    throw new Error('Le fichier relu ne correspond pas aux données exportées.');
  }

  const manifest = {
    exported_at: backup.exported_at,
    file: 'notes-backup.json',
    sha256: createHash('sha256').update(json).digest('hex'),
    bytes: Buffer.byteLength(json),
    counts: {
      folders: folders.length,
      notes: fullNotes.length,
      notes_in_trash: fullNotes.filter((n) => n.deleted).length,
      notes_pinned: fullNotes.filter((n) => n.pinned).length,
      notes_locked: fullNotes.filter((n) => n.locked).length,
      notes_without_folder: fullNotes.filter((n) => !n.folder_id).length,
      notes_with_images: fullNotes.filter((n) => /<img[^>]+src="data:/i.test(n.content || '')).length,
      notes_from_apple: fullNotes.filter((n) => n.apple_id).length,
    },
    largest_note_bytes: Math.max(0, ...fullNotes.map((n) => Buffer.byteLength(n.content || ''))),
  };
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  await writeReadableCopy(outDir, fullNotes, folders);

  console.log(`\nSauvegarde écrite dans : ${outDir}`);
  console.log(JSON.stringify(manifest.counts, null, 2));
  if (notesMeta?.passcode) {
    console.log('\n⚠️  Le fichier contient le code de verrouillage des notes en clair (notes_meta.passcode).');
  }
  await supabase.auth.signOut();
}

main().catch((err) => {
  console.error('\nÉchec de la sauvegarde :', err.message || err);
  process.exit(1);
});
