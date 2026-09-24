import { useEffect, useRef } from 'react';
import { useEditor } from '@tiptap/react';
import extensions from './extensions';
import { useNotesStore } from '../store/useNotesStore';

// Encapsule l'instance TipTap et la synchronisation avec la note active du store.
//
// Le chargement/déchargement du contenu se fait dans un seul effet, déclenché par
// currentNoteId ET isLockedHidden : à chaque fois qu'il tourne, il commence par vider une
// sauvegarde en attente pour la note qu'on quitte (avec le contenu encore présent dans
// l'éditeur à cet instant, avant tout setContent) avant de charger la nouvelle — ce qui
// évite de perdre les toutes dernières frappes tapées juste avant de changer de note,
// dupliquer, ou verrouiller, sans que les composants appelants aient à y penser.
export function useNoteEditor() {
  const currentNoteId = useNotesStore((s) => s.currentNoteId);
  const notes = useNotesStore((s) => s.notes);
  const updateNoteContent = useNotesStore((s) => s.updateNoteContent);
  const unlockedIds = useNotesStore((s) => s.unlockedIds);

  const saveTimer = useRef(null);
  const loadingRef = useRef(false);
  const editingNoteIdRef = useRef(null);

  const currentNote = notes.find((n) => n.id === currentNoteId) || null;
  const isLockedHidden = !!currentNote?.locked && !unlockedIds.has(currentNote?.id);
  // Le contenu complet d'une note issue de la liste est chargé à la demande (voir
  // setCurrentNoteId dans le store) : reste `undefined` le temps de ce chargement.
  const contentLoading = !!currentNote && currentNote.content === undefined;

  const editor = useEditor({
    extensions,
    content: '',
    editorProps: {
      attributes: { class: 'note-editor-content' },
    },
    onUpdate: ({ editor: ed }) => {
      const id = editingNoteIdRef.current;
      if (!id || loadingRef.current) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        if (ed.isDestroyed) return;
        updateNoteContent(id, ed.getHTML());
      }, 300);
    },
  });

  useEffect(() => {
    // En StrictMode (dev), React monte/démonte/remonte les effets : l'éditeur d'un run
    // précédent peut être détruit (isDestroyed) pendant qu'une closure y fait encore
    // référence. Toute commande sur un éditeur détruit plante avec une erreur interne
    // TipTap peu explicite ("commandManager" est null) — on s'en protège partout ici.
    if (!editor || editor.isDestroyed) return;

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      const prevId = editingNoteIdRef.current;
      if (prevId) updateNoteContent(prevId, editor.getHTML());
    }

    loadingRef.current = true;
    try {
      if (!currentNote || isLockedHidden || contentLoading) {
        editingNoteIdRef.current = null;
        editor.commands.setContent('', { emitUpdate: false });
      } else {
        editingNoteIdRef.current = currentNote.id;
        editor.commands.setContent(currentNote.content || '', { emitUpdate: false });
      }
    } catch (err) {
      // Contenu importé malformé : on affiche un avertissement plutôt que de planter toute
      // l'app. Le HTML d'origine reste intact dans la base, rien n'est perdu.
      console.error('Contenu illisible pour la note', currentNote?.id, err);
      try {
        if (!editor.isDestroyed) {
          editor.commands.setContent(
            '<p>⚠️ Le contenu de cette note n\'a pas pu être affiché (import corrompu).</p>',
            { emitUpdate: false }
          );
        }
      } catch (err2) {
        console.error("Éditeur indisponible, impossible d'afficher le message de repli", err2);
      }
    }
    loadingRef.current = false;
    // currentNote est dérivé de `notes` (qui change à chaque frappe sauvegardée) : on ne
    // veut recharger le contenu que sur un vrai changement de note, pas à chaque re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, currentNoteId, isLockedHidden, contentLoading]);

  function flushPendingSave() {
    if (!editor || editor.isDestroyed || !saveTimer.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const id = editingNoteIdRef.current;
    if (id) updateNoteContent(id, editor.getHTML());
  }

  return { editor, currentNote, isLockedHidden, contentLoading, flushPendingSave };
}
