import { EditorContent } from '@tiptap/react';
import { Lock } from 'lucide-react';
import { useNoteEditor } from '../editor/useNoteEditor';
import { useNotesStore } from '../store/useNotesStore';
import { formatFullDate } from '../lib/notesUtils';
import { useIsMobile } from '../hooks/useIsMobile';
import EditorToolbar from './EditorToolbar';
import BubbleToolbar from './BubbleToolbar';

export default function EditorPane({ onOpenMenu }) {
  const { editor, currentNote, isLockedHidden } = useNoteEditor();
  const unlockNote = useNotesStore((s) => s.unlockNote);
  const passcode = useNotesStore((s) => s.passcode);
  const isMobile = useIsMobile();
  const usableEditor = editor && !editor.isDestroyed ? editor : null;

  function handleUnlock() {
    const attempt = prompt('Code pour déverrouiller cette note :');
    if (attempt === null) return;
    if (attempt === passcode) unlockNote(currentNote.id);
    else alert('Code incorrect.');
  }

  return (
    <main className="flex h-full w-full flex-col overflow-y-auto overscroll-contain bg-editor-bg [-webkit-overflow-scrolling:touch]">
      <EditorToolbar
        editor={currentNote && !isLockedHidden ? usableEditor : null}
        note={currentNote}
        isLockedHidden={isLockedHidden}
        onOpenMenu={onOpenMenu}
      />

      <div className="relative flex-1">
        {!currentNote && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[15px] max-md:text-[17px] text-text-secondary">
            Sélectionne une note, ou crée-en une nouvelle.
          </div>
        )}

        {currentNote && isLockedHidden && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-text-secondary">
            <Lock size={isMobile ? 40 : 34} strokeWidth={1.6} />
            <p className="text-[15px] max-md:text-[17px]">Cette note est verrouillée</p>
            <button
              type="button"
              onClick={handleUnlock}
              className="rounded bg-black/5 px-3.5 py-1.5 text-[13px] max-md:text-[15px] font-medium text-text-primary hover:bg-black/10"
            >
              Déverrouiller la note
            </button>
          </div>
        )}

        {currentNote && !isLockedHidden && (
          <>
            <div className="pt-6 text-center text-xs max-md:text-sm text-text-secondary">{formatFullDate(currentNote.updatedAt)}</div>
            <div className="max-w-[700px] px-8 pb-6 pt-3">
              {usableEditor && <BubbleToolbar editor={usableEditor} />}
              <EditorContent editor={usableEditor} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
