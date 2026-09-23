import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'
import { supabase } from './lib/supabaseClient'

function Root() {
  // undefined = vérification initiale de session en cours, null = pas connecté
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    // Réagit à une connexion (formulaire dans AuthGate) ou déconnexion (autre onglet, hub)
    // sans avoir besoin de recharger la page.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center text-sm max-md:text-base text-text-secondary">
        Chargement…
      </div>
    )
  }

  return session ? <App /> : <AuthGate />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
