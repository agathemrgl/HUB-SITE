import { Lock } from 'lucide-react';
import { useNotesStore } from '../store/useNotesStore';
import { getDisplayPreview, formatListDate } from '../lib/notesUtils';

export default function NoteListItem({ note, onContextMenu }) {
  const currentNoteId = useNotesStore((s) => s.currentNoteId);
  const setCurrentNoteId = useNotesStore((s) => s.setCurrentNoteId);
  const unlockedIds = useNotesStore((s) => s.unlockedIds);

  const { title, snippet } = getDisplayPreview(note, unlockedIds);
  const active = note.id === currentNoteId;

  return (
    <li className="border-b border-border/70 last:border-none">
      <div
        onClick={() => setCurrentNoteId(note.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e.clientX, e.clientY, note.id);
        }}
        className={
          'my-1 cursor-pointer rounded px-2.5 py-2 ' + (active ? 'bg-selected' : 'hover:bg-black/5')
        }
      >
        <div className="flex items-center gap-1 truncate text-[14px] font-semibold text-text-primary">
          {note.locked && <Lock size={12} className="shrink-0 opacity-70" />}
          <span className="truncate">{title}</span>
        </div>
        <div className="mt-0.5 flex gap-1.5 text-xs text-text-secondary">
          <span className="shrink-0">{formatListDate(note.deleted ? note.deletedAt : note.updatedAt)}</span>
          <span className="truncate">{snippet}</span>
        </div>
      </div>
    </li>
  );
}
