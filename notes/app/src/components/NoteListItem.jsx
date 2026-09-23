import { useRef } from 'react';
import { Lock } from 'lucide-react';
import { useNotesStore } from '../store/useNotesStore';
import { getDisplayPreview, formatListDate } from '../lib/notesUtils';
import { useIsMobile } from '../hooks/useIsMobile';

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 10;

export default function NoteListItem({ note, onContextMenu }) {
  const currentNoteId = useNotesStore((s) => s.currentNoteId);
  const setCurrentNoteId = useNotesStore((s) => s.setCurrentNoteId);
  const setMobileView = useNotesStore((s) => s.setMobileView);
  const unlockedIds = useNotesStore((s) => s.unlockedIds);
  const isMobile = useIsMobile();

  const { title, snippet } = getDisplayPreview(note, unlockedIds);
  const active = note.id === currentNoteId;

  const longPressTimer = useRef(null);
  const touchStart = useRef(null);
  const longPressTriggered = useRef(false);

  function openNote() {
    setCurrentNoteId(note.id);
    setMobileView('editor');
  }

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      onContextMenu(touch.clientX, touch.clientY, note.id);
    }, LONG_PRESS_MS);
  }

  function handleTouchMove(e) {
    if (!touchStart.current || !longPressTimer.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStart.current.x);
    const dy = Math.abs(touch.clientY - touchStart.current.y);
    if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) clearLongPressTimer();
  }

  function handleClick() {
    // Le tap long a déjà ouvert le menu contextuel : on n'ouvre pas la note en plus.
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    openNote();
  }

  return (
    <li className="border-b border-border/70 last:border-none">
      <div
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e.clientX, e.clientY, note.id);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={clearLongPressTimer}
        style={{ WebkitTouchCallout: 'none' }}
        className={
          'my-1 cursor-pointer select-none rounded px-2.5 py-2 ' +
          (active ? 'bg-selected' : 'hover:bg-black/5')
        }
      >
        <div className="flex items-center gap-1 truncate text-[14px] max-md:text-[16px] font-semibold text-text-primary">
          {note.locked && <Lock size={isMobile ? 14 : 12} className="shrink-0 opacity-70" />}
          <span className="truncate">{title}</span>
        </div>
        <div className="mt-0.5 flex gap-1.5 text-xs max-md:text-sm text-text-secondary">
          <span className="shrink-0">{formatListDate(note.deleted ? note.deletedAt : note.updatedAt)}</span>
          <span className="truncate">{snippet}</span>
        </div>
      </div>
    </li>
  );
}
