import { useState } from 'react';
import { supabase } from './lib/supabaseClient';

export default function AuthGate() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError('Connexion impossible.');
    // Succès : onAuthStateChange (dans main.jsx) détecte la session et affiche l'appli.
  }

  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-editor-bg px-6">
      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <p className="mb-1 text-center text-[15px] max-md:text-[17px] font-semibold text-text-primary">Notes</p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          required
          className="rounded border border-border bg-transparent px-3 py-2 text-[14px] max-md:text-[16px] text-text-primary outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          autoComplete="current-password"
          required
          className="rounded border border-border bg-transparent px-3 py-2 text-[14px] max-md:text-[16px] text-text-primary outline-none focus:ring-2 focus:ring-accent"
        />

        {error && <p className="text-center text-[13px] max-md:text-[15px] text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-accent px-3 py-2 text-[14px] max-md:text-[16px] font-medium text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {loading ? 'Connexion…' : 'Connecter'}
        </button>
      </form>
    </div>
  );
}
