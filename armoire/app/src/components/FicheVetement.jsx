import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Collage from '@/components/Collage';
import Confirmation from '@/components/Confirmation';
import { PastilleCouleur, Photo, numero } from '@/components/communs';
import { COULEUR, LABEL_CATEGORIE, LABEL_SAISON } from '@/lib/constantes';
import { formatJour } from '@/lib/dates';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useArmoire } from '@/store/Armoire';
import { cn } from '@/lib/utils';

function Ligne({ titre, children }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3 border-t border-vert/40 py-3 text-[15px]">
      <span className="surtitre">( {titre} )</span>
      <div>{children}</div>
    </div>
  );
}

// Fiche d'un vêtement : caractéristiques, statistiques de port et tenues qui le contiennent
export default function FicheVetement({ vetement, onClose, onModifier }) {
  const { usage, tenues, vetementsParId, basculerFavori, supprimerVetement } = useArmoire();
  const [confirmer, setConfirmer] = useState(false);
  const large = useMediaQuery('(min-width: 768px)');
  const naviguer = useNavigate();

  const v = vetement && (vetementsParId.get(vetement.id) ?? vetement);
  const stats = v && usage.parVetement.get(v.id);
  const avecLui = v ? tenues.filter((t) => t.composition.some((e) => e.v === v.id)) : [];

  return (
    <Sheet open={!!vetement} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={large ? 'right' : 'bottom'}
        className={cn('gap-0 overflow-y-auto border-vert bg-carte p-0', large ? 'w-full border-l sm:max-w-md' : 'max-h-[90dvh] rounded-t-xl border-t')}
      >
        {v && (
          <>
            <Photo vetement={v} className="quadrillage aspect-square w-full border-b border-vert" imgClassName="p-10" />
            <div className="grid gap-4 p-6">
              <SheetHeader className="p-0">
                <div className="flex items-start justify-between gap-3">
                  <SheetTitle className="font-sans text-[26px] leading-[1.1] font-medium text-vert-texte">{v.nom}</SheetTitle>
                  <button
                    type="button"
                    aria-pressed={v.favori}
                    aria-label="Favori"
                    onClick={() => basculerFavori(v)}
                    className="mt-1 grid size-10 shrink-0 place-items-center rounded-full border border-vert text-vert-texte"
                  >
                    <Heart className={cn('size-5', v.favori && 'fill-vert text-vert-texte')} />
                  </button>
                </div>
                <SheetDescription className="etiquette text-encre/60">
                  {LABEL_CATEGORIE[v.categorie]}
                  {v.marque && ` · ${v.marque}`}
                </SheetDescription>
              </SheetHeader>

              {/* Statistiques de port */}
              <div className="grille-filets grid-cols-2">
                <div className="p-4">
                  <p className="font-sans text-[34px] leading-none font-medium text-vert-texte">{numero(stats?.fois ?? 0)}</p>
                  <p className="etiquette mt-2 text-encre/60">{stats?.fois ? 'fois porté' : 'Jamais porté'}</p>
                </div>
                <div className="p-4">
                  <p className="font-sans text-[16px] leading-tight font-medium">{stats?.dernier ? formatJour(stats.dernier, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                  <p className="etiquette mt-2 text-encre/60">Dernière fois</p>
                </div>
              </div>

              <div>
                {v.couleurs.length > 0 && (
                  <Ligne titre="Couleurs">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {v.couleurs.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1.5">
                          <PastilleCouleur id={c} /> {COULEUR[c]?.label}
                        </span>
                      ))}
                    </span>
                  </Ligne>
                )}
                {v.saisons.length > 0 && <Ligne titre="Saisons">{v.saisons.map((s) => LABEL_SAISON[s]).join(', ')}</Ligne>}
                {v.tags.length > 0 && <Ligne titre="Tags">{v.tags.join(', ')}</Ligne>}
                {v.notes && (
                  <Ligne titre="Notes">
                    <span className="whitespace-pre-line">{v.notes}</span>
                  </Ligne>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 rounded-md border-vert bg-transparent text-vert-texte shadow-none hover:bg-accent hover:text-vert-texte" onClick={() => onModifier(v)}>
                  <Pencil /> Modifier
                </Button>
                <Button className="h-11 rounded-md" onClick={() => naviguer(`/tenues/nouvelle?avec=${v.id}`)}>
                  <Plus /> Créer une tenue
                </Button>
              </div>

              {avecLui.length > 0 && (
                <div className="grid gap-3 pt-2">
                  <p className="surtitre">( dans {avecLui.length} tenue{avecLui.length > 1 && 's'} )</p>
                  <div className="grille-filets grid-cols-3">
                    {avecLui.map((t) => (
                      <button key={t.id} type="button" onClick={() => naviguer(`/tenues/${t.id}`)} className="text-left hover:bg-accent">
                        <div className="quadrillage"><Collage composition={t.composition} vetementsParId={vetementsParId} /></div>
                        <p className="etiquette truncate p-2">{t.nom || 'Sans nom'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="ghost" className="etiquette mt-2 rounded-md text-destructive hover:bg-accent hover:text-destructive" onClick={() => setConfirmer(true)}>
                <Trash2 /> Supprimer ce vêtement
              </Button>
            </div>
          </>
        )}
        <Confirmation
          ouvert={confirmer}
          onOpenChange={setConfirmer}
          titre="Supprimer ce vêtement ?"
          texte={avecLui.length ? `Il disparaîtra aussi des ${avecLui.length} tenue(s) qui le contiennent.` : 'Sa photo sera supprimée définitivement.'}
          onConfirmer={async () => {
            await supprimerVetement(v);
            toast.success('Vêtement supprimé');
            onClose();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
