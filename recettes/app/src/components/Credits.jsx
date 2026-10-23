import { useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/*
 * Bouton rond « i » en haut à droite, 20px à gauche du point de connexion : les crédits DA et police
 * s'affichent au survol sur ordinateur, au toucher sur mobile.
 */
export default function Credits({ className }) {
  const [ouvert, setOuvert] = useState(false);
  const minuteur = useRef(null);
  // Fermeture un peu retardée : le temps de passer du bouton au panneau (pour cliquer les liens)
  const survol = (o) => (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(minuteur.current);
    if (o) setOuvert(true);
    else minuteur.current = setTimeout(() => setOuvert(false), 200);
  };
  const lien = 'underline-offset-4 hover:underline focus-visible:underline';

  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Crédits"
          onPointerEnter={survol(true)}
          onPointerLeave={survol(false)}
          className={cn(
            'fixed top-[18px] right-[59px] z-40 grid size-[21px] place-items-center rounded-full bg-card text-[13px] leading-none text-foreground italic outline-none focus-visible:ring-[3px] focus-visible:ring-ring sm:top-[26px] sm:right-[67px] print:hidden',
            className,
          )}
        >
          i
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        onPointerEnter={survol(true)}
        onPointerLeave={survol(false)}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-auto rounded-3xl border-0 bg-card p-4 text-[15px] leading-snug shadow-[0_16px_40px_-16px_rgb(0_0_0/0.3)]"
      >
        <p>
          <span className="surtitre block pb-0.5">DA</span>
          <a href="https://portfolio.agathe.space" target="_blank" rel="noreferrer" className={lien}>
            Agathe Margely
          </a>
        </p>
        <p className="mt-3">
          <span className="surtitre block pb-0.5">Police</span>
          <a href="https://www.miratmasson.com/" target="_blank" rel="noreferrer" className={lien}>
            Amiamie par Mirat-Masson
          </a>
        </p>
      </PopoverContent>
    </Popover>
  );
}
