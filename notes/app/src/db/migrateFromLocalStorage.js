import { db } from './db';

const OLD_NOTES_KEY = 'hub-notes-v1';
const OLD_FOLDERS_KEY = 'hub-notes-folders-v1';
const OLD_SORT_KEY = 'hub-notes-sort-v1';
const OLD_PASSCODE_KEY = 'hub-notes-passcode-v1';

// Le HTML des checklists de l'ancienne version (des <div class="checklist-item"> contenant
// une case à cocher) ne correspond pas au format attendu par les extensions TipTap
// TaskList/TaskItem (<ul data-type="taskList"><li data-type="taskItem" data-checked="...">).
// On le convertit ici, sur un élément détaché (jamais le DOM live), en conservant l'état
// coché et en regroupant les items consécutifs dans une seule liste.
function convertChecklistsToTaskList(html) {
  if (!html || !html.includes('checklist-item')) return html;

  const source = document.createElement('div');
  source.innerHTML = html;

  const output = document.createElement('div');
  let currentList = null;

  Array.from(source.childNodes).forEach((node) => {
    const isChecklistItem = node.nodeType === 1 && node.classList?.contains('checklist-item');

    if (!isChecklistItem) {
      currentList = null;
      output.appendChild(node.cloneNode(true));
      return;
    }

    if (!currentList) {
      currentList = document.createElement('ul');
      currentList.setAttribute('data-type', 'taskList');
      output.appendChild(currentList);
    }

    const checkbox = node.querySelector('input[type="checkbox"]');
    const textEl = node.querySelector('.checklist-text');
    const checked = !!checkbox?.checked;
    const text = (textEl?.textContent || '').replace(/ /g, ' ').trim();

    const li = document.createElement('li');
    li.setAttribute('data-type', 'taskItem');
    li.setAttribute('data-checked', checked ? 'true' : 'false');
    const p = document.createElement('p');
    p.textContent = text;
    li.appendChild(p);
    currentList.appendChild(li);
  });

  return output.innerHTML;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Migration automatique et unique depuis l'ancienne version vanilla (localStorage) vers
// IndexedDB. Idempotente : ne fait rien si déjà exécutée, ou si aucune donnée à migrer.
// Ne supprime jamais les anciennes clés localStorage, qui restent un filet de sécurité.
export async function migrateFromLocalStorage() {
  const done = await db.meta.get('migrationDone');
  if (done?.value) return;

  const oldNotes = readJSON(OLD_NOTES_KEY, []);
  const oldFolders = readJSON(OLD_FOLDERS_KEY, []);

  if (!oldNotes.length && !oldFolders.length) {
    await db.meta.put({ key: 'migrationDone', value: true });
    return;
  }

  await db.transaction('rw', db.notes, db.folders, db.meta, async () => {
    await Promise.all(
      oldFolders.map((f, index) =>
        db.folders.put({
          id: f.id,
          name: f.name,
          parentId: null,
          position: index,
          expanded: true,
        })
      )
    );

    await Promise.all(
      oldNotes.map((n) =>
        db.notes.put({
          id: n.id,
          content: convertChecklistsToTaskList(n.html || ''),
          createdAt: n.createdAt || n.updatedAt || Date.now(),
          updatedAt: n.updatedAt || Date.now(),
          pinned: !!n.pinned,
          locked: !!n.locked,
          folderId: n.folderId || null,
          deleted: !!n.deleted,
          deletedAt: n.deletedAt || null,
        })
      )
    );

    const oldSort = localStorage.getItem(OLD_SORT_KEY);
    if (oldSort) await db.meta.put({ key: 'sortKey', value: oldSort });

    const oldPasscode = localStorage.getItem(OLD_PASSCODE_KEY);
    if (oldPasscode) await db.meta.put({ key: 'passcode', value: oldPasscode });

    await db.meta.put({ key: 'migrationDone', value: true });
  });
}
