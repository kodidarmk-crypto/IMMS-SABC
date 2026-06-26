document.addEventListener("DOMContentLoaded", loadAnalysis);

async function loadAnalysis() {
  const { machineId } = window.IMMS.getContext();
  const body = document.getElementById("amdec-body");
  if (!machineId) {
    body.innerHTML = '<tr><td colspan="9">Open a machine first.</td></tr>';
    return;
  }
  const sb = await window.IMMS.getClient();
  const [{ data: components }, { data: failures }] = await Promise.all([
    sb.from("machine_components").select("*").eq("machine_id", machineId),
    sb.from("failures").select("*, machine_components(name)").eq("machine_id", machineId)
  ]);

  const grouped = new Map();
  (components || []).forEach(c => grouped.set(c.id, { component: c.name, failures: [] }));
  (failures || []).forEach(f => {
    const key = f.component_id || f.id;
    if (!grouped.has(key)) grouped.set(key, { component: f.machine_components?.name || "Unassigned", failures: [] });
    grouped.get(key).failures.push(f);
  });

  body.innerHTML = Array.from(grouped.values()).map(row => {
    const count = row.failures.length;
    const unresolved = row.failures.filter(f => f.status === "unresolved").length;
    const criticality = unresolved ? "High" : count ? "Medium" : "Low";
    return `
      <tr>
        <td>${window.IMMS.escapeHtml(row.component)}</td>
        <td>${count ? window.IMMS.escapeHtml(row.failures.map(f => f.title).join(", ")) : "No failure recorded"}</td>
        <td>${count}</td>
        <td>${unresolved}</td>
        <td>${criticality}</td>
        <td>${count * Math.max(unresolved, 1)}</td>
      </tr>`;
  }).join("") || '<tr><td colspan="9">No AMDEC data yet.</td></tr>';
}
