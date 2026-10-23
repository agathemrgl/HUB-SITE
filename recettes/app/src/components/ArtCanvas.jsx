import { useEffect, useRef } from 'react';
import { LARGEUR_REF, configPour, dessiner } from '@/lib/art';
import { cn } from '@/lib/utils';

const reduireAnimations = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/*
 * Dessin génératif propre à une recette (voir lib/art.js).
 * L'animation ne tourne que quand le canvas est visible ; survoler (ou appuyer) le lien ou la figure parente l'accélère.
 */
// `teinte` : { fond, trait } (voir lib/teintes.js), Pine sur Seedling par défaut.
export default function ArtCanvas({ id, famille, teinte, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const config = configPour(id, famille);
    const ctx = canvas.getContext('2d');
    const style = getComputedStyle(canvas);
    const couleurs = {
      trait: style.getPropertyValue('--art-trait').trim() || 'var(--pin)',
      fond: style.getPropertyValue('--art-fond').trim() || '#fff',
    };
    let P = config.depart;
    let visible = false;
    let rapide = false;
    let dernier = 0;
    let raf = null;

    function dimensionner() {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      // Le dessin est calculé sur 340px de large, puis mis à l'échelle du canvas
      const k = (width / LARGEUR_REF) * dpr;
      return { k, largeur: LARGEUR_REF, hauteur: (height / (width || 1)) * LARGEUR_REF };
    }
    let taille = dimensionner();

    function peindre() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(taille.k, 0, 0, taille.k, 0, 0);
      dessiner(ctx, config, P, taille.largeur, taille.hauteur, couleurs);
    }

    function boucle(temps) {
      raf = null;
      if (!visible) return;
      const pas = 1000 / (rapide ? 60 : 25);
      if (temps - dernier >= pas) {
        dernier = temps;
        P += rapide ? 10 * config.velocity : config.velocity;
        peindre();
      }
      raf = requestAnimationFrame(boucle);
    }

    peindre();
    const redimension = new ResizeObserver(() => {
      taille = dimensionner();
      peindre();
    });
    redimension.observe(canvas);
    if (reduireAnimations) return () => redimension.disconnect();

    const observateur = new IntersectionObserver(([entree]) => {
      visible = entree.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(boucle);
    });
    observateur.observe(canvas);

    const cible = canvas.closest('a, figure') || canvas;
    const accelerer = () => (rapide = true);
    const ralentir = () => (rapide = false);
    cible.addEventListener('pointerenter', accelerer);
    cible.addEventListener('pointerleave', ralentir);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observateur.disconnect();
      redimension.disconnect();
      cible.removeEventListener('pointerenter', accelerer);
      cible.removeEventListener('pointerleave', ralentir);
    };
  }, [id, famille, teinte?.fond, teinte?.trait]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ '--art-fond': teinte?.fond || 'var(--pousse)', '--art-trait': teinte?.trait || 'var(--pin)' }}
      className={cn('block size-full', className)}
    />
  );
}
