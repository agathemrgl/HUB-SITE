const board = document.getElementById('workspace');
const viewport = board.closest('.board-viewport');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');
const zoomInButton = document.getElementById('zoom-in-button');
const zoomOutButton = document.getElementById('zoom-out-button');
const fileInput = document.getElementById('file-input');
const uploadCategory = document.getElementById('upload-category');
const categoryFileInputs = document.querySelectorAll('.category-file-input');
const bgToast = document.getElementById('bg-toast');
const bgToastText = document.getElementById('bg-toast-text');
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmOkBtn = document.getElementById('confirm-ok');
const confirmCancelBtn = document.getElementById('confirm-cancel');
const outfitBlock = document.querySelector('.w-block--outfit');
const outfitResizeHandle = document.getElementById('outfit-resize-handle');
const wardrobeEl = document.querySelector('.wardrobe');
const wardrobeStack = document.getElementById('wardrobe-stack');
const movableBlocks = document.querySelectorAll('.w-block--movable');
let pendingDelete = null;
const blockPositions = {};

// Fige la position/largeur actuelle (issue de la mise en page flex de départ) de chaque bloc
// déplaçable, pour pouvoir ensuite le déplacer librement n'importe où sans que le reste ne bouge.
function freezeWardrobeLayout() {
  const wardrobeRect = wardrobeEl.getBoundingClientRect();
  // Passe 1 : mesure tous les blocs pendant qu'ils sont encore dans le flux flex normal
  // (sortir un bloc du flux décale ses voisins, donc on ne doit rien appliquer pendant la mesure).
  const measured = [];
  movableBlocks.forEach(block => {
    const id = block.dataset.blockId;
    if (blockPositions[id]) return; // déjà restauré depuis l'état sauvegardé
    const rect = block.getBoundingClientRect();
    measured.push({
      block,
      id,
      pos: {
        left: (rect.left - wardrobeRect.left) / scale,
        top: (rect.top - wardrobeRect.top) / scale
      }
    });
  });
  // Passe 2 : applique les positions figées maintenant que toutes les mesures sont prises
  measured.forEach(({ block, id, pos }) => {
    applyBlockPosition(block, pos);
    blockPositions[id] = pos;
  });
}

// La largeur des blocs est toujours pilotée par le CSS (jamais figée ici), pour que les
// ajustements de style ne soient pas écrasés par une largeur mémorisée d'une session précédente.
function applyBlockPosition(block, pos) {
  block.style.position = 'absolute';
  block.style.left = `${pos.left}px`;
  block.style.top = `${pos.top}px`;
}

// Déplacement totalement libre d'un bloc à la souris, uniquement via son titre (pas via "+")
const BLOCK_GAP = 10; // espace minimum (px écran) à garder entre deux blocs déplaçables
// (doit rester <= au gap CSS de la mise en page par défaut, sinon la disposition de base
// elle-même serait considérée comme "en chevauchement" et se ferait réaligner à tort)

function rectsOverlapWithGap(a, b, gap) {
  return !(
    a.right + gap <= b.left ||
    a.left >= b.right + gap ||
    a.bottom + gap <= b.top ||
    a.top >= b.bottom + gap
  );
}

function blockCollides(block) {
  const rect = block.getBoundingClientRect();
  return Array.from(movableBlocks).some(other => {
    if (other === block) return false;
    return rectsOverlapWithGap(rect, other.getBoundingClientRect(), BLOCK_GAP);
  });
}

// Corrige d'éventuels chevauchements hérités d'un état sauvegardé avant l'anti-chevauchement
// (ou d'un ancien layout) : pousse chaque bloc sous celui déjà placé avec lequel il chevauche.
function resolveBlockOverlaps() {
  const placed = [];
  let changed = false;
  movableBlocks.forEach(block => {
    let guard = 0;
    while (guard < 30) {
      const rect = block.getBoundingClientRect();
      const collider = placed.find(other => rectsOverlapWithGap(rect, other.getBoundingClientRect(), BLOCK_GAP));
      if (!collider) break;
      const colliderRect = collider.getBoundingClientRect();
      const pushDown = (colliderRect.bottom - rect.top) + BLOCK_GAP;
      const currentTop = parseFloat(block.style.top) || 0;
      block.style.top = `${currentTop + pushDown / scale}px`;
      changed = true;
      guard++;
    }
    placed.push(block);
    const id = block.dataset.blockId;
    blockPositions[id] = {
      ...blockPositions[id],
      left: parseFloat(block.style.left) || 0,
      top: parseFloat(block.style.top) || 0
    };
  });
  if (changed) saveCurrentState();
}

function enableBlockDrag(block) {
  const id = block.dataset.blockId;
  const header = block.querySelector('.w-block-header');

  header.addEventListener('pointerdown', event => {
    if (event.target.closest('.w-add-btn')) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const originLeft = parseFloat(block.style.left) || 0;
    const originTop = parseFloat(block.style.top) || 0;
    header.setPointerCapture(event.pointerId);
    block.classList.add('is-dragging');

    const move = moveEvent => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;
      block.style.left = `${originLeft + deltaX}px`;
      block.style.top = `${originTop + deltaY}px`;
    };
    const up = () => {
      header.releasePointerCapture(event.pointerId);
      block.classList.remove('is-dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);

      // Si le nouvel emplacement chevauche un autre bloc (en tenant compte du gap minimum),
      // on annule le déplacement et le bloc revient à sa position de départ.
      if (blockCollides(block)) {
        block.style.left = `${originLeft}px`;
        block.style.top = `${originTop}px`;
      }

      blockPositions[id] = {
        ...blockPositions[id],
        left: parseFloat(block.style.left),
        top: parseFloat(block.style.top)
      };
      saveCurrentState();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

movableBlocks.forEach(enableBlockDrag);

// Détermine où poser un vêtement/étiquette lâché à un point écran donné : à l'intérieur du bloc
// Outfits (il y devient "ancré", donc suit le bloc s'il est déplacé), sinon sur le plan de travail.
function resolveDrop(clientX, clientY) {
  const outfitRect = outfitBlock.getBoundingClientRect();
  const insideOutfit = clientX >= outfitRect.left && clientX <= outfitRect.right && clientY >= outfitRect.top && clientY <= outfitRect.bottom;
  if (insideOutfit) {
    return {
      parent: outfitBlock,
      x: (clientX - outfitRect.left) / scale - dragOffset.x / scale,
      y: (clientY - outfitRect.top) / scale - dragOffset.y / scale
    };
  }
  const viewportRect = viewport.getBoundingClientRect();
  return {
    parent: board,
    x: (clientX - viewportRect.left - boardOffset.x) / scale - dragOffset.x / scale,
    y: (clientY - viewportRect.top - boardOffset.y) / scale - dragOffset.y / scale
  };
}

// Après un déplacement d'un item déjà posé, ré-évalue s'il doit être ancré au bloc Outfits
// (pour le suivre quand ce bloc bouge) ou rattaché au plan de travail, selon sa position actuelle.
function reanchorElement(element, state) {
  const rect = element.getBoundingClientRect();
  const outfitRect = outfitBlock.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const insideOutfit = centerX >= outfitRect.left && centerX <= outfitRect.right && centerY >= outfitRect.top && centerY <= outfitRect.bottom;
  const targetParent = insideOutfit ? outfitBlock : board;

  if (element.parentElement !== targetParent) {
    const targetRect = targetParent.getBoundingClientRect();
    const newLeft = (rect.left - targetRect.left) / scale;
    const newTop = (rect.top - targetRect.top) / scale;
    targetParent.appendChild(element);
    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
    if (state) {
      state.x = newLeft;
      state.y = newTop;
      state.anchor = insideOutfit ? 'outfit' : 'board';
    }
  } else if (state) {
    state.x = parseInt(element.style.left, 10);
    state.y = parseInt(element.style.top, 10);
  }
}

const OUTFIT_MIN_WIDTH = 250;
const OUTFIT_MIN_HEIGHT = 250;

// Redimensionnement du bloc Outfits (largeur + hauteur) à la souris via sa poignée
outfitResizeHandle.addEventListener('pointerdown', event => {
  event.preventDefault();
  event.stopPropagation();
  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = outfitBlock.offsetWidth;
  const startHeight = outfitBlock.offsetHeight;
  outfitResizeHandle.setPointerCapture(event.pointerId);

  const move = moveEvent => {
    const deltaX = (moveEvent.clientX - startX) / scale;
    const deltaY = (moveEvent.clientY - startY) / scale;
    outfitBlock.style.width = `${Math.max(OUTFIT_MIN_WIDTH, startWidth + deltaX)}px`;
    outfitBlock.style.height = `${Math.max(OUTFIT_MIN_HEIGHT, startHeight + deltaY)}px`;
  };
  const up = () => {
    outfitResizeHandle.releasePointerCapture(event.pointerId);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    saveCurrentState();
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

function askDeleteWardrobeItem(item, category) {
  pendingDelete = { type: 'wardrobe', item, category };
  confirmOverlay.classList.add('is-visible');
}

function askDeleteTag(label) {
  pendingDelete = { type: 'tag', label };
  confirmOverlay.classList.add('is-visible');
}

function closeConfirm() {
  confirmOverlay.classList.remove('is-visible');
  pendingDelete = null;
}

confirmCancelBtn.addEventListener('click', closeConfirm);
confirmOverlay.addEventListener('click', event => {
  if (event.target === confirmOverlay) closeConfirm();
});
confirmOkBtn.addEventListener('click', () => {
  if (!pendingDelete) return;
  if (pendingDelete.type === 'tag') {
    const idx = TAGS.indexOf(pendingDelete.label);
    if (idx !== -1) TAGS.splice(idx, 1);
    populateTags();
    saveCurrentState();
    closeConfirm();
    return;
  }
  const { item, category } = pendingDelete;
  categories[category] = categories[category].filter(i => i.id !== item.id);
  populateCategories();
  saveCurrentState();
  closeConfirm();
});

const BG_REMOVAL_CDN = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
let bgRemovalModulePromise = null;

function loadBgRemoval() {
  if (!bgRemovalModulePromise) {
    bgRemovalModulePromise = import(/* webpackIgnore: true */ BG_REMOVAL_CDN);
  }
  return bgRemovalModulePromise;
}

function showBgToast(text) {
  bgToastText.textContent = text;
  bgToast.classList.add('is-visible');
}

function hideBgToast() {
  bgToast.classList.remove('is-visible');
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Détoure l'image (fond transparent) via un modèle IA chargé depuis un CDN.
// En cas d'échec (pas de réseau, etc.), on retombe sur l'image d'origine.
async function removeImageBackground(file) {
  try {
    showBgToast('Détourage du fond…');
    const { removeBackground } = await loadBgRemoval();
    const resultBlob = await removeBackground(file, {
      output: { format: 'image/png' },
      progress: (key, current, total) => {
        if (total) showBgToast(`Détourage du fond… ${Math.round((current / total) * 100)}%`);
      }
    });
    return await blobToDataURL(resultBlob);
  } catch (error) {
    console.warn('Détourage du fond impossible, image originale conservée', error);
    return await blobToDataURL(file);
  }
}

async function handleFilesForCategory(files, category) {
  if (!files.length) return;
  for (const file of files) {
    const image = await removeImageBackground(file);
    const item = {
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label: file.name.replace(/\.[^/.]+$/, ''),
      image
    };
    categories[category].push(item);
    populateCategories();
    saveCurrentState();
  }
  hideBgToast();
}

const STATE_VERSION = 7;

const ICON_SAVE = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;
const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const categories = {
  tops: [
    { id: 'top-1', label: 'T-shirt rose 1', image: 'sources/vetements/tshirt-rose.png' },
    { id: 'top-2', label: 'T-shirt rose 2', image: 'sources/vetements/tshirt-rose2.png' },
    { id: 'top-3', label: 'T-shirt rose 3', image: 'sources/vetements/tshirt-rose3.png' }
  ],
  bottoms: [
    { id: 'bottom-1', label: 'Baggy 1', image: 'sources/vetements/bas-baggy.png' },
    { id: 'bottom-2', label: 'Baggy 2', image: 'sources/vetements/bas-baggy2.png' },
    { id: 'bottom-3', label: 'Baggy 3', image: 'sources/vetements/bas-baggy3.png' }
  ],
  shoes:       [],
  accessories: []
};

let workspaceItems = [];
let workspaceTags = [];
let boardOffset = { x: 0, y: 0 };
let scale = window.matchMedia('(max-width: 720px)').matches ? 0.7 : 1;
const SCALE_MIN = 0.2;
const SCALE_MAX = 3;
const SCALE_STEP = 0.15;

let currentDrag = null;
let dragOffset = { x: 0, y: 0 };

function updateBoardTransform() {
  board.style.transform = `translate(${boardOffset.x}px, ${boardOffset.y}px) scale(${scale})`;
  updateBackgroundGrid();
}

function updateBackgroundGrid() {
  const tileSize = 80 * scale;
  // Modulo positif pour que la grille suive le pan sans sauter
  const offX = ((boardOffset.x % tileSize) + tileSize) % tileSize;
  const offY = ((boardOffset.y % tileSize) + tileSize) % tileSize;
  document.body.style.backgroundSize = `${tileSize}px ${tileSize}px, ${tileSize}px ${tileSize}px, 100% 100%`;
  document.body.style.backgroundPosition = `${offX}px ${offY}px, ${offX}px ${offY}px, 0 0`;
}

// Zoom centré sur un point pivot (en coords viewport)
function zoomTo(newScale, pivotX, pivotY) {
  newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, newScale));
  const ratio = newScale / scale;
  boardOffset.x = pivotX - (pivotX - boardOffset.x) * ratio;
  boardOffset.y = pivotY - (pivotY - boardOffset.y) * ratio;
  scale = newScale;
  updateBoardTransform();
  updateZoomLabel();
}

function updateZoomLabel() {
  const el = document.getElementById('zoom-level');
  if (el) el.textContent = `${Math.round(scale * 100)}%`;
}

function viewportCenter() {
  const r = viewport.getBoundingClientRect();
  return { x: r.width / 2, y: r.height / 2 };
}

function createItemCard(item, category) {
  const card = document.createElement('div');
  card.className = 'wardrobe-item';
  card.dataset.category = category;
  card.dataset.id = item.id;

  if (item.image) {
    const img = document.createElement('img');
    img.className = 'wardrobe-item-img';
    img.src = item.image;
    img.alt = item.label;
    img.draggable = false;
    card.appendChild(img);
  } else {
    const swatch = document.createElement('div');
    swatch.className = 'wardrobe-item-swatch';
    swatch.style.background = item.color;
    card.appendChild(swatch);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'wardrobe-item-delete';
  deleteBtn.title = 'Supprimer';
  deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  deleteBtn.addEventListener('pointerdown', e => e.stopPropagation());
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    askDeleteWardrobeItem(item, category);
  });
  card.appendChild(deleteBtn);

  card.addEventListener('pointerdown', event => {
    event.stopPropagation();
    beginDrag(event, card, item);
  });

  return card;
}

function buildWorkspaceEl(item, id, category) {
  const el = document.createElement('div');
  el.className = 'workspace-item';
  el.dataset.id = id;
  el.dataset.category = category;

  if (item.image) {
    const img = document.createElement('img');
    img.className = 'workspace-item-img';
    img.src = item.image;
    img.alt = item.label;
    img.draggable = false;
    el.appendChild(img);
  } else {
    const preview = document.createElement('div');
    preview.className = 'workspace-item-preview';
    preview.style.background = item.color;
    preview.textContent = item.label;
    el.appendChild(preview);
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = item.label;
    el.appendChild(label);
  }

  // Bouton supprimer
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.title = 'Supprimer';
  deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  deleteBtn.addEventListener('pointerdown', e => e.stopPropagation());
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    el.remove();
    workspaceItems = workspaceItems.filter(i => i.id !== id);
    saveCurrentState();
  });
  el.appendChild(deleteBtn);

  return el;
}

function populateCategories() {
  Object.entries(categories).forEach(([category, items]) => {
    const list = document.getElementById(`${category}-list`);
    list.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'wardrobe-empty';
      empty.textContent = "Il n'y a pas d'éléments ici. Ajoutes-en !";
      list.appendChild(empty);
    }
    items.forEach(item => {
      list.appendChild(createItemCard(item, category));
    });
  });
}

const DRAG_THRESHOLD = 6; // px avant de considérer le geste comme un vrai drag (sinon = clic)

function beginDrag(event, card, item) {
  if (currentDrag) return; // protection anti-duplication
  event.preventDefault();
  const rect = card.getBoundingClientRect();

  currentDrag = {
    element: null,
    item,
    category: card.dataset.category,
    sourceCard: card,
    rectWidth: rect.width,
    rectHeight: rect.height,
    startX: event.clientX,
    startY: event.clientY,
    hasMoved: false
  };
  dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };

  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
}

// Trouve le bloc étagère (Hauts/Bas/Chaussures/Accessoires) sous un point écran, s'il y en a un
function getShelfBlockAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const block = el ? el.closest('.w-block') : null;
  if (!block) return null;
  const list = block.querySelector('.wardrobe-items');
  // Seules les vraies étagères de catégorie (Hauts/Bas/Chaussures/Accessoires) ont un data-category.
  // Le bloc Outfits contient aussi une .wardrobe-items (les étiquettes) mais ce n'est pas une étagère
  // de reclassement : on ne doit pas le traiter comme telle, sinon le dépôt d'un vêtement dessus échoue.
  return list && list.dataset.category ? { block, category: list.dataset.category } : null;
}

function moveItemToCategory(item, fromCategory, toCategory) {
  if (!toCategory || fromCategory === toCategory) return;
  const idx = categories[fromCategory].findIndex(i => i.id === item.id);
  if (idx === -1) return;
  const [moved] = categories[fromCategory].splice(idx, 1);
  categories[toCategory].push(moved);
  populateCategories();
  saveCurrentState();
}

function moveDrag(event) {
  if (!currentDrag) return;

  if (!currentDrag.hasMoved) {
    const dx = event.clientX - currentDrag.startX;
    const dy = event.clientY - currentDrag.startY;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return; // pas encore assez de mouvement : peut-être un simple clic
    currentDrag.hasMoved = true;

    // Le seuil est dépassé : on crée seulement maintenant le clone flottant
    const clone = currentDrag.sourceCard.cloneNode(true);
    clone.classList.add('workspace-item');
    clone.style.width = `${currentDrag.rectWidth}px`;
    clone.style.position = 'fixed';
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    currentDrag.element = clone;
  }

  currentDrag.element.style.left = `${event.clientX - dragOffset.x}px`;
  currentDrag.element.style.top = `${event.clientY - dragOffset.y}px`;

  // Met en surbrillance l'étagère survolée si elle diffère de la catégorie d'origine
  document.querySelectorAll('.w-block.is-drop-target').forEach(el => el.classList.remove('is-drop-target'));
  const hit = getShelfBlockAt(event.clientX, event.clientY);
  if (hit && hit.category !== currentDrag.category) {
    hit.block.classList.add('is-drop-target');
  }
}

function endDrag(event) {
  if (!currentDrag) return;
  document.querySelectorAll('.w-block.is-drop-target').forEach(el => el.classList.remove('is-drop-target'));

  if (!currentDrag.hasMoved) {
    // Simple clic (pas de drag) : bascule l'affichage de la croix de suppression
    toggleWardrobeItemSelection(currentDrag.sourceCard);
  } else {
    const hit = getShelfBlockAt(event.clientX, event.clientY);
    if (hit) {
      // Lâché sur une étagère : reclasse l'item dans cette catégorie
      moveItemToCategory(currentDrag.item, currentDrag.category, hit.category);
    } else {
      const viewportRect = viewport.getBoundingClientRect();
      if (
        event.clientX >= viewportRect.left &&
        event.clientX <= viewportRect.right &&
        event.clientY >= viewportRect.top &&
        event.clientY <= viewportRect.bottom
      ) {
        // Lâché hors des étagères : pose sur le board, ou dans le bloc Outfits si lâché dessus
        // (il y sera alors ancré et suivra ce bloc s'il est déplacé)
        const drop = resolveDrop(event.clientX, event.clientY);
        addWorkspaceItem(currentDrag.item, currentDrag.category, drop.x, drop.y, drop.parent);
      }
    }
    if (currentDrag.element) currentDrag.element.remove();
  }

  currentDrag = null;
  window.removeEventListener('pointermove', moveDrag);
  window.removeEventListener('pointerup', endDrag);
}

function toggleWardrobeItemSelection(card) {
  const already = card.classList.contains('is-selected');
  document.querySelectorAll('.wardrobe-item.is-selected, .tag-item.is-selected').forEach(el => el.classList.remove('is-selected'));
  if (!already) card.classList.add('is-selected');
}

// Clic en dehors d'un item d'étagère ou d'une étiquette : désélectionne (masque la croix)
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.wardrobe-item') && !event.target.closest('.tag-item')) {
    document.querySelectorAll('.wardrobe-item.is-selected, .tag-item.is-selected').forEach(el => el.classList.remove('is-selected'));
  }
});

function addWorkspaceItem(item, category, x, y, parent = board) {
  const id = `ws-${item.id}-${Date.now()}`;
  const element = buildWorkspaceEl(item, id, category);
  // Bornes dynamiques (basées sur la taille réelle du parent) pour pouvoir
  // déposer un vêtement n'importe où dessus, y compris tout en bas près du bloc Outfit
  const maxX = parent.clientWidth - 40;
  const maxY = parent.clientHeight - 40;
  element.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
  element.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
  parent.appendChild(element);

  enableWorkspaceDrag(element, workspaceItems);
  workspaceItems.push({
    id, item, category,
    x: parseInt(element.style.left, 10),
    y: parseInt(element.style.top, 10),
    anchor: parent === outfitBlock ? 'outfit' : 'board'
  });
  updateWorkspaceVisibility();
  saveCurrentState();
}

function buildWorkspaceTagEl(label, id) {
  const el = document.createElement('div');
  el.className = 'workspace-tag';
  el.dataset.id = id;
  el.textContent = label;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.title = 'Supprimer';
  deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  deleteBtn.addEventListener('pointerdown', e => e.stopPropagation());
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    el.remove();
    workspaceTags = workspaceTags.filter(t => t.id !== id);
    saveCurrentState();
  });
  el.appendChild(deleteBtn);

  return el;
}

function addWorkspaceTag(label, x, y, parent = board) {
  const id = `tag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const element = buildWorkspaceTagEl(label, id);
  const maxX = parent.clientWidth - 40;
  const maxY = parent.clientHeight - 40;
  element.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
  element.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
  parent.appendChild(element);

  enableWorkspaceDrag(element, workspaceTags);
  workspaceTags.push({
    id, label,
    x: parseInt(element.style.left, 10),
    y: parseInt(element.style.top, 10),
    anchor: parent === outfitBlock ? 'outfit' : 'board'
  });
  saveCurrentState();
}

const TAGS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Soirée', 'Journée', 'Plage', 'Ski', 'Sport'];
let currentTagDrag = null;

function createTagCard(label) {
  const card = document.createElement('div');
  card.className = 'tag-item';
  card.textContent = label;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'wardrobe-item-delete';
  deleteBtn.title = 'Supprimer';
  deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  deleteBtn.addEventListener('pointerdown', e => e.stopPropagation());
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    askDeleteTag(label);
  });
  card.appendChild(deleteBtn);

  card.addEventListener('pointerdown', event => {
    event.stopPropagation();
    beginTagDrag(event, card, label);
  });

  return card;
}

function populateTags() {
  const list = document.getElementById('tags-list');
  list.innerHTML = '';
  TAGS.forEach(label => list.appendChild(createTagCard(label)));
}

function beginTagDrag(event, card, label) {
  if (currentTagDrag) return;
  event.preventDefault();
  const rect = card.getBoundingClientRect();
  currentTagDrag = {
    element: null,
    label,
    sourceCard: card,
    startX: event.clientX,
    startY: event.clientY,
    hasMoved: false
  };
  dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };

  window.addEventListener('pointermove', moveTagDrag);
  window.addEventListener('pointerup', endTagDrag);
}

function moveTagDrag(event) {
  if (!currentTagDrag) return;

  if (!currentTagDrag.hasMoved) {
    const dx = event.clientX - currentTagDrag.startX;
    const dy = event.clientY - currentTagDrag.startY;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    currentTagDrag.hasMoved = true;

    const clone = document.createElement('div');
    clone.className = 'workspace-tag';
    clone.textContent = currentTagDrag.label;
    clone.style.position = 'fixed';
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    currentTagDrag.element = clone;
  }

  currentTagDrag.element.style.left = `${event.clientX - dragOffset.x}px`;
  currentTagDrag.element.style.top = `${event.clientY - dragOffset.y}px`;
}

function endTagDrag(event) {
  if (!currentTagDrag) return;

  if (!currentTagDrag.hasMoved) {
    // Simple clic (pas de drag) : bascule l'affichage de la croix de suppression
    toggleWardrobeItemSelection(currentTagDrag.sourceCard);
  } else {
    const viewportRect = viewport.getBoundingClientRect();
    if (
      event.clientX >= viewportRect.left &&
      event.clientX <= viewportRect.right &&
      event.clientY >= viewportRect.top &&
      event.clientY <= viewportRect.bottom
    ) {
      const drop = resolveDrop(event.clientX, event.clientY);
      addWorkspaceTag(currentTagDrag.label, drop.x, drop.y, drop.parent);
    }
    if (currentTagDrag.element) currentTagDrag.element.remove();
  }

  currentTagDrag = null;
  window.removeEventListener('pointermove', moveTagDrag);
  window.removeEventListener('pointerup', endTagDrag);
}

// stateList : le tableau (workspaceItems ou workspaceTags) où persister x/y après déplacement
function enableWorkspaceDrag(element, stateList) {
  let startX, startY, originX, originY;
  element.addEventListener('pointerdown', event => {
    event.stopPropagation();
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    startX = event.clientX;
    startY = event.clientY;
    originX = parseInt(element.style.left, 10);
    originY = parseInt(element.style.top, 10);
    element.style.cursor = 'grabbing';

    const move = moveEvent => {
      // Les deltas écran sont divisés par scale pour obtenir les deltas plateau
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;
      element.style.left = `${originX + deltaX}px`;
      element.style.top = `${originY + deltaY}px`;
    };

    const up = () => {
      element.style.cursor = 'grab';
      element.releasePointerCapture(event.pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const state = stateList.find(item => item.id === element.dataset.id);
      reanchorElement(element, state);
      saveCurrentState();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  // Mobile : tap sur l'élément pour faire apparaître/masquer le bouton ✕
  element.addEventListener('click', e => {
    if (!window.matchMedia('(hover: hover)').matches && !e.target.closest('.delete-btn')) {
      const already = element.classList.contains('is-selected');
      document.querySelectorAll('.workspace-item.is-selected, .workspace-tag.is-selected').forEach(el => el.classList.remove('is-selected'));
      if (!already) element.classList.add('is-selected');
    }
  });
}

// Mobile : tap sur le canvas vide → désélectionner
board.addEventListener('click', e => {
  if (!e.target.closest('.workspace-item') && !e.target.closest('.workspace-tag')) {
    document.querySelectorAll('.workspace-item.is-selected, .workspace-tag.is-selected').forEach(el => el.classList.remove('is-selected'));
  }
});

function updateWorkspaceVisibility() {}

function saveCurrentState() {
  const state = {
    boardOffset,
    scale,
    version: STATE_VERSION,
    workspaceItems: workspaceItems.map(item => ({ id: item.id, item: item.item, category: item.category, x: item.x, y: item.y, anchor: item.anchor })),
    workspaceTags: workspaceTags.map(t => ({ id: t.id, label: t.label, x: t.x, y: t.y, anchor: t.anchor })),
    outfitWidth: outfitBlock.offsetWidth,
    outfitHeight: outfitBlock.offsetHeight,
    tags: TAGS,
    // Seule la position du bloc Outfits (redimensionnable, donc clairement personnalisé) est
    // mémorisée. Les blocs vêtements restent toujours alignés sur la disposition de base au
    // rechargement : le déplacement à la souris reste possible mais n'est jamais obligatoire.
    blockPositions: { outfit: blockPositions.outfit },
    // On sauvegarde le classement complet (y compris les items par défaut) pour que
    // les reclassements entre étagères (drag & drop) survivent au rechargement.
    categories
  };
  localStorage.setItem('armoire-proto-state', JSON.stringify(state));
}

function restoreState() {
  const raw = localStorage.getItem('armoire-proto-state');
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    if (state.version !== STATE_VERSION) {
      localStorage.removeItem('armoire-proto-state');
      return;
    }
    if (typeof state.outfitWidth === 'number') {
      outfitBlock.style.width = `${Math.max(OUTFIT_MIN_WIDTH, state.outfitWidth)}px`;
    }
    if (typeof state.outfitHeight === 'number') {
      outfitBlock.style.height = `${Math.max(OUTFIT_MIN_HEIGHT, state.outfitHeight)}px`;
    }
    // Restaure le classement complet tel qu'il était (defaults reclassés + items custom)
    if (state.categories) {
      Object.keys(categories).forEach(cat => {
        if (Array.isArray(state.categories[cat])) {
          categories[cat] = state.categories[cat];
        }
      });
    }
    populateCategories();
    if (Array.isArray(state.tags)) {
      TAGS.length = 0;
      state.tags.forEach(label => TAGS.push(label));
    }
    populateTags();
    if (state.blockPositions) {
      // Seul le bloc Outfits garde une position mémorisée ; les blocs vêtements restent
      // toujours alignés sur la disposition de base (voir saveCurrentState).
      const pos = state.blockPositions.outfit;
      const block = document.querySelector('.w-block--movable[data-block-id="outfit"]');
      if (block && pos) {
        applyBlockPosition(block, pos);
        blockPositions.outfit = pos;
      }
    }
    if (Array.isArray(state.workspaceItems)) {
      state.workspaceItems.forEach(saved => {
        workspaceItems.push(saved);
        const element = buildWorkspaceEl(saved.item, saved.id, saved.category);
        element.style.left = `${saved.x}px`;
        element.style.top = `${saved.y}px`;
        const parent = saved.anchor === 'outfit' ? outfitBlock : board;
        parent.appendChild(element);
        enableWorkspaceDrag(element, workspaceItems);
      });
    }
    if (Array.isArray(state.workspaceTags)) {
      state.workspaceTags.forEach(saved => {
        workspaceTags.push(saved);
        const element = buildWorkspaceTagEl(saved.label, saved.id);
        element.style.left = `${saved.x}px`;
        element.style.top = `${saved.y}px`;
        const parent = saved.anchor === 'outfit' ? outfitBlock : board;
        parent.appendChild(element);
        enableWorkspaceDrag(element, workspaceTags);
      });
    }
    updateWorkspaceVisibility();
  } catch (error) {
    console.warn('Impossible de restaurer l\'état', error);
  }
}

// Zoom molette/trackpad centré sur le curseur
viewport.addEventListener('wheel', event => {
  event.preventDefault();
  if (event.ctrlKey) {
    // Pincement trackpad (le navigateur le signale via ctrlKey) ou Ctrl/Cmd + molette : zoom centré sur le curseur
    const viewportRect = viewport.getBoundingClientRect();
    const pivotX = event.clientX - viewportRect.left;
    const pivotY = event.clientY - viewportRect.top;
    const newScale = scale * (1 - event.deltaY * 0.008);
    zoomTo(newScale, pivotX, pivotY);
  } else {
    // Scroll classique (molette ou deux doigts sur trackpad) : déplace le plan de travail
    boardOffset.x -= event.deltaX;
    boardOffset.y -= event.deltaY;
    updateBoardTransform();
  }
  saveCurrentState();
}, { passive: false });

zoomInButton.addEventListener('click', () => {
  const c = viewportCenter();
  zoomTo(scale * (1 + SCALE_STEP), c.x, c.y);
  saveCurrentState();
});

zoomOutButton.addEventListener('click', () => {
  const c = viewportCenter();
  zoomTo(scale * (1 - SCALE_STEP), c.x, c.y);
  saveCurrentState();
});

saveButton.addEventListener('click', () => {
  saveCurrentState();
  saveButton.innerHTML = ICON_CHECK;
  setTimeout(() => (saveButton.innerHTML = ICON_SAVE), 1400);
});

resetButton.addEventListener('click', () => {
  window.location.reload();
});

fileInput.addEventListener('change', event => {
  const files = Array.from(event.target.files);
  const category = uploadCategory.value;
  event.target.value = '';
  handleFilesForCategory(files, category);
});

// Boutons "+" à côté de chaque titre d'étagère (Hauts, Bas, Chaussures, Accessoires)
categoryFileInputs.forEach(input => {
  input.addEventListener('change', event => {
    const files = Array.from(event.target.files);
    const category = input.dataset.category;
    event.target.value = '';
    const btn = input.closest('.w-add-btn');
    if (btn) btn.classList.add('is-loading');
    handleFilesForCategory(files, category).finally(() => {
      if (btn) btn.classList.remove('is-loading');
    });
  });
});

function centerOnWelcome() {
  const welcome = document.querySelector('.bg-welcome');
  if (!welcome) return;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  // Le bloc a left:50% + transform:translateX(-50%), donc son centre visuel
  // est exactement à offsetLeft (= 50% du canvas = 1200px), pas offsetLeft + offsetWidth/2
  const cx = welcome.offsetLeft;
  const cy = welcome.offsetTop + welcome.offsetHeight / 2;
  boardOffset.x = vw / 2 - cx * scale;
  boardOffset.y = vh / 2 - cy * scale;
  updateBoardTransform();
  updateZoomLabel();
}

// Garde le point actuellement au centre de la fenêtre bien centré après un redimensionnement,
// au lieu de recentrer sur "Bienvenue" ou de laisser le point de vue dériver.
let lastViewportSize = { w: viewport.clientWidth, h: viewport.clientHeight };

function onResize() {
  const newVw = viewport.clientWidth;
  const newVh = viewport.clientHeight;
  const boardCenterX = (lastViewportSize.w / 2 - boardOffset.x) / scale;
  const boardCenterY = (lastViewportSize.h / 2 - boardOffset.y) / scale;
  boardOffset.x = newVw / 2 - boardCenterX * scale;
  boardOffset.y = newVh / 2 - boardCenterY * scale;
  updateBoardTransform();
  lastViewportSize = { w: newVw, h: newVh };
}

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
    event.preventDefault();
    saveCurrentState();
    saveButton.innerHTML = ICON_CHECK;
    setTimeout(() => (saveButton.innerHTML = ICON_SAVE), 1400);
  }
});

const mobileQuery = window.matchMedia('(max-width: 720px)');

function animateToBreakpoint(isMobile) {
  const targetScale = isMobile ? 0.7 : 1;
  const welcome = document.querySelector('.bg-welcome');
  if (!welcome) return;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const cx = welcome.offsetLeft;
  const cy = welcome.offsetTop + welcome.offsetHeight / 2;

  scale = targetScale;
  boardOffset.x = vw / 2 - cx * targetScale;
  boardOffset.y = vh / 2 - cy * targetScale;

  board.classList.add('is-transitioning');
  updateBoardTransform();
  updateZoomLabel();

  board.addEventListener('transitionend', () => {
    board.classList.remove('is-transitioning');
  }, { once: true });

  lastViewportSize = { w: vw, h: vh };
}

mobileQuery.addEventListener('change', e => animateToBreakpoint(e.matches));
window.addEventListener('resize', onResize);
window.addEventListener('DOMContentLoaded', () => {
  populateCategories();
  populateTags();
  restoreState();
  freezeWardrobeLayout();
  resolveBlockOverlaps();
  document.fonts.ready.then(() => {
    centerOnWelcome();
    lastViewportSize = { w: viewport.clientWidth, h: viewport.clientHeight };
  });
});
