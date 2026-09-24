// Conversion entre le format JS utilisé par le store (camelCase) et les colonnes
// Postgres (snake_case) des tables notes/folders. Garde le mapping à un seul endroit.

export function noteFromRow(row) {
  return {
    id: row.id,
    // Absent des lignes issues du chargement en liste (voir initialize() dans le store,
    // qui ne sélectionne pas cette colonne) : reste `undefined` tant que le contenu complet
    // n'a pas été chargé à la demande, plutôt qu'une chaîne vide (note réellement vide).
    content: row.content,
    preview: row.preview ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pinned: row.pinned,
    locked: row.locked,
    folderId: row.folder_id,
    deleted: row.deleted,
    deletedAt: row.deleted_at,
    appleId: row.apple_id || undefined,
  };
}

export function noteToRow(note, userId) {
  return {
    id: note.id,
    user_id: userId,
    content: note.content,
    preview: note.preview ?? '',
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    pinned: note.pinned,
    locked: note.locked,
    folder_id: note.folderId ?? null,
    deleted: note.deleted,
    deleted_at: note.deletedAt ?? null,
    apple_id: note.appleId ?? null,
  };
}

export function folderFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    position: row.position,
    expanded: row.expanded,
  };
}

export function folderToRow(folder, userId) {
  return {
    id: folder.id,
    user_id: userId,
    name: folder.name,
    parent_id: folder.parentId ?? null,
    position: folder.position,
    expanded: folder.expanded,
  };
}
