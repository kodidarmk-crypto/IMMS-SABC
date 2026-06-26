document.addEventListener("DOMContentLoaded", loadGmao);

async function loadGmao() {
  const { machineId } = window.IMMS.getContext();
  if (!machineId) {
    document.querySelector(".gmao-body").innerHTML = '<p class="empty-state">Open a machine first.</p>';
    return;
  }

  const sb = await window.IMMS.getClient();
  const [{ data: machine, error }, { data: alerts }, { data: interventions }, { data: team }, { data: components }] = await Promise.all([
    sb.from("machines").select("*, usines(name), chaines(name)").eq("id", machineId).maybeSingle(),
    sb.from("failures").select("*").eq("machine_id", machineId).eq("status", "unresolved").order("started_at", { ascending: false }),
    sb.from("interventions").select("*").eq("machine_id", machineId).gte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(8),
    sb.from("chaine_members").select("profiles(full_name,email,role)").eq("chaine_id", window.IMMS.getContext().chaineId || "00000000-0000-0000-0000-000000000000"),
    sb.from("machine_components").select("*").eq("machine_id", machineId).order("name")
  ]);

  if (error || !machine) {
    document.querySelector(".gmao-body").innerHTML = `<p class="empty-state">${window.IMMS.escapeHtml(error?.message || "Machine not found.")}</p>`;
    return;
  }

  renderMachine(machine);
  renderAlerts(alerts || []);
  renderInterventions(interventions || []);
  renderTeam(team || []);
  renderComponents(components || []);
}

function renderMachine(machine) {
  document.getElementById("machineImage").src = window.IMMS.publicUrl(machine.image_url) || "factory.svg";
  document.getElementById("machineName").textContent = machine.name || "Machine";
  document.getElementById("machineType").textContent = machine.type || "";
  document.getElementById("machineStatus").textContent = machine.status || "running";
  document.getElementById("machineFactory").textContent = machine.usines?.name || "N/A";
  document.getElementById("machineLine").textContent = machine.chaines?.name || "N/A";
  document.getElementById("machineManufacturer").textContent = machine.manufacturer || "N/A";
  document.getElementById("machineDescription").textContent = `${machine.name || "This machine"} is managed through IMMS for maintenance, failures, documents, stock and analysis.`;
}

function renderAlerts(rows) {
  const el = document.querySelector(".alert-list");
  el.innerHTML = rows.length ? rows.map(f => `
    <div class="alert-item">
      <strong>${window.IMMS.escapeHtml(f.title)}</strong>
      <span>${window.IMMS.escapeHtml(f.severity || "medium")}</span>
      <p>${window.IMMS.escapeHtml(f.description || "")}</p>
    </div>`).join("") : '<p class="empty-state">No unresolved alerts.</p>';
}

function renderInterventions(rows) {
  const el = document.querySelector(".interventions-list");
  el.innerHTML = rows.length ? rows.map(i => `
    <div class="intervention-item">
      <strong>${window.IMMS.escapeHtml(i.title)}</strong>
      <span>${new Date(i.scheduled_at).toLocaleString()}</span>
      <p>${window.IMMS.escapeHtml(i.type)} - ${window.IMMS.escapeHtml(i.status)}</p>
    </div>`).join("") : '<p class="empty-state">No upcoming intervention.</p>';
}

function renderTeam(rows) {
  const el = document.querySelector(".team-list");
  el.innerHTML = rows.length ? rows.map(r => {
    const p = r.profiles || {};
    return `<div class="team-item"><strong>${window.IMMS.escapeHtml(p.full_name || "Member")}</strong><span>${window.IMMS.escapeHtml(p.role || "")}</span></div>`;
  }).join("") : '<p class="empty-state">No team assigned.</p>';
}

function renderComponents(rows) {
  const el = document.querySelector(".elements-list");
  el.innerHTML = rows.length ? rows.map(c => `<div class="element-item"><strong>${window.IMMS.escapeHtml(c.name)}</strong><span>${window.IMMS.escapeHtml(c.criticality || "medium")}</span></div>`).join("") : '<p class="empty-state">No machine elements yet.</p>';
}
