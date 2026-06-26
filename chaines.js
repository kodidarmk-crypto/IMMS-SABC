let allChaines = [];
let currentFilter = "all";

const chaineStatuses = {
  active: { label: "Active", color: "#27ae60" },
  maintenance: { label: "Maintenance", color: "#f39c12" },
  inactive: { label: "Inactive", color: "#e74c3c" }
};

async function loadChaines() {
  const { usineId } = window.IMMS.getContext();
  const container = document.querySelector(".chaines-container");
  if (!usineId) {
    container.innerHTML = '<p class="empty-state">Open a factory first.</p>';
    return;
  }

  try {
    const sb = await window.IMMS.getClient();
    const { data, error } = await sb
      .from("chaines")
      .select("*, machines(id)")
      .eq("usine_id", usineId)
      .order("name", { ascending: true });
    if (error) throw error;
    allChaines = data || [];
    displayChaines(currentFilter === "all" ? allChaines : allChaines.filter(c => c.status === currentFilter));
  } catch (error) {
    container.innerHTML = `<p class="empty-state">${window.IMMS.escapeHtml(error.message)}</p>`;
  }
}

function filterByStatus(status) {
  currentFilter = status;
  displayChaines(status === "all" ? allChaines : allChaines.filter(c => c.status === status));
}

function displayChaines(chaines) {
  const container = document.querySelector(".chaines-container");
  if (!chaines.length) {
    container.innerHTML = '<p class="empty-state">No production lines found.</p>';
    return;
  }

  container.innerHTML = chaines.map(chaine => {
    const status = String(chaine.status || "active").toLowerCase();
    const meta = chaineStatuses[status] || chaineStatuses.active;
    return `
      <div class="chaine-card">
        <div class="chaine-left">
          <h2>${window.IMMS.escapeHtml(chaine.name)}</h2>
          <div class="chaine-infos">
            <div class="chaine-info"><span class="info-label">Responsable</span><p>${window.IMMS.escapeHtml(chaine.responsable || "N/A")}</p></div>
            <div class="chaine-info"><span class="info-label">Status</span><button class="status-pill" style="--status:${meta.color}" onclick="changeStatus('${chaine.id}', '${status}')">${meta.label}</button></div>
          </div>
        </div>
        <div class="chaine-right">
          <div class="machine-count"><h1>${chaine.machines?.length || 0}</h1><span>Machines</span></div>
          <button class="open-chaine-btn" onclick="openChaine('${chaine.id}')">Open</button>
        </div>
      </div>`;
  }).join("");
}

async function changeStatus(chaineId, currentStatus) {
  const statuses = ["active", "maintenance", "inactive"];
  const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
  const sb = await window.IMMS.getClient();
  const { error } = await sb.from("chaines").update({ status: nextStatus }).eq("id", chaineId);
  if (error) return window.IMMS.notify(error.message, "error");
  loadChaines();
}

function openChaine(chaineId) {
  window.IMMS.setContext("selectedChaine", chaineId);
  window.location.href = "machines.html";
}

document.addEventListener("DOMContentLoaded", loadChaines);
