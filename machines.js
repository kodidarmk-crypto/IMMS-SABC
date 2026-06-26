let allMachines = [];
let currentFilter = "all";

const machineStatuses = {
  running: { label: "Running", color: "#27ae60" },
  maintenance: { label: "Maintenance", color: "#f39c12" },
  inactive: { label: "Inactive", color: "#e74c3c" }
};

async function loadMachines() {
  const { chaineId } = window.IMMS.getContext();
  const container = document.querySelector(".machines-container");
  if (!chaineId) {
    container.innerHTML = '<p class="empty-state">Open a production line first.</p>';
    return;
  }

  try {
    const sb = await window.IMMS.getClient();
    const { data, error } = await sb
      .from("machines")
      .select("*")
      .eq("chaine_id", chaineId)
      .order("name", { ascending: true });
    if (error) throw error;
    allMachines = data || [];
    displayMachines(currentFilter === "all" ? allMachines : allMachines.filter(m => m.status === currentFilter));
  } catch (error) {
    container.innerHTML = `<p class="empty-state">${window.IMMS.escapeHtml(error.message)}</p>`;
  }
}

function filterByStatus(status) {
  currentFilter = status;
  displayMachines(status === "all" ? allMachines : allMachines.filter(m => m.status === status));
}

function displayMachines(machines) {
  const container = document.querySelector(".machines-container");
  if (!machines.length) {
    container.innerHTML = '<p class="empty-state">No machines found.</p>';
    return;
  }

  container.innerHTML = machines.map(machine => {
    const status = String(machine.status || "running").toLowerCase();
    const meta = machineStatuses[status] || machineStatuses.running;
    const imageUrl = window.IMMS.publicUrl(machine.image_url);
    return `
      <div class="machine-card">
        <div class="machine-image">
          <img src="${imageUrl || "factory.svg"}" alt="${window.IMMS.escapeHtml(machine.name)}">
        </div>
        <div class="machine-content">
          <div class="machine-header">
            <h2>${window.IMMS.escapeHtml(machine.name)}</h2>
            <button class="status-pill" style="--status:${meta.color}" onclick="changeStatus('${machine.id}', '${status}')">${meta.label}</button>
          </div>
          <div class="machine-info-grid">
            <div class="machine-info"><span>Type</span><p>${window.IMMS.escapeHtml(machine.type || "N/A")}</p></div>
            <div class="machine-info"><span>Manufacturer</span><p>${window.IMMS.escapeHtml(machine.manufacturer || "N/A")}</p></div>
            <div class="machine-info"><span>Responsable</span><p>${window.IMMS.escapeHtml(machine.responsable || "N/A")}</p></div>
          </div>
        </div>
        <div class="machine-side"><button class="open-machine-btn" onclick="openMachine('${machine.id}')">Ouvrir</button></div>
      </div>`;
  }).join("");
}

async function changeStatus(machineId, currentStatus) {
  const statuses = ["running", "maintenance", "inactive"];
  const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
  const sb = await window.IMMS.getClient();
  const { error } = await sb.from("machines").update({ status: nextStatus }).eq("id", machineId);
  if (error) return window.IMMS.notify(error.message, "error");
  loadMachines();
}

function openMachine(machineId) {
  window.IMMS.setContext("machineId", machineId);
  window.location.href = "gmao.html";
}

document.addEventListener("DOMContentLoaded", loadMachines);
