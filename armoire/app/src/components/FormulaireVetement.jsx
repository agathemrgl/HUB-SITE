import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PastilleCouleur, Puce } from '@/components/communs';
import { CATEGORIES, COULEURS, SAISONS } from '@/lib/constantes';
import { urlPhoto } from '@/lib/donnees';
import { MODES_DETOURAGE, preparerPhoto } from '@/lib/images';
import { useArmoire } from '@/store/Armoire';
import { cn } from '@/lib/utils';

const VIDE = { nom: '', categorie: 'hauts', couleurs: [], saisons: [], marque: '', tags: [], notes: '', favori: false };
const champ = 'h-11 rounded-md border-vert/60 bg-transparent text-[16px] shadow-none placeholder:text-encre/40 focus-visible:border-vert md:text-[15px]';

const basculer = (liste, valeur) => (liste.includes(valeur) ? liste.filter((x) => x !== valeur) : [...liste, valeur]);
const nomDepuisFichier = (f) => f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();

function Groupe({ titre, children }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="surtitre mb-2">( {titre} )</legend>
      {children}
    </fieldset>
  );
}

/*
 * Ajout ou modification d'un vêtement. En ajout, on peut choisir plusieurs photos d'un coup :
 * chacune devient un vêtement (nommé d'après le fichier) avec les mêmes caractéristiques.
 */
export default function FormulaireVetement({ ouvert, onOpenChange, vetement, categorieParDefaut }) {
  const { enregistrerVetement } = useArmoire();
  const [valeurs, setValeurs] = useState(VIDE);
  const [tagsTexte, setTagsTexte] = useState('');
  const [fichiers, setFichiers] = useState([]);
  const [mode, setMode] = useState('auto');
  // Aperçu du détourage de la première photo : { blob, url, mode } ; on enregistre ce blob tel quel
  const [apercu, setApercu] = useState(null);
  const [traitement, setTraitement] = useState(false);
  const [optionsDetourage, setOptionsDetourage] = useState(false);
  const [envoi, setEnvoi] = useState(null); // null ou « 2/5 »
  const entree = useRef(null);

  useEffect(() => {
    if (!ouvert) return;
    const depart = vetement ?? { ...VIDE, categorie: categorieParDefaut || 'hauts' };
    setValeurs({ ...VIDE, ...depart, marque: depart.marque ?? '', notes: depart.notes ?? '' });
    setTagsTexte((depart.tags ?? []).join(', '));
    setFichiers([]);
    setMode('auto');
    setOptionsDetourage(false);
  }, [ouvert, vetement, categorieParDefaut]);

  // Détoure la première photo dès qu'elle est choisie (ou que le mode change), pour la voir avant d'enregistrer
  useEffect(() => {
    const premier = fichiers[0];
    if (!premier) {
      setApercu(null);
      return;
    }
    let annule = false;
    let url = null;
    setTraitement(true);
    preparerPhoto(premier, { mode })
      .then(({ blob, mode: utilise }) => {
        if (annule) return;
        url = URL.createObjectURL(blob);
        setApercu({ blob, url, mode: utilise });
      })
      .catch((e) => {
        console.error(e);
        if (!annule) toast.error('Détourage impossible, essaie un autre mode');
      })
      .finally(() => !annule && setTraitement(false));
    return () => {
      annule = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fichiers, mode]);

  const maj = (cle, valeur) => setValeurs((v) => ({ ...v, [cle]: valeur }));

  function choisirFichiers(liste) {
    const images = [...liste].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    setFichiers(vetement ? images.slice(0, 1) : images);
    if (!valeurs.nom && images.length === 1) maj('nom', nomDepuisFichier(images[0]));
  }

  async function envoyer(e) {
    e.preventDefault();
    const base = {
      ...valeurs,
      marque: valeurs.marque.trim() || null,
      notes: valeurs.notes.trim() || null,
      tags: tagsTexte.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (vetement || fichiers.length <= 1) {
        setEnvoi('Enregistrement…');
        const photo = fichiers.length ? { fichier: apercu.blob, pret: true } : {};
        await enregistrerVetement({ ...base, nom: base.nom.trim() || 'Sans nom' }, photo);
        toast.success(vetement ? 'Vêtement modifié' : 'Vêtement ajouté');
      } else {
        for (const [i, f] of fichiers.entries()) {
          setEnvoi(`${i + 1} / ${fichiers.length}`);
          const photo = i === 0 && apercu ? { fichier: apercu.blob, pret: true } : { fichier: f, mode };
          await enregistrerVetement({ ...base, nom: nomDepuisFichier(f) }, photo);
        }
        toast.success(`${fichiers.length} vêtements ajoutés`);
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Échec de l'enregistrement");
    } finally {
      setEnvoi(null);
    }
  }

  const photoActuelle = fichiers.length ? apercu?.url : urlPhoto(vetement?.photo);
  const plusieurs = fichiers.length > 1;

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !envoi && onOpenChange(o)}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto overscroll-contain rounded-lg border border-vert bg-carte p-0 shadow-[8px_8px_0_var(--vert)] sm:max-w-2xl">
        <DialogHeader className={vetement ? 'sticky top-0 z-10 border-b border-vert bg-carte/95 px-6 pt-6 pb-4 backdrop-blur' : 'sr-only'}>
          <DialogTitle className="font-display text-[26px] leading-none text-vert-texte lowercase md:text-[32px]">{vetement ? 'modifier' : 'Ajouter des vêtements'}</DialogTitle>
          <DialogDescription className="sr-only">Photo et caractéristiques du vêtement</DialogDescription>
        </DialogHeader>

        <form onSubmit={envoyer} className={cn('grid gap-6 p-6 md:grid-cols-[220px_1fr]', !vetement && 'pt-12')}>
          {/* Photo(s) */}
          <div className="grid content-start gap-3">
            <button
              type="button"
              onClick={() => entree.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                choisirFichiers(e.dataTransfer.files);
              }}
              className="quadrillage relative grid aspect-square w-full place-items-center overflow-hidden border border-vert text-vert-texte transition-colors hover:brightness-[0.98]"
            >
              {traitement ? (
                <span className="etiquette grid place-items-center gap-3 px-4">
                  <Loader2 className="size-6 animate-spin" />
                  Détourage…
                </span>
              ) : photoActuelle ? (
                <img src={photoActuelle} alt="" className="max-h-full max-w-full object-contain p-3" />
              ) : (
                <span className="etiquette grid place-items-center gap-3 px-4">
                  <ImagePlus className="size-8" strokeWidth={1.4} />
                  Choisir ou déposer {vetement ? 'une photo' : 'des photos'}
                </span>
              )}
              {plusieurs && (
                <span className="numero absolute top-2 right-2">+{fichiers.length - 1}</span>
              )}
            </button>
            <input ref={entree} type="file" accept="image/*" multiple={!vetement} hidden onChange={(e) => choisirFichiers(e.target.files)} />
            {fichiers.length > 0 && !optionsDetourage && (
              <button type="button" onClick={() => setOptionsDetourage(true)} className="etiquette justify-self-start text-encre/50 underline-offset-2 hover:text-encre hover:underline">
                Détourage raté ? Autres modes
              </button>
            )}
            {fichiers.length > 0 && optionsDetourage && (
              <div className="grid grid-cols-4 gap-px border border-vert bg-vert">
                {MODES_DETOURAGE.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={mode === m.id}
                    disabled={traitement}
                    onClick={() => setMode(m.id)}
                    className={cn('etiquette h-9 text-[10px] transition-colors', mode === m.id ? 'bg-primary text-encre' : 'bg-carte hover:bg-accent')}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            {plusieurs && <p className="etiquette text-encre/60">{fichiers.length} photos : un vêtement par photo, nommé d'après le fichier.</p>}
          </div>

          {/* Caractéristiques */}
          <div className="grid content-start gap-5">
            {!plusieurs && <Input placeholder="Nom (ex. Chemise lin blanche)" aria-label="Nom" value={valeurs.nom} onChange={(e) => maj('nom', e.target.value)} className={champ} />}

            <Groupe titre="Catégorie">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Puce key={c.id} actif={valeurs.categorie === c.id} onClick={() => maj('categorie', c.id)}>
                    {c.label}
                  </Puce>
                ))}
              </div>
            </Groupe>

            <Groupe titre="Couleurs">
              <div className="flex flex-wrap gap-2">
                {COULEURS.map((c) => {
                  const actif = valeurs.couleurs.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={actif}
                      title={c.label}
                      onClick={() => maj('couleurs', basculer(valeurs.couleurs, c.id))}
                      className={cn('grid size-9 place-items-center rounded-full transition', actif ? 'ring-2 ring-vert ring-offset-2 ring-offset-carte' : 'hover:scale-110')}
                    >
                      <PastilleCouleur id={c.id} className="size-7" />
                      <span className="sr-only">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </Groupe>

            <Groupe titre="Saisons">
              <div className="flex flex-wrap gap-2">
                {SAISONS.map((s) => (
                  <Puce key={s.id} actif={valeurs.saisons.includes(s.id)} onClick={() => maj('saisons', basculer(valeurs.saisons, s.id))}>
                    {s.label}
                  </Puce>
                ))}
              </div>
            </Groupe>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Marque" aria-label="Marque" value={valeurs.marque} onChange={(e) => maj('marque', e.target.value)} className={champ} />
              <Input placeholder="Tags, séparés par des virgules" aria-label="Tags" value={tagsTexte} onChange={(e) => setTagsTexte(e.target.value)} className={champ} />
            </div>
            <Textarea placeholder="Notes (taille, matière, entretien…)" aria-label="Notes" value={valeurs.notes} onChange={(e) => maj('notes', e.target.value)} className="min-h-20 rounded-md border-vert/60 bg-transparent text-[16px] shadow-none placeholder:text-encre/40 focus-visible:border-vert md:text-[15px]" />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" className="rounded-md hover:bg-accent" disabled={!!envoi} onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" className="h-10 min-w-36 rounded-md" disabled={!!envoi || traitement || (fichiers.length > 0 && !apercu) || (!vetement && !fichiers.length && !valeurs.nom.trim())}>
                {envoi ? (
                  <>
                    <Loader2 className="animate-spin" /> {envoi}
                  </>
                ) : vetement ? (
                  'Enregistrer'
                ) : plusieurs ? (
                  `Ajouter ${fichiers.length} vêtements`
                ) : (
                  'Ajouter'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
