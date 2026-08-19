import Dexie from 'dexie';

export const db = new Dexie('hub-notes-db');

// Pas d'index sur pinned/deleted : ce sont des booléens, qui ne sont pas des clés IndexedDB
// valides (equals(true/false) échouerait). Le jeu de données d'une app de notes perso reste
// petit, donc on charge tout via toArray() (voir store) et on filtre/trie côté JS, comme le
// faisait la version vanilla avec de simples tableaux.
db.version(1).stores({
  notes: 'id',
  folders: 'id',
  meta: 'key',
});
