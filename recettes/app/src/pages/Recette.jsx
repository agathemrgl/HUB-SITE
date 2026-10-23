import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChefHat, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ArtCanvas from '@/components/ArtCanvas';
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
import { FACTEURS, ilYA, multiplier } from '@/lib/recettes';
import { teintePour } from '@/lib/teintes';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useCarnet } from '@/store/Carnet';
import { cn } from '@/lib/utils';

/*
 * Page recette : bandeau dans la teinte de la recette (titre, accroche, tags, dessin en filigrane),
 * puis sur ordinateur une colonne « Infos / Ingrédients » fixe au défilement à côté de la « Préparation » ;
 * sur mobile, Infos puis onglets Ingrédients / Préparation.
 */

export function Entete({ children, className }) {
  return <h2 className={cn('surtitre mb-3', className)}>{children}</h2>;
}

// Infos en petites tuiles : intitulé en gris, valeur dessous
export function Infos({ recette, facteur }) {
  if (!recette.infos?.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-2">
      {recette.infos.map(([label, valeur]) => (
        <div key={label} className="rounded-2xl bg-card px-4 py-3">
          <dt className="text-[13px] text-muted-foreground">{label}</dt>
          <dd className="text-[17px] leading-snug">{valeur ? (/^portions?$/i.test(label) ? multiplier(valeur, facteur, true) : valeur) : '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function Ingredients({ recette, facteur, setFacteur, coches, setCoches }) {
  if (!recette.ingredients?.length) return <p className="py-3 text-muted-foreground">—</p>;
  function cocher(i) {
    const suivant = new Set(coches);
    suivant.has(i) ? suivant.delete(i) : suivant.add(i);
    setCoches(suivant);
  }
  return (
    <div className="rounded-3xl bg-card p-5">
      <ToggleGroup
        type="single"
        value={String(facteur)}
        onValueChange={(v) => v && setFacteur(Number(v))}
        aria-label="Adapter les quantités"
        spacing={1}
        className="mb-3 flex-wrap"
      >
        {FACTEURS.map((f) => (
          <ToggleGroupItem
            key={f.label}
            value={String(f.valeur)}
            className={cn(tagVariants({ taille: 'sm', actif: 'fixe' }), 'bg-muted px-3 tabular-nums hover:bg-muted/70 data-[spacing=1]:rounded-full')}
          >
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ul>
        {recette.ingredients.map((x, i) => (
          <li key={i} className="border-b border-border py-3 text-[16px] leading-snug last:border-0 last:pb-0 md:text-[17px]">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={coches.has(i)}
                onCheckedChange={() => cocher(i)}
                className="mt-0.5 size-5 rounded-full border-foreground/20 shadow-none data-[state=checked]:border-pin data-[state=checked]:bg-pin data-[state=checked]:text-primary-foreground"
              />
              <span className={cn('transition-opacity', coches.has(i) && 'line-through opacity-40')}>{multiplier(x, facteur)}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Preparation({ recette }) {
  const histoire = [].concat(recette.histoire || []);
  const etapes = recette.etapes || [];
  const faq = recette.faq || [];
  const teinte = teintePour(recette.id);
  if (!histoire.length && !etapes.length && !faq.length) {
    return <p className="text-muted-foreground">La préparation arrive bientôt.</p>;
  }
  return (
    <div className="flex flex-col gap-8 text-[17px] leading-[1.45] md:text-[18px]">
      {histoire.length > 0 && (
        <div className="grid gap-4 text-[19px] leading-[1.4] tracking-[-0.01em] md:text-[21px]">
          {histoire.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
      {etapes.length > 0 && (
        <ol className="grid gap-2">
          {etapes.map((x, i) => (
            <li key={i} className="flex gap-4 rounded-3xl bg-card p-5">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full text-[15px] tabular-nums"
                style={{ backgroundColor: teinte.fond, color: teinte.trait }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <p className="pt-1">
                <span className="sr-only">Étape {i + 1} : </span>
                {x}
              </p>
            </li>
          ))}
        </ol>
      )}
      {faq.length > 0 && (
        <div>
          <Entete>Questions fréquentes</Entete>
          <Accordion type="multiple" className="rounded-3xl bg-card px-5">
            {faq.map((x, i) => (
              <AccordionItem key={i} value={String(i)} className="border-border">
                <AccordionTrigger className="py-5 text-[18px] leading-snug font-normal tracking-[-0.01em] hover:no-underline md:text-[20px]">
                  {x.question}
                </AccordionTrigger>
                <AccordionContent className="text-[16px] leading-[1.45] text-muted-foreground md:text-[17px]">{x.reponse}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
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

  // Titre et description de l'onglet / des moteurs de recherche selon la recette (remis à l'état d'origine en partant)
  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    const titre = document.title;
    const description = meta?.content;
    if (recette) {
      document.title = `${recette.titre} — Recettes de vie`;
      if (meta && recette.sousTitre) meta.content = recette.sousTitre;
    }
    return () => {
      document.title = titre;
      if (meta) meta.content = description;
    };
  }, [recette?.titre, recette?.sousTitre]);

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

  if (!recette) {
    return (
      <main id="contenu" className="conteneur py-16">
        <p className="rounded-3xl bg-card px-6 py-10 text-center text-[18px] text-muted-foreground">
          {chargement ? (
            'Chargement…'
          ) : (
            <>
              Cette recette n’existe pas (ou plus).{' '}
              <Link to="/" className="text-pin underline underline-offset-4">
                Retour au carnet
              </Link>
            </>
          )}
        </p>
      </main>
    );
  }

  const teinte = teintePour(recette.id);
  const ingredients = <Ingredients {...{ recette, facteur, setFacteur, coches, setCoches }} />;
  const bouton = 'h-11 rounded-full px-5 text-[16px] shadow-none';

  return (
    <main id="contenu" className="pb-16">
      <article>
        {/* Bandeau dans la teinte de la recette, dessin en filigrane */}
        <header className="relative overflow-hidden rounded-b-[32px] md:mx-[calc(var(--gouttiere)/2)] md:rounded-[32px]" style={{ backgroundColor: teinte.fond }}>
          <div className="pointer-events-none absolute inset-y-0 right-[-10%] w-[85%] opacity-40 md:right-0 md:w-[55%] md:opacity-60" aria-hidden="true">
            <ArtCanvas id={recette.id} teinte={teinte} />
          </div>
          <div className="conteneur relative pt-4 pb-8 md:pt-6 md:pb-14">
            <Link to="/" className="mb-6 inline-flex size-10 items-center justify-center rounded-full bg-card/70 backdrop-blur transition-colors hover:bg-card md:mb-10" aria-label="Toutes les recettes">
              <ArrowLeft className="size-5" />
            </Link>
            <div className="max-w-[880px]">
              <h1 className="text-[clamp(40px,26px+3.6vw,80px)] leading-[0.98] tracking-[-0.05em]" style={{ color: teinte.trait }}>
                {recette.titre}
              </h1>
              <p className="mt-3 text-[14px] text-foreground/55">{ilYA(recette.date)}</p>
              {recette.sousTitre && <p className="mt-4 text-[19px] leading-snug md:text-[23px]">{recette.sousTitre}</p>}
              <TagsRecette tags={recette.tags} className="mt-5 [&_a]:bg-card/80 [&_a]:backdrop-blur" />
              {recette.lien && (
                <p className="mt-4 text-[15px]">
                  Source :{' '}
                  <a href={recette.lien} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    {recette.lien.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-2 print:hidden">
                {recette.etapes?.length > 0 && (
                  <Button onClick={() => setCuisine(true)} className={cn(bouton, 'text-primary-foreground hover:opacity-90')} style={{ backgroundColor: teinte.trait }}>
                    <ChefHat className="size-5" /> Mode cuisine
                  </Button>
                )}
                {peutModifier(recette) && (
                  <>
                    <Button variant="secondary" onClick={() => ouvrirFormulaire(recette)} className={cn(bouton, 'bg-card hover:bg-card/80')}>
                      <Pencil className="size-4" /> Modifier
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="secondary" className={cn(bouton, 'bg-card/60 px-4 text-destructive hover:bg-card')}>
                          <Trash2 className="size-4" /> Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl border-0 bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-[22px] font-normal tracking-[-0.02em]">Supprimer « {recette.titre} » ?</AlertDialogTitle>
                          <AlertDialogDescription className="text-[16px]">
                            La recette disparaît du carnet pour tout le monde. Impossible de revenir en arrière.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="h-11 rounded-full border-0 bg-muted text-[16px] shadow-none">Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={supprimer} className="h-11 rounded-full bg-destructive text-[16px] text-primary-foreground hover:bg-destructive/90">
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="conteneur pt-8 md:pt-12">
          {large ? (
            <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 xl:gap-16">
              <aside className="sticky top-20 grid gap-8 self-start">
                {recette.infos?.length > 0 && (
                  <div>
                    <Entete>Infos</Entete>
                    <Infos recette={recette} facteur={facteur} />
                  </div>
                )}
                <div>
                  <Entete>Ingrédients</Entete>
                  {ingredients}
                </div>
              </aside>
              <div>
                <Entete>Préparation</Entete>
                <Preparation recette={recette} />
              </div>
            </div>
          ) : (
            <>
              {recette.infos?.length > 0 && (
                <div className="mb-6">
                  <Infos recette={recette} facteur={facteur} />
                </div>
              )}
              <Tabs defaultValue="ingredients" className="gap-4">
                <TabsList className="h-auto w-full rounded-full bg-card p-1">
                  {[
                    ['ingredients', 'Ingrédients'],
                    ['preparation', 'Préparation'],
                  ].map(([v, label]) => (
                    <TabsTrigger
                      key={v}
                      value={v}
                      className="h-10 rounded-full text-[16px] font-normal data-[state=active]:bg-pin data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="ingredients">{ingredients}</TabsContent>
                <TabsContent value="preparation">
                  <Preparation recette={recette} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </article>

      <ModeCuisine recette={recette} ouvert={cuisine} setOuvert={setCuisine} />
    </main>
  );
}
