import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BringToFront, Save, CalendarPlus, Check, Eraser, Loader2, Minus, Plus, Search, SendToBack, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ActionBarre, Barre, Espace, styleBoutonBarre } from '@/components/Barre';
import Collage, { LARGEUR_MAX, LARGEUR_MIN, nouvelElement } from '@/components/Collage';
import Confirmation from '@/components/Confirmation';
import { Photo, Puce, numero } from '@/components/communs';
import { CATEGORIES, LABEL_CATEGORIE, TAGS_TENUE } from '@/lib/constantes';
import { aujourdhui, formatJour } from '@/lib/dates';
import { useArmoire } from '@/store/Armoire';
import { cn } from '@/lib/utils';

// Bibliothèque de vêtements à cliquer pour les poser sur le canvas
function Bibliotheque({ vetements, presents, onAjouter, className }) {
  const [categorie, setCategorie] = useState('tout');
  const [recherche, setRecherche] = useState('');
  const q = recherche.trim().toLowerCase();
  const liste = vetements.filter((v) => (categorie === 'tout' || v.categorie === categorie) && (!q || [v.nom, v.marque, ...v.tags].some((t) => t?.toLowerCase().includes(q))));

  return (
    <div className={cn('flex min-h-0 flex-col gap-3', className)}>
      <p className="surtitre">( ajouter une pièce )</p>
      <label className="flex h-9 items-center gap-2 rounded-full border border-vert/60 px-3 focus-within:border-vert">
        <Search className="size-3.5 text-vert-texte" />
        <input placeholder="Chercher" value={recherche} onChange={(e) => setRecherche(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[16px] outline-none md:text-[13px]" />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {[{ id: 'tout', label: 'Tout' }, ...CATEGORIES].map((c) => (
          <Puce key={c.id} actif={categorie === c.id} onClick={() => setCategorie(c.id)} className="h-7 px-2.5 text-[10px]">
            {c.label}
          </Puce>
        ))}
      </div>
      <div className="grille-filets min-h-0 flex-1 auto-rows-max grid-cols-3 sm:grid-cols-4 md:grid-cols-3 md:overflow-y-auto">
        {liste.map((v) => (
          <button key={v.id} type="button" title={`Ajouter ${v.nom}`} onClick={() => onAjouter(v)} className="relative hover:bg-accent">
            <Photo vetement={v} className="aspect-square" imgClassName="p-2" />
            {presents.has(v.id) && <span className="absolute top-1.5 right-1.5 rond size-2 bg-encre" />}
          </button>
        ))}
        {liste.length === 0 && (
          <p className="etiquette col-span-full p-6 text-center text-encre/60">
            {vetements.length ? 'Rien ici.' : <Link to="/" className="underline">Ajoute d'abord des vêtements</Link>}
          </p>
        )}
      </div>
    </div>
  );
}

export default function EditeurTenue() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const naviguer = useNavigate();
  const { tenuesParId, vetements, vetementsParId, chargement, enregistrerTenue, supprimerTenue, definirJour, joursParDate } = useArmoire();

  const nouvelle = id === 'nouvelle';
  const tenue = nouvelle ? null : tenuesParId.get(id);
  const jourDemande = params.get('jour');

  const [nom, setNom] = useState('');
  const [tags, setTags] = useState([]);
  const [composition, setComposition] = useState([]);
  const [selection, setSelection] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [modifie, setModifie] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [jourPlan, setJourPlan] = useState(jourDemande ?? aujourdhui());
  const initialisee = useRef(null);

  // Remplit l'éditeur une fois la tenue disponible (elle peut arriver après le premier rendu)
  useEffect(() => {
    if (initialisee.current === id || chargement) return;
    if (tenue) {
      setNom(tenue.nom);
      setTags(tenue.tags);
      setComposition(tenue.composition);
    } else if (nouvelle) {
      const avec = vetementsParId.get(params.get('avec'));
      setNom('');
      setTags([]);
      setComposition(avec ? [nouvelElement(avec, [])] : []);
    } else {
      naviguer('/tenues', { replace: true });
      return;
    }
    setSelection(null);
    setModifie(false);
    initialisee.current = id;
  }, [id, tenue, nouvelle, chargement, vetementsParId, params, naviguer]);

  const changer = (suivante) => {
    setComposition(suivante);
    setModifie(true);
  };

  const presents = useMemo(() => new Set(composition.map((e) => e.v)), [composition]);
  const element = selection !== null ? composition[selection] : null;

  function ajouter(v) {
    changer([...composition, nouvelElement(v, composition)]);
    setSelection(composition.length);
  }

  function modifierSelection(modif) {
    if (selection === null) return;
    changer(composition.map((e, i) => (i === selection ? { ...e, ...modif(e) } : e)));
  }

  function retirer(index) {
    changer(composition.filter((_, i) => i !== index));
    setSelection(null);
  }

  const zs = composition.map((e) => e.z ?? 0);

  // Suppr / Retour arrière retire l'élément choisi (hors champs de saisie)
  useEffect(() => {
    function clavier(e) {
      if (selection === null || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        retirer(selection);
      } else if (e.key === 'Escape') setSelection(null);
    }
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  });

  async function enregistrer() {
    setEnvoi(true);
    try {
      const enregistree = await enregistrerTenue({ id: tenue?.id, nom: nom.trim(), tags, composition });
      setModifie(false);
      if (jourDemande) {
        await definirJour({ jour: jourDemande, tenue_id: enregistree.id, note: joursParDate.get(jourDemande)?.note });
        toast.success(`Tenue enregistrée pour le ${formatJour(jourDemande, { day: 'numeric', month: 'long' })}`);
        naviguer('/calendrier');
      } else {
        toast.success('Tenue enregistrée');
        if (nouvelle) {
          initialisee.current = enregistree.id;
          naviguer(`/tenues/${enregistree.id}`, { replace: true });
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'enregistrement");
    } finally {
      setEnvoi(false);
    }
  }

  async function planifier() {
    try {
      const t = !tenue || modifie ? await enregistrerTenue({ id: tenue?.id, nom: nom.trim(), tags, composition }) : tenue;
      setModifie(false);
      await definirJour({ jour: jourPlan, tenue_id: t.id, note: joursParDate.get(jourPlan)?.note });
      toast.success(`Ajoutée au calendrier : ${formatJour(jourPlan)}`);
      if (nouvelle) {
        initialisee.current = t.id;
        naviguer(`/tenues/${t.id}`, { replace: true });
      }
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'ajout au calendrier");
    }
  }

  const outils = [
    { label: 'Plus petit', icone: Minus, action: () => modifierSelection((e) => ({ l: Math.max(LARGEUR_MIN, e.l * 0.9) })) },
    { label: 'Plus grand', icone: Plus, action: () => modifierSelection((e) => ({ l: Math.min(LARGEUR_MAX, e.l * 1.1) })) },
    { label: 'Premier plan', icone: BringToFront, action: () => modifierSelection(() => ({ z: Math.max(...zs) + 1 })) },
    { label: 'Arrière-plan', icone: SendToBack, action: () => modifierSelection(() => ({ z: Math.min(...zs) - 1 })) },
    { label: 'Retirer', icone: X, action: () => retirer(selection) },
  ];

  if (chargement) {
    return (
      <div className="grid place-items-center py-24 text-vert-texte">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const dateAffichee = (jourDemande ?? tenue?.created_at?.slice(0, 10) ?? aujourdhui()).replaceAll('-', '');
  const etiquetteBouton = jourDemande ? 'Enregistrer et planifier' : !modifie && !nouvelle ? 'Enregistrée' : 'Enregistrer';

  return (
    <div className="conteneur pb-10">
      {/* Barre : retour, enregistrer (toujours cliquable sauf canvas vide ; « Enregistrée » quand rien n'a changé) */}
      <Barre>
        <Link to={jourDemande ? '/calendrier' : '/tenues'} className={styleBoutonBarre}>
          <ArrowLeft className="size-3.5" /> {jourDemande ? 'Calendrier' : 'Tenues'}
        </Link>
        <Espace />
        <ActionBarre disabled={envoi || !composition.length} onClick={enregistrer}>
          <span className="flex items-center gap-1.5">
            {envoi ? <Loader2 className="size-4 animate-spin" /> : !modifie && !nouvelle && !jourDemande ? <Check className="size-4" /> : <Save className="size-4" />} {etiquetteBouton}
          </span>
        </ActionBarre>
      </Barre>

      <div className="grid gap-3 pt-4 md:pt-6 lg:gap-10 lg:grid-cols-[230px_minmax(0,1fr)_230px] xl:grid-cols-[250px_minmax(0,1fr)_250px]">
        {/* Gauche : titre, actions */}
        <aside className="grid min-w-0 content-start gap-5 lg:sticky lg:top-16 lg:self-start">
          <div className="grid gap-2">
            <p className="etiquette text-encre/60">( {dateAffichee} )</p>
            <textarea
              rows={2}
              value={nom}
              onChange={(e) => {
                setNom(e.target.value);
                setModifie(true);
              }}
              placeholder="Nom de la tenue"
              aria-label="Nom de la tenue"
              className="field-sizing-content resize-none bg-transparent font-sans text-[28px] leading-[1.1] font-medium text-vert-texte outline-none placeholder:text-vert-texte/40 lg:text-[30px]"
            />
            {jourDemande && <p className="etiquette w-fit rounded-md bg-primary px-2 py-1 text-primary-foreground">Pour le {formatJour(jourDemande)}</p>}
          </div>

          <div className="grid gap-2">
            {!jourDemande && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-11 rounded-md border-vert bg-transparent text-vert-texte shadow-none hover:bg-accent hover:text-vert-texte" disabled={!composition.length}>
                    <CalendarPlus /> Planifier
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="grid w-72 gap-3 rounded-lg border border-vert p-4 shadow-[6px_6px_0_var(--vert)]">
                  <Input type="date" value={jourPlan} onChange={(e) => setJourPlan(e.target.value)} className="h-10 rounded-md border-vert bg-transparent text-[16px] shadow-none" />
                  {joursParDate.get(jourPlan)?.tenue_id && joursParDate.get(jourPlan).tenue_id !== tenue?.id && <p className="etiquette text-encre/60">Ce jour a déjà une tenue : elle sera remplacée.</p>}
                  <Button className="rounded-md" disabled={!jourPlan} onClick={planifier}>
                    Planifier ce jour
                  </Button>
                </PopoverContent>
              </Popover>
            )}
            <div className={cn('grid gap-2', tenue && 'grid-cols-2')}>
              <Button variant="outline" className="h-11 rounded-md border-vert bg-transparent text-vert-texte shadow-none hover:bg-accent hover:text-vert-texte" disabled={!composition.length} onClick={() => { changer([]); setSelection(null); }}>
                <Eraser /> Vider
              </Button>
              {tenue && (
                <Button variant="outline" className="h-11 rounded-md border-vert bg-transparent text-vert-texte shadow-none hover:bg-accent hover:text-vert-texte text-destructive hover:text-destructive" onClick={() => setConfirmer(true)}>
                  <Trash2 /> Supprimer
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* Centre : canvas sur papier quadrillé */}
        <div className="order-first grid content-start gap-3 lg:order-none">
          <div className="quadrillage relative mx-auto w-full max-w-[min(100%,calc((100dvh-170px)*0.75))] border border-vert">
            <Collage composition={composition} vetementsParId={vetementsParId} editable selection={selection} onSelection={setSelection} onChange={changer} />
            {composition.length === 0 && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center content-center gap-5 px-10 text-center text-vert-texte">
                <span className="croix" aria-hidden />
                <p className="etiquette">Clique des pièces dans la bibliothèque, puis glisse et redimensionne-les ici</p>
              </div>
            )}
          </div>
          {/* Outils de l'élément choisi */}
          <div className={cn('mx-auto flex gap-px overflow-hidden rounded-md border border-vert bg-primary transition-opacity', !element && 'max-lg:hidden lg:pointer-events-none lg:opacity-0')}>
            {outils.map(({ label, icone: Icone, action }) => (
              <button key={label} type="button" title={label} aria-label={label} onClick={action} className="grid size-10 place-items-center bg-carte text-vert-texte hover:bg-accent">
                <Icone className="size-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Droite : occasions, collection numérotée, bibliothèque */}
        <div className="grid min-w-0 content-start gap-6 lg:sticky lg:top-16 lg:h-[calc(100dvh-90px)] lg:grid-rows-[auto_auto_1fr] lg:self-start">
          <div className="grid gap-2">
            <p className="surtitre">( occasions )</p>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...TAGS_TENUE, ...tags])].map((t) => (
                <Puce
                  key={t}
                  actif={tags.includes(t)}
                  className="h-7 px-2.5 text-[10px]"
                  onClick={() => {
                    setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
                    setModifie(true);
                  }}
                >
                  {t}
                </Puce>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <p className="surtitre">( collection ) · {numero(composition.length)}</p>
            {composition.length === 0 ? (
              <p className="etiquette text-encre/50">Aucune pièce pour l'instant.</p>
            ) : (
              <ol className="grille-filets max-h-56 overflow-y-auto lg:max-h-64">
                {composition.map((e, i) => {
                  const v = vetementsParId.get(e.v);
                  if (!v) return null;
                  return (
                    <li key={`${e.v}-${i}`} className={cn('flex items-center gap-3 p-2', selection === i && 'bg-accent!')}>
                      <button type="button" onClick={() => setSelection(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="numero">{numero(i + 1)}</span>
                        <Photo vetement={v} className="size-10 shrink-0" imgClassName="p-0.5" />
                        <span className="min-w-0">
                          <span className="etiquette block truncate">{v.nom}</span>
                          <span className="etiquette block text-encre/50">{LABEL_CATEGORIE[v.categorie]}</span>
                        </span>
                      </button>
                      <button type="button" aria-label={`Retirer ${v.nom}`} onClick={() => retirer(i)} className="p-1 text-vert-texte hover:text-encre">
                        <X className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <Bibliotheque vetements={vetements} presents={presents} onAjouter={ajouter} className="min-w-0 lg:min-h-0" />
        </div>
      </div>

      <Confirmation
        ouvert={confirmer}
        onOpenChange={setConfirmer}
        titre="Supprimer cette tenue ?"
        texte="Les jours du calendrier qui l'utilisent resteront, sans tenue."
        onConfirmer={async () => {
          await supprimerTenue(tenue);
          toast.success('Tenue supprimée');
          naviguer('/tenues');
        }}
      />
    </div>
  );
}
