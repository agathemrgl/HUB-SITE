/*
 * DONNÉES DE TEST — à retirer quand on n'en a plus besoin.
 *
 * Ouvrir l'app connectée avec :
 *   …/armoire/#/?test=ajouter  → 3 vêtements, 1 tenue, et la tenue le 10/11/2026
 *   …/armoire/#/?test=retirer  → supprime tout ce qui porte le tag « test »
 *
 * Pour retirer le test du code : supprimer ce fichier, public/test/, et la ligne
 * <DonneesTest /> (+ son import) dans App.jsx.
 */
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useArmoire } from '@/store/Armoire';

const TAG = 'test';
const JOUR = '2026-11-10';

const VETEMENTS = [
  { cle: 'pull', nom: 'Pull pomme', categorie: 'hauts', couleurs: ['bleu', 'rouge'], saisons: ['automne', 'hiver'], photo: '/armoire/test/pull.webp' },
  { cle: 'tshirt', nom: 'T-shirt rayé', categorie: 'hauts', couleurs: ['marron', 'beige', 'bleu'], saisons: ['printemps', 'automne'], photo: '/armoire/test/tshirt.webp' },
  { cle: 'pantalon', nom: 'Pantalon rayé', categorie: 'bas', couleurs: ['bleu', 'blanc'], saisons: ['printemps', 'ete'], photo: '/armoire/test/pantalon.webp' },
];

export function DonneesTest() {
  const [params] = useSearchParams();
  const naviguer = useNavigate();
  const fait = useRef(false);
  const a = useArmoire();
  const action = params.get('test');

  useEffect(() => {
    if (!action || fait.current || a.chargement || !a.userId) return;
    fait.current = true;
    (async () => {
      try {
        if (action === 'ajouter') {
          if (a.vetements.some((v) => v.tags.includes(TAG))) {
            toast('Les données de test sont déjà là');
          } else {
            const ids = {};
            for (const { cle, ...v } of VETEMENTS) ids[cle] = (await a.enregistrerVetement({ ...v, tags: [TAG] })).id;
            const tenue = await a.enregistrerTenue({
              nom: 'Tenue test',
              tags: [TAG, 'Journée'],
              composition: [
                { v: ids.pantalon, x: 0.3, y: 0.38, l: 0.4, z: 1 },
                { v: ids.pull, x: 0.17, y: 0.04, l: 0.66, z: 2 },
              ],
            });
            await a.definirJour({ jour: JOUR, tenue_id: tenue.id, note: TAG });
            toast.success('Données de test ajoutées');
          }
        } else if (action === 'retirer') {
          for (const t of a.tenues.filter((t) => t.tags.includes(TAG))) await a.supprimerTenue(t);
          for (const v of a.vetements.filter((v) => v.tags.includes(TAG))) await a.supprimerVetement(v);
          if (a.joursParDate.get(JOUR)?.note === TAG) await a.retirerJour(JOUR);
          toast.success('Données de test retirées');
        }
      } catch (e) {
        console.error(e);
        toast.error('Échec du test : ' + e.message);
      }
      naviguer('/', { replace: true });
    })();
  }, [action, a, naviguer]);

  return null;
}
