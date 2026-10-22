import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { champ, zoneTexte } from '@/components/formulaire/styles';

const SUGGESTIONS = ['Préparation', 'Cuisson', 'Repos', 'Méthode de cuisson', 'Portions'];

// Lignes « Infos » : intitulé + valeur (Préparation : 15 minutes…)
export function Infos({ valeurs, onChange }) {
  const changer = (i, cle, v) => onChange(valeurs.map((x, j) => (j === i ? { ...x, [cle]: v } : x)));
  return (
    <div className="grid gap-2">
      <datalist id="infos-suggestions">
        {SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {valeurs.map((x, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input list="infos-suggestions" value={x.label} onChange={(e) => changer(i, 'label', e.target.value)} placeholder="Intitulé" aria-label={`Intitulé ${i + 1}`} className={`${champ} w-[42%]`} />
          <Input value={x.valeur} onChange={(e) => changer(i, 'valeur', e.target.value)} placeholder={/portion/i.test(x.label) ? '4 personnes' : '15 minutes'} aria-label={`Valeur ${i + 1}`} className={`${champ} flex-1`} />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(valeurs.filter((_, j) => j !== i))} aria-label="Retirer">
            <X />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...valeurs, { label: '', valeur: '' }])} className="h-10 w-fit rounded-full border-dashed bg-transparent text-[15px]">
        <Plus /> Ajouter une info
      </Button>
    </div>
  );
}

// Questions fréquentes : question + réponse
export function Faq({ valeurs, onChange }) {
  const changer = (i, cle, v) => onChange(valeurs.map((x, j) => (j === i ? { ...x, [cle]: v } : x)));
  return (
    <div className="grid gap-3">
      {valeurs.map((x, i) => (
        <div key={i} className="grid gap-1.5 border-b border-dotted border-[var(--pointilles)] pb-3">
          <div className="flex items-center gap-1">
            <Input value={x.question} onChange={(e) => changer(i, 'question', e.target.value)} placeholder="La question" aria-label={`Question ${i + 1}`} className={`${champ} flex-1`} />
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(valeurs.filter((_, j) => j !== i))} aria-label="Retirer la question">
              <X />
            </Button>
          </div>
          <Textarea value={x.reponse} onChange={(e) => changer(i, 'reponse', e.target.value)} placeholder="La réponse" aria-label={`Réponse ${i + 1}`} className={`${zoneTexte} mr-9`} />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...valeurs, { question: '', reponse: '' }])} className="h-10 w-fit rounded-full border-dashed bg-transparent text-[15px]">
        <Plus /> Ajouter une question
      </Button>
    </div>
  );
}
