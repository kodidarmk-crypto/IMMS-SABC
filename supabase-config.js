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

window.IMMS = window.IMMS || {};
window.IMMS.getClient = () => new Promise((resolve) => {
  if (window._supabase) return resolve(window._supabase);
  document.addEventListener('supabase:ready', () => resolve(window._supabase), { once: true });
});

window.IMMS.getContext = () => ({
  machineId: sessionStorage.getItem('machine_id'),
  machineNom: sessionStorage.getItem('machine_nom'),
  usineId: sessionStorage.getItem('usine_id') || sessionStorage.getItem('selectedUsine'),
  usineNom: sessionStorage.getItem('usine_nom') || sessionStorage.getItem('selectedUsineNom'),
  chaineId: sessionStorage.getItem('chaine_id') || sessionStorage.getItem('selectedChaine'),
  chaineNom: sessionStorage.getItem('chaine_nom') || sessionStorage.getItem('selectedChaineNom'),
  selectedUsine: sessionStorage.getItem('selectedUsine') || sessionStorage.getItem('usine_id'),
  selectedChaine: sessionStorage.getItem('selectedChaine') || sessionStorage.getItem('chaine_id')
});

window.IMMS.setContext = (key, value) => {
  if (!key) return;
  const normalized = key.toString();
  switch (normalized) {
    case 'machineId': sessionStorage.setItem('machine_id', value); break;
    case 'machineNom': sessionStorage.setItem('machine_nom', value); break;
    case 'usineId': sessionStorage.setItem('usine_id', value); break;
    case 'usineNom': sessionStorage.setItem('usine_nom', value); break;
    case 'chaineId': sessionStorage.setItem('chaine_id', value); break;
    case 'chaineNom': sessionStorage.setItem('chaine_nom', value); break;
    case 'selectedUsine': sessionStorage.setItem('selectedUsine', value); break;
    case 'selectedUsineNom': sessionStorage.setItem('selectedUsineNom', value); break;
    case 'selectedChaine': sessionStorage.setItem('selectedChaine', value); break;
    case 'selectedChaineNom': sessionStorage.setItem('selectedChaineNom', value); break;
    default: sessionStorage.setItem(normalized, value); break;
  }
};

window.IMMS.notify = (message = '', type = 'info') => {
  const containerId = 'imms-notification-container';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'fixed';
    container.style.right = '16px';
    container.style.top = '16px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.padding = '12px 14px';
  toast.style.borderRadius = '10px';
  toast.style.minWidth = '240px';
  toast.style.boxShadow = '0 12px 30px rgba(0,0,0,.15)';
  toast.style.color = '#fff';
  toast.style.fontFamily = 'sans-serif';
  toast.style.fontSize = '14px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity .22s ease, transform .22s ease';

  switch (type) {
    case 'success': toast.style.background = '#28a745'; break;
    case 'error': toast.style.background = '#d6336c'; break;
    case 'warning': toast.style.background = '#f0ad4e'; toast.style.color = '#1f1f1f'; break;
    default: toast.style.background = '#0d6efd'; break;
  }

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-12px)';
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4200);
};

window.IMMS.escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

window.IMMS.publicUrl = (path, bucketName) => {
  if (!path) return '';
  if (!window._supabase || !window._supabase.storage) return path;
  const { data } = window._supabase.storage.from(bucketName || '').getPublicUrl(path);
  return data?.publicUrl || path;
};
