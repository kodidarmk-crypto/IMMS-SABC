// ============================================================
//  IMMS-SABC — Supabase Configuration
//  Project : https://afujoysgsoluozufbbrg.supabase.co
// ============================================================

const SUPABASE_URL  = 'https://afujoysgsoluozufbbrg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdWpveXNnc29sdW96dWZiYnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDc3NzksImV4cCI6MjA5NTYyMzc3OX0.K6RV1fZu5YDR8Zl3A8ETVyeE5OQ63xPLpG6qeJl5GBI';

// Charge le SDK Supabase depuis CDN (compatible navigateur, pas de bundler)
(function loadSupabase() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  script.onload = () => {
    window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        autoRefreshToken : true,
        persistSession   : true,
        detectSessionInUrl: true,
        storage          : window.localStorage   // session persistée entre pages
      }
    });
    // Déclenche un événement custom pour que les autres scripts sachent que c'est prêt
    document.dispatchEvent(new Event('supabase:ready'));
  };
  script.onerror = () => console.error('[IMMS] Impossible de charger le SDK Supabase.');
  document.head.appendChild(script);
})();

// Helper global — attend que Supabase soit prêt avant d'exécuter le callback
window.withSupabase = (cb) => {
  if (window._supabase) { cb(window._supabase); return; }
  document.addEventListener('supabase:ready', () => cb(window._supabase), { once: true });
};

// Helper : récupère la session active (retourne null si non connecté)
window.getSession = () =>
  window._supabase
    ? window._supabase.auth.getSession().then(({ data }) => data.session)
    : Promise.resolve(null);

// Helper : récupère le profil complet de l'utilisateur connecté (depuis table profiles)
window.getCurrentUser = async () => {
  const session = await window.getSession();
  if (!session) return null;
  const { data, error } = await window._supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (error) { console.error('[IMMS] getCurrentUser:', error.message); return null; }
  return data;
};

// Helper : passe le machine_id entre pages via sessionStorage
window.setMachineContext = (machineId, machineName) => {
  sessionStorage.setItem('current_machine_id',   machineId);
  sessionStorage.setItem('current_machine_name',  machineName || '');
};
window.getMachineId = () => sessionStorage.getItem('current_machine_id');

// Helper : passe le chaine_id entre pages
window.setChaineContext = (chaineId, chaineName) => {
  sessionStorage.setItem('current_chaine_id',   chaineId);
  sessionStorage.setItem('current_chaine_name',  chaineName || '');
};
window.getChaineId = () => sessionStorage.getItem('current_chaine_id');

// Helper : passe le usine_id entre pages
window.setUsineContext = (usineId, usineName) => {
  sessionStorage.setItem('current_usine_id',   usineId);
  sessionStorage.setItem('current_usine_name',  usineName || '');
};
window.getUsineId = () => sessionStorage.getItem('current_usine_id');
