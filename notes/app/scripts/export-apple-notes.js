// Exporte toutes les notes de Notes.app (macOS) en JSON, en lecture seule (rien n'est
// modifié dans Notes.app). Usage : osascript -l JavaScript export-apple-notes.js > export.json
// Les notes du dossier système "Notes" (par défaut, tous comptes confondus) n'ont pas de
// dossier assigné dans l'export ; les autres gardent le nom de leur dossier Apple Notes.

function isDefaultFolder(name) {
  return name === 'Notes' || name === 'Notas' || name === 'Notizen';
}

function run() {
  const Notes = Application('Notes');
  const accounts = Notes.accounts();
  const result = [];

  accounts.forEach((account) => {
    let folders;
    try {
      folders = account.folders();
    } catch (e) {
      return;
    }

    folders.forEach((folder) => {
      const folderName = folder.name();
      let notes;
      try {
        notes = folder.notes();
      } catch (e) {
        return;
      }

      notes.forEach((note) => {
        try {
          result.push({
            appleId: note.id(),
            name: note.name(),
            body: note.body(),
            account: account.name(),
            folder: isDefaultFolder(folderName) ? null : folderName,
            createdAt: note.creationDate().getTime(),
            updatedAt: note.modificationDate().getTime(),
            attachmentCount: (() => {
              try {
                return note.attachments().length;
              } catch (e) {
                return 0;
              }
            })(),
          });
        } catch (e) {
          // Note illisible (ex. corrompue) : on l'ignore plutôt que de faire échouer tout l'export.
        }
      });
    });
  });

  return JSON.stringify(result);
}

run();
