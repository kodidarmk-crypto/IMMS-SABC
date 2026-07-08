// ============================================================
//  IMMS-SABC — gmao.js
//  Utilise les IDs exacts de gmao.html :
//  #machineImage #machineName #machineType #machineStatus
//  #machineFactory #machineLine #machineManufacturer #machineDescription
//  .alert-list  .interventions-list  .team-list  .elements-list
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

  // ── 1. Infos machine ──────────────────────────────────────
  async function loadMachineInfo() {
    const { data: m, error } = await sb
      .from('machines')
      .select('*, chaines(name), usines(name)')
      .eq('id', machineId)
      .single();
    if (error || !m) return;

    const img = document.getElementById('machineImage');
    if (img) { img.src = m.image_url || 'factory.svg'; img.alt = m.name; }

    setText('machineName',         m.name);
    setText('machineType',         m.type || '');
    setText('machineManufacturer', m.manufacturer || '');
    setText('machineFactory',      m.usines?.name || '');
    setText('machineLine',         m.chaines?.name || '');
    setText('machineDescription',  m.description || 'Aucune description disponible.');

    const statusEl = document.getElementById('machineStatus');
    if (statusEl) {
      statusEl.textContent    = labelStatut(m.status);
      statusEl.className      = `machine-status status-${m.status}`;
      statusEl.dataset.status = m.status;
      statusEl.style.cssText  = `padding:6px 16px;border-radius:20px;cursor:pointer;border:none;font-weight:600;color:#fff;background:${colorStatut(m.status)};`;

      statusEl.addEventListener('click', async () => {
        const next = nextStatut(statusEl.dataset.status);
        const { error } = await sb.from('machines').update({ status: next, updated_at: new Date() }).eq('id', machineId);
        if (!error) {
          statusEl.textContent    = labelStatut(next);
          statusEl.className      = `machine-status status-${next}`;
          statusEl.dataset.status = next;
          statusEl.style.background = colorStatut(next);
        }
      });
    }
  }

  // ── 2. Alert Panel ────────────────────────────────────────
  async function loadAlerts() {
    const container = document.querySelector('.alert-list');
    if (!container) return;

    const now = new Date().toISOString();
    const [{ data: intv }, { data: pannes }] = await Promise.all([
      sb.from('interventions').select('id,title,type,scheduled_at,status')
        .eq('machine_id', machineId).eq('status', 'scheduled').lt('scheduled_at', now),
      sb.from('pannes').select('id,titre,date_debut,severite')
        .eq('machine_id', machineId).neq('statut', 'resolu')
    ]);

    const items = [
      ...(intv  || []).map(i => ({
        id: i.id,
        title: i.title,
        date: i.scheduled_at,
        type: i.type,
        status: i.status,
        kind: 'intervention'
      })),
      ...(pannes || []).map(p => ({
        id: p.id,
        title: p.titre,
        date: p.date_debut,
        type: p.severite,
        status: p.statut,
        kind: 'panne'
      }))
    ];

    if (items.length === 0) {
      container.innerHTML = '<p style="opacity:.6;padding:10px;">Aucune alerte active. ✅</p>'; return;
    }
    container.innerHTML = items.map(it => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;border-radius:8px;
                  background:${it.kind==='panne'?'rgba(231,76,60,.12)':'rgba(243,156,18,.12)'};margin-bottom:8px;">
        <span style="font-size:1.2rem;">${it.kind === 'panne' ? '🔴' : '⚠️'}</span>
        <div>
          <strong>${window.IMMS.escapeHtml(it.title)}</strong><br/>
          <small style="opacity:.7;">${it.kind==='panne'?'Panne depuis':'Prévue le'} ${formatDate(it.date)}</small>
        </div>
      </div>
    `).join('');
  }

  // ── 3. Interventions de la semaine ───────────────────────
  async function loadWeeklyInterventions() {
    const container = document.querySelector('.interventions-list');
    if (!container) return;

    const now     = new Date();
    const weekEnd = new Date(); weekEnd.setDate(now.getDate() + 7);

    const { data, error } = await sb.from('interventions')
      .select('id,title,type,scheduled_at,status')
      .eq('machine_id', machineId)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', weekEnd.toISOString())
      .order('scheduled_at');

    if (error || !data || data.length === 0) {
      container.innerHTML = '<p style="opacity:.6;padding:10px;">Aucune intervention cette semaine.</p>'; return;
    }
    container.innerHTML = data.map(it => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;
                  background:rgba(255,255,255,.04);margin-bottom:8px;">
        <span style="background:#3498db;color:#fff;padding:2px 10px;border-radius:12px;font-size:.75rem;white-space:nowrap;">${it.type}</span>
        <div style="flex:1;">
          <strong>${it.title}</strong><br/>
          <small style="opacity:.7;">${formatDate(it.scheduled_at)}</small>
        </div>
        <span style="font-size:.78rem;opacity:.7;">${it.status}</span>
      </div>
    `).join('');
  }

  // ── 4. Équipe ─────────────────────────────────────────────
  async function loadTeam() {
    const container = document.querySelector('.team-list');
    if (!container) return;

    const { data: machine } = await sb.from('machines').select('chaine_id').eq('id', machineId).single();
    if (!machine) return;

    const { data, error } = await sb.from('membres_chaines')
      .select('profiles(id,first_name,last_name,full_name,role,avatar_url)')
      .eq('chaine_id', machine.chaine_id);

    if (error || !data || data.length === 0) {
      container.innerHTML = '<p style="opacity:.6;padding:10px;">Aucun membre assigné.</p>'; return;
    }
    container.innerHTML = data.map(m => {
      const profile = m.profiles || {};
      const name = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Non identifié';
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;
                  background:rgba(255,255,255,.04);margin-bottom:8px;">
        <img src="${profile.avatar_url||'signup.svg'}" alt="${window.IMMS.escapeHtml(name)}"
             onerror="this.src='signup.svg'"
             style="width:40px;height:40px;border-radius:50%;object-fit:cover;"/>
        <div>
          <strong>${window.IMMS.escapeHtml(name)}</strong><br/>
          <small style="opacity:.7;">${window.IMMS.escapeHtml(profile.role || '')}</small>
        </div>
      </div>
    `;
    }).join('');
  }

  // ── 5. Composants/Éléments ───────────────────────────────
  async function loadElements() {
    const container = document.querySelector('.elements-list');
    if (!container) return;

    const { data, error } = await sb.from('elements').select('*').eq('machine_id', machineId).order('nom');

    if (error || !data || data.length === 0) {
      container.innerHTML = '<p style="opacity:.6;padding:10px;">Aucun composant enregistré.</p>';
    } else {
      container.innerHTML = data.map(el => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:10px;border-radius:8px;background:rgba(255,255,255,.04);margin-bottom:6px;">
          <div>
            <strong>${el.nom}</strong>
            ${el.description ? `<br/><small style="opacity:.7;">${el.description}</small>` : ''}
          </div>
          <span style="opacity:.6;font-size:.85rem;">Qté: ${el.quantite}</span>
        </div>
      `).join('');
    }

    // Bouton Add Elements
    const addBtn = document.querySelector('.elements-card .card-header button');
    if (addBtn) {
      addBtn.onclick = async () => {
        const nom = prompt('Nom du composant :');
        if (!nom) return;
        const { error } = await sb.from('elements').insert({ machine_id: machineId, nom });
        if (!error) loadElements(); else alert('Erreur : ' + error.message);
      };
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
  function labelStatut(s) { return s==='running'?'🟢 Running':s==='maintenance'?'🔧 Maintenance':'⛔ Inactive'; }
  function colorStatut(s) { return s==='running'?'#27ae60':s==='maintenance'?'#f39c12':'#e74c3c'; }
  function nextStatut(s)  { return s==='running'?'maintenance':s==='maintenance'?'inactive':'running'; }
});
