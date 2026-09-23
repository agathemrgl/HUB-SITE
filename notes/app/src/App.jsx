import { useCallback, useEffect, useState } from 'react';
import { migrateFromLocalStorage } from './db/migrateFromLocalStorage';
import { useNotesStore } from './store/useNotesStore';
import FoldersSidebar from './components/FoldersSidebar';
import NotesList from './components/NotesList';
import EditorPane from './components/EditorPane';
import ContextMenu from './components/ContextMenu';

export default function App() {
  const [ready, setReady] = useState(false);
  const notes = useNotesStore((s) => s.notes);
  const dataLoaded = useNotesStore((s) => s.dataLoaded);
  const currentNoteId = useNotesStore((s) => s.currentNoteId);
  const setCurrentNoteId = useNotesStore((s) => s.setCurrentNoteId);
  const createNote = useNotesStore((s) => s.createNote);
  const purgeOldTrash = useNotesStore((s) => s.purgeOldTrash);
  const sidebarCollapsed = useNotesStore((s) => s.sidebarCollapsed);

  const [menu, setMenu] = useState(null);

  useEffect(() => {
    migrateFromLocalStorage().then(() => setReady(true));
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
