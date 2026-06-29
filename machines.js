// ============================================================
//  IMMS-SABC — machines.js
//  Affiche les machines d'une chaîne, navigue vers gmao.html
// ============================================================

document.addEventListener('supabase:ready', async () => {
  const sb = window._supabase;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const chaineId   = window.getChaineId();
  const chaineName = sessionStorage.getItem('current_chaine_name') || 'Chaîne';
  const usineId    = window.getUsineId();

  const chaineTitle = document.getElementById('chaineName') || document.querySelector('.page-chaine-name');
  if (chaineTitle) chaineTitle.textContent = chaineName;

  if (!chaineId) { window.location.href = 'chaines.html'; return; }

  const grid = document.getElementById('machinesGrid') || document.querySelector('.machines-grid');
  if (!grid) return;

  await loadMachines();

  async function loadMachines() {
    grid.innerHTML = '<p class="loading-text">Chargement des machines…</p>';

    const { data: machines, error } = await sb
      .from('machines')
      .select('*')
      .eq('chaine_id', chaineId)
      .order('nom');

    if (error) {
      grid.innerHTML = `<p class="error-text">Erreur : ${error.message}</p>`; return;
    }
    if (!machines || machines.length === 0) {
      grid.innerHTML = '<p class="empty-text">Aucune machine dans cette chaîne.</p>'; return;
    }

    grid.innerHTML = '';
    machines.forEach(m => grid.appendChild(buildCard(m)));
  }

  function buildCard(m) {
    const card = document.createElement('div');
    card.className = 'machine-card';
    card.innerHTML = `
      <div class="machine-card-img">
        <img src="${m.image_url || 'factory.svg'}" alt="${m.nom}"
             onerror="this.src='factory.svg'"/>
      </div>
      <div class="machine-card-body">
        <h3>${m.nom}</h3>
        <p class="machine-type">${m.type || ''}</p>
        <p class="machine-manufacturer">${m.manufacturer || ''}</p>
        <button class="status-btn status-${m.statut}" data-id="${m.id}" data-statut="${m.statut}">
          ${labelStatut(m.statut)}
        </button>
      </div>
    `;

    // Clic sur la carte → GMAO de cette machine
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('status-btn')) return;
      window.setMachineContext(m.id, m.nom);
      window.location.href = 'gmao.html';
    });

    // Bouton statut
    card.querySelector('.status-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      const next = nextStatut(btn.dataset.statut);
      await sb.from('machines').update({ statut: next }).eq('id', m.id);
      btn.dataset.statut = next;
      btn.className = `status-btn status-${next}`;
      btn.textContent = labelStatut(next);
    });

    return card;
  }

  function labelStatut(s) {
    return s === 'running' ? '🟢 Running' : s === 'maintenance' ? '🔧 Maintenance' : '⛔ Inactive';
  }
  function nextStatut(s) {
    return s === 'running' ? 'maintenance' : s === 'maintenance' ? 'inactive' : 'running';
  }
});
