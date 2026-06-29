// ============================================================
//  IMMS-SABC — supabase-config.js
//  Compatible avec forgot-password.html qui charge déjà le SDK
//  en dur : <script src="https://cdn.jsdelivr.net/..."></script>
// ============================================================

const SUPABASE_URL  = 'https://afujoysgsoluozufbbrg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdWpveXNnc29sdW96dWZiYnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDc3NzksImV4cCI6MjA5NTYyMzc3OX0.K6RV1fZu5YDR8Zl3A8ETVyeE5OQ63xPLpG6qeJl5GBI';

function initSupabase() {
  // Le SDK peut déjà être présent (chargé en dur dans certaines pages)
  // On utilise le global window.supabase s'il existe, sinon on charge le SDK
  if (window.supabase && window.supabase.createClient) {
    window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    });
    document.dispatchEvent(new Event('supabase:ready'));
    return;
  }

  // Sinon, charge le SDK dynamiquement
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  script.onload = () => {
    window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    });
    document.dispatchEvent(new Event('supabase:ready'));
  };
  script.onerror = () => console.error('[IMMS] Impossible de charger Supabase SDK.');
  document.head.appendChild(script);
}

// Si le DOM est déjà prêt, on init directement
// Sinon on attend DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}

// ── Helpers navigation entre pages ─────────────────────────
window.withSupabase = (cb) => {
  if (window._supabase) { cb(window._supabase); return; }
  document.addEventListener('supabase:ready', () => cb(window._supabase), { once: true });
};
window.getSession    = () => window._supabase
  ? window._supabase.auth.getSession().then(({ data }) => data.session)
  : Promise.resolve(null);
window.getCurrentUser = async () => {
  const s = await window.getSession();
  if (!s) return null;
  const { data } = await window._supabase.from('profiles').select('*').eq('id', s.user.id).single();
  return data;
};

window.setUsineContext   = (id, nom) => { sessionStorage.setItem('usine_id',   id); sessionStorage.setItem('usine_nom',   nom||''); };
window.getUsineId        = ()        =>   sessionStorage.getItem('usine_id');
window.getUsineNom       = ()        =>   sessionStorage.getItem('usine_nom');
window.setChaineContext  = (id, nom) => { sessionStorage.setItem('chaine_id',  id); sessionStorage.setItem('chaine_nom',  nom||''); };
window.getChaineId       = ()        =>   sessionStorage.getItem('chaine_id');
window.getChaineNom      = ()        =>   sessionStorage.getItem('chaine_nom');
window.setMachineContext = (id, nom) => { sessionStorage.setItem('machine_id', id); sessionStorage.setItem('machine_nom', nom||''); };
window.getMachineId      = ()        =>   sessionStorage.getItem('machine_id');
window.getMachineNom     = ()        =>   sessionStorage.getItem('machine_nom');
