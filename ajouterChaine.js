document.addEventListener("DOMContentLoaded", async () => {
  await loadFactories();
  document.getElementById("chaineStatus")?.addEventListener("change", updateStatusColor);
  document.querySelector(".add-chaine-form").addEventListener("submit", addChaine);
});

async function loadFactories() {
  const sb = await window.IMMS.getClient();
  const select = document.getElementById("chaineUsine");
  const { usineId } = window.IMMS.getContext();
  const { data, error } = await sb.from("usines").select("id,name").order("name");
  if (error) return window.IMMS.notify(error.message, "error");
  select.innerHTML = '<option value="">Select a factory</option>' + (data || [])
    .map(u => `<option value="${u.id}" ${u.id === usineId ? "selected" : ""}>${window.IMMS.escapeHtml(u.name)}</option>`)
    .join("");
}

function updateStatusColor() {
  const select = document.getElementById("chaineStatus");
  const colors = { active: "#27ae60", maintenance: "#f39c12", inactive: "#e74c3c" };
  select.style.borderColor = colors[select.value] || "#bdc3c7";
  select.style.color = colors[select.value] || "#2c3e50";
}

async function addChaine(e) {
  e.preventDefault();
  const sb = await window.IMMS.getClient();
  const payload = {
    name: document.getElementById("chaineNom").value.trim(),
    usine_id: document.getElementById("chaineUsine").value,
    responsable: document.getElementById("chaineResponsable").value.trim(),
    status: (document.getElementById("chaineStatus").value || "active").toLowerCase()
  };
  if (!payload.name || !payload.usine_id) return window.IMMS.notify("Production line name and factory are required.", "error");

  const { error } = await sb.from("chaines").insert(payload);
  if (error) return window.IMMS.notify(error.message, "error");
  window.IMMS.setContext("selectedUsine", payload.usine_id);
  window.location.href = "chaines.html";
}
