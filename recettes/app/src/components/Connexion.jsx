import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useCarnet } from '@/store/Carnet';
import { champ } from '@/components/formulaire/styles';

// Connexion avec le même compte que le hub (la session est partagée entre les sites).
export default function Connexion() {
  const { connexion, setConnexion } = useCarnet();
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
    <Dialog open={connexion} onOpenChange={setConnexion}>
      <DialogContent className="border-black bg-vert-clair sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[24px] font-normal">Connexion</DialogTitle>
          <DialogDescription className="text-[15px] text-black/60">Pour ajouter et modifier des recettes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={envoyer} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="connexion-email" className="text-[15px] font-normal">Email</Label>
            <Input id="connexion-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={champ} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="connexion-mdp" className="text-[15px] font-normal">Mot de passe</Label>
            <Input id="connexion-mdp" type="password" autoComplete="current-password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className={champ} />
          </div>
          {erreur && <p className="text-[15px] text-destructive">{erreur}</p>}
          <Button type="submit" disabled={envoi} className="h-11 rounded-full text-[16px]">
            {envoi ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
