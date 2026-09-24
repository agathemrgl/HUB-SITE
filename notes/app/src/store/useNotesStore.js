import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { convertAppleBodyToHtml } from '../lib/appleImport';
import { computePreviewText } from '../lib/notesUtils';
import { migrateFromLocalStorage } from '../db/migrateFromLocalStorage';
import { migrateLocalDbToSupabase } from '../db/migrateToSupabase';
import { noteFromRow, noteToRow, folderFromRow, folderToRow } from '../db/rows';

// Colonnes chargées pour la liste : jamais `content`, potentiellement lourd (HTML, images
// en base64) — seulement `preview`, un extrait texte léger recalculé à chaque sauvegarde.
// Le contenu complet n'est chargé qu'à la demande, voir ensureNoteContentLoaded ci-dessous.
const NOTE_LIST_COLUMNS =
  'id, created_at, updated_at, pinned, locked, folder_id, deleted, deleted_at, apple_id, preview';

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours, comme "Récemment supprimées"

function newId(prefix) {
  return prefix + Date.now() + Math.random().toString(16).slice(2);
}

let userId = null;

async function requireUserId() {
  if (userId) return userId;
  // getSession() relit la session déjà stockée en local, sans requête de revalidation au
  // serveur (contrairement à getUser()) — plus robuste face aux restrictions de stockage/
  // cookies tiers de certains navigateurs (Safari en particulier).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Aucune session Supabase active.');
  userId = session.user.id;
  return userId;
}

function persistLastFolderId(id) {
  requireUserId().then((uid) => supabase.from('notes_meta').upsert({ user_id: uid, last_folder_id: id }));
}

// Charge le contenu complet d'une note si ce n'est pas déjà fait (note issue de la liste,
// jamais ouverte). Idempotent : ne refait pas la requête si content est déjà en mémoire.
async function ensureNoteContentLoaded(get, set, id) {
  const note = get().notes.find((n) => n.id === id);
  if (!note || note.content !== undefined) return note;
  const { data, error } = await supabase.from('notes').select('content').eq('id', id).single();
  if (error || !data) {
    console.error('Erreur chargement contenu note :', error);
    return note;
  }
  const loaded = { ...note, content: data.content };
  set((s) => ({ notes: s.notes.map((n) => (n.id === id ? loaded : n)) }));
  return loaded;
}

export const useNotesStore = create((set, get) => ({
  // Supabase (Postgres) est la seule source de vérité : ce store en garde un miroir en
  // mémoire, mis à jour localement après chaque écriture réussie (pas de resync globale).
  notes: [],
  folders: [],
  sortKey: 'updated',
  passcode: null,
  dataLoaded: false,

  // État d'interface uniquement (pas persisté à part sortKey, voir setSortKey)
  currentFolderId: 'all',
  currentNoteId: null,
  searchQuery: '',
  sidebarCollapsed: false,
  unlockedIds: new Set(),

  // Écran actif en navigation mobile (un seul pane visible à la fois, voir useIsMobile) :
  // 'folders' | 'notes' | 'editor'. Ignoré en desktop (3 colonnes toujours visibles). On
  // démarre directement sur 'notes' (dernier dossier ouvert), pas sur l'écran Dossiers.
  mobileView: 'notes',
  setMobileView: (view) => set({ mobileView: view }),

  setCurrentFolderId: (id) => {
    set({ currentFolderId: id });
    persistLastFolderId(id);
  },
  setCurrentNoteId: (id) => {
    set({ currentNoteId: id });
    if (id) ensureNoteContentLoaded(get, set, id);
  },
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // À appeler une fois au montage : migre l'ancien stockage local si besoin, puis charge
  // tout depuis Supabase.
  initialize: async () => {
    await migrateFromLocalStorage();
    const uid = await requireUserId();
    await migrateLocalDbToSupabase(uid);

    const [{ data: noteRows, error: notesError }, { data: folderRows, error: foldersError }, { data: metaRow }] =
      await Promise.all([
        supabase.from('notes').select(NOTE_LIST_COLUMNS).eq('user_id', uid),
        supabase.from('folders').select('*').eq('user_id', uid),
        supabase.from('notes_meta').select('*').eq('user_id', uid).maybeSingle(),
      ]);

    if (notesError) console.error('Erreur chargement notes :', notesError);
    if (foldersError) console.error('Erreur chargement dossiers :', foldersError);

    set({
      notes: (noteRows || []).map(noteFromRow),
      folders: (folderRows || []).map(folderFromRow).sort((a, b) => a.position - b.position),
      sortKey: metaRow?.sort_key || 'updated',
      passcode: metaRow?.passcode || null,
      currentFolderId: metaRow?.last_folder_id || 'all',
      dataLoaded: true,
    });
  },

  setSortKey: async (key) => {
    set({ sortKey: key });
    const uid = await requireUserId();
    await supabase.from('notes_meta').upsert({ user_id: uid, sort_key: key });
  },

  // ---------- Notes ----------

  createNote: async () => {
    const uid = await requireUserId();
    const { currentFolderId } = get();
    const now = Date.now();
    const note = {
      id: newId('n'),
      content: '',
      preview: '',
      createdAt: now,
      updatedAt: now,
      pinned: false,
      locked: false,
      folderId: currentFolderId === 'all' || currentFolderId === 'trash' ? null : currentFolderId,
      deleted: false,
      deletedAt: null,
    };
    await supabase.from('notes').insert(noteToRow(note, uid));
    set((s) => ({ notes: [...s.notes, note], currentNoteId: note.id }));
    return note.id;
  },

  updateNoteContent: async (id, content) => {
    if (!id) return;
    const updatedAt = Date.now();
    const preview = computePreviewText(content);
    await supabase.from('notes').update({ content, preview, updated_at: updatedAt }).eq('id', id);
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, content, preview, updatedAt } : n)) }));
  },

  // Une note vide (jamais remplie) quittée est supprimée silencieusement, comme dans Notes
  // d'Apple, pour ne pas accumuler des notes vides.
  discardIfEmpty: async (id) => {
    if (!id) return;
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = note.content || '';
    const text = (tmp.innerText || '').trim();
    if (!text) {
      await supabase.from('notes').delete().eq('id', id);
      set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    }
  },

  duplicateNote: async (id) => {
    const uid = await requireUserId();
    // Peut être appelé depuis le menu contextuel d'une note jamais ouverte (donc sans
    // contenu chargé) : on s'assure de l'avoir avant de dupliquer, sinon on copierait une
    // note vide.
    const note = await ensureNoteContentLoaded(get, set, id);
    if (!note) return null;
    const now = Date.now();
    const copy = {
      ...note,
      id: newId('n'),
      createdAt: now,
      updatedAt: now,
      pinned: false,
      locked: false,
      deleted: false,
      deletedAt: null,
    };
    await supabase.from('notes').insert(noteToRow(copy, uid));
    set((s) => ({ notes: [...s.notes, copy], currentNoteId: copy.id }));
    return copy.id;
  },

  // Suppression = déplacement vers "Récemment supprimées" (récupérable 30 jours), jamais
  // définitif tant que l'utilisatrice ne vide pas la corbeille elle-même.
  deleteNote: async (id) => {
    const deletedAt = Date.now();
    await supabase.from('notes').update({ deleted: true, deleted_at: deletedAt, pinned: false }).eq('id', id);
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, deleted: true, deletedAt, pinned: false } : n)),
      currentNoteId: s.currentNoteId === id ? null : s.currentNoteId,
    }));
  },

  restoreNote: async (id) => {
    await supabase.from('notes').update({ deleted: false, deleted_at: null }).eq('id', id);
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, deleted: false, deletedAt: null } : n)) }));
  },

  deleteForever: async (id) => {
    await supabase.from('notes').delete().eq('id', id);
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      currentNoteId: s.currentNoteId === id ? null : s.currentNoteId,
    }));
  },

  purgeOldTrash: async () => {
    const now = Date.now();
    const stale = get().notes.filter(
      (n) => n.deleted && n.deletedAt && now - n.deletedAt > TRASH_RETENTION_MS
    );
    if (!stale.length) return;
    const ids = stale.map((n) => n.id);
    await supabase.from('notes').delete().in('id', ids);
    set((s) => ({ notes: s.notes.filter((n) => !ids.includes(n.id)) }));
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const pinned = !note.pinned;
    await supabase.from('notes').update({ pinned }).eq('id', id);
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, pinned } : n)) }));
  },

  moveNoteToFolder: async (id, folderId) => {
    await supabase.from('notes').update({ folder_id: folderId }).eq('id', id);
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, folderId } : n)) }));
  },

  // ---------- Verrouillage (code local, pas une vraie sécurité) ----------

  setPasscode: async (code) => {
    set({ passcode: code });
    const uid = await requireUserId();
    await supabase.from('notes_meta').upsert({ user_id: uid, passcode: code });
  },

  toggleLock: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const locked = !note.locked;
    await supabase.from('notes').update({ locked }).eq('id', id);
    set((s) => {
      const notes = s.notes.map((n) => (n.id === id ? { ...n, locked } : n));
      if (!locked) return { notes };
      // On reverrouille : la note ne doit plus être "déverrouillée pour cette session".
      const next = new Set(s.unlockedIds);
      next.delete(id);
      return { notes, unlockedIds: next };
    });
  },

  unlockNote: (id) =>
    set((s) => {
      const next = new Set(s.unlockedIds);
      next.add(id);
      return { unlockedIds: next };
    }),

  // ---------- Dossiers ----------

  createFolder: async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const uid = await requireUserId();
    const folder = { id: newId('f'), name: trimmed, parentId: null, position: get().folders.length, expanded: true };
    await supabase.from('folders').insert(folderToRow(folder, uid));
    set((s) => ({ folders: [...s.folders, folder], currentFolderId: folder.id }));
    persistLastFolderId(folder.id);
  },

  renameFolder: async (id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    await supabase.from('folders').update({ name: trimmed }).eq('id', id);
    set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f)) }));
  },

  deleteFolder: async (id) => {
    const affectedIds = get().notes.filter((n) => n.folderId === id).map((n) => n.id);
    await supabase.from('folders').delete().eq('id', id);
    if (affectedIds.length) {
      await supabase.from('notes').update({ folder_id: null }).in('id', affectedIds);
    }
    const wasCurrent = get().currentFolderId === id;
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      notes: s.notes.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)),
      currentFolderId: wasCurrent ? 'all' : s.currentFolderId,
    }));
    if (wasCurrent) persistLastFolderId('all');
  },

  // ---------- Import depuis Apple Notes ----------
  //
  // Prend le JSON produit par scripts/export-apple-notes.js. Idempotent par note (déduplique
  // via appleId), donc rejouable si on ajoute des notes côté Apple Notes plus tard : seules
  // les nouvelles sont importées, rien n'est dupliqué ni écrasé.
  importAppleNotes: async (rawItems) => {
    const uid = await requireUserId();
    const existingAppleIds = new Set(get().notes.filter((n) => n.appleId).map((n) => n.appleId));
    const folderByName = new Map(get().folders.map((f) => [f.name, f.id]));

    let imported = 0;
    let skipped = 0;
    const withAttachments = [];
    const newFolders = [];
    const newNotes = [];

    for (const item of rawItems) {
      if (!item.appleId || existingAppleIds.has(item.appleId)) {
        skipped++;
        continue;
      }

      let folderId = null;
      if (item.folder) {
        folderId = folderByName.get(item.folder) || null;
        if (!folderId) {
          const folder = {
            id: newId('f'),
            name: item.folder,
            parentId: null,
            position: folderByName.size,
            expanded: true,
          };
          folderByName.set(item.folder, folder.id);
          newFolders.push(folder);
          folderId = folder.id;
        }
      }

      const content = convertAppleBodyToHtml(item.body);
      const note = {
        id: newId('n'),
        appleId: item.appleId,
        content,
        preview: computePreviewText(content),
        createdAt: item.createdAt || Date.now(),
        updatedAt: item.updatedAt || Date.now(),
        pinned: false,
        locked: false,
        folderId,
        deleted: false,
        deletedAt: null,
      };
      newNotes.push(note);

      existingAppleIds.add(item.appleId);
      imported++;
      if (item.attachmentCount > 0) withAttachments.push(item.name);
    }

    if (newFolders.length) await supabase.from('folders').insert(newFolders.map((f) => folderToRow(f, uid)));
    if (newNotes.length) await supabase.from('notes').insert(newNotes.map((n) => noteToRow(n, uid)));

    set((s) => ({ folders: [...s.folders, ...newFolders], notes: [...s.notes, ...newNotes] }));

    return { imported, skipped, withAttachments };
  },
}));
