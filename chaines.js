// ============================================================
//  IMMS-SABC — chaines.js
//  Affiche les chaînes d'une usine spécifique
// ============================================================

document.addEventListener('supabase:ready', async () => {
  const sb = window._supabase;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const usineId   = window.getUsineId();
  const usineName = sessionStorage.getItem('current_usine_name') || 'Usine';

  // Affiche le nom de l'usine dans le header si présent
  const usineTitle = document.getElementById('usineName') || document.querySelector('.page-usine-name');
  if (usineTitle) usineTitle.textContent = usineName;

  if (!usineId) { window.location.href = 'Usines.html'; return; }

  const grid = document.getElementById('chainesGrid') || document.querySelector('.chaines-grid');
  if (!grid) return;

  await loadChaines();

  async function loadChaines() {
    grid.innerHTML = '<p class="loading-text">Chargement des chaînes…</p>';

    const { data: chaines, error } = await sb
      .from('chaines')
      .select('*, machines(count)')
      .eq('usine_id', usineId)
      .order('nom');

    if (error) {
      grid.innerHTML = `<p class="error-text">Erreur : ${error.message}</p>`; return;
    }
    if (!chaines || chaines.length === 0) {
      grid.innerHTML = '<p class="empty-text">Aucune chaîne dans cette usine.</p>'; return;
    }

    grid.innerHTML = '';
    chaines.forEach(ch => grid.appendChild(buildCard(ch)));
  }

  function buildCard(ch) {
    const nbMachines = ch.machines?.[0]?.count ?? 0;
    const card = document.createElement('div');
    card.className = 'chaine-card';
    card.innerHTML = `
      <div class="chaine-card-body">
        <h3>${ch.nom}</h3>
        <p>${ch.description || ''}</p>
        <div class="chaine-meta">
          <span>${nbMachines} machine${nbMachines > 1 ? 's' : ''}</span>
          <button class="status-btn status-${ch.statut}" data-id="${ch.id}" data-statut="${ch.statut}">
            ${labelStatut(ch.statut)}
          </button>
        </div>
      </div>
    `;

    // Clic sur la carte → machines de cette chaîne
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('status-btn')) return;
      window.setChaineContext(ch.id, ch.nom);
      window.location.href = 'machines.html';
    });

    // Bouton statut
    card.querySelector('.status-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      const next = nextStatut(btn.dataset.statut);
      await sb.from('chaines').update({ statut: next }).eq('id', ch.id);
      btn.dataset.statut = next;
      btn.className = `status-btn status-${next}`;
      btn.textContent = labelStatut(next);
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
