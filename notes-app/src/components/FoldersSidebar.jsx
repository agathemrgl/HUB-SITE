import { useRef } from 'react';
import { Plus, Trash2, StickyNote, Upload } from 'lucide-react';
import { useNotesStore } from '../store/useNotesStore';

export default function FoldersSidebar() {
  const folders = useNotesStore((s) => s.folders);
  const currentFolderId = useNotesStore((s) => s.currentFolderId);
  const setCurrentFolderId = useNotesStore((s) => s.setCurrentFolderId);
  const createFolder = useNotesStore((s) => s.createFolder);
  const deleteFolder = useNotesStore((s) => s.deleteFolder);
  const importAppleNotes = useNotesStore((s) => s.importAppleNotes);
  const notes = useNotesStore((s) => s.notes);
  const importInputRef = useRef(null);

  const allCount = notes.filter((n) => !n.deleted).length;
  const trashCount = notes.filter((n) => n.deleted).length;

  function handleCreateFolder() {
    const name = prompt('Nom du nouveau dossier :');
    if (name) createFolder(name);
  }

  function handleDeleteFolder(e, folder) {
    e.preventDefault();
    if (confirm(`Supprimer le dossier "${folder.name}" ? Les notes qu'il contient retourneront dans "Toutes les notes".`)) {
      deleteFolder(folder.id);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const items = JSON.parse(text);
      const { imported, skipped, withAttachments } = await importAppleNotes(items);
      let msg = `${imported} note(s) importée(s).`;
      if (skipped) msg += ` ${skipped} déjà importée(s) précédemment, ignorée(s).`;
      if (withAttachments.length) {
        msg += `\n\n${withAttachments.length} note(s) avaient des pièces jointes (images, fichiers) qui n'ont pas pu être transférées automatiquement :\n- ${withAttachments.slice(0, 15).join('\n- ')}${withAttachments.length > 15 ? '\n- …' : ''}`;
      }
      alert(msg);
    } catch (err) {
      alert("Impossible de lire ce fichier d'export : " + err.message);
    }
  }

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar">
      <div className="flex h-11 items-center justify-between border-b border-border px-3">
        <span className="text-sm font-semibold text-text-primary">Dossiers</span>
        <button
          type="button"
          onClick={handleCreateFolder}
          title="Nouveau dossier"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-accent-strong hover:bg-black/5"
        >
          <Plus size={15} strokeWidth={2.2} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3 pt-2">
        <FolderRow
          label="Toutes les notes"
          icon={StickyNote}
          count={allCount}
          active={currentFolderId === 'all'}
          onClick={() => setCurrentFolderId('all')}
        />

        {folders.map((f) => (
          <FolderRow
            key={f.id}
            label={f.name}
            count={notes.filter((n) => !n.deleted && n.folderId === f.id).length}
            active={currentFolderId === f.id}
            onClick={() => setCurrentFolderId(f.id)}
            onContextMenu={(e) => handleDeleteFolder(e, f)}
          />
        ))}

        <div className="my-2 border-t border-border" />

        <FolderRow
          label="Récemment supprimées"
          icon={Trash2}
          count={trashCount}
          active={currentFolderId === 'trash'}
          onClick={() => setCurrentFolderId('trash')}
          danger
        />

        <div className="my-2 border-t border-border" />

        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-text-secondary hover:bg-black/5"
        >
          <Upload size={15} strokeWidth={1.8} className="shrink-0 opacity-70" />
          <span>Importer depuis Apple Notes</span>
        </button>
        <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={handleImportFile} />
      </nav>
    </aside>
  );
}

function FolderRow({ label, icon: Icon, count, active, danger, ...props }) {
  return (
    <button
      type="button"
      className={
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] ' +
        (active ? 'bg-selected font-medium text-text-primary' : 'text-text-primary hover:bg-black/5') +
        (danger && !active ? ' text-danger/90' : '')
      }
      {...props}
    >
      {Icon && <Icon size={15} strokeWidth={1.8} className="shrink-0 opacity-70" />}
      <span className="flex-1 truncate">{label}</span>
      {count > 0 && <span className="text-xs text-text-secondary">{count}</span>}
    </button>
  );
}
