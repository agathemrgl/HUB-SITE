// Convertit le HTML exporté par Notes.app (chaque ligne = un <div>, un titre réel devient
// <h1>/<h2>/<h3> imbriqué dans le div) vers du HTML que TipTap sait lire nativement
// (des <p> pour le texte normal, les balises de titre remontées telles quelles, les listes
// et tableaux déjà en HTML standard passés tels quels).
export function convertAppleBodyToHtml(body) {
  let html = body || '';
  // Selon le compte (iCloud vs Exchange/IMAP), Notes.app exporte soit juste les <div> de
  // contenu, soit un document complet <html><head>...</head><body>...</body></html> : on
  // extrait explicitement le contenu du <body> plutôt que de compter sur la tolérance du
  // parseur HTML du navigateur pour les balises html/head/body imbriquées dans un <div>.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) html = bodyMatch[1];

  const source = document.createElement('div');
  source.innerHTML = html;
  const output = document.createElement('div');

  Array.from(source.childNodes).forEach((node) => {
    if (node.nodeType !== 1) {
      if (node.textContent && node.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = node.textContent;
        output.appendChild(p);
      }
      return;
    }

    const tag = node.tagName.toLowerCase();

    if (tag !== 'div') {
      // <ul>, <ol>, <table>... déjà en HTML standard, TipTap les parse tel quel.
      output.appendChild(node.cloneNode(true));
      return;
    }

    const onlyBr = node.childNodes.length === 1 && node.firstChild.nodeType === 1 && node.firstChild.tagName === 'BR';
    if (!node.textContent.trim() && (node.childNodes.length === 0 || onlyBr)) {
      output.appendChild(document.createElement('p'));
      return;
    }

    const singleChild = node.children.length === 1 ? node.children[0] : null;
    if (singleChild && /^H[1-6]$/.test(singleChild.tagName) && singleChild.textContent.trim() === node.textContent.trim()) {
      output.appendChild(singleChild.cloneNode(true));
      return;
    }

    const p = document.createElement('p');
    p.innerHTML = node.innerHTML;
    output.appendChild(p);
  });

  return output.innerHTML;
}
