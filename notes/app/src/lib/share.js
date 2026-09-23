import { getPlainText } from './notesUtils';

// Partage réel, sans backend : l'API Web Share ouvre le menu de partage natif de l'OS
// (Mail, Messages, AirDrop...), exactement ce que fait le bouton "Partager" d'Apple Notes.
// Repli sur le presse-papiers quand le navigateur ne la supporte pas (Firefox desktop, etc.)
export async function shareNote(note) {
  const text = getPlainText(note.content);
  const title = text.split('\n').find(Boolean) || 'Note';

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
    } catch (err) {
      if (err?.name !== 'AbortError') console.error('Partage annulé :', err);
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    alert('Note copiée dans le presse-papiers.');
  } catch {
    alert("Impossible de partager : ce navigateur ne supporte ni le partage natif ni le presse-papiers.");
  }
}
