// outDir (../) pointe sur armoire/, qui contient aussi ce dossier source (app/) et sources/ :
// on ne peut donc pas utiliser build.emptyOutDir. Ce script vide juste les anciens fichiers
// buildés (armoire/assets/, armoire/index.html) avant chaque build, en laissant le reste intact.
import { rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const armoireDir = fileURLToPath(new URL('../..', import.meta.url));

for (const entry of ['assets', 'index.html']) {
  const target = path.join(armoireDir, entry);
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
}
