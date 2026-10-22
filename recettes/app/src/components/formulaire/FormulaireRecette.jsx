import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import ArtCanvas from '@/components/ArtCanvas';
import CarteRecette from '@/components/CarteRecette';
import Filtres from '@/components/Filtres';
import ListeEditable from '@/components/formulaire/ListeEditable';
import { Faq, Infos } from '@/components/formulaire/Paires';
import { champ, etiquette, zoneTexte } from '@/components/formulaire/styles';
import { tagVariants } from '@/components/tag';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Entete, Infos as InfosRecette, Preparation } from '@/pages/Recette';
import { TAGS } from '@/data/tags';
import { NOMS_FAMILLES_ART } from '@/lib/art';
import { enregistrerRecette } from '@/lib/donnees';
import { QUANTITE, slug } from '@/lib/recettes';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useCarnet } from '@/store/Carnet';
import { cn } from '@/lib/utils';

/*
 * Formulaire d'ajout / de modification d'une recette (mêmes champs que MODELE_RECETTE.md).
 * Ordinateur : grand panneau latéral, formulaire à gauche et aperçu en direct à droite.
 * Mobile : plein écran, une section à la fois (L'essentiel → Ingrédients → Préparation → Extras → Aperçu).
 * Le brouillon d'une nouvelle recette est gardé dans le navigateur tant qu'elle n'est pas enregistrée.
 */

const CLE_BROUILLON = 'recettes-brouillon-v1';
const aujourdhui = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-JJ, à l'heure locale

const SECTIONS = [
  { id: 'essentiel', titre: 'L’essentiel' },
  { id: 'ingredients', titre: 'Ingrédients' },
  { id: 'preparation', titre: 'Préparation' },
  { id: 'extras', titre: 'Extras' },
];

const vide = () => ({
  titre: '',
  sousTitre: '',
  date: aujourdhui(),
  tags: [],
  art: '',
  infos: [
    { label: 'Préparation', valeur: '' },
    { label: 'Cuisson', valeur: '' },
    { label: 'Portions', valeur: '' },
  ],
  ingredients: [''],
  histoire: [''],
  etapes: [''],
  faq: [],
  lien: '',
});

const avecUneLigne = (l) => (l?.length ? l : ['']);

function depuisRecette(r) {
  return {
    titre: r.titre,
    sousTitre: r.sousTitre || '',
    date: r.date,
    tags: r.tags || [],
    art: r.art || '',
    infos: (r.infos || []).map(([label, valeur]) => ({ label, valeur })),
    ingredients: avecUneLigne(r.ingredients),
    histoire: avecUneLigne([].concat(r.histoire || [])),
    etapes: avecUneLigne(r.etapes),
    faq: r.faq || [],
    lien: r.lien || '',
  };
}

// Valeurs du formulaire → recette du site (lignes vides retirées)
function versRecette(v, id, userId) {
  const lignes = (l) => l.map((x) => x.trim()).filter(Boolean);
  return {
    id,
    userId,
    titre: v.titre.trim(),
    sousTitre: v.sousTitre.trim(),
    date: v.date || aujourdhui(),
    tags: v.tags,
    art: v.art || undefined,
    infos: v.infos.filter((x) => x.label.trim()).map((x) => [x.label.trim(), x.valeur.trim()]),
    ingredients: lignes(v.ingredients),
    histoire: lignes(v.histoire),
    etapes: lignes(v.etapes),
    faq: v.faq.filter((x) => x.question.trim()).map((x) => ({ question: x.question.trim(), reponse: x.reponse.trim() })),
    lien: v.lien.trim(),
  };
}

function idUnique(titre, recettes) {
  const base = slug(titre) || 'recette';
  let id = base;
  for (let n = 2; recettes.some((r) => r.id === id); n++) id = `${base}-${n}`;
  return id;
}

function lireBrouillon() {
  try {
    return JSON.parse(localStorage.getItem(CLE_BROUILLON));
  } catch {
    return null;
  }
}

function ecrireBrouillon(v) {
  try {
    if (v) localStorage.setItem(CLE_BROUILLON, JSON.stringify(v));
    else localStorage.removeItem(CLE_BROUILLON);
  } catch {
    // stockage indisponible : pas de brouillon
  }
}

const aideIngredient = (l) =>
  QUANTITE.test(l.trim()) ? null : 'Pas de quantité au début : cette ligne ne sera pas recalculée par ÷2, ×2…';

// ---------- Sections ----------

function Champ({ id, label, erreur, children, aide }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className={etiquette}>
        {label}
      </Label>
      {children}
      {aide && !erreur && <p className="text-[13px] text-black/55">{aide}</p>}
      {erreur && <p className="text-[14px] text-destructive">{erreur}</p>}
    </div>
  );
}

function Essentiel({ v, maj, erreurs }) {
  const idArt = slug(v.titre) || 'nouvelle-recette';
  return (
    <div className="grid gap-5">
      <Champ id="f-titre" label="Titre *" erreur={erreurs.titre}>
        <Input id="f-titre" value={v.titre} onChange={(e) => maj({ titre: e.target.value })} placeholder="Taboulé de Teta" aria-invalid={Boolean(erreurs.titre)} className={champ} />
      </Champ>
      <Champ id="f-sous-titre" label="Sous-titre" aide="Une ou deux phrases d’accroche.">
        <Textarea id="f-sous-titre" value={v.sousTitre} onChange={(e) => maj({ sousTitre: e.target.value })} placeholder="Le taboulé de ma grand-mère, beaucoup de persil, très peu de boulgour." className={zoneTexte} />
      </Champ>
      <Champ id="f-date" label="Date">
        <Input id="f-date" type="date" value={v.date} onChange={(e) => maj({ date: e.target.value })} className={cn(champ, 'w-fit')} />
      </Champ>
      <div className="grid gap-2">
        <p className={etiquette}>Tags</p>
        <Filtres
          selection={new Set(v.tags.map(slug))}
          onChange={(s) => maj({ tags: TAGS.flatMap((f) => f.tags).filter((t) => s.has(slug(t))) })}
        />
      </div>
      <div className="grid gap-2">
        <p className={etiquette}>Dessin</p>
        <ToggleGroup type="single" value={v.art || 'hasard'} onValueChange={(x) => x && maj({ art: x === 'hasard' ? '' : x })} spacing={2} className="grid w-full grid-cols-3 gap-2 sm:grid-cols-7">
          {['hasard', ...NOMS_FAMILLES_ART].map((f) => (
            <ToggleGroupItem
              key={f}
              value={f}
              aria-label={f === 'hasard' ? 'Au hasard' : f}
              className="flex h-auto flex-col items-stretch gap-1 rounded-lg border border-black/20 bg-transparent p-1.5 text-[13px] font-normal hover:bg-black/5 hover:text-black data-[spacing=2]:rounded-lg data-[state=on]:border-black data-[state=on]:bg-transparent data-[state=on]:text-black data-[state=on]:ring-2 data-[state=on]:ring-black"
            >
              <span className="block aspect-[335/210] w-full bg-vert-clair">
                {f === 'hasard' ? <span className="grid size-full place-items-center text-[20px]">?</span> : <ArtCanvas id={idArt} famille={f} />}
              </span>
              {f === 'hasard' ? 'Au hasard' : f === 'petales' ? 'pétales' : f}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}

function SectionIngredients({ v, maj }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <p className={etiquette}>Infos</p>
        <Infos valeurs={v.infos} onChange={(infos) => maj({ infos })} />
      </div>
      <div className="grid gap-2">
        <p className={etiquette}>Ingrédients</p>
        <p className="-mt-1 text-[13px] text-black/55">La quantité en premier (« 250 g de farine ») pour que ÷2 / ×2 la recalcule. Coller une liste entière la découpe en lignes.</p>
        <ListeEditable nom="Ingrédient" valeurs={v.ingredients} onChange={(ingredients) => maj({ ingredients })} placeholder="250 g de farine" ajouter="Ajouter un ingrédient" indice={aideIngredient} />
      </div>
    </div>
  );
}

function SectionPreparation({ v, maj }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <p className={etiquette}>Histoire</p>
        <p className="-mt-1 text-[13px] text-black/55">D’où vient la recette, qui me l’a transmise… Un paragraphe par case.</p>
        <ListeEditable nom="Paragraphe" multiligne valeurs={v.histoire} onChange={(histoire) => maj({ histoire })} ajouter="Ajouter un paragraphe" />
      </div>
      <div className="grid gap-2">
        <p className={etiquette}>Étapes</p>
        <ListeEditable
          nom="Étape"
          multiligne
          valeurs={v.etapes}
          onChange={(etapes) => maj({ etapes })}
          placeholder="Préchauffer le four à 180 °C."
          ajouter="Ajouter une étape"
          numero={(i) => `Étape ${String(i + 1).padStart(2, '0')}`}
        />
      </div>
    </div>
  );
}

function Extras({ v, maj }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <p className={etiquette}>Questions fréquentes</p>
        <Faq valeurs={v.faq} onChange={(faq) => maj({ faq })} />
      </div>
      <Champ id="f-lien" label="Source ou inspiration" aide="Lien facultatif, affiché sous le titre.">
        <Input id="f-lien" type="url" inputMode="url" value={v.lien} onChange={(e) => maj({ lien: e.target.value })} placeholder="https://…" className={champ} />
      </Champ>
    </div>
  );
}

// Aperçu : la carte de l'accueil, puis le haut de la page recette
function Apercu({ recette }) {
  const r = { ...recette, titre: recette.titre || 'Sans titre', id: recette.id || 'nouvelle-recette' };
  return (
    <div className="grid gap-8">
      <div className="pointer-events-none max-w-[360px] select-none" inert>
        <CarteRecette recette={r} />
      </div>
      <div className="grid gap-4">
        <h3 className="text-[32px] leading-none font-medium tracking-[-0.03em]">{r.titre}</h3>
        {r.infos.length > 0 && (
          <div>
            <Entete>Infos</Entete>
            <InfosRecette recette={r} facteur={1} />
          </div>
        )}
        {r.ingredients.length > 0 && (
          <div>
            <Entete>Ingrédients</Entete>
            <ul>
              {r.ingredients.map((x, i) => (
                <li key={i} className="border-b border-dotted border-[var(--pointilles)] py-2.5 text-[15px]">
                  {x}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid gap-4">
          <Entete>Préparation</Entete>
          <div className="[&>div]:max-w-none">
            <Preparation recette={r} />
          </div>
        </div>
      </div>
    </div>
  );
}

const RENDU = { essentiel: Essentiel, ingredients: SectionIngredients, preparation: SectionPreparation, extras: Extras };

// ---------- Formulaire ----------

export default function FormulaireRecette() {
  const { formulaire, fermerFormulaire, recettes, remplacer, session } = useCarnet();
  const ordinateur = useMediaQuery('(min-width: 1024px)');
  const naviguer = useNavigate();
  const ouvert = Boolean(formulaire);
  const existante = formulaire?.recette || null;

  const [v, setV] = useState(vide);
  const [erreurs, setErreurs] = useState({});
  const [etape, setEtape] = useState(0);
  const [envoi, setEnvoi] = useState(false);

  // À l'ouverture : la recette à modifier, sinon le brouillon en cours, sinon un formulaire vide
  useEffect(() => {
    if (!formulaire) return;
    setErreurs({});
    setEtape(0);
    if (formulaire.recette) {
      setV(depuisRecette(formulaire.recette));
      return;
    }
    const brouillon = lireBrouillon();
    if (brouillon) {
      setV({ ...vide(), ...brouillon });
      toast('Brouillon restauré', { action: { label: 'Repartir de zéro', onClick: () => (ecrireBrouillon(null), setV(vide())) } });
    } else {
      setV(vide());
    }
  }, [formulaire]);

  // Chaque saisie met à jour le brouillon d'une nouvelle recette, seulement si quelque chose
  // a vraiment été saisi (la date du jour ne compte pas)
  const maj = (modif) => {
    const suivant = { ...v, ...modif };
    setV(suivant);
    if (modif.titre?.trim()) setErreurs((e) => ({ ...e, titre: undefined }));
    if (!existante && JSON.stringify({ ...suivant, date: '' }) !== JSON.stringify({ ...vide(), date: '' })) {
      ecrireBrouillon(suivant);
    }
  };

  const recette = versRecette(v, existante?.id || slug(v.titre), session?.user.id);
  const etapes = ordinateur ? SECTIONS : [...SECTIONS, { id: 'apercu', titre: 'Aperçu' }];

  async function enregistrer() {
    if (!recette.titre) {
      setErreurs({ titre: 'Il faut au moins un titre.' });
      setEtape(0);
      document.getElementById('f-titre')?.focus();
      return;
    }
    setEnvoi(true);
    try {
      const id = existante ? existante.id : idUnique(recette.titre, recettes);
      const enregistree = await enregistrerRecette({ ...recette, id }, { nouvelle: !existante });
      remplacer(enregistree, existante?.id);
      if (!existante) ecrireBrouillon(null);
      toast.success(existante ? 'Recette mise à jour' : 'Recette ajoutée au carnet');
      fermerFormulaire();
      naviguer(`/recette/${enregistree.id}`);
    } catch (e) {
      const message =
        e.code === '23505'
          ? 'Une recette avec cette adresse existe déjà.'
          : e.code === '42501'
            ? 'Ce compte n’a pas le droit d’ajouter de recettes.'
            : 'Enregistrement impossible. Le brouillon est gardé, réessaie plus tard.';
      toast.error(message);
    } finally {
      setEnvoi(false);
    }
  }

  const titreFormulaire = existante ? 'Modifier la recette' : 'Nouvelle recette';
  const boutonEnregistrer = (
    <Button type="submit" disabled={envoi} className="h-11 rounded-full px-6 text-[16px]">
      <Check /> {envoi ? 'Enregistrement…' : 'Enregistrer'}
    </Button>
  );
  const surEnvoi = (e) => {
    e.preventDefault();
    enregistrer();
  };
  // Entrée dans un champ simple n'envoie pas le formulaire (les listes s'en servent pour ajouter une ligne)
  const surTouche = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
  };

  if (ordinateur) {
    return (
      <Sheet open={ouvert} onOpenChange={(o) => !o && fermerFormulaire()}>
        <SheetContent side="right" className="w-full gap-0 border-black bg-vert-clair p-0 sm:max-w-[min(1180px,94vw)]">
          <form onSubmit={surEnvoi} onKeyDown={surTouche} className="flex h-full flex-col">
            <div className="border-b border-black px-8 py-5">
              <SheetTitle className="text-[28px] font-normal tracking-[-0.03em]">{titreFormulaire}</SheetTitle>
              <SheetDescription className="text-[15px] text-black/60">L’aperçu à droite se met à jour pendant la saisie.</SheetDescription>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="overflow-y-auto px-8 py-6">
                {SECTIONS.map(({ id, titre }) => {
                  const Section = RENDU[id];
                  return (
                    <section key={id} className="mb-10">
                      <Entete className="mb-4">{titre}</Entete>
                      <Section v={v} maj={maj} erreurs={erreurs} />
                    </section>
                  );
                })}
              </div>
              <aside className="overflow-y-auto border-l border-black bg-[color-mix(in_srgb,var(--vert)_14%,var(--vert-clair))] px-8 py-6" aria-label="Aperçu">
                <p className="mb-4 text-[13px] tracking-[0.02em] text-black/60 uppercase">Aperçu</p>
                <Apercu recette={recette} />
              </aside>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-black px-8 py-4">
              <Button type="button" variant="ghost" onClick={fermerFormulaire} className="h-11 rounded-full text-[16px]">
                {existante ? 'Annuler' : 'Fermer (brouillon gardé)'}
              </Button>
              {boutonEnregistrer}
            </div>
          </form>
        </SheetContent>
      </Sheet>
    );
  }

  const courante = etapes[etape];
  const Section = RENDU[courante.id];
  const derniere = etape === etapes.length - 1;

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && fermerFormulaire()}>
      <DialogContent className="flex h-dvh max-w-none flex-col gap-0 rounded-none border-0 bg-vert-clair p-0 sm:max-w-none">
        <form onSubmit={surEnvoi} onKeyDown={surTouche} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-black px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3">
            <DialogTitle className="pr-10 text-[22px] font-normal tracking-[-0.02em]">{titreFormulaire}</DialogTitle>
            <DialogDescription className="sr-only">Formulaire en {etapes.length} étapes</DialogDescription>
            <ol className="mt-3 flex gap-1" aria-label="Étapes">
              {etapes.map((s, i) => (
                <li key={s.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => setEtape(i)}
                    aria-current={i === etape ? 'step' : undefined}
                    className={cn(tagVariants({ taille: 'sm', actif: i === etape }), 'w-full px-1 text-[12px] md:text-[12px]', i < etape && 'bg-black/10')}
                  >
                    {s.titre}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {Section ? <Section v={v} maj={maj} erreurs={erreurs} /> : <Apercu recette={recette} />}
          </div>
          <div className="flex gap-2 border-t border-black px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" disabled={etape === 0} onClick={() => setEtape(etape - 1)} className="h-11 flex-1 rounded-full bg-transparent text-[16px]">
              <ArrowLeft /> Précédent
            </Button>
            {derniere ? (
              <div className="flex flex-1 [&>button]:flex-1">{boutonEnregistrer}</div>
            ) : (
              <Button type="button" onClick={() => setEtape(etape + 1)} className="h-11 flex-1 rounded-full text-[16px]">
                Suivant <ArrowRight />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
