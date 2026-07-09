const board = document.getElementById('workspace');
const viewport = board.closest('.board-viewport');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');
const zoomInButton = document.getElementById('zoom-in-button');
const zoomOutButton = document.getElementById('zoom-out-button');
const fileInput = document.getElementById('file-input');
const uploadCategory = document.getElementById('upload-category');

const STATE_VERSION = 3;

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
let boardOffset = { x: 0, y: 0 };
let scale = window.matchMedia('(max-width: 720px)').matches ? 0.7 : 1;
const SCALE_MIN = 0.2;
const SCALE_MAX = 3;
const SCALE_STEP = 0.15;

let isPanning = false;
let panStart = { x: 0, y: 0 };
let boardStart = { x: 0, y: 0 };
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
    items.forEach(item => {
      list.appendChild(createItemCard(item, category));
    });
  });
}

function beginDrag(event, card, item) {
  if (currentDrag) return; // protection anti-duplication
  event.preventDefault();
  const rect = card.getBoundingClientRect();
  const clone = card.cloneNode(true);
  clone.classList.add('workspace-item');
  clone.style.width = `${rect.width}px`;
  clone.style.left = `${event.clientX - rect.width / 2}px`;
  clone.style.top = `${event.clientY - rect.height / 2}px`;
  clone.style.position = 'fixed';
  clone.style.zIndex = '9999';
  clone.style.pointerEvents = 'none';
  document.body.appendChild(clone);

  currentDrag = { element: clone, item, category: card.dataset.category };
  dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };

  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
}

function moveDrag(event) {
  if (!currentDrag) return;
  currentDrag.element.style.left = `${event.clientX - dragOffset.x}px`;
  currentDrag.element.style.top = `${event.clientY - dragOffset.y}px`;
}

function endDrag(event) {
  if (!currentDrag) return;
  const viewportRect = viewport.getBoundingClientRect();
  if (
    event.clientX >= viewportRect.left &&
    event.clientX <= viewportRect.right &&
    event.clientY >= viewportRect.top &&
    event.clientY <= viewportRect.bottom
  ) {
    // Convertit les coords écran en coords plateau (tenant compte du zoom)
    const boardX = (event.clientX - viewportRect.left - boardOffset.x) / scale - dragOffset.x / scale;
    const boardY = (event.clientY - viewportRect.top - boardOffset.y) / scale - dragOffset.y / scale;
    addWorkspaceItem(currentDrag.item, currentDrag.category, boardX, boardY);
  }
  currentDrag.element.remove();
  currentDrag = null;
  window.removeEventListener('pointermove', moveDrag);
  window.removeEventListener('pointerup', endDrag);
}

function addWorkspaceItem(item, category, x, y) {
  const id = `ws-${item.id}-${Date.now()}`;
  const element = buildWorkspaceEl(item, id, category);
  element.style.left = `${Math.max(0, Math.min(2200, x))}px`;
  element.style.top = `${Math.max(0, Math.min(1460, y))}px`;
  board.appendChild(element);

  enableWorkspaceDrag(element);
  workspaceItems.push({ id, item, category, x: parseInt(element.style.left, 10), y: parseInt(element.style.top, 10) });
  updateWorkspaceVisibility();
  saveCurrentState();
}

function enableWorkspaceDrag(element) {
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
      const state = workspaceItems.find(item => item.id === element.dataset.id);
      if (state) {
        state.x = parseInt(element.style.left, 10);
        state.y = parseInt(element.style.top, 10);
        saveCurrentState();
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  // Mobile : tap sur le vêtement pour faire apparaître/masquer le bouton ✕
  element.addEventListener('click', e => {
    if (!window.matchMedia('(hover: hover)').matches && !e.target.closest('.delete-btn')) {
      const already = element.classList.contains('is-selected');
      document.querySelectorAll('.workspace-item.is-selected').forEach(el => el.classList.remove('is-selected'));
      if (!already) element.classList.add('is-selected');
    }
  });
}

// Mobile : tap sur le canvas vide → désélectionner
board.addEventListener('click', e => {
  if (!e.target.closest('.workspace-item')) {
    document.querySelectorAll('.workspace-item.is-selected').forEach(el => el.classList.remove('is-selected'));
  }
});

function updateWorkspaceVisibility() {}

function saveCurrentState() {
  const state = {
    boardOffset,
    scale,
    version: STATE_VERSION,
    workspaceItems: workspaceItems.map(item => ({ id: item.id, item: item.item, category: item.category, x: item.x, y: item.y })),
    // On ne sauvegarde que les items uploadés par l'utilisateur (id commence par "custom-")
    customItems: Object.fromEntries(
      Object.entries(categories).map(([cat, items]) => [cat, items.filter(i => i.id.startsWith('custom-'))])
    )
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
    // On ajoute uniquement les items custom uploadés (pas les defaults)
    if (state.customItems) {
      Object.entries(state.customItems).forEach(([cat, items]) => {
        if (!categories[cat]) categories[cat] = [];
        items.forEach(item => {
          if (!categories[cat].find(i => i.id === item.id)) {
            categories[cat].push(item);
          }
        });
      });
    }
    populateCategories();
    if (Array.isArray(state.workspaceItems)) {
      state.workspaceItems.forEach(saved => {
        workspaceItems.push(saved);
        const element = buildWorkspaceEl(saved.item, saved.id, saved.category);
        element.style.left = `${saved.x}px`;
        element.style.top = `${saved.y}px`;
        board.appendChild(element);
        enableWorkspaceDrag(element);
      });
    }
    updateWorkspaceVisibility();
  } catch (error) {
    console.warn('Impossible de restaurer l\'état', error);
  }
}

function beginBoardPan(event) {
  if (event.target.closest('.wardrobe') || event.target.closest('.workspace-item') || event.target.closest('button') || event.target.closest('select') || event.target.closest('input') || event.target.closest('label')) {
    return;
  }
  event.preventDefault();
  isPanning = true;
  panStart = { x: event.clientX, y: event.clientY };
  boardStart = { ...boardOffset };
  board.style.cursor = 'grabbing';

  const move = moveEvent => {
    if (!isPanning) return;
    boardOffset.x = boardStart.x + (moveEvent.clientX - panStart.x);
    boardOffset.y = boardStart.y + (moveEvent.clientY - panStart.y);
    updateBoardTransform();
  };

  const end = () => {
    isPanning = false;
    board.style.cursor = 'grab';
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
}

// Zoom molette/trackpad centré sur le curseur
viewport.addEventListener('wheel', event => {
  event.preventDefault();
  const viewportRect = viewport.getBoundingClientRect();
  const pivotX = event.clientX - viewportRect.left;
  const pivotY = event.clientY - viewportRect.top;
  // ctrlKey = pinch trackpad (deltaY plus fin), sinon scroll normal
  const sensitivity = event.ctrlKey ? 0.008 : 0.001;
  const newScale = scale * (1 - event.deltaY * sensitivity);
  zoomTo(newScale, pivotX, pivotY);
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
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      const item = {
        id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        label: file.name.replace(/\.[^/.]+$/, ''),
        image: reader.result
      };
      categories[category].push(item);
      populateCategories();
      saveCurrentState();
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
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

let resizeTimer = null;

function onResize() {
  // Recalcule instantanément l'offset pour garder Bienvenue centré
  const welcome = document.querySelector('.bg-welcome');
  if (!welcome) return;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const cx = welcome.offsetLeft;
  const cy = welcome.offsetTop + welcome.offsetHeight / 2;
  boardOffset.x = vw / 2 - cx * scale;
  boardOffset.y = vh / 2 - cy * scale;
  updateBoardTransform();
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
}

mobileQuery.addEventListener('change', e => animateToBreakpoint(e.matches));
window.addEventListener('resize', onResize);
board.addEventListener('pointerdown', beginBoardPan);
window.addEventListener('DOMContentLoaded', () => {
  populateCategories();
  restoreState();
  document.fonts.ready.then(() => {
    centerOnWelcome();
  });
});
