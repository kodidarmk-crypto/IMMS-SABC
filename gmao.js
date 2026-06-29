// ============================================================
//  IMMS-SABC — gmao.js
//  Cœur de l'app : affiche toutes les infos d'une machine
// ============================================================

document.addEventListener('supabase:ready', async () => {
  const sb = window._supabase;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const machineId = window.getMachineId();
  if (!machineId) { window.location.href = 'machines.html'; return; }

  // Charge tout en parallèle
  await Promise.all([
    loadMachineInfo(),
    loadAlerts(),
    loadWeeklyInterventions(),
    loadTeam(),
    loadElements()
  ]);

  // ── 1. Infos machine ───────────────────────────────────────
  async function loadMachineInfo() {
    const { data: m, error } = await sb
      .from('machines')
      .select('*, chaines(nom), usines(nom)')
      .eq('id', machineId)
      .single();

    if (error || !m) return;

    setEl('machineName',         m.nom);
    setEl('machineType',         m.type || '');
    setEl('machineManufacturer', m.manufacturer || '');
    setEl('machineFactory',      m.usines?.nom || '');
    setEl('machineLine',         m.chaines?.nom || '');
    setEl('machineDescription',  m.description || '');

    const img = document.getElementById('machineImage');
    if (img && m.image_url) img.src = m.image_url;

    // Bouton statut cliquable
    const statusBtn = document.getElementById('machineStatus');
    if (statusBtn) {
      statusBtn.textContent = labelStatut(m.statut);
      statusBtn.className   = `machine-status status-${m.statut}`;
      statusBtn.dataset.statut = m.statut;
      statusBtn.addEventListener('click', async () => {
        const next = nextStatut(statusBtn.dataset.statut);
        await sb.from('machines').update({ statut: next }).eq('id', machineId);
        statusBtn.textContent    = labelStatut(next);
        statusBtn.className      = `machine-status status-${next}`;
        statusBtn.dataset.statut = next;
      });
    }
  }

  // ── 2. Alert Panel — interventions non réalisées + pannes non résolues ──
  async function loadAlerts() {
    const container = document.querySelector('.alert-list');
    if (!container) return;

    const [{ data: intv }, { data: pannes }] = await Promise.all([
      sb.from('interventions')
        .select('id, titre, date_prevue, priorite')
        .eq('machine_id', machineId)
        .eq('statut', 'planifiee')
        .lt('date_prevue', new Date().toISOString()),
      sb.from('pannes')
        .select('id, titre, date_debut, severite')
        .eq('machine_id', machineId)
        .neq('statut', 'resolu')
    ]);

    const items = [
      ...(intv  || []).map(i => ({ ...i, kind: 'intervention' })),
      ...(pannes || []).map(p => ({ ...p, kind: 'panne' }))
    ];

    if (items.length === 0) {
      container.innerHTML = '<p class="empty-text">Aucune alerte active.</p>'; return;
    }
    container.innerHTML = items.map(it => `
      <div class="alert-item alert-${it.kind}">
        <span class="alert-icon">${it.kind === 'panne' ? '🔴' : '⚠️'}</span>
        <div>
          <strong>${it.titre}</strong>
          <small>${it.kind === 'panne' ? 'Panne depuis' : 'Prévue le'} ${formatDate(it.date_debut || it.date_prevue)}</small>
        </div>
      </div>
    `).join('');
  }

  // ── 3. Interventions de la semaine ─────────────────────────
  async function loadWeeklyInterventions() {
    const container = document.querySelector('.interventions-list');
    if (!container) return;

    const now     = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(now.getDate() + 7);

    const { data, error } = await sb
      .from('interventions')
      .select('id, titre, type, date_prevue, statut, assignee:profiles(nom)')
      .eq('machine_id', machineId)
      .gte('date_prevue', now.toISOString())
      .lte('date_prevue', weekEnd.toISOString())
      .order('date_prevue');

    if (error || !data || data.length === 0) {
      container.innerHTML = '<p class="empty-text">Aucune intervention cette semaine.</p>'; return;
    }
    container.innerHTML = data.map(it => `
      <div class="intervention-item">
        <span class="intv-type type-${it.type}">${it.type}</span>
        <div>
          <strong>${it.titre}</strong>
          <small>${formatDate(it.date_prevue)} — ${it.assignee?.nom || 'Non assigné'}</small>
        </div>
        <span class="intv-status status-${it.statut}">${it.statut}</span>
      </div>
    `).join('');
  }

  // ── 4. Équipe de la machine ────────────────────────────────
  async function loadTeam() {
    const container = document.querySelector('.team-list');
    if (!container) return;

    // Récupère la chaîne de la machine puis les membres de cette chaîne
    const { data: machine } = await sb
      .from('machines')
      .select('chaine_id')
      .eq('id', machineId)
      .single();

    if (!machine) return;

    const { data, error } = await sb
      .from('membres_chaines')
      .select('profile:profiles(id, nom, prenom, role, avatar_url)')
      .eq('chaine_id', machine.chaine_id);

    if (error || !data || data.length === 0) {
      container.innerHTML = '<p class="empty-text">Aucun membre assigné.</p>'; return;
    }

    container.innerHTML = data.map(m => `
      <div class="team-member">
        <img src="${m.profile?.avatar_url || 'signup.svg'}" alt="${m.profile?.nom}"
             onerror="this.src='signup.svg'" class="member-avatar"/>
        <div>
          <strong>${m.profile?.prenom || ''} ${m.profile?.nom || ''}</strong>
          <small>${m.profile?.role || ''}</small>
        </div>
      </div>
    `).join('');
  }

  // ── 5. Composants/Éléments de la machine ──────────────────
  async function loadElements() {
    const container = document.querySelector('.elements-list');
    if (!container) return;

    const { data, error } = await sb
      .from('elements')
      .select('*')
      .eq('machine_id', machineId)
      .order('nom');

    if (error || !data || data.length === 0) {
      container.innerHTML = '<p class="empty-text">Aucun composant enregistré.</p>'; return;
    }
    container.innerHTML = data.map(el => `
      <div class="element-item">
        <strong>${el.nom}</strong>
        <span>Qté : ${el.quantite}</span>
        <small>${el.description || ''}</small>
      </div>
    `).join('');

    // Bouton Add Elements
    const addBtn = document.querySelector('.elements-card button');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const nom = prompt('Nom du composant :');
        if (!nom) return;
        addElement(nom);
      });
    }
  }

  async function addElement(nom) {
    const { error } = await sb.from('elements').insert({ machine_id: machineId, nom });
    if (!error) loadElements();
    else alert('Erreur : ' + error.message);
  }

  // ── Helpers ────────────────────────────────────────────────
  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function labelStatut(s) {
    return s === 'running' ? '🟢 Running' : s === 'maintenance' ? '🔧 Maintenance' : '⛔ Inactive';
  }
  function nextStatut(s) {
    return s === 'running' ? 'maintenance' : s === 'maintenance' ? 'inactive' : 'running';
  }
});
