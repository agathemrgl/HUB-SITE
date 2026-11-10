import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Collage from '@/components/Collage';
import { ActionBarre, Barre, BoutonBarre, Espace } from '@/components/Barre';
import { CarteTenue } from '@/pages/Tenues';
import { numero } from '@/components/communs';
import { aujourdhui, formatJour, grilleMois, versIso } from '@/lib/dates';
import { useArmoire } from '@/store/Armoire';
import { cn } from '@/lib/utils';

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const cadre = 'rounded-lg border border-vert bg-carte shadow-[8px_8px_0_var(--vert)]';

// Fenêtre d'un jour : choisir / changer / retirer la tenue, ajouter une note
function FenetreJour({ jour, onClose }) {
  const { joursParDate, tenues, tenuesParId, vetementsParId, definirJour, retirerJour } = useArmoire();
  const entree = jour ? joursParDate.get(jour) : null;
  const tenue = entree?.tenue_id ? tenuesParId.get(entree.tenue_id) : null;
  const [note, setNote] = useState('');
  const [choix, setChoix] = useState(false);
  // Le bloc de note n'apparaît que s'il y a une note, ou après « Ajouter une note »
  const [noteOuverte, setNoteOuverte] = useState(false);

  useEffect(() => {
    setNote(entree?.note ?? '');
    setChoix(false);
  }, [jour, entree?.note]);

  useEffect(() => {
    setNoteOuverte(false);
  }, [jour]);

  if (!jour) return null;
  const passe = jour <= aujourdhui();

  async function choisir(t) {
    await definirJour({ jour, tenue_id: t.id, note });
    setChoix(false);
    toast.success(passe ? 'Tenue notée' : 'Tenue prévue');
  }

  async function enregistrerNote() {
    if ((entree?.note ?? '') === note) return;
    if (!entree && !note.trim()) return;
    await definirJour({ jour, tenue_id: entree?.tenue_id, note });
  }

  return (
    <Dialog open={!!jour} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`max-h-[92dvh] gap-5 overflow-y-auto overscroll-contain ${cadre} sm:max-w-xl`}>
        <DialogHeader>
          <DialogTitle className="font-sans text-[26px] leading-tight font-medium text-vert-texte first-letter:uppercase">{formatJour(jour)}</DialogTitle>
          <DialogDescription className="etiquette text-encre/60">{tenue ? (passe ? 'Tenue portée' : 'Tenue prévue') : passe ? 'Rien de noté ce jour-là' : 'Rien de prévu pour l’instant'}</DialogDescription>
        </DialogHeader>

        {tenue && !choix ? (
          <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-start">
            <div className="quadrillage overflow-hidden border border-vert">
              <Collage composition={tenue.composition} vetementsParId={vetementsParId} />
            </div>
            <div className="grid gap-2">
              <p className="font-sans text-[18px] font-medium">{tenue.nom || 'Sans nom'}</p>
              {tenue.tags.length > 0 && <p className="etiquette text-vert-texte">{tenue.tags.join(', ')}</p>}
              <Button variant="outline" className="justify-start rounded-md border-vert bg-transparent text-vert-texte shadow-none hover:bg-accent hover:text-vert-texte" onClick={() => setChoix(true)}>
                Changer de tenue
              </Button>
              <Button asChild variant="outline" className="justify-start rounded-md border-vert bg-transparent text-vert-texte shadow-none hover:bg-accent hover:text-vert-texte">
                <Link to={`/tenues/${tenue.id}`}>
                  <Pencil /> Modifier la tenue
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <Button asChild className="h-11 rounded-md">
              <Link to={`/tenues/nouvelle?jour=${jour}`}>
                <Plus /> Composer une nouvelle tenue
              </Link>
            </Button>
            {tenues.length > 0 && (
              <>
                <p className="surtitre pt-2">( ou choisir une tenue existante )</p>
                <div className="grille-filets max-h-[46dvh] grid-cols-3 overflow-y-auto sm:grid-cols-4">
                  {tenues.map((t) => (
                    <CarteTenue key={t.id} tenue={t} vetementsParId={vetementsParId} compacte onClick={() => choisir(t)} />
                  ))}
                </div>
              </>
            )}
            {choix && (
              <Button variant="ghost" className="etiquette rounded-md hover:bg-accent" onClick={() => setChoix(false)}>
                Annuler
              </Button>
            )}
          </div>
        )}

        {entree?.note || noteOuverte ? (
        <div className="grid gap-2">
          <p className="surtitre">( note )</p>
          <Textarea
            autoFocus={noteOuverte && !entree?.note}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={enregistrerNote}
            placeholder="Occasion, météo, ressenti…"
            className="min-h-16 rounded-md border-vert/60 bg-transparent text-[16px] shadow-none focus-visible:border-vert md:text-[15px]"
          />
        </div>
        ) : (
          <button type="button" onClick={() => setNoteOuverte(true)} className="etiquette flex items-center gap-1.5 justify-self-start text-vert-texte hover:underline">
            <Plus className="size-3.5" /> Ajouter une note
          </button>
        )}

        {entree && (
          <Button
            variant="ghost"
            className="etiquette justify-self-start rounded-md text-destructive hover:bg-accent hover:text-destructive"
            onClick={async () => {
              await retirerJour(jour);
              toast.success('Jour vidé');
              onClose();
            }}
          >
            <Trash2 /> Vider ce jour
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Calendrier() {
  const { jours, joursParDate, tenuesParId, vetementsParId } = useArmoire();
  const maintenant = new Date();
  const [mois, setMois] = useState({ a: maintenant.getFullYear(), m: maintenant.getMonth() });
  const [ouvert, setOuvert] = useState(null);
  const ajd = aujourdhui();

  const cases = useMemo(() => grilleMois(mois.a, mois.m), [mois]);
  const titre = new Date(mois.a, mois.m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const decaler = (n) => setMois(({ a, m }) => ({ a: a + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 }));

  const aVenir = jours.filter((j) => j.jour > ajd && tenuesParId.has(j.tenue_id)).slice(0, 6);


  return (
    <div className="conteneur pb-16">
      {/* Barre : navigation dans les mois, planifier aujourd'hui */}
      <Barre>
        <BoutonBarre aria-label="Mois précédent" onClick={() => decaler(-1)}>
          <ChevronLeft className="size-4" />
        </BoutonBarre>
        <span className="etiquette flex min-w-0 items-center px-1 text-[12px]">{titre}</span>
        <BoutonBarre aria-label="Mois suivant" onClick={() => decaler(1)}>
          <ChevronRight className="size-4" />
        </BoutonBarre>
        <BoutonBarre className="max-sm:hidden" onClick={() => setMois({ a: maintenant.getFullYear(), m: maintenant.getMonth() })}>
          Aujourd'hui
        </BoutonBarre>
        <Espace />
        <ActionBarre icone={Plus} onClick={() => setOuvert(ajd)}>
          Planifier aujourd'hui
        </ActionBarre>
      </Barre>

      {/* Jours de la semaine, puis grille à filets */}
      <div className="mt-4 grid grid-cols-7 border border-b-0 border-vert bg-carte text-vert-texte md:mt-6">
        {JOURS_SEMAINE.map((j) => (
          <div key={j} className="etiquette py-2.5 text-center">
            {j}
          </div>
        ))}
      </div>
      <div className="grille-filets grid-cols-7 border-t-0">
        {cases.map((date) => {
          const iso = versIso(date);
          const entree = joursParDate.get(iso);
          const tenue = entree?.tenue_id ? tenuesParId.get(entree.tenue_id) : null;
          const horsMois = date.getMonth() !== mois.m;
          const estAjd = iso === ajd;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setOuvert(iso)}
              aria-label={formatJour(iso)}
              className={cn(
                'group relative flex aspect-[3/4] flex-col overflow-hidden p-1 text-left transition-colors hover:bg-accent md:aspect-[4/5] md:p-2',
                tenue && 'quadrillage',
                horsMois && 'bg-fond! text-encre/35',
              )}
            >
              <span
                className={cn(
                  'relative z-10 grid h-5 min-w-5 place-items-center self-start rounded font-mono text-[11px] leading-none md:h-6 md:min-w-6 md:text-[13px]',
                  estAjd && 'bg-primary px-1 text-primary-foreground',
                )}
              >
                {numero(date.getDate())}
              </span>
              {tenue && (
                <div className={cn('absolute inset-x-0 bottom-0 top-4 md:top-6', iso > ajd && 'opacity-55', horsMois && 'opacity-35')}>
                  <Collage composition={tenue.composition} vetementsParId={vetementsParId} className="mx-auto h-full w-auto" />
                </div>
              )}
              {!tenue && !horsMois && <Plus className="absolute right-1.5 bottom-1.5 size-3.5 text-vert-texte opacity-0 transition-opacity group-hover:opacity-100 md:right-2 md:bottom-2" />}
              {entree?.note && <span className="absolute top-1.5 right-1.5 rond size-1.5 bg-encre md:top-2.5 md:right-2.5" title="Note" />}
            </button>
          );
        })}
      </div>

      {aVenir.length > 0 && (
        <section className="pt-10">
          <p className="surtitre pb-3">( à venir )</p>
          <div className="grille-filets grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {aVenir.map((j) => {
              const t = tenuesParId.get(j.tenue_id);
              return (
                <button key={j.jour} type="button" onClick={() => setOuvert(j.jour)} className="group text-left">
                  <div className="quadrillage">
                    <Collage composition={t.composition} vetementsParId={vetementsParId} />
                  </div>
                  <div className="p-3">
                    <p className="etiquette text-vert-texte">{formatJour(j.jour, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <p className="truncate font-sans text-[13px] font-medium">{t.nom || 'Sans nom'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <FenetreJour jour={ouvert} onClose={() => setOuvert(null)} />
    </div>
  );
}
