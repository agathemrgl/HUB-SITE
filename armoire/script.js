const board = document.getElementById('workspace');
const viewport = board.closest('.board-viewport');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');
const zoomInButton = document.getElementById('zoom-in-button');
const zoomOutButton = document.getElementById('zoom-out-button');
const fileInput = document.getElementById('file-input');
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

// Sous 720px, le plateau de travail desktop (canvas, pan/zoom, drag & drop) est masqué au
// profit d'une app à onglets indépendante (voir renderMobile* plus bas) : ce n'est jamais
// la même mise en page redimensionnée, mais une expérience distincte pensée pour le tactile.
const mobileQuery = window.matchMedia('(max-width: 720px)');
const DELETE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

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
    renderCreaCanvas();
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

function askDeleteOutfit(outfit) {
  pendingDelete = { type: 'outfit', outfit };
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
  if (pendingDelete.type === 'outfit') {
    savedOutfits = savedOutfits.filter(o => o.id !== pendingDelete.outfit.id);
    populateSavedOutfits();
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

const STATE_VERSION = 8;

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
let savedOutfits = [];
let outfitCounter = 0;
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

// Retire un item/tag posé sur le plateau (board ou bloc Outfits), DOM + état, quel que
// soit l'endroit d'où l'action est déclenchée (croix desktop ou croix de l'app mobile).
function removeWorkspaceItemById(id) {
  const el = document.querySelector(`.workspace-item[data-id="${id}"]`);
  if (el) el.remove();
  workspaceItems = workspaceItems.filter(i => i.id !== id);
  renderCreaCanvas();
}

function removeWorkspaceTagById(id) {
  const el = document.querySelector(`.workspace-tag[data-id="${id}"]`);
  if (el) el.remove();
  workspaceTags = workspaceTags.filter(t => t.id !== id);
  renderCreaCanvas();
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
    removeWorkspaceItemById(id);
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
  renderMobileDressing();
  renderCreaStrip();
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
  // déposer un vêtement n'importe où dessus, y compris tout en bas près du bloc Outfit.
  // Si le parent est masqué (display:none, ex. le plateau desktop pendant qu'on est en
  // vue mobile), sa taille vaut 0 : on ne borne alors pas du tout, plutôt que d'écraser
  // toute position à (0,0) — ce qui viendrait empiler tous les éléments au même endroit.
  const maxX = parent.clientWidth > 0 ? parent.clientWidth - 40 : Infinity;
  const maxY = parent.clientHeight > 0 ? parent.clientHeight - 40 : Infinity;
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
  renderCreaCanvas();
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
    removeWorkspaceTagById(id);
    saveCurrentState();
  });
  el.appendChild(deleteBtn);

  return el;
}

function addWorkspaceTag(label, x, y, parent = board) {
  const id = `tag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const element = buildWorkspaceTagEl(label, id);
  const maxX = parent.clientWidth > 0 ? parent.clientWidth - 40 : Infinity;
  const maxY = parent.clientHeight > 0 ? parent.clientHeight - 40 : Infinity;
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
  renderCreaCanvas();
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
  renderCreaTagsPalette();
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

// Récupère un instantané (données pures, sans DOM) de tout ce qui est actuellement
// ancré au bloc Outfits : c'est ce qui compose la "tenue" en cours de composition.
function snapshotCurrentOutfit() {
  const items = workspaceItems
    .filter(i => i.anchor === 'outfit')
    .map(i => ({ item: i.item, category: i.category, x: i.x, y: i.y }));
  const tags = workspaceTags
    .filter(t => t.anchor === 'outfit')
    .map(t => ({ label: t.label, x: t.x, y: t.y }));
  return { items, tags };
}

function saveCurrentOutfit() {
  const snapshot = snapshotCurrentOutfit();
  if (snapshot.items.length === 0 && snapshot.tags.length === 0) return; // rien à sauvegarder
  outfitCounter += 1;
  savedOutfits.push({
    id: `outfit-${Date.now()}`,
    name: `Tenue ${outfitCounter}`,
    ...snapshot
  });
  populateSavedOutfits();
  saveCurrentState();
}

// Retire du bloc Outfits (DOM + états) tout ce qui y est actuellement ancré,
// pour laisser la place à une tenue sauvegardée qu'on va charger.
function clearOutfitCanvas() {
  workspaceItems
    .filter(i => i.anchor === 'outfit')
    .forEach(i => {
      const el = outfitBlock.querySelector(`.workspace-item[data-id="${i.id}"]`);
      if (el) el.remove();
    });
  workspaceItems = workspaceItems.filter(i => i.anchor !== 'outfit');

  workspaceTags
    .filter(t => t.anchor === 'outfit')
    .forEach(t => {
      const el = outfitBlock.querySelector(`.workspace-tag[data-id="${t.id}"]`);
      if (el) el.remove();
    });
  workspaceTags = workspaceTags.filter(t => t.anchor !== 'outfit');
}

function loadSavedOutfit(outfit) {
  clearOutfitCanvas();
  outfit.items.forEach(saved => {
    addWorkspaceItem(saved.item, saved.category, saved.x, saved.y, outfitBlock);
  });
  outfit.tags.forEach(saved => {
    addWorkspaceTag(saved.label, saved.x, saved.y, outfitBlock);
  });
  if (mobileQuery.matches) setMobileTab('crea');
}

function createOutfitCard(outfit) {
  const card = document.createElement('div');
  card.className = 'wardrobe-item outfit-card';
  card.title = outfit.name;

  const preview = document.createElement('div');
  preview.className = 'outfit-card-preview';
  const thumbs = outfit.items.slice(0, 3);
  if (thumbs.length > 0) {
    thumbs.forEach(saved => {
      if (saved.item.image) {
        const img = document.createElement('img');
        img.src = saved.item.image;
        img.alt = saved.item.label;
        img.draggable = false;
        preview.appendChild(img);
      } else {
        const swatch = document.createElement('div');
        swatch.className = 'outfit-card-swatch';
        swatch.style.background = saved.item.color;
        preview.appendChild(swatch);
      }
    });
  } else {
    preview.classList.add('is-empty');
    preview.textContent = outfit.tags.map(t => t.label).join(', ') || '—';
  }
  card.appendChild(preview);

  const label = document.createElement('div');
  label.className = 'outfit-card-label';
  label.textContent = outfit.name;
  card.appendChild(label);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'wardrobe-item-delete';
  deleteBtn.title = 'Supprimer';
  deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  deleteBtn.addEventListener('pointerdown', e => e.stopPropagation());
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    askDeleteOutfit(outfit);
  });
  card.appendChild(deleteBtn);

  card.addEventListener('click', e => {
    if (e.target.closest('.wardrobe-item-delete')) return;
    loadSavedOutfit(outfit);
  });

  return card;
}

function populateSavedOutfits() {
  const list = document.getElementById('saved-outfits-list');
  list.innerHTML = '';
  if (savedOutfits.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'wardrobe-empty';
    empty.textContent = "Il n'y a pas d'éléments ici. Ajoutes-en !";
    list.appendChild(empty);
  }
  savedOutfits.forEach(outfit => list.appendChild(createOutfitCard(outfit)));
  renderMobileSaved();
}

// --- App mobile à onglets (Vêtements / Créa / Tenues) ---
// Rendu indépendant du plateau de travail desktop. Les fonctions ci-dessous lisent les
// mêmes données (categories, workspaceItems, workspaceTags, TAGS, savedOutfits) mais
// construisent leur propre DOM, dans les panneaux #mobile-panel-*.

function setMobileTab(tab) {
  document.querySelectorAll('.mobile-tab').forEach(btn => btn.classList.toggle('is-active', btn.dataset.tab === tab));
  document.querySelectorAll('.mobile-panel').forEach(panel => panel.classList.toggle('is-active', panel.dataset.panel === tab));
}

document.querySelectorAll('.mobile-tab').forEach(btn => {
  btn.addEventListener('click', () => setMobileTab(btn.dataset.tab));
});

document.querySelectorAll('[data-upload-category]').forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.dataset.uploadCategory;
    const input = document.querySelector(`.category-file-input[data-category="${category}"]`);
    if (input) input.click();
  });
});

function buildItemVisual(item) {
  if (item.image) {
    const img = document.createElement('img');
    img.className = 'wardrobe-item-img';
    img.src = item.image;
    img.alt = item.label;
    img.draggable = false;
    return img;
  }
  const swatch = document.createElement('div');
  swatch.className = 'wardrobe-item-swatch';
  swatch.style.background = item.color;
  return swatch;
}

function createMobileDeleteBtn(onDelete) {
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'wardrobe-item-delete';
  deleteBtn.title = 'Supprimer';
  deleteBtn.innerHTML = DELETE_ICON_SVG;
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    onDelete();
  });
  return deleteBtn;
}

function createMobileItemCard(item, category) {
  const card = document.createElement('div');
  card.className = 'wardrobe-item mobile-item-card';
  card.appendChild(buildItemVisual(item));
  card.appendChild(createMobileDeleteBtn(() => askDeleteWardrobeItem(item, category)));
  card.addEventListener('click', e => {
    if (e.target.closest('.wardrobe-item-delete')) return;
    addItemToCrea(item, category);
  });
  return card;
}

function renderMobileDressing() {
  ['tops', 'bottoms', 'shoes', 'accessories'].forEach(category => {
    const list = document.getElementById(`m-${category}-list`);
    if (!list) return;
    list.innerHTML = '';
    categories[category].forEach(item => list.appendChild(createMobileItemCard(item, category)));
  });
}

// --- Créa : bibliothèque compacte (gauche) + canvas collage libre (droite) ---

let creaCascade = 0;
function nextCreaOffset() {
  const offset = 16 + (creaCascade % 6) * 28;
  creaCascade++;
  return offset;
}

function addItemToCrea(item, category) {
  const offset = nextCreaOffset();
  addWorkspaceItem(item, category, offset, offset, outfitBlock);
}

function addTagToCrea(label) {
  const offset = nextCreaOffset();
  addWorkspaceTag(label, offset, offset, outfitBlock);
}

function createCreaStripCard(item, category) {
  const card = document.createElement('div');
  card.className = 'crea-strip-card';
  card.appendChild(buildItemVisual(item));
  const label = document.createElement('div');
  label.className = 'crea-strip-label';
  label.textContent = item.label;
  card.appendChild(label);
  card.addEventListener('click', () => addItemToCrea(item, category));
  return card;
}

function renderCreaStrip() {
  const list = document.getElementById('crea-strip-list');
  if (!list) return;
  list.innerHTML = '';
  ['tops', 'bottoms', 'shoes', 'accessories'].forEach(category => {
    categories[category].forEach(item => list.appendChild(createCreaStripCard(item, category)));
  });
}

document.getElementById('crea-scroll-up')?.addEventListener('click', () => {
  document.getElementById('crea-strip-list').scrollBy({ top: -160, behavior: 'smooth' });
});
document.getElementById('crea-scroll-down')?.addEventListener('click', () => {
  document.getElementById('crea-strip-list').scrollBy({ top: 160, behavior: 'smooth' });
});

function renderCreaTagsPalette() {
  const row = document.getElementById('crea-tags-row');
  if (!row) return;
  row.innerHTML = '';
  TAGS.forEach(label => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tag-item';
    chip.textContent = label;
    chip.addEventListener('click', () => addTagToCrea(label));
    row.appendChild(chip);
  });
}

// Glisser une carte à main levée dans le canvas Créa (indépendant du drag desktop : pas de
// division par `scale`, puisqu'aucun zoom n'est appliqué à ce canvas).
function enableCreaCardDrag(card, state) {
  card.addEventListener('pointerdown', event => {
    if (event.target.closest('.wardrobe-item-delete')) return;
    event.preventDefault();
    event.stopPropagation();
    card.setPointerCapture(event.pointerId);
    card.classList.add('is-dragging');
    const startX = event.clientX;
    const startY = event.clientY;
    const originLeft = parseFloat(card.style.left) || 0;
    const originTop = parseFloat(card.style.top) || 0;

    const move = moveEvent => {
      card.style.left = `${originLeft + (moveEvent.clientX - startX)}px`;
      card.style.top = `${originTop + (moveEvent.clientY - startY)}px`;
    };
    const up = () => {
      card.classList.remove('is-dragging');
      card.releasePointerCapture(event.pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      state.x = parseFloat(card.style.left);
      state.y = parseFloat(card.style.top);
      saveCurrentState();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

function renderCreaCanvas() {
  const canvas = document.getElementById('crea-canvas');
  const empty = document.getElementById('crea-empty');
  if (!canvas || !empty) return;
  canvas.querySelectorAll('.crea-card').forEach(el => el.remove());

  const items = workspaceItems.filter(i => i.anchor === 'outfit');
  const tags = workspaceTags.filter(t => t.anchor === 'outfit');
  empty.style.display = (items.length === 0 && tags.length === 0) ? 'block' : 'none';

  items.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'crea-card';
    card.style.left = `${entry.x}px`;
    card.style.top = `${entry.y}px`;
    card.appendChild(buildItemVisual(entry.item));
    const label = document.createElement('div');
    label.className = 'crea-card-label';
    label.textContent = entry.item.label;
    card.appendChild(label);
    card.appendChild(createMobileDeleteBtn(() => {
      removeWorkspaceItemById(entry.id);
      saveCurrentState();
    }));
    canvas.appendChild(card);
    enableCreaCardDrag(card, entry);
  });

  tags.forEach(entry => {
    const chip = document.createElement('div');
    chip.className = 'crea-card crea-card--tag';
    chip.style.left = `${entry.x}px`;
    chip.style.top = `${entry.y}px`;
    chip.textContent = entry.label;
    chip.appendChild(createMobileDeleteBtn(() => {
      removeWorkspaceTagById(entry.id);
      saveCurrentState();
    }));
    canvas.appendChild(chip);
    enableCreaCardDrag(chip, entry);
  });
}

function renderMobileSaved() {
  const list = document.getElementById('m-saved-outfits-list');
  if (!list) return;
  list.innerHTML = '';
  if (savedOutfits.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'wardrobe-empty';
    empty.textContent = "Il n'y a pas d'éléments ici. Ajoutes-en !";
    list.appendChild(empty);
  }
  savedOutfits.forEach(outfit => list.appendChild(createOutfitCard(outfit)));
}

document.getElementById('crea-save-btn').addEventListener('click', () => {
  saveCurrentOutfit();
  const btn = document.getElementById('crea-save-btn');
  const original = btn.innerHTML;
  btn.innerHTML = ICON_CHECK;
  setTimeout(() => (btn.innerHTML = original), 1400);
});

document.getElementById('crea-clear-btn').addEventListener('click', () => {
  clearOutfitCanvas();
  renderCreaCanvas();
  saveCurrentState();
});

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
    categories,
    savedOutfits,
    outfitCounter
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
    if (Array.isArray(state.savedOutfits)) {
      savedOutfits = state.savedOutfits;
    }
    if (typeof state.outfitCounter === 'number') {
      outfitCounter = state.outfitCounter;
    }
    populateSavedOutfits();
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
    renderCreaCanvas();
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

// --- Pan et zoom tactiles ---
// L'événement wheel (scroll/pincement trackpad) ne se déclenche jamais au toucher : sans ça,
// impossible de déplacer le plan de travail sur mobile. Un doigt = pan, deux doigts = zoom
// (en réutilisant zoomTo, la même fonction que pour la molette).
const activeTouches = new Map();
let touchPanStart = null;
let touchPinch = null;

function isInteractiveDragTarget(target) {
  return (
    target.closest('.workspace-item') ||
    target.closest('.workspace-tag') ||
    target.closest('button') ||
    target.closest('select') ||
    target.closest('input') ||
    target.closest('label')
  );
}

board.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || isInteractiveDragTarget(event.target)) return;

  activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (activeTouches.size === 1) {
    touchPanStart = { x: event.clientX, y: event.clientY, boardOffset: { ...boardOffset } };
    touchPinch = null;
  } else if (activeTouches.size === 2) {
    touchPanStart = null;
    const pts = Array.from(activeTouches.values());
    touchPinch = {
      startDistance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      startScale: scale,
      midpoint: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
    };
  }
});

window.addEventListener('pointermove', event => {
  if (event.pointerType !== 'touch' || !activeTouches.has(event.pointerId)) return;
  activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (touchPinch && activeTouches.size === 2) {
    const pts = Array.from(activeTouches.values());
    const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const newScale = touchPinch.startScale * (distance / touchPinch.startDistance);
    const viewportRect = viewport.getBoundingClientRect();
    zoomTo(newScale, touchPinch.midpoint.x - viewportRect.left, touchPinch.midpoint.y - viewportRect.top);
  } else if (touchPanStart && activeTouches.size === 1) {
    boardOffset.x = touchPanStart.boardOffset.x + (event.clientX - touchPanStart.x);
    boardOffset.y = touchPanStart.boardOffset.y + (event.clientY - touchPanStart.y);
    updateBoardTransform();
  }
});

function endTouchTracking(event) {
  if (event.pointerType !== 'touch') return;
  activeTouches.delete(event.pointerId);
  if (activeTouches.size === 0) {
    touchPanStart = null;
    touchPinch = null;
    saveCurrentState();
  }
}
window.addEventListener('pointerup', endTouchTracking);
window.addEventListener('pointercancel', endTouchTracking);

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

document.getElementById('save-outfit-btn').addEventListener('click', () => {
  saveCurrentOutfit();
});

fileInput.addEventListener('change', event => {
  const files = Array.from(event.target.files);
  const category = uploadCategoryValue;
  event.target.value = '';
  handleFilesForCategory(files, category);
});

// Dropdown accessible (remplace le <select> natif) : bouton + listbox ARIA,
// navigable au clavier (flèches, Entrée, Échap) en plus du clic/tap.
let uploadCategoryValue = 'tops';

function setupCategoryDropdown() {
  const dropdown = document.getElementById('category-dropdown');
  const trigger = document.getElementById('category-trigger');
  const triggerLabel = document.getElementById('category-trigger-label');
  const listbox = document.getElementById('category-listbox');
  const options = Array.from(listbox.querySelectorAll('.dropdown-option'));
  let highlighted = options.findIndex(o => o.getAttribute('aria-selected') === 'true');

  function highlight(index) {
    highlighted = Math.max(0, Math.min(options.length - 1, index));
    options.forEach((o, i) => o.classList.toggle('is-active', i === highlighted));
    listbox.setAttribute('aria-activedescendant', options[highlighted].id);
    options[highlighted].scrollIntoView({ block: 'nearest' });
  }

  function open() {
    listbox.hidden = false;
    dropdown.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    highlight(highlighted);
    listbox.focus();
  }

  function close(returnFocus) {
    listbox.hidden = true;
    dropdown.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus();
  }

  function select(index) {
    options.forEach((o, i) => o.setAttribute('aria-selected', i === index ? 'true' : 'false'));
    triggerLabel.textContent = options[index].textContent;
    uploadCategoryValue = options[index].dataset.value;
    highlighted = index;
  }

  trigger.addEventListener('click', () => {
    if (listbox.hidden) open(); else close(false);
  });

  listbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlight(highlighted + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlight(highlighted - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(highlighted);
      close(true);
    } else if (event.key === 'Escape') {
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    }
  });

  options.forEach((option, index) => {
    option.addEventListener('click', () => {
      select(index);
      close(true);
    });
    option.addEventListener('pointerenter', () => highlight(index));
  });

  document.addEventListener('pointerdown', event => {
    if (!listbox.hidden && !dropdown.contains(event.target)) close(false);
  });
}

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
  populateSavedOutfits();
  setupCategoryDropdown();
  restoreState();
  // Sous 720px le plateau desktop est masqué (display:none) : ses mesures ne veulent rien
  // dire tant qu'il n'est pas affiché, donc on ne fige/ré-aligne rien dans ce cas au chargement.
  if (!mobileQuery.matches) {
    freezeWardrobeLayout();
    resolveBlockOverlaps();
  }
  document.fonts.ready.then(() => {
    if (!mobileQuery.matches) centerOnWelcome();
    lastViewportSize = { w: viewport.clientWidth, h: viewport.clientHeight };
  });
});
