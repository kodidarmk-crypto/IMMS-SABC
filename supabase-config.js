// ============================================================
//  IMMS-SABC — supabase-config.js
//  Vanilla HTML/JS — pas de Next.js, pas de bundler
// ============================================================

const SUPABASE_URL = 'https://afujoysgsoluozufbbrg.supabase.co';

// Publishable key (nouvelle clé Supabase 2025)
const SUPABASE_KEY = 'sb_publishable_Jy814jkIkXUAEAOhpmzFoA_MuxNhAsM';

function initSupabase() {
  // Si le SDK est déjà chargé (ex: forgot-password.html le charge en dur)
  if (window.supabase && window.supabase.createClient) {
    window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    });
    document.dispatchEvent(new Event('supabase:ready'));
    return;
  }

  // Sinon charge le SDK dynamiquement
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  script.onload = () => {
    window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    });
    document.dispatchEvent(new Event('supabase:ready'));
  };
  script.onerror = () => console.error('[IMMS] Impossible de charger le SDK Supabase.');
  document.head.appendChild(script);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}

// ── Helpers globaux ─────────────────────────────────────────
window.withSupabase = (cb) => {
  if (window._supabase) { cb(window._supabase); return; }
  document.addEventListener('supabase:ready', () => cb(window._supabase), { once: true });
};

window.getSession = () =>
  window._supabase
    ? window._supabase.auth.getSession().then(({ data }) => data.session)
    : Promise.resolve(null);

window.getCurrentUser = async () => {
  const s = await window.getSession();
  if (!s) return null;
  const { data } = await window._supabase
    .from('profiles').select('*').eq('id', s.user.id).single();
  return data;
};

// ── Contexte navigation entre pages ────────────────────────
window.setUsineContext   = (id, nom) => { sessionStorage.setItem('usine_id',   id); sessionStorage.setItem('usine_nom',   nom||''); };
window.getUsineId        = ()        =>   sessionStorage.getItem('usine_id');
window.getUsineNom       = ()        =>   sessionStorage.getItem('usine_nom');
window.setChaineContext  = (id, nom) => { sessionStorage.setItem('chaine_id',  id); sessionStorage.setItem('chaine_nom',  nom||''); };
window.getChaineId       = ()        =>   sessionStorage.getItem('chaine_id');
window.getChaineNom      = ()        =>   sessionStorage.getItem('chaine_nom');
window.setMachineContext = (id, nom) => { sessionStorage.setItem('machine_id', id); sessionStorage.setItem('machine_nom', nom||''); };
window.getMachineId      = ()        =>   sessionStorage.getItem('machine_id');
window.getMachineNom     = ()        =>   sessionStorage.getItem('machine_nom');
