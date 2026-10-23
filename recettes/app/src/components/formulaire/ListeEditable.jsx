import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { champ, zoneTexte } from '@/components/formulaire/styles';
import { cn } from '@/lib/utils';

/*
 * Liste de lignes à ajouter, retirer et réordonner (ingrédients, étapes, paragraphes).
 * - Entrée dans une ligne (champ simple) : crée la ligne suivante.
 * - Coller plusieurs lignes d'un coup : une ligne par élément.
 * `indice(valeur)` peut renvoyer un petit texte d'aide affiché sous la ligne.
 */
export default function ListeEditable({ valeurs, onChange, placeholder, multiligne = false, numero, ajouter = 'Ajouter', indice, nom }) {
  const refs = useRef([]);
  const [focus, setFocus] = useState(null);

  useEffect(() => {
    if (focus === null) return;
    refs.current[focus]?.focus();
    setFocus(null);
  }, [focus, valeurs.length]);

  const changer = (i, v) => onChange(valeurs.map((x, j) => (j === i ? v : x)));
  const inserer = (i, nouvelles = ['']) => {
    onChange([...valeurs.slice(0, i), ...nouvelles, ...valeurs.slice(i)]);
    setFocus(i + nouvelles.length - 1);
  };
  const retirer = (i) => {
    const suivante = valeurs.filter((_, j) => j !== i);
    onChange(suivante.length ? suivante : ['']);
    setFocus(Math.max(0, i - 1));
  };
  const deplacer = (i, d) => {
    const suivante = [...valeurs];
    [suivante[i], suivante[i + d]] = [suivante[i + d], suivante[i]];
    onChange(suivante);
    setFocus(i + d);
  };

  function surCollage(e, i) {
    const lignes = e.clipboardData
      .getData('text')
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '').trim()) // retire puces et numéros collés
      .filter(Boolean);
    if (lignes.length < 2) return;
    e.preventDefault();
    const avant = valeurs.slice(0, i);
    const apres = valeurs.slice(i + 1);
    const garder = valeurs[i].trim() ? [valeurs[i]] : [];
    onChange([...avant, ...garder, ...lignes, ...apres]);
    setFocus(avant.length + garder.length + lignes.length - 1);
  }

  const Champ = multiligne ? Textarea : Input;

  return (
    <div className="grid gap-2">
      <ol className="grid gap-2">
        {valeurs.map((v, i) => {
          const aide = v.trim() && indice?.(v);
          return (
            <li key={i} className="grid gap-1">
              {numero && <span className="text-[13px] text-muted-foreground">{numero(i)}</span>}
              <div className="flex items-start gap-1">
                <Champ
                  ref={(el) => (refs.current[i] = el)}
                  value={v}
                  aria-label={`${nom} ${i + 1}`}
                  placeholder={i === 0 ? placeholder : undefined}
                  onChange={(e) => changer(i, e.target.value)}
                  onPaste={(e) => surCollage(e, i)}
                  onKeyDown={(e) => {
                    if (!multiligne && e.key === 'Enter') {
                      e.preventDefault();
                      inserer(i + 1);
                    }
                    if (e.key === 'Backspace' && !v && valeurs.length > 1) {
                      e.preventDefault();
                      retirer(i);
                    }
                  }}
                  className={cn(multiligne ? zoneTexte : champ, 'flex-1')}
                />
                <div className="flex shrink-0 items-center">
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => deplacer(i, -1)} aria-label="Monter" className="max-sm:hidden">
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === valeurs.length - 1} onClick={() => deplacer(i, 1)} aria-label="Descendre" className="max-sm:hidden">
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => retirer(i)} aria-label="Retirer">
                    <X />
                  </Button>
                </div>
              </div>
              {aide && <p className="text-[13px] text-pin">{aide}</p>}
            </li>
          );
        })}
      </ol>
      <Button type="button" variant="outline" onClick={() => inserer(valeurs.length)} className="h-10 w-fit rounded-full border-dashed border-foreground/20 bg-transparent text-[15px] shadow-none hover:bg-card">
        <Plus /> {ajouter}
      </Button>
    </div>
  );
}
