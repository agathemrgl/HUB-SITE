import { create } from 'zustand';
import { liveQuery } from 'dexie';
import { db } from '../db/db';
import { convertAppleBodyToHtml } from '../lib/appleImport';

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours, comme "Récemment supprimées"

function newId(prefix) {
  return prefix + Date.now() + Math.random().toString(16).slice(2);
}

export const useNotesStore = create((set, get) => ({
  // Miroir réactif d'IndexedDB (voir les abonnements liveQuery en bas de fichier) : Dexie
  // reste la seule source de vérité pour les données persistées, ce store ne duplique pas
  // la logique d'écriture ailleurs que dans ses propres actions.
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

  setCurrentFolderId: (id) => set({ currentFolderId: id }),
  setCurrentNoteId: (id) => set({ currentNoteId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSortKey: async (key) => {
    set({ sortKey: key });
    await db.meta.put({ key: 'sortKey', value: key });
  },

  // ---------- Notes ----------

  createNote: async () => {
    const { currentFolderId } = get();
    const now = Date.now();
    const note = {
      id: newId('n'),
      content: '',
      createdAt: now,
      updatedAt: now,
      pinned: false,
      locked: false,
      folderId: currentFolderId === 'all' || currentFolderId === 'trash' ? null : currentFolderId,
      deleted: false,
      deletedAt: null,
    };
    await db.notes.put(note);
    set({ currentNoteId: note.id });
    return note.id;
  },

  updateNoteContent: async (id, content) => {
    if (!id) return;
    await db.notes.update(id, { content, updatedAt: Date.now() });
  },

  // Une note vide (jamais remplie) quittée est supprimée silencieusement, comme dans Notes
  // d'Apple, pour ne pas accumuler des notes vides.
  discardIfEmpty: async (id) => {
    if (!id) return;
    const note = await db.notes.get(id);
    if (!note) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = note.content || '';
    const text = (tmp.innerText || '').trim();
    if (!text) await db.notes.delete(id);
  },

  duplicateNote: async (id) => {
    const note = await db.notes.get(id);
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
    await db.notes.put(copy);
    set({ currentNoteId: copy.id });
    return copy.id;
  },

  // Suppression = déplacement vers "Récemment supprimées" (récupérable 30 jours), jamais
  // définitif tant que l'utilisatrice ne vide pas la corbeille elle-même.
  deleteNote: async (id) => {
    await db.notes.update(id, { deleted: true, deletedAt: Date.now(), pinned: false });
    if (get().currentNoteId === id) set({ currentNoteId: null });
  },

  restoreNote: async (id) => {
    await db.notes.update(id, { deleted: false, deletedAt: null });
  },

  deleteForever: async (id) => {
    await db.notes.delete(id);
    if (get().currentNoteId === id) set({ currentNoteId: null });
  },

  purgeOldTrash: async () => {
    const now = Date.now();
    const stale = get().notes.filter(
      (n) => n.deleted && n.deletedAt && now - n.deletedAt > TRASH_RETENTION_MS
    );
    if (stale.length) await db.notes.bulkDelete(stale.map((n) => n.id));
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await db.notes.update(id, { pinned: !note.pinned });
  },

  moveNoteToFolder: async (id, folderId) => {
    await db.notes.update(id, { folderId });
  },

  // ---------- Verrouillage (code local, pas une vraie sécurité) ----------

  setPasscode: async (code) => {
    set({ passcode: code });
    await db.meta.put({ key: 'passcode', value: code });
  },

  toggleLock: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await db.notes.update(id, { locked: !note.locked });
    if (note.locked) {
      // On reverrouille : la note ne doit plus être "déverrouillée pour cette session".
      set((s) => {
        const next = new Set(s.unlockedIds);
        next.delete(id);
        return { unlockedIds: next };
      });
    }
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
    const folder = {
      id: newId('f'),
      name: trimmed,
      parentId: null,
      position: get().folders.length,
      expanded: true,
    };
    await db.folders.put(folder);
    set({ currentFolderId: folder.id });
  },

  renameFolder: async (id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    await db.folders.update(id, { name: trimmed });
  },

  deleteFolder: async (id) => {
    await db.folders.delete(id);
    const affected = get().notes.filter((n) => n.folderId === id);
    await Promise.all(affected.map((n) => db.notes.update(n.id, { folderId: null })));
    if (get().currentFolderId === id) set({ currentFolderId: 'all' });
  },

  // ---------- Import depuis Apple Notes ----------
  //
  // Prend le JSON produit par scripts/export-apple-notes.js. Idempotent par note (déduplique
  // via appleId), donc rejouable si on ajoute des notes côté Apple Notes plus tard : seules
  // les nouvelles sont importées, rien n'est dupliqué ni écrasé.
  importAppleNotes: async (rawItems) => {
    const existingAppleIds = new Set(get().notes.filter((n) => n.appleId).map((n) => n.appleId));
    const folderByName = new Map(get().folders.map((f) => [f.name, f.id]));

    let imported = 0;
    let skipped = 0;
    const withAttachments = [];

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
          await db.folders.put(folder);
          folderByName.set(item.folder, folder.id);
          folderId = folder.id;
        }
      }

      await db.notes.put({
        id: newId('n'),
        appleId: item.appleId,
        content: convertAppleBodyToHtml(item.body),
        createdAt: item.createdAt || Date.now(),
        updatedAt: item.updatedAt || Date.now(),
        pinned: false,
        locked: false,
        folderId,
        deleted: false,
        deletedAt: null,
      });

      existingAppleIds.add(item.appleId);
      imported++;
      if (item.attachmentCount > 0) withAttachments.push(item.name);
    }

    return { imported, skipped, withAttachments };
  },
}));

// ---------- Synchronisation Dexie -> store (source de vérité unique) ----------

liveQuery(() => db.notes.toArray()).subscribe({
  next: (notes) => useNotesStore.setState({ notes, dataLoaded: true }),
  error: (err) => console.error('Erreur liveQuery notes :', err),
});

liveQuery(() => db.folders.toArray()).subscribe({
  next: (folders) =>
    useNotesStore.setState({ folders: [...folders].sort((a, b) => a.position - b.position) }),
  error: (err) => console.error('Erreur liveQuery folders :', err),
});

liveQuery(() => db.meta.toArray()).subscribe({
  next: (rows) => {
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    useNotesStore.setState({
      sortKey: map.sortKey || 'updated',
      passcode: map.passcode || null,
    });
  },
  error: (err) => console.error('Erreur liveQuery meta :', err),
});
