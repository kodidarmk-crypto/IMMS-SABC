// ============================================================
//  IMMS-SABC — usines.js
//  Colonnes BDD : name, status, city, image_url
//  Container HTML : div.usines-page
// ============================================================

document.addEventListener('supabase:ready', async () => {
  const sb = window._supabase;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const container = document.querySelector('.usines-page');
  if (!container) return;

  let allUsines    = [];
  let activeFilter = 'all';

  await loadUsines();

  // Filtres status si présents dans le HTML
  window.filterByStatus = function(status) {
    activeFilter = status;
    renderUsines();
  };

  async function loadUsines() {
    container.innerHTML = '<p style="padding:20px;opacity:.6;">Chargement des usines…</p>';
    const { data, error } = await sb
      .from('usines')
      .select('*')
      .order('name');

    if (error) {
      container.innerHTML = `<p style="color:#e74c3c;padding:20px;">Erreur : ${error.message}</p>`;
      return;
    }
    allUsines = data || [];
    renderUsines();
  }

  function renderUsines() {
    const list = activeFilter === 'all'
      ? allUsines
      : allUsines.filter(u => u.status === activeFilter);

    if (list.length === 0) {
      container.innerHTML = '<p style="padding:20px;opacity:.6;">Aucune usine enregistrée.</p>';
      return;
    }
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;padding:10px 0;';
    list.forEach(u => grid.appendChild(buildCard(u)));
    container.appendChild(grid);
  }

  function buildCard(u) {
    const card = document.createElement('div');
    card.className = 'usine-card';
    card.style.cssText = 'cursor:pointer;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;transition:transform .2s;';
    card.innerHTML = `
      <img src="${u.image_url || 'factory.svg'}" alt="${u.name}"
           onerror="this.src='factory.svg'"
           style="width:100%;height:160px;object-fit:cover;"/>
      <div style="padding:16px;">
        <h3 style="margin:0 0 4px;">${u.name}</h3>
        <p style="margin:0 0 4px;opacity:.6;font-size:.83rem;">${u.city || ''}</p>
        <p style="margin:0 0 4px;opacity:.6;font-size:.83rem;">${u.sector || ''}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
          <span style="opacity:.5;font-size:.8rem;">Resp: ${u.responsable || '—'}</span>
          <button class="statut-btn" data-id="${u.id}" data-status="${u.status}"
            style="padding:4px 14px;border-radius:20px;border:none;cursor:pointer;font-weight:600;
                   background:${colorStatus(u.status)};color:#fff;font-size:.78rem;">
            ${labelStatus(u.status)}
          </button>
        </div>
      </div>
    `;

    // Clic carte → chaînes
    card.addEventListener('click', (e) => {
      if (e.target.closest('.statut-btn')) return;
      window.setUsineContext(u.id, u.name);
      window.location.href = 'chaines.html';
    });

    // Bouton status → cycle 3 états
    card.querySelector('.statut-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn  = e.currentTarget;
      const next = nextStatus(btn.dataset.status);
      const { error } = await sb.from('usines').update({ status: next }).eq('id', u.id);
      if (!error) {
        u.status             = next;
        btn.dataset.status   = next;
        btn.textContent      = labelStatus(next);
        btn.style.background = colorStatus(next);
      }
    });

    return card;
  }

  function labelStatus(s) { return s==='active'?'✅ Active':s==='maintenance'?'🔧 Maintenance':'⛔ Inactive'; }
  function colorStatus(s) { return s==='active'?'#27ae60':s==='maintenance'?'#f39c12':'#e74c3c'; }
  function nextStatus(s)  { return s==='active'?'maintenance':s==='maintenance'?'inactive':'active'; }
});