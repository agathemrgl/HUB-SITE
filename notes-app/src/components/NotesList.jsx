import { useState } from 'react';
import { Search, SquarePen, ArrowUpDown, PanelLeft } from 'lucide-react';
import { useNotesStore } from '../store/useNotesStore';
import { getVisibleNotes } from '../lib/notesUtils';
import NoteListItem from './NoteListItem';

const SORT_OPTIONS = [
  { key: 'updated', label: 'Date de modification' },
  { key: 'created', label: 'Date de création' },
  { key: 'title', label: 'Titre' },
];

export default function NotesList({ onContextMenu }) {
  const notes = useNotesStore((s) => s.notes);
  const currentFolderId = useNotesStore((s) => s.currentFolderId);
  const searchQuery = useNotesStore((s) => s.searchQuery);
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery);
  const sortKey = useNotesStore((s) => s.sortKey);
  const setSortKey = useNotesStore((s) => s.setSortKey);
  const unlockedIds = useNotesStore((s) => s.unlockedIds);
  const createNote = useNotesStore((s) => s.createNote);
  const toggleSidebar = useNotesStore((s) => s.toggleSidebar);

  const [sortOpen, setSortOpen] = useState(false);

  const { pinned, rest } = getVisibleNotes({ notes, currentFolderId, searchQuery, sortKey, unlockedIds });
  const isEmpty = !pinned.length && !rest.length;

  return (
    <div className="flex h-full w-full flex-col bg-list-bg">
      <div className="flex h-11 items-center gap-2 border-b border-border px-3">
        <button
          type="button"
          title="Afficher/masquer les dossiers"
          onClick={toggleSidebar}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-accent-strong hover:bg-black/5"
        >
          <PanelLeft size={16} strokeWidth={1.8} />
        </button>

        <div className="relative flex-1">
          <Search size={13} strokeWidth={2.4} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher"
            className="w-full rounded bg-black/5 py-1 pl-6 pr-2 text-[13px] outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            title="Trier les notes"
            onClick={() => setSortOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded text-text-primary/70 hover:bg-black/5"
          >
            <ArrowUpDown size={15} strokeWidth={1.8} />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-52 rounded border border-border bg-list-bg p-1.5 shadow-lg">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setSortKey(opt.key);
                      setSortOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-black/5"
                  >
                    <span className="w-3 text-xs">{sortKey === opt.key ? '✓' : ''}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          title="Nouvelle note (⌘N)"
          onClick={() => createNote()}
          className="flex h-7 w-7 items-center justify-center rounded text-accent-strong hover:bg-black/5"
        >
          <SquarePen size={16} strokeWidth={1.8} />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto px-2 pb-3 pt-2">
        {isEmpty && (
          <li className="px-2 py-4 text-center text-[13px] text-text-secondary">
            {searchQuery ? 'Aucun résultat' : currentFolderId === 'trash' ? 'Corbeille vide' : 'Aucune note'}
          </li>
        )}

        {pinned.length > 0 && (
          <>
            <li className="px-2 pb-1 pt-2 text-xs font-semibold text-pinned">Épinglées</li>
            {pinned.map((n) => (
              <NoteListItem key={n.id} note={n} onContextMenu={onContextMenu} />
            ))}
            {rest.length > 0 && <li className="px-2 pb-1 pt-2 text-xs font-semibold text-text-secondary">Notes</li>}
          </>
        )}

        {rest.map((n) => (
          <NoteListItem key={n.id} note={n} onContextMenu={onContextMenu} />
        ))}
      </ul>
    </div>
  );
}
