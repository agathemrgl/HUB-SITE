import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { teintePour } from '@/lib/teintes';

/*
 * Mode cuisine : une étape à la fois, en grand, flèches du clavier ou boutons pour avancer.
 * L'écran reste allumé tant que le mode est ouvert (Wake Lock, si le navigateur le permet).
 */
export default function ModeCuisine({ recette, ouvert, setOuvert }) {
  const [i, setI] = useState(0);
  const etapes = recette.etapes || [];
  const n = etapes.length;

  useEffect(() => {
    if (!ouvert) return;
    setI(0);
    let verrou = null;
    let actif = true;
    const demander = () =>
      navigator.wakeLock
        ?.request('screen')
        .then((v) => {
          if (actif) verrou = v;
          else v.release();
        })
        .catch(() => {});
    demander();
    // Le verrou saute quand l'onglet passe en arrière-plan : on le redemande au retour
    const surRetour = () => document.visibilityState === 'visible' && demander();
    document.addEventListener('visibilitychange', surRetour);
    return () => {
      actif = false;
      verrou?.release();
      document.removeEventListener('visibilitychange', surRetour);
    };
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e) => {
      if (e.key === 'ArrowRight') setI((x) => Math.min(n - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [ouvert, n]);

  if (!n) return null;
  const teinte = teintePour(recette.id);

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogContent style={{ backgroundColor: teinte.fond }} className="flex h-dvh max-w-none flex-col rounded-none border-0 p-5 pt-[max(20px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))] sm:max-w-none md:p-12">
        <DialogTitle className="surtitre pr-10 font-normal !text-foreground/55">{recette.titre}</DialogTitle>
        <DialogDescription className="sr-only">Mode cuisine, une étape à la fois</DialogDescription>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-card/70" aria-hidden="true">
          <div className="h-full rounded-full transition-[width] duration-500 ease-out-quart" style={{ width: `${((i + 1) / n) * 100}%`, backgroundColor: teinte.trait }} />
        </div>

        <div className="flex flex-1 flex-col justify-center overflow-y-auto" aria-live="polite">
          <p className="mb-4 text-[15px] text-foreground/55">
            Étape {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </p>
          <p className="max-w-[900px] text-[clamp(28px,18px+2.4vw,58px)] leading-[1.1] tracking-[-0.04em]" style={{ color: teinte.trait }}>{etapes[i]}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="h-14 flex-1 rounded-full bg-card text-[18px] shadow-none hover:bg-card/80" disabled={i === 0} onClick={() => setI(i - 1)}>
            <ArrowLeft /> Précédente
          </Button>
          {i < n - 1 ? (
            <Button style={{ backgroundColor: teinte.trait }} className="h-14 flex-1 rounded-full text-[18px] text-primary-foreground shadow-none hover:opacity-90" onClick={() => setI(i + 1)}>
              Suivante <ArrowRight />
            </Button>
          ) : (
            <Button style={{ backgroundColor: teinte.trait }} className="h-14 flex-1 rounded-full text-[18px] text-primary-foreground shadow-none hover:opacity-90" onClick={() => setOuvert(false)}>
              Bon appétit !
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
