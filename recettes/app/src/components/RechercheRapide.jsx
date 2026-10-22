import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CookingPot, Tag } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { TAGS, RECETTES } from '@/data/recettes';
import { parTitre, sansAccents, slug } from '@/lib/recettes';

/*
 * Palette de recherche (⌘K / Ctrl+K) : aller directement à une recette ou filtrer l'accueil par un tag.
 * Les mots-clés sont aussi donnés sans accents pour que « pepites » trouve « pépites ».
 */
export default function RechercheRapide({ ouvert, setOuvert }) {
  const naviguer = useNavigate();

  useEffect(() => {
    function surTouche(e) {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOuvert((o) => !o);
      }
    }
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [setOuvert]);

  function aller(chemin) {
    setOuvert(false);
    naviguer(chemin);
  }

  return (
    <CommandDialog
      open={ouvert}
      onOpenChange={setOuvert}
      title="Rechercher"
      description="Chercher une recette ou un tag"
      className="border-black bg-vert-clair"
    >
      <CommandInput placeholder="Une recette, un ingrédient, un tag…" className="text-[16px]" />
      <CommandList>
        <CommandEmpty>Rien de trouvé.</CommandEmpty>
        <CommandGroup heading="Recettes">
          {[...RECETTES].sort(parTitre).map((r) => (
            <CommandItem
              key={r.id}
              value={r.id}
              keywords={[r.titre, sansAccents(r.titre), sansAccents((r.ingredients || []).join(' '))]}
              onSelect={() => aller(`/recette/${r.id}`)}
              className="text-[16px] data-[selected=true]:bg-black data-[selected=true]:text-vert-clair"
            >
              <CookingPot />
              {r.titre}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tags">
          {TAGS.flatMap((f) =>
            f.tags.map((t) => (
              <CommandItem
                key={t}
                value={`tag-${slug(t)}`}
                keywords={[t, sansAccents(t), f.famille]}
                onSelect={() => aller(`/?tags=${slug(t)}`)}
                className="text-[16px] data-[selected=true]:bg-black data-[selected=true]:text-vert-clair"
              >
                <Tag />
                {t}
                <span className="ml-auto text-[13px] opacity-60">{f.famille}</span>
              </CommandItem>
            )),
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
