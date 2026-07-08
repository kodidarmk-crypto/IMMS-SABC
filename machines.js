// ============================================================
//  IMMS-SABC — machines.js
//  Container HTML : div.machines-container  (machines.html)
//  Filtres : filterByStatus() appelé depuis les boutons HTML
// ============================================================

document.addEventListener('supabase:ready', async () => {
  const sb = window._supabase;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const chaineId  = window.getChaineId();
  const chaineNom = window.getChaineNom();
  if (!chaineId) { window.location.href = 'chaines.html'; return; }

  // Affiche le nom de la chaîne dans le titre
  const titleEl = document.querySelector('.machine-page h1');
  if (titleEl) titleEl.textContent = `Machines — ${chaineNom}`;

  const container = document.querySelector('.machines-container');
  if (!container) return;

  let allMachines  = [];
  let activeFilter = 'running';

  await loadMachines();

  // Expose filterByStatus() globalement (appelé depuis onclick dans le HTML)
  window.filterByStatus = function(status) {
    activeFilter = status;
    const colors = { running: '#27ae60', maintenance: '#f39c12', inactive: '#e74c3c' };
    ['Running','Maintenance','Inactive'].forEach(s => {
      const btn = document.getElementById('status' + s);
      if (btn) {
        const key = s.toLowerCase();
        btn.style.backgroundColor = key === status ? colors[key] : 'transparent';
        btn.style.color            = key === status ? '#fff' : colors[key];
        btn.style.border           = `2px solid ${colors[key]}`;
      }
    });
    renderMachines();
  };

  async function loadMachines() {
    container.innerHTML = '<p style="padding:20px;opacity:.6;">Chargement des machines…</p>';
    const { data, error } = await sb.from('machines').select('*').eq('chaine_id', chaineId).order('name');
    if (error) { container.innerHTML = `<p style="color:red;padding:20px;">${error.message}</p>`; return; }
    allMachines = data || [];
    renderMachines();
  }

  function renderMachines() {
    const list = allMachines.filter(m => m.status === activeFilter);
    if (list.length === 0) {
      container.innerHTML = `<p style="padding:20px;opacity:.6;">Aucune machine "${activeFilter}".</p>`; return;
    }
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;';
    list.forEach(m => grid.appendChild(buildCard(m)));
    container.appendChild(grid);
  }

  function buildCard(m) {
    const card = document.createElement('div');
    card.className = 'machine-card';
    card.style.cssText = 'cursor:pointer;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;';
    card.innerHTML = `
      <img src="${m.image_url || 'factory.svg'}" alt="${m.name}"
           onerror="this.src='factory.svg'"
           style="width:100%;height:150px;object-fit:cover;"/>
      <div style="padding:16px;">
        <h3 style="margin:0 0 4px;">${window.IMMS.escapeHtml(m.name)}</h3>
        <p style="margin:0 0 2px;opacity:.7;font-size:.82rem;">${m.type || ''}</p>
        <p style="margin:0 0 12px;opacity:.6;font-size:.82rem;">${m.manufacturer || ''}</p>
        <button class="statut-btn" data-id="${m.id}" data-status="${m.status}"
          style="padding:4px 14px;border-radius:20px;border:none;cursor:pointer;font-weight:600;
                 background:${colorStatut(m.status)};color:#fff;font-size:.78rem;">
          ${labelStatut(m.status)}
        </button>
      </div>
    `;

    // Clic carte → GMAO
    card.addEventListener('click', (e) => {
      if (e.target.closest('.statut-btn')) return;
      window.setMachineContext(m.id, m.name);
      window.location.href = 'gmao.html';
    });

    // Bouton statut → cycle
    card.querySelector('.statut-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn  = e.currentTarget;
      const next = nextStatut(btn.dataset.status);
      const { error } = await sb.from('machines').update({ status: next, updated_at: new Date() }).eq('id', m.id);
      if (!error) {
        m.status             = next;
        btn.dataset.status   = next;
        btn.textContent      = labelStatut(next);
        btn.style.background = colorStatut(next);
        if (next !== activeFilter) renderMachines();
      }
    });

    return card;
  }

  function labelStatut(s) { return s === 'running' ? '🟢 Running' : s === 'maintenance' ? '🔧 Maintenance' : '⛔ Inactive'; }
  function colorStatut(s) { return s === 'running' ? '#27ae60' : s === 'maintenance' ? '#f39c12' : '#e74c3c'; }
  function nextStatut(s)  { return s === 'running' ? 'maintenance' : s === 'maintenance' ? 'inactive' : 'running'; }
});
