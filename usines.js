let allUsines = [];

const statusMeta = {
  active: { label: "Active", color: "#27ae60" },
  maintenance: { label: "Maintenance", color: "#f39c12" },
  inactive: { label: "Inactive", color: "#e74c3c" }
};

async function loadUsines() {
  try {
    const sb = await window.IMMS.getClient();
    const { data, error } = await sb
      .from("usines")
      .select("*, chaines(id)")
      .order("name", { ascending: true });
    if (error) throw error;
    allUsines = data || [];
    displayUsines(allUsines);
  } catch (error) {
    document.querySelector(".usines-page").innerHTML = `<p class="empty-state">${window.IMMS.escapeHtml(error.message)}</p>`;
  }
}

function displayUsines(usines) {
  const container = document.querySelector(".usines-page");
  if (!usines.length) {
    container.innerHTML = '<p class="empty-state">No factories found.</p>';
    return;
  }

  container.innerHTML = usines.map(usine => {
    const status = String(usine.status || "active").toLowerCase();
    const meta = statusMeta[status] || statusMeta.active;
    const image = window.IMMS.publicUrl(usine.image_url) || "factory.svg";
    return `
      <div class="usine-card">
        <div class="usine-image">
          <img src="${image}" alt="${window.IMMS.escapeHtml(usine.name)}">
        </div>
        <div class="usine-content">
          <div class="usine-header">
            <h2>${window.IMMS.escapeHtml(usine.name)}</h2>
            <button class="status-pill" style="--status:${meta.color}" onclick="changeUsineStatus('${usine.id}', '${status}')">${meta.label}</button>
          </div>
          <div class="usine-info-grid">
            <div class="usine-info"><span class="info-label">Ville</span><p>${window.IMMS.escapeHtml(usine.city || "N/A")}</p></div>
            <div class="usine-info"><span class="info-label">Responsable</span><p>${window.IMMS.escapeHtml(usine.responsable || "N/A")}</p></div>
            <div class="usine-info"><span class="info-label">Secteur</span><p>${window.IMMS.escapeHtml(usine.sector || "N/A")}</p></div>
            <div class="usine-info"><span class="info-label">Creation</span><p>${window.IMMS.escapeHtml(usine.creation_date || "N/A")}</p></div>
          </div>
        </div>
        <div class="usine-side">
          <div class="chaine-count"><h1>${usine.chaines?.length || 0}</h1><span>Chaines</span></div>
          <button class="open-usine-btn" onclick="openUsine('${usine.id}')">Ouvrir</button>
        </div>
      </div>`;
  }).join("");
}

async function changeUsineStatus(usineId, currentStatus) {
  const statuses = ["active", "maintenance", "inactive"];
  const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
  const sb = await window.IMMS.getClient();
  const { error } = await sb.from("usines").update({ status: nextStatus }).eq("id", usineId);
  if (error) return window.IMMS.notify(error.message, "error");
  loadUsines();
}

function openUsine(usineId) {
  window.IMMS.setContext("selectedUsine", usineId);
  window.location.href = "chaines.html";
}

document.addEventListener("DOMContentLoaded", loadUsines);
