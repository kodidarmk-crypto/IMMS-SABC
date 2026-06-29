// ============================================================
//  IMMS-SABC — usines.js
//  Affiche la liste des usines, gère le statut et la navigation
// ============================================================

document.addEventListener('supabase:ready', async () => {
  const sb = window._supabase;

  // Vérifie session
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const grid = document.getElementById('usinesGrid') || document.querySelector('.usines-grid');
  if (!grid) return;

  await loadUsines();

  async function loadUsines() {
    grid.innerHTML = '<p class="loading-text">Chargement des usines…</p>';

    const { data: usines, error } = await sb
      .from('usines')
      .select('*, chaines(count)')
      .order('nom');

    if (error) {
      grid.innerHTML = `<p class="error-text">Erreur : ${error.message}</p>`;
      return;
    }
    if (!usines || usines.length === 0) {
      grid.innerHTML = '<p class="empty-text">Aucune usine enregistrée.</p>';
      return;
    }

    grid.innerHTML = '';
    usines.forEach(usine => grid.appendChild(buildCard(usine)));
  }

  function buildCard(usine) {
    const nbChaines = usine.chaines?.[0]?.count ?? 0;
    const card = document.createElement('div');
    card.className = 'usine-card';
    card.innerHTML = `
      <div class="usine-card-img">
        <img src="${usine.image_url || 'factory.svg'}" alt="${usine.nom}"
             onerror="this.src='factory.svg'"/>
      </div>
      <div class="usine-card-body">
        <h3>${usine.nom}</h3>
        <p class="usine-location">${usine.localisation || '—'}</p>
        <p class="usine-desc">${usine.description || ''}</p>
        <div class="usine-meta">
          <span>${nbChaines} chaîne${nbChaines > 1 ? 's' : ''}</span>
          <button class="status-btn status-${usine.statut}" data-id="${usine.id}" data-statut="${usine.statut}">
            ${labelStatut(usine.statut)}
          </button>
        </div>
      </div>
    `;

    // Clic sur la carte → naviguer vers les chaînes
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('status-btn')) return;
      window.setUsineContext(usine.id, usine.nom);
      window.location.href = 'chaines.html';
    });

    // Bouton statut → cycle 3 états
    card.querySelector('.status-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      const next = nextStatut(btn.dataset.statut);
      const { error } = await sb.from('usines').update({ statut: next }).eq('id', usine.id);
      if (!error) {
        btn.dataset.statut = next;
        btn.className = `status-btn status-${next}`;
        btn.textContent = labelStatut(next);
        usine.statut = next;
      }
    });

    return card;
  }

  function labelStatut(s) {
    return s === 'active' ? '✅ Active' : s === 'maintenance' ? '🔧 Maintenance' : '⛔ Inactive';
  }
  function nextStatut(s) {
    return s === 'active' ? 'maintenance' : s === 'maintenance' ? 'inactive' : 'active';
  }
});
