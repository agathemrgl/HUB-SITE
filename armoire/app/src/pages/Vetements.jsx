import { useMemo, useState } from 'react';
import { ArrowDownUp, ChevronDown, Heart, Loader2, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ActionBarre, Barre, BoutonBarre } from '@/components/Barre';
import FicheVetement from '@/components/FicheVetement';
import FormulaireVetement from '@/components/FormulaireVetement';
import { BlocVide, CaseAjout, EtatVide, PastilleCouleur, Photo, Puce, fois, numero } from '@/components/communs';
import { CATEGORIES, COULEURS, LABEL_CATEGORIE, SAISONS } from '@/lib/constantes';
import { ancienneArmoire, marquerImportFait, versFichier } from '@/lib/import';
import { useArmoire } from '@/store/Armoire';
import { cn } from '@/lib/utils';

const TRIS = [
  { id: 'recents', label: 'Récents' },
  { id: 'plus', label: 'Les plus portés' },
  { id: 'moins', label: 'Les moins portés' },
  { id: 'oublies', label: 'Oubliés depuis longtemps' },
  { id: 'nom', label: 'Nom A → Z' },
];
const FILTRES_VIDES = { couleurs: [], saisons: [], favoris: false, jamais: false };
const basculer = (liste, valeur) => (liste.includes(valeur) ? liste.filter((x) => x !== valeur) : [...liste, valeur]);
const menu = 'rounded-lg border border-vert p-4 shadow-[6px_6px_0_var(--vert)]';

// Case de la grille : nom et infos en mono en haut, numéro vert, photo au centre
function CaseVetement({ vetement, n, stats, onOuvrir, onFavori }) {
  return (
    <div className="group relative flex flex-col p-3 md:p-4">
      <button type="button" onClick={onOuvrir} className="flex flex-1 flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="etiquette block truncate pr-9">{vetement.nom || 'Sans nom'}</span>
        <span className="etiquette block truncate pr-9 text-encre/55">
          {LABEL_CATEGORIE[vetement.categorie]} · {fois(stats?.fois)}
        </span>
        <Photo vetement={vetement} className="mt-3 aspect-square w-full" imgClassName="p-2 transition-transform duration-500 group-hover:scale-[1.06] group-hover:-rotate-2" />
        <span className="numero mt-2 self-end">{numero(n)}</span>
      </button>
      <button
        type="button"
        aria-label={vetement.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        aria-pressed={vetement.favori}
        onClick={onFavori}
        className={cn(
          'absolute top-2 right-2 grid size-8 place-items-center rounded-full text-vert-texte transition-opacity md:top-3 md:right-3',
          vetement.favori ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-50',
        )}
      >
        <Heart className={cn('size-4', vetement.favori && 'fill-vert')} />
      </button>
    </div>
  );
}

function ImportAncienne() {
  const { enregistrerVetement } = useArmoire();
  const [anciens] = useState(ancienneArmoire);
  const [avancement, setAvancement] = useState(null);
  if (!anciens.length) return null;

  async function importer() {
    let reussis = 0;
    for (const [i, a] of anciens.entries()) {
      setAvancement(`${i + 1} / ${anciens.length}`);
      try {
        await enregistrerVetement({ nom: a.nom, categorie: a.categorie, couleurs: [], saisons: [], tags: [] }, { fichier: await versFichier(a.image) });
        reussis++;
      } catch (e) {
        console.error(e);
      }
    }
    marquerImportFait();
    setAvancement(null);
    toast.success(`${reussis} vêtement${reussis > 1 ? 's' : ''} importé${reussis > 1 ? 's' : ''}`);
  }

  return (
    <Button variant="outline" className="rounded-md border-vert bg-transparent text-vert-texte shadow-none" disabled={!!avancement} onClick={importer}>
      {avancement ? (
        <>
          <Loader2 className="animate-spin" /> Import {avancement}
        </>
      ) : (
        `Importer les ${anciens.length} vêtements de l'ancienne armoire`
      )}
    </Button>
  );
}

export default function Vetements() {
  const { vetements, usage, chargement, erreur, basculerFavori } = useArmoire();
  const [categorie, setCategorie] = useState('tout');
  const [recherche, setRecherche] = useState('');
  const [filtres, setFiltres] = useState(FILTRES_VIDES);
  const [tri, setTri] = useState('recents');
  const [fiche, setFiche] = useState(null);
  const [formulaire, setFormulaire] = useState(null); // null fermé, {} ajout, { vetement } modification

  const nbFiltres = filtres.couleurs.length + filtres.saisons.length + Number(filtres.favoris) + Number(filtres.jamais);
  const comptes = useMemo(() => {
    const c = { tout: vetements.length };
    for (const v of vetements) c[v.categorie] = (c[v.categorie] ?? 0) + 1;
    return c;
  }, [vetements]);

  const affiches = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const st = (v) => usage.parVetement.get(v.id);
    const liste = vetements.filter(
      (v) =>
        (categorie === 'tout' || v.categorie === categorie) &&
        (!q || [v.nom, v.marque, ...v.tags].some((t) => t?.toLowerCase().includes(q))) &&
        (!filtres.couleurs.length || filtres.couleurs.some((c) => v.couleurs.includes(c))) &&
        (!filtres.saisons.length || filtres.saisons.some((s) => v.saisons.includes(s))) &&
        (!filtres.favoris || v.favori) &&
        (!filtres.jamais || !st(v)),
    );
    const comparer = {
      recents: () => 0,
      nom: (a, b) => a.nom.localeCompare(b.nom, 'fr'),
      plus: (a, b) => (st(b)?.fois ?? 0) - (st(a)?.fois ?? 0),
      moins: (a, b) => (st(a)?.fois ?? 0) - (st(b)?.fois ?? 0),
      oublies: (a, b) => (st(a)?.dernier ?? '').localeCompare(st(b)?.dernier ?? ''),
    }[tri];
    return [...liste].sort(comparer);
  }, [vetements, usage, categorie, recherche, filtres, tri]);

  const reinitialiser = () => {
    setFiltres(FILTRES_VIDES);
    setRecherche('');
    setCategorie('tout');
  };

  return (
    <div className="conteneur pb-16">

      {/* Barre : filtres, tri, recherche, ajout */}
      <Barre>
        <Popover>
          <PopoverTrigger asChild>
            <BoutonBarre>
              Filtres{nbFiltres ? ` (${nbFiltres})` : ''} <ChevronDown className="size-3.5" />
            </BoutonBarre>
          </PopoverTrigger>
          <PopoverContent align="start" className={cn(menu, 'grid w-80 gap-4')}>
            <div className="flex flex-wrap gap-2">
              <Puce actif={filtres.favoris} onClick={() => setFiltres((f) => ({ ...f, favoris: !f.favoris }))}>
                <Heart className="size-3.5" /> Favoris
              </Puce>
              <Puce actif={filtres.jamais} onClick={() => setFiltres((f) => ({ ...f, jamais: !f.jamais }))}>
                Jamais portés
              </Puce>
            </div>
            <div className="grid gap-2">
              <p className="surtitre">Couleurs</p>
              <div className="flex flex-wrap gap-1.5">
                {COULEURS.map((c) => {
                  const actif = filtres.couleurs.includes(c.id);
                  return (
                    <button key={c.id} type="button" title={c.label} aria-pressed={actif} onClick={() => setFiltres((f) => ({ ...f, couleurs: basculer(f.couleurs, c.id) }))} className={cn('grid size-8 place-items-center rounded-full', actif && 'ring-2 ring-vert ring-offset-2 ring-offset-popover')}>
                      <PastilleCouleur id={c.id} className="size-6" />
                      <span className="sr-only">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <p className="surtitre">Saisons</p>
              <div className="flex flex-wrap gap-2">
                {SAISONS.map((s) => (
                  <Puce key={s.id} actif={filtres.saisons.includes(s.id)} onClick={() => setFiltres((f) => ({ ...f, saisons: basculer(f.saisons, s.id) }))}>
                    {s.label}
                  </Puce>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <BoutonBarre>
              <ArrowDownUp className="size-3.5" /> <span className="max-sm:hidden">{TRIS.find((t) => t.id === tri).label}</span>
            </BoutonBarre>
          </PopoverTrigger>
          <PopoverContent align="start" className={cn(menu, 'grid w-60 gap-1 p-2')}>
            {TRIS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTri(t.id)} className={cn('etiquette rounded-md px-3 py-2.5 text-left hover:bg-accent', tri === t.id && 'text-vert-texte')}>
                {tri === t.id ? '● ' : ''}
                {t.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {(nbFiltres > 0 || recherche) && (
          <BoutonBarre onClick={reinitialiser} className="max-sm:hidden">
            Tout effacer
          </BoutonBarre>
        )}

        <label className="ml-auto flex min-w-0 items-center gap-2 px-3 md:px-4">
          <Search className="size-3.5 shrink-0" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="RECHERCHE"
            aria-label="Rechercher"
            className="w-24 min-w-0 bg-transparent font-mono text-[16px] tracking-wider uppercase outline-none placeholder:text-vert/60 md:w-40 md:text-[11px]"
          />
          {recherche && (
            <button type="button" aria-label="Effacer la recherche" onClick={() => setRecherche('')}>
              <X className="size-3.5" />
            </button>
          )}
        </label>
        <ActionBarre icone={Plus} onClick={() => setFormulaire({})}>
          Nouveau vêtement
        </ActionBarre>
      </Barre>

      <div className="grid gap-0 md:grid-cols-[200px_1fr] lg:grid-cols-[240px_1fr]">
        {/* Catégories : colonne à gauche sur ordinateur, rangée défilante sur mobile */}
        <nav aria-label="Catégories" className="flex flex-wrap gap-2 py-3 md:sticky md:top-11 md:flex-col md:flex-nowrap md:gap-0 md:self-start md:overflow-visible md:py-6 md:pr-6">
          {[{ id: 'tout', label: 'Tout' }, ...CATEGORIES].map((c) => {
            const actif = categorie === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategorie(c.id)}
                aria-pressed={actif}
                className={cn(
                  'etiquette flex shrink-0 items-center justify-between gap-3 rounded-full border border-vert/50 px-3.5 py-2 transition-colors md:rounded-none md:border-0 md:px-0 md:py-1.5 md:text-[12px]',
                  actif ? 'border-vert bg-primary text-primary-foreground md:bg-transparent md:text-vert-texte' : 'hover:text-vert-texte',
                )}
              >
                <span>
                  {actif && <span className="max-md:hidden">→ </span>}
                  {c.label}
                </span>
                <span className="opacity-60">{comptes[c.id] ?? 0}</span>
              </button>
            );
          })}
        </nav>

        <div className="md:pt-6">
          {erreur ? (
            <EtatVide texte="Impossible de charger l'armoire. Vérifie ta connexion.">
              <p className="etiquette">{erreur.message}</p>
            </EtatVide>
          ) : chargement ? (
            <div className="grid place-items-center py-24 text-vert-texte">
              <Loader2 className="animate-spin" />
            </div>
          ) : vetements.length === 0 ? (
            <BlocVide label="Ajouter des vêtements" onClick={() => setFormulaire({})}>
              <div className="justify-self-center">
                <ImportAncienne />
              </div>
            </BlocVide>
          ) : affiches.length === 0 ? (
            <EtatVide texte="Aucun vêtement ne correspond.">
              <Button variant="outline" className="rounded-md border-vert bg-transparent text-vert-texte shadow-none" onClick={reinitialiser}>
                Réinitialiser
              </Button>
            </EtatVide>
          ) : (
            <div className="grille-filets grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {affiches.map((v, i) => (
                <CaseVetement key={v.id} vetement={v} n={i + 1} stats={usage.parVetement.get(v.id)} onOuvrir={() => setFiche(v)} onFavori={() => basculerFavori(v)} />
              ))}
              <CaseAjout label="Ajouter un vêtement" onClick={() => setFormulaire({})} />
            </div>
          )}
        </div>
      </div>

      <FicheVetement
        vetement={fiche}
        onClose={() => setFiche(null)}
        onModifier={(v) => {
          setFiche(null);
          setFormulaire({ vetement: v });
        }}
      />
      <FormulaireVetement
        ouvert={!!formulaire}
        onOpenChange={(o) => !o && setFormulaire(null)}
        vetement={formulaire?.vetement}
        categorieParDefaut={categorie === 'tout' ? undefined : categorie}
      />
    </div>
  );
}
