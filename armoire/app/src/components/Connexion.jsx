import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Armoire est privée : même compte que le hub (la session est partagée entre les sites).
// Même langage que l'app : grand titre en Crozet, grille à filets turquoise, étiquettes mono.
export default function Connexion() {
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
    if (error) setErreur('Connexion impossible : vérifie l’email et le mot de passe.');
  }

  const champ = 'w-full bg-transparent font-sans text-[16px] text-encre outline-none placeholder:text-encre/30';

  return (
    <div className="conteneur grid min-h-dvh content-center justify-items-center gap-8 py-12">
      <h1 className="text-center font-display text-[48px] leading-none text-titre lowercase md:text-[64px]">armoire</h1>

      <form onSubmit={envoyer} className="grille-filets w-full max-w-md">
        <label className="grid gap-2 p-4 focus-within:bg-accent">
          <span className="surtitre">( email )</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" className={champ} />
        </label>
        <label className="grid gap-2 p-4 focus-within:bg-accent">
          <span className="surtitre">( mot de passe )</span>
          <input type="password" autoComplete="current-password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} placeholder="••••••••" className={champ} />
        </label>
        {erreur && <p className="etiquette p-4 text-destructive">{erreur}</p>}
        <button type="submit" disabled={envoi} className="etiquette flex h-12 items-center justify-center gap-2 text-vert-texte transition-colors hover:bg-accent disabled:opacity-60">
          {envoi ? <Loader2 className="size-4 animate-spin" /> : null}
          {envoi ? 'Connexion…' : 'Se connecter'}
          {!envoi && <ArrowRight className="size-4" />}
        </button>
      </form>

    </div>
  );
}
