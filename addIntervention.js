document.addEventListener("DOMContentLoaded", () => {
  const { machineId } = window.IMMS.getContext();
  if (document.getElementById("machineId")) document.getElementById("machineId").value = machineId || "";
  document.querySelector(".addintervention_form").addEventListener("submit", addIntervention);
});

async function addIntervention(e) {
  e.preventDefault();
  const context = window.IMMS.getContext();
  const machine_id = document.getElementById("machineId").value || context.machineId;
  if (!machine_id) return window.IMMS.notify("Open a machine first.", "error");

  const date = document.getElementById("interventionDate").value;
  const start = document.getElementById("interventionStart").value || "08:00";
  const scheduled_at = date ? new Date(`${date}T${start}`).toISOString() : null;
  const payload = {
    machine_id,
    chaine_id: context.chaineId || null,
    title: document.getElementById("interventionTitle").value.trim(),
    type: document.getElementById("interventionType").value || "preventive",
    occurrence: document.getElementById("interventionRepeat").value || null,
    scheduled_at,
    status: "scheduled",
    description: document.getElementById("interventionDescription").value.trim()
  };
  if (!payload.title || !payload.scheduled_at) return window.IMMS.notify("Title and date are required.", "error");

  const sb = await window.IMMS.getClient();
  const { error } = await sb.from("interventions").insert(payload);
  if (error) return window.IMMS.notify(error.message, "error");
  window.location.href = "interventions.html";
}
