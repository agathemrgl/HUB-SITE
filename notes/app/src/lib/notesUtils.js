// Texte brut (sans balises) tiré du HTML d'une note, tronqué : c'est ce qui est persisté
// dans la colonne `preview` à chaque sauvegarde, pour que la liste n'ait jamais besoin de
// charger le contenu complet (images en base64 comprises) d'une note pour l'afficher.
const PREVIEW_MAX_CHARS = 500;

// `innerText` ne restitue les sauts de ligne entre blocs (paragraphes, titres...) que de
// façon fiable sur un élément réellement affiché dans la page ; sur un élément détaché
// (jamais ajouté au DOM, comme ici) son calcul dépend du rendu et varie selon le
// navigateur — d'où des sauts de ligne parfois absents. On insère nous-mêmes un \n après
// chaque balise de bloc avant de lire `textContent`, fiable quel que soit le rendu.
const BLOCK_BREAK_RE = /<\/(p|div|h[1-6]|li|blockquote|tr|pre)>|<br\s*\/?>/gi;

function htmlToPlainText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = (html || '').replace(BLOCK_BREAK_RE, (match) => match + '\n');
  return (tmp.textContent || '').replace(/ /g, ' ');
}

export function computePreviewText(html) {
  return htmlToPlainText(html).slice(0, PREVIEW_MAX_CHARS);
}

// Le titre et l'extrait affichés dans la liste viennent du texte brut de la note
// (première ligne = titre, reste = extrait), jamais du HTML stocké — une seule source de
// vérité, comme dans la version vanilla.
export function extractPreviewFromText(text) {
  const lines = (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length);
  return {
    title: lines[0] || 'Nouvelle note',
    snippet: lines.slice(1).join(' ') || '',
    isEmpty: lines.length === 0,
  };
}

export function extractPreview(html) {
  return extractPreviewFromText(computePreviewText(html));
}

export function getPlainText(html) {
  return htmlToPlainText(html).trim();
}

// Pour une note verrouillée non déverrouillée dans cette session, on n'expose ni le titre
// ni l'extrait réels, ni à l'affichage ni à la recherche. Utilise le `preview` déjà chargé
// en priorité (liste) ; ne recalcule depuis le HTML complet que si celui-ci est disponible
// en mémoire (note ouverte) et qu'aucun preview n'a encore été persisté.
export function getDisplayPreview(note, unlockedIds) {
  const hidden = note.locked && !unlockedIds.has(note.id);
  if (hidden) return { title: 'Note verrouillée', snippet: '', isEmpty: false };
  if (note.preview !== undefined) return extractPreviewFromText(note.preview);
  return extractPreview(note.content);
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
