import { useRef } from 'react';
import {
  ListChecks,
  Table as TableIcon,
  Image as ImageIcon,
  Lock,
  Unlock,
  Share2,
  MoreHorizontal,
  ChevronLeft,
} from 'lucide-react';
import { useNotesStore } from '../store/useNotesStore';
import { shareNote } from '../lib/share';
import { useIsMobile } from '../hooks/useIsMobile';
import AaFormatPanel from './AaFormatPanel';
import IconButton from './IconButton';

const FOLDER_LABELS = { all: 'Toutes les notes', trash: 'Récemment supprimées' };

function insertImageFile(editor, file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    editor.chain().focus().setImage({ src: reader.result }).run();
  };
  reader.readAsDataURL(file);
}

export default function EditorToolbar({ editor, note, isLockedHidden, onOpenMenu }) {
  const fileInputRef = useRef(null);
  const toggleLock = useNotesStore((s) => s.toggleLock);
  const setPasscode = useNotesStore((s) => s.setPasscode);
  const passcode = useNotesStore((s) => s.passcode);
  const unlockNote = useNotesStore((s) => s.unlockNote);
  const setMobileView = useNotesStore((s) => s.setMobileView);
  const currentFolderId = useNotesStore((s) => s.currentFolderId);
  const folders = useNotesStore((s) => s.folders);
  const isMobile = useIsMobile();

  const folderLabel =
    FOLDER_LABELS[currentFolderId] || folders.find((f) => f.id === currentFolderId)?.name || 'Notes';

  function handleLockClick() {
    if (!note) return;
    if (!note.locked) {
      let code = passcode;
      if (!code) {
        const p1 = prompt("Choisis un code pour verrouiller tes notes (il s'appliquera à toutes tes notes verrouillées) :");
        if (!p1 || p1.trim().length < 4) {
          if (p1 !== null) alert('Code trop court (4 caractères minimum). Verrouillage annulé.');
          return;
        }
        const p2 = prompt('Confirme le code :');
        if (p2 !== p1) {
          alert('Les codes ne correspondent pas. Verrouillage annulé.');
          return;
        }
        code = p1;
        setPasscode(code);
      }
    }
    toggleLock(note.id);
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-border bg-editor-bg px-3 sticky top-0 z-20">
      {isMobile && (
        <button
          type="button"
          onClick={() => setMobileView('notes')}
          className="mr-1 flex h-7 shrink-0 items-center gap-0.5 truncate rounded pr-1 text-[13px] max-md:text-[15px] text-accent-strong hover:bg-black/5"
        >
          <ChevronLeft size={21} strokeWidth={2} className="shrink-0" />
          <span className="truncate">{folderLabel}</span>
        </button>
      )}

      {editor && (
        <>
          <AaFormatPanel editor={editor} />
          <IconButton
            icon={ListChecks}
            title="Liste à cocher"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          />
          <IconButton
            icon={TableIcon}
            title="Insérer un tableau"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()}
          />
          <IconButton icon={ImageIcon} title="Ajouter une photo" onClick={() => fileInputRef.current?.click()} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              Array.from(e.target.files || []).forEach((f) => insertImageFile(editor, f));
              e.target.value = '';
            }}
          />
        </>
      )}

      <div className="flex-1" />

      {note && (
        <>
          <IconButton
            icon={note.locked ? Unlock : Lock}
            title={note.locked ? 'Déverrouiller la note' : 'Verrouiller la note'}
            active={note.locked}
            onClick={handleLockClick}
          />
          <IconButton
            icon={Share2}
            title={isLockedHidden ? 'Déverrouille la note pour la partager' : 'Partager'}
            disabled={isLockedHidden}
            onClick={() => shareNote(note)}
          />
          <IconButton icon={MoreHorizontal} title="Plus d'options" onClick={(e) => onOpenMenu(e, note.id)} />
        </>
      )}
    </div>
  );
}
