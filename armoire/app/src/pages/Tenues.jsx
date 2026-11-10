import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownUp, ChevronDown, Loader2, Plus, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ActionBarre, Barre, BoutonBarre, Espace } from '@/components/Barre';
import Collage from '@/components/Collage';
import { BlocVide, CaseAjout, Puce, numero } from '@/components/communs';
import { formatJour } from '@/lib/dates';
import { useArmoire } from '@/store/Armoire';
import { cn } from '@/lib/utils';

/*
 * Carte d'une tenue : le collage sur papier quadrillé, puis le nom et la liste numérotée
 * des pièces (façon planche « 1. chaussettes, 2. … »).
 */
export function CarteTenue({ tenue, vetementsParId, stats, n, to, onClick, compacte = false, className }) {
  const pieces = tenue.composition.map((e) => vetementsParId.get(e.v)).filter(Boolean);
  const contenu = (
    <>
      <div className="quadrillage relative overflow-hidden">
        <Collage composition={tenue.composition} vetementsParId={vetementsParId} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        {n !== undefined && <span className="numero absolute top-3 left-3">{numero(n)}</span>}
      </div>
      <div className={cn('grid gap-1.5', compacte ? 'p-2' : 'p-3 md:p-4')}>
        <p className={cn('truncate font-sans font-medium', compacte ? 'text-[12px]' : 'text-[15px] md:text-[17px]')}>{tenue.nom || 'Sans nom'}</p>
        {!compacte && (
          <>
            <p className="etiquette line-clamp-2 text-encre/60">
              {pieces.map((p, i) => `${i + 1}. ${p.nom}`).join('  ')}
            </p>
            <p className="etiquette text-vert-texte">
              {stats ? `Portée ${stats.fois}× · ${formatJour(stats.dernier, { day: 'numeric', month: 'short' })}` : 'Jamais portée'}
              {tenue.tags.length > 0 && ` · ${tenue.tags.join(' / ')}`}
            </p>
          </>
        )}
      </div>
    </>
  );
  const classes = cn('group block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring', className);
  return to ? (
    <Link to={to} className={classes}>
      {contenu}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={classes}>
      {contenu}
    </button>
  );
}

const TRIS = [
  { id: 'recentes', label: 'Récentes' },
  { id: 'plus', label: 'Les plus portées' },
  { id: 'jamais', label: 'Jamais portées d’abord' },
  { id: 'nom', label: 'Nom A → Z' },
];
const menu = 'rounded-lg border border-vert p-4 shadow-[6px_6px_0_var(--vert)]';

export default function Tenues() {
  const { tenues, vetementsParId, usage, chargement } = useArmoire();
  const [tag, setTag] = useState(null);
  const [tri, setTri] = useState('recentes');
  const naviguer = useNavigate();

  const tags = useMemo(() => [...new Set(tenues.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b, 'fr')), [tenues]);
  const affichees = useMemo(() => {
    const liste = tag ? tenues.filter((t) => t.tags.includes(tag)) : tenues;
    const fois = (t) => usage.parTenue.get(t.id)?.fois ?? 0;
    const comparer = {
      recentes: () => 0,
      plus: (a, b) => fois(b) - fois(a),
      jamais: (a, b) => fois(a) - fois(b),
      nom: (a, b) => a.nom.localeCompare(b.nom, 'fr'),
    }[tri];
    return [...liste].sort(comparer);
  }, [tenues, tag, tri, usage]);

  return (
    <div className="conteneur pb-16">
      {/* Barre : occasions, tri, nouvelle tenue */}
      <Barre>
        <Popover>
          <PopoverTrigger asChild>
            <BoutonBarre>
              Filtres{tag ? ' (1)' : ''} <ChevronDown className="size-3.5" />
            </BoutonBarre>
          </PopoverTrigger>
          <PopoverContent align="start" className={cn(menu, 'grid w-80 gap-3')}>
            <p className="surtitre">Occasions</p>
            {tags.length ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Puce key={t} actif={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                    {t}
                  </Puce>
                ))}
              </div>
            ) : (
              <p className="etiquette text-encre/60">Aucune occasion pour l'instant.</p>
            )}
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
              <button key={t.id} type="button" onClick={() => setTri(t.id)} className={cn('etiquette px-3 py-2.5 text-left hover:bg-accent', tri === t.id && 'text-vert-texte')}>
                {tri === t.id ? '● ' : ''}
                {t.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        {tag && (
          <BoutonBarre onClick={() => setTag(null)}>
            {tag} <X className="size-3.5" />
          </BoutonBarre>
        )}
        <Espace />
        <ActionBarre to="/tenues/nouvelle" icone={Plus}>
          Nouvelle tenue
        </ActionBarre>
      </Barre>

      <div className="pt-4 md:pt-6">
      {chargement ? (
        <div className="grid place-items-center py-24 text-vert-texte">
          <Loader2 className="animate-spin" />
        </div>
      ) : tenues.length === 0 ? (
        <BlocVide label="Créer une tenue" onClick={() => naviguer('/tenues/nouvelle')} />
      ) : (
        <div className="grille-filets grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {affichees.map((t, i) => (
            <CarteTenue key={t.id} tenue={t} n={i + 1} vetementsParId={vetementsParId} stats={usage.parTenue.get(t.id)} to={`/tenues/${t.id}`} />
          ))}
          <CaseAjout label="Nouvelle tenue" onClick={() => naviguer('/tenues/nouvelle')} />
        </div>
      )}
      </div>
    </div>
  );
}
