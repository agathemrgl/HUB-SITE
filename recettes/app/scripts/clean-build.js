// outDir (../) pointe sur recettes/, qui contient aussi ce dossier source (app/) : on ne
// peut donc pas utiliser build.emptyOutDir. Ce script vide juste les anciens fichiers
// buildés (recettes/assets/, recettes/index.html) avant chaque build, en laissant app/ intact.
import { rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const recettesDir = fileURLToPath(new URL('../..', import.meta.url));

for (const entry of ['assets', 'index.html']) {
  const target = path.join(recettesDir, entry);
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
}
