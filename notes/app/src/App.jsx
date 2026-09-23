import { useCallback, useEffect, useState } from 'react';
import { useNotesStore } from './store/useNotesStore';
import FoldersSidebar from './components/FoldersSidebar';
import NotesList from './components/NotesList';
import EditorPane from './components/EditorPane';
import ContextMenu from './components/ContextMenu';

export default function App() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const notes = useNotesStore((s) => s.notes);
  const dataLoaded = useNotesStore((s) => s.dataLoaded);
  const currentNoteId = useNotesStore((s) => s.currentNoteId);
  const setCurrentNoteId = useNotesStore((s) => s.setCurrentNoteId);
  const createNote = useNotesStore((s) => s.createNote);
  const purgeOldTrash = useNotesStore((s) => s.purgeOldTrash);
  const sidebarCollapsed = useNotesStore((s) => s.sidebarCollapsed);
  const initialize = useNotesStore((s) => s.initialize);

  const [menu, setMenu] = useState(null);

  useEffect(() => {
    // Race contre un timeout : si l'initialisation reste bloquée (ex. bug connu de Safari
    // avec IndexedDB au chargement), on affiche une erreur au lieu d'un spinner infini.
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Le chargement prend trop de temps.')), 10000)
    );
    Promise.race([initialize(), timeout])
      .then(() => setReady(true))
      .catch((err) => {
        console.error('Erreur au chargement des notes :', err);
        setInitError(err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) purgeOldTrash();
  }, [ready, purgeOldTrash]);

  // Sélectionne la note la plus récente au premier chargement, une seule fois.
  useEffect(() => {
    if (!ready || !dataLoaded || currentNoteId) return;
    const visible = [...notes].filter((n) => !n.deleted).sort((a, b) => b.updatedAt - a.updatedAt);
    if (visible.length) setCurrentNoteId(visible[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, dataLoaded]);

  const openContextMenu = useCallback((x, y, noteId) => setMenu({ x, y, noteId }), []);
  const openContextMenuFromButton = useCallback((e, noteId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ x: rect.left, y: rect.bottom + 4, noteId });
  }, []);
  const closeContextMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    function onKeyDown(e) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        createNote();
      }
      if (key === 'f') {
        e.preventDefault();
        document.querySelector('input[type="search"]')?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [createNote]);

  if (initError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 text-sm text-text-secondary">
        <p>Impossible de charger tes notes.</p>
        <button type="button" className="text-accent underline" onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-sm text-text-secondary">
        Chargement…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {!sidebarCollapsed && (
        <div className="w-[220px] shrink-0 border-r border-border">
          <FoldersSidebar />
        </div>
      )}

      <div className="w-[300px] shrink-0 border-r border-border">
        <NotesList onContextMenu={openContextMenu} />
      </div>

      <div className="min-w-0 flex-1">
        <EditorPane onOpenMenu={openContextMenuFromButton} />
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} noteId={menu.noteId} onClose={closeContextMenu} />}
    </div>
  );
}
