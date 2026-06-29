// ============================================================
//  IMMS-SABC — chaines.js
//  Container HTML : div.chaines-container  (chaines.html)
//  Filtres : filterByStatus() appelé depuis les boutons HTML
// ============================================================

document.addEventListener('supabase:ready', async () => {
  const sb = window._supabase;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const usineId  = window.getUsineId();
  const usineNom = window.getUsineNom();
  if (!usineId) { window.location.href = 'Usines.html'; return; }

  // Affiche le nom de l'usine dans le titre si l'élément existe
  const titleEl = document.querySelector('.chaines-card h1');
  if (titleEl) titleEl.textContent = `Production Lines — ${usineNom}`;

  const container = document.querySelector('.chaines-container');
  if (!container) return;

  let allChaines   = [];
  let activeFilter = 'active'; // filtre par défaut = active (correspond au bouton actif dans le HTML)

  await loadChaines();

  // Expose filterByStatus() globalement (appelé depuis onclick dans le HTML)
  window.filterByStatus = function(status) {
    activeFilter = status;
    // Mise à jour visuelle des boutons
    document.querySelectorAll('.status-btn').forEach(b => {
      const isActive = b.id === 'status' + capitalise(status);
      b.style.backgroundColor = isActive ? colorStatut(status) : 'transparent';
      b.style.color            = isActive ? '#fff' : colorStatut(status);
    });
    renderChaines();
  };

  async function loadChaines() {
    container.innerHTML = '<p style="padding:20px;opacity:.6;">Chargement des chaînes…</p>';
    const { data, error } = await sb.from('chaines').select('*').eq('usine_id', usineId).order('nom');
    if (error) { container.innerHTML = `<p style="color:red;padding:20px;">${error.message}</p>`; return; }
    allChaines = data || [];
    renderChaines();
  }

  function renderChaines() {
    const list = allChaines.filter(c => c.statut === activeFilter);
    if (list.length === 0) {
      container.innerHTML = `<p style="padding:20px;opacity:.6;">Aucune chaîne "${activeFilter}".</p>`; return;
    }
    container.innerHTML = '';
    list.forEach(ch => container.appendChild(buildCard(ch)));
  }

  function buildCard(ch) {
    const card = document.createElement('div');
    card.className = 'chaine-card';
    card.style.cssText = 'cursor:pointer;padding:20px;border:1px solid rgba(255,255,255,.1);border-radius:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;';
    card.innerHTML = `
      <div>
        <h3 style="margin:0 0 6px;">${ch.nom}</h3>
        <p style="margin:0;opacity:.7;font-size:.85rem;">${ch.description || 'Aucune description'}</p>
      </div>
      <button class="statut-btn" data-id="${ch.id}" data-statut="${ch.statut}"
        style="padding:5px 14px;border-radius:20px;border:none;cursor:pointer;font-weight:600;
               background:${colorStatut(ch.statut)};color:#fff;font-size:.8rem;white-space:nowrap;">
        ${labelStatut(ch.statut)}
      </button>
    `;

    // Clic carte → machines
    card.addEventListener('click', (e) => {
      if (e.target.closest('.statut-btn')) return;
      window.setChaineContext(ch.id, ch.nom);
      window.location.href = 'machines.html';
    });

    // Bouton statut → cycle
    card.querySelector('.statut-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn  = e.currentTarget;
      const next = nextStatut(btn.dataset.statut);
      const { error } = await sb.from('chaines').update({ statut: next, updated_at: new Date() }).eq('id', ch.id);
      if (!error) {
        ch.statut            = next;
        btn.dataset.statut   = next;
        btn.textContent      = labelStatut(next);
        btn.style.background = colorStatut(next);
        // Re-render si le filtre actuel ne correspond plus
        if (next !== activeFilter) renderChaines();
      }
    });

    return card;
  }

  function labelStatut(s) { return s === 'active' ? '✅ Active' : s === 'maintenance' ? '🔧 Maintenance' : '⛔ Inactive'; }
  function colorStatut(s) { return s === 'active' ? '#27ae60' : s === 'maintenance' ? '#f39c12' : '#e74c3c'; }
  function nextStatut(s)  { return s === 'active' ? 'maintenance' : s === 'maintenance' ? 'inactive' : 'active'; }
  function capitalise(s)  { return s.charAt(0).toUpperCase() + s.slice(1); }
});
