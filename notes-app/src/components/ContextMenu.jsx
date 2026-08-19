import { useEffect, useRef, useState } from 'react';
import { useNotesStore } from '../store/useNotesStore';
import { shareNote } from '../lib/share';

export default function ContextMenu({ x, y, noteId, onClose }) {
  const notes = useNotesStore((s) => s.notes);
  const folders = useNotesStore((s) => s.folders);
  const unlockedIds = useNotesStore((s) => s.unlockedIds);
  const togglePin = useNotesStore((s) => s.togglePin);
  const toggleLock = useNotesStore((s) => s.toggleLock);
  const setPasscode = useNotesStore((s) => s.setPasscode);
  const passcode = useNotesStore((s) => s.passcode);
  const createNote = useNotesStore((s) => s.createNote);
  const duplicateNote = useNotesStore((s) => s.duplicateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const restoreNote = useNotesStore((s) => s.restoreNote);
  const deleteForever = useNotesStore((s) => s.deleteForever);
  const moveNoteToFolder = useNotesStore((s) => s.moveNoteToFolder);

  const [moveOpen, setMoveOpen] = useState(false);
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });

  const note = notes.find((n) => n.id === noteId);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    setPos({ left, top });
  }, [x, y]);

  if (!note) return null;

  function handleLock() {
    if (!note.locked && !passcode) {
      const p1 = prompt("Choisis un code pour verrouiller tes notes (il s'appliquera à toutes tes notes verrouillées) :");
      if (!p1 || p1.trim().length < 4) {
        if (p1 !== null) alert('Code trop court (4 caractères minimum). Verrouillage annulé.');
        onClose();
        return;
      }
      const p2 = prompt('Confirme le code :');
      if (p2 !== p1) {
        alert('Les codes ne correspondent pas. Verrouillage annulé.');
        onClose();
        return;
      }
      setPasscode(p1);
    }
    toggleLock(note.id);
    onClose();
  }

  const itemClass =
    'flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-accent hover:text-white';

  return (
    <div
      ref={ref}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-50 w-64 rounded border border-border bg-list-bg p-1.5 shadow-xl"
    >
      {!note.deleted ? (
        <>
          <button className={itemClass} onClick={onClose}>
            Ouvrir la note dans une nouvelle fenêtre
          </button>
          <Sep />
          <button className={itemClass} onClick={() => { togglePin(note.id); onClose(); }}>
            {note.pinned ? 'Détacher la note' : 'Épingler la note'}
          </button>
          <button className={itemClass} onClick={handleLock}>
            {note.locked ? 'Déverrouiller la note' : 'Verrouiller la note'}
          </button>
          <Sep />
          <button className={itemClass} onClick={() => { createNote(); onClose(); }}>
            Nouvelle note
          </button>
          <button className={itemClass} onClick={() => { duplicateNote(note.id); onClose(); }}>
            Dupliquer la note
          </button>
          <Sep />
          <button
            className={itemClass + (note.locked && !unlockedIds.has(note.id) ? ' opacity-40' : '')}
            disabled={note.locked && !unlockedIds.has(note.id)}
            onClick={() => { shareNote(note); onClose(); }}
          >
            Partager la note
          </button>
          <Sep />
          <button className={itemClass} onClick={() => setMoveOpen((v) => !v)}>
            Déplacer vers <span className="opacity-60">›</span>
          </button>
          {moveOpen && (
            <div className="ml-2.5 mt-0.5 flex flex-col gap-0.5 border-l-2 border-border pl-2">
              <button
                className={
                  'rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-accent hover:text-white ' +
                  (!note.folderId ? 'font-semibold' : '')
                }
                onClick={() => { moveNoteToFolder(note.id, null); onClose(); }}
              >
                {!note.folderId ? '✓ ' : ''}Toutes les notes
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  className={
                    'rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-accent hover:text-white ' +
                    (note.folderId === f.id ? 'font-semibold' : '')
                  }
                  onClick={() => { moveNoteToFolder(note.id, f.id); onClose(); }}
                >
                  {note.folderId === f.id ? '✓ ' : ''}{f.name}
                </button>
              ))}
            </div>
          )}
          <Sep />
          <button className={itemClass + ' text-danger'} onClick={() => { deleteNote(note.id); onClose(); }}>
            Supprimer
          </button>
        </>
      ) : (
        <>
          <button className={itemClass} onClick={() => { restoreNote(note.id); onClose(); }}>
            Récupérer
          </button>
          <Sep />
          <button className={itemClass + ' text-danger'} onClick={() => { deleteForever(note.id); onClose(); }}>
            Supprimer définitivement
          </button>
        </>
      )}
    </div>
  );
}

function Sep() {
  return <div className="my-1 border-t border-border" />;
}
