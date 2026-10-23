import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { champ } from '@/components/formulaire/styles';
import { supabase } from '@/lib/supabase';
import { useCarnet } from '@/store/Carnet';
import { cn } from '@/lib/utils';

/*
 * Point de connexion en haut à droite, même taille et même place que sur le hub : il ouvre un petit panneau
 * avec le formulaire de connexion, ou le bouton de déconnexion une fois connectée.
 * Même compte que le hub (la session est partagée entre les sites).
 */
export default function PointConnexion({ className }) {
  const { session, connexion, setConnexion, deconnexion } = useCarnet();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function envoyer(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setEnvoi(false);
    if (error) {
      setErreur('Connexion impossible.');
      return;
    }
    setMotDePasse('');
    setConnexion(false);
    toast.success('Connectée');
  }

  return (
    <Popover open={connexion} onOpenChange={setConnexion}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={session ? 'Compte' : 'Se connecter'}
          className={cn(
            'fixed top-[18px] right-[18px] z-40 size-[21px] rounded-full border-2 border-pin outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring sm:top-[26px] sm:right-[26px] print:hidden',
            session ? 'bg-pin' : 'bg-transparent hover:bg-pin/30', // plein une fois connectée, cerclé sinon
            className,
          )}
        />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-[min(300px,calc(100vw-32px))] rounded-3xl border-0 bg-card p-4 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.3)]">
        {session ? (
          <div className="grid gap-3">
            <p className="text-[14px] break-all text-muted-foreground">{session.user.email}</p>
            <Button
              variant="secondary"
              onClick={() => {
                deconnexion();
                setConnexion(false);
              }}
              className="h-11 rounded-full bg-muted text-[15px] shadow-none"
            >
              Déconnexion
            </Button>
          </div>
        ) : (
          <form onSubmit={envoyer} className="grid gap-2">
            <Input type="email" placeholder="Email" aria-label="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={cn(champ, 'h-11 bg-muted')} />
            <Input type="password" placeholder="Mot de passe" aria-label="Mot de passe" autoComplete="current-password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className={cn(champ, 'h-11 bg-muted')} />
            {erreur && <p className="text-[14px] text-destructive">{erreur}</p>}
            <Button type="submit" disabled={envoi} className="mt-1 h-11 rounded-full text-[15px] shadow-none">
              {envoi ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
