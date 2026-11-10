import { NavLink, useLocation } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useArmoire } from '@/store/Armoire';
import { cn } from '@/lib/utils';

export const ONGLETS = [
  { to: '/', label: 'Vêtements', fin: true },
  { to: '/tenues', label: 'Tenues' },
  { to: '/calendrier', label: 'Calendrier' },
];

function Compte() {
  const { session, deconnexion } = useArmoire();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Compte"
          className="grid size-9 place-items-center rounded-full border border-vert font-mono text-[13px] text-vert-texte uppercase outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          {session.user.email[0]}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-64 gap-3 rounded-lg border border-vert p-4 shadow-none">
        <p className="etiquette break-all">{session.user.email}</p>
        <Button variant="outline" className="rounded-md border-vert bg-transparent text-vert-texte shadow-none" onClick={deconnexion}>
          Déconnexion
        </Button>
      </PopoverContent>
    </Popover>
  );
}

const TITRES = { '/': 'vêtements', '/tenues': 'tenues', '/calendrier': 'calendrier' };

// En-tête : le grand titre de l'onglet en cours, centré, puis les onglets (sur ordinateur).
// Le bouton de compte reste en haut à droite.
export default function Header() {
  const { pathname } = useLocation();
  const onglet = ONGLETS.find((o) => (o.fin ? pathname === o.to : pathname.startsWith(o.to))) ?? ONGLETS[0];
  return (
    <header className="relative">
      <div className="conteneur relative">
        <div className="absolute top-3 right-[var(--gouttiere)] z-10 md:top-4">
          <Compte />
        </div>
        <h1 className="pt-16 pb-5 text-center font-display text-[clamp(58px,14vw,200px)] leading-[0.82] text-titre lowercase md:pt-14 md:pb-8">
          {TITRES[onglet.to]}
        </h1>
        <nav className="hidden items-stretch justify-center md:flex" aria-label="Onglets">
          {ONGLETS.map(({ to, label, fin }) => (
            <NavLink
              key={to}
              to={to}
              end={fin}
              className={({ isActive }) =>
                cn(
                  'etiquette flex h-11 items-center border-b-2 border-transparent px-6 text-[12px] transition-colors hover:text-vert-texte',
                  isActive && 'border-vert text-vert-texte',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

// Barre d'onglets en bas de l'écran (téléphone, et toujours dans l'app installée, voir .barre-onglets
// dans index.css) : un rail translucide à contour turquoise (le contenu défile flouté dessous), l'onglet actif en aplat turquoise qui glisse d'un onglet à l'autre.
export function BarreOnglets() {
  const { pathname } = useLocation();
  const actif = Math.max(0, ONGLETS.findIndex((o) => (o.fin ? pathname === o.to : pathname.startsWith(o.to))));
  return (
    <nav aria-label="Onglets" className="barre-onglets fixed inset-x-0 bottom-0 z-30 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="relative grid h-12 grid-cols-3 border border-vert bg-fond/50 backdrop-blur-md backdrop-saturate-150">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1/3 bg-primary/85 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${actif * 100}%)` }}
        />
        {ONGLETS.map(({ to, label, fin }) => (
          <NavLink
            key={to}
            to={to}
            end={fin}
            className={({ isActive }) => cn('etiquette relative z-10 grid place-items-center text-[12px] transition-colors', isActive ? 'text-encre' : 'text-vert-texte')}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
