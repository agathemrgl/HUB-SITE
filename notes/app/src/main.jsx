import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'
import { supabase } from './lib/supabaseClient'

const root = createRoot(document.getElementById('root'))

async function boot() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  root.render(
    <StrictMode>
      {session ? <App /> : <AuthGate />}
    </StrictMode>,
  )
}

boot()
