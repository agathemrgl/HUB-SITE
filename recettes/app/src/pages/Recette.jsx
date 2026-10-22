import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChefHat, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ModeCuisine from '@/components/ModeCuisine';
import TagsRecette from '@/components/TagsRecette';
import { tagVariants } from '@/components/tag';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supprimerRecette } from '@/lib/donnees';
import { useCarnet } from '@/store/Carnet';
import { FACTEURS, ilYA, multiplier } from '@/lib/recettes';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

/*
 * Page recette, construite comme le blog Stripe (Inspi/) : sur ordinateur, colonne « Infos / Ingrédients »
 * fixe au défilement à côté de l'article « Préparation » ; sur mobile, Infos puis onglets Ingrédients / Préparation.
 */

const ligne = 'border-b border-dotted border-[var(--pointilles)] py-3 text-[clamp(15px,13px+0.4vw,18px)] leading-[1.25] tracking-[0.02em]';

export function Entete({ children, className }) {
  return (
    <h2 className={cn('border-b-[0.5px] border-black pb-2 text-[clamp(15px,13px+0.4vw,18px)] leading-[1.25] font-normal tracking-[0.02em] uppercase', className)}>
      {children}
    </h2>
  );
}

export function Infos({ recette, facteur }) {
  if (!recette.infos?.length) return null;
  return (
    <dl className="mb-6">
      {recette.infos.map(([label, valeur]) => (
        <div key={label} className={cn(ligne, 'grid grid-cols-2 gap-x-3')}>
          <dt>{label}</dt>
          <dd className="font-medium">{valeur ? (/^portions?$/i.test(label) ? multiplier(valeur, facteur, true) : valeur) : '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function Ingredients({ recette, facteur, setFacteur, coches, setCoches }) {
  if (!recette.ingredients?.length) return <p className="py-3 text-black/45">—</p>;
  function cocher(i) {
    const suivant = new Set(coches);
    suivant.has(i) ? suivant.delete(i) : suivant.add(i);
    setCoches(suivant);
  }
  return (
    <>
      <ToggleGroup
        type="single"
        value={String(facteur)}
        onValueChange={(v) => v && setFacteur(Number(v))}
        aria-label="Adapter les quantités"
        spacing={1}
        className="flex-wrap border-b border-dotted border-[var(--pointilles)] py-3"
      >
        {FACTEURS.map((f) => (
          <ToggleGroupItem
            key={f.label}
            value={String(f.valeur)}
            className={cn(tagVariants({ taille: 'md', actif: 'fixe' }), 'px-3 tabular-nums data-[spacing=1]:rounded-full')}
          >
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ul>
        {recette.ingredients.map((x, i) => (
          <li key={i} className={ligne}>
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={coches.has(i)}
                onCheckedChange={() => cocher(i)}
                className="mt-[3px] rounded-full border-black data-[state=checked]:bg-black data-[state=checked]:text-vert-clair"
              />
              <span className={cn('transition-opacity', coches.has(i) && 'line-through opacity-45')}>{multiplier(x, facteur)}</span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Preparation({ recette }) {
  const histoire = [].concat(recette.histoire || []);
  const etapes = recette.etapes || [];
  const faq = recette.faq || [];
  if (!histoire.length && !etapes.length && !faq.length) {
    return <p className="text-black/45">La préparation arrive bientôt.</p>;
  }
  return (
    <div className="flex flex-col text-[16px] leading-[1.3] min-[960px]:max-w-[76%] min-[960px]:text-[18px]">
      {histoire.map((p, i) => (
        <p key={i} className={i ? 'mt-6' : ''}>
          {p}
        </p>
      ))}
      {etapes.length > 0 && (
        <ol className={cn('grid gap-6', histoire.length && 'mt-6')}>
          {etapes.map((x, i) => (
            <li key={i} className="grid gap-1.5 border-b border-dotted border-[var(--pointilles)] pb-6">
              <span className="text-[clamp(14px,11px+0.21vw,15px)] leading-5 tracking-[0.02em]">Étape {String(i + 1).padStart(2, '0')}</span>
              <p>{x}</p>
            </li>
          ))}
        </ol>
      )}
      {faq.length > 0 && (
        <>
          <Entete className="mt-14">Questions fréquentes</Entete>
          <Accordion type="multiple" className="mt-2">
            {faq.map((x, i) => (
              <AccordionItem key={i} value={String(i)} className="border-b border-dotted border-[var(--pointilles)] last:border-b">
                <AccordionTrigger className="py-5 text-[clamp(20px,17px+0.6vw,24px)] leading-[1.15] font-normal tracking-[-0.02em] hover:no-underline [&>svg]:text-black">
                  {x.question}
                </AccordionTrigger>
                <AccordionContent className="text-[16px] leading-[1.3] min-[960px]:text-[18px]">{x.reponse}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}
    </div>
  );
}

export default function Recette() {
  const { id } = useParams();
  const { recettes, chargement, peutModifier, ouvrirFormulaire, retirer } = useCarnet();
  const naviguer = useNavigate();
  const recette = recettes.find((x) => x.id === id);
  const large = useMediaQuery('(min-width: 960px)');
  const [facteur, setFacteur] = useState(1);
  const [coches, setCoches] = useState(new Set());
  const [cuisine, setCuisine] = useState(false);

  // Remise à zéro seulement quand on change de recette (pas quand Supabase renvoie la même, à jour)
  useEffect(() => {
    setFacteur(1);
    setCoches(new Set());
  }, [id]);

  useEffect(() => {
    document.title = recette ? `${recette.titre} — Recettes de vie` : 'Recettes de vie';
  }, [recette?.titre]);

  async function supprimer() {
    try {
      await supprimerRecette(recette.id);
      retirer(recette.id);
      toast.success('Recette supprimée');
      naviguer('/');
    } catch {
      toast.error('Suppression impossible. Réessaie plus tard.');
    }
  }

  if (!recette && chargement) {
    return <main id="contenu" className="mx-auto max-w-[1152px] px-5 py-16 text-[24px] text-bleu-gris xl:px-0">Chargement…</main>;
  }

  if (!recette) {
    return (
      <main id="contenu" className="mx-auto max-w-[1152px] px-5 py-16 text-[24px] xl:px-0">
        Cette recette n'existe pas (ou plus).{' '}
        <Link to="/" className="text-vert underline underline-offset-4">
          Retour au carnet
        </Link>
      </main>
    );
  }

  const ingredients = <Ingredients {...{ recette, facteur, setFacteur, coches, setCoches }} />;

  return (
    <main id="contenu" className="mx-auto max-w-[1152px] px-5 pt-6 pb-20 xl:px-0">
      <article>
        <header className="mb-8 max-w-[950px]">
          <p className="mb-3 text-[18px] leading-6 text-bleu-gris">{ilYA(recette.date)}</p>
          <h1 className="mb-4 text-[clamp(40px,30px+3vw,72px)] leading-none font-medium tracking-[-0.03em]">{recette.titre}</h1>
          {recette.sousTitre && <p className="mb-4 text-[clamp(20px,16px+1vw,28px)] leading-[1.25]">{recette.sousTitre}</p>}
          <TagsRecette tags={recette.tags} className="mt-2.5" />
          {recette.lien && (
            <p className="mt-4 text-[16px]">
              Source :{' '}
              <a href={recette.lien} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-vert">
                {recette.lien.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </a>
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2 print:hidden">
            {recette.etapes?.length > 0 && (
              <Button onClick={() => setCuisine(true)} className="h-11 rounded-full px-5 text-[16px] md:text-[18px]">
                <ChefHat className="size-5" /> Mode cuisine
              </Button>
            )}
            {peutModifier(recette) && (
              <>
                <Button variant="outline" onClick={() => ouvrirFormulaire(recette)} className="h-11 rounded-full bg-transparent px-5 text-[16px] md:text-[18px]">
                  <Pencil className="size-4" /> Modifier
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="h-11 rounded-full px-4 text-[16px] text-destructive hover:bg-destructive hover:text-white md:text-[18px]">
                      <Trash2 className="size-4" /> Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-black bg-vert-clair">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-[22px] font-normal">Supprimer « {recette.titre} » ?</AlertDialogTitle>
                      <AlertDialogDescription className="text-[16px] text-black/70">
                        La recette disparaît du carnet pour tout le monde. Impossible de revenir en arrière.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full bg-transparent text-[16px]">Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={supprimer} className="rounded-full bg-destructive text-[16px] text-white hover:bg-destructive/90">
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </header>

        {large ? (
          <div className="grid grid-cols-24 gap-x-3">
            <aside className="sticky top-20 col-span-6 self-start">
              <Entete>Infos</Entete>
              <Infos recette={recette} facteur={facteur} />
              <Entete>Ingrédients</Entete>
              {ingredients}
            </aside>
            <div className="col-start-8 col-end-25 grid gap-4 self-start">
              <Entete>Préparation</Entete>
              <Preparation recette={recette} />
            </div>
          </div>
        ) : (
          <>
            <Entete>Infos</Entete>
            <Infos recette={recette} facteur={facteur} />
            <Tabs defaultValue="ingredients" className="gap-4">
              <TabsList className="h-auto w-full rounded-full border border-black bg-transparent p-1">
                {[
                  ['ingredients', 'Ingrédients'],
                  ['preparation', 'Préparation'],
                ].map(([v, label]) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="rounded-full py-1.5 text-[16px] font-normal data-[state=active]:bg-black data-[state=active]:text-vert-clair data-[state=active]:shadow-none"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="ingredients">{ingredients}</TabsContent>
              <TabsContent value="preparation" className="pt-2">
                <Preparation recette={recette} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </article>

      <p className="mt-20 text-[18px]">
        <Link to="/" className="text-vert underline underline-offset-4">
          ← Toutes les recettes
        </Link>
      </p>

      <ModeCuisine recette={recette} ouvert={cuisine} setOuvert={setCuisine} />
    </main>
  );
}
