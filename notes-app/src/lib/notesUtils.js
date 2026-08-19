// Le titre et l'extrait affichés dans la liste viennent du texte brut de la note
// (première ligne = titre, reste = extrait), jamais du HTML stocké — une seule source de
// vérité, comme dans la version vanilla.
export function extractPreview(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const text = (tmp.innerText || '').replace(/ /g, ' ');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length);
  return {
    title: lines[0] || 'Nouvelle note',
    snippet: lines.slice(1).join(' ') || '',
    isEmpty: lines.length === 0,
  };
}

export function getPlainText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.innerText || '').trim();
}

// Pour une note verrouillée non déverrouillée dans cette session, on n'expose ni le titre
// ni l'extrait réels, ni à l'affichage ni à la recherche.
export function getDisplayPreview(note, unlockedIds) {
  const hidden = note.locked && !unlockedIds.has(note.id);
  return hidden
    ? { title: 'Note verrouillée', snippet: '', isEmpty: false }
    : extractPreview(note.content);
}

export function formatListDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(
    'fr-FR',
    sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }
  );
}

export function formatFullDate(ts) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' à ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function sortNotes(pool, sortKey, unlockedIds) {
  const arr = [...pool];
  if (sortKey === 'created') {
    arr.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sortKey === 'title') {
    arr.sort((a, b) =>
      getDisplayPreview(a, unlockedIds).title.localeCompare(getDisplayPreview(b, unlockedIds).title, 'fr')
    );
  } else {
    arr.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return arr;
}

// Filtre + trie + sépare en section épinglée, à partir de l'état brut du store — le
// composant liste n'a qu'à afficher le résultat.
export function getVisibleNotes({ notes, currentFolderId, searchQuery, sortKey, unlockedIds }) {
  let pool;
  if (currentFolderId === 'trash') pool = notes.filter((n) => n.deleted);
  else if (currentFolderId === 'all') pool = notes.filter((n) => !n.deleted);
  else pool = notes.filter((n) => !n.deleted && n.folderId === currentFolderId);

  const query = searchQuery.trim().toLowerCase();
  if (query) {
    pool = pool.filter((n) => {
      const { title, snippet } = getDisplayPreview(n, unlockedIds);
      return (title + ' ' + snippet).toLowerCase().includes(query);
    });
  }

  const sorted = sortNotes(pool, sortKey, unlockedIds);
  const showPinned = currentFolderId !== 'trash';
  const pinned = showPinned ? sorted.filter((n) => n.pinned) : [];
  const rest = showPinned ? sorted.filter((n) => !n.pinned) : sorted;
  return { pinned, rest };
}
