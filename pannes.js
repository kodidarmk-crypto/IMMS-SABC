let failures = [];
let liveTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("add-failure-form")?.addEventListener("submit", addFailure);
  document.getElementById("sort-failures")?.addEventListener("change", renderFailures);
  document.getElementById("export-history-btn")?.addEventListener("click", exportFailurePdf);
  await loadComponents();
  await loadFailures();
});

async function loadComponents() {
  const { machineId } = window.IMMS.getContext();
  const select = document.getElementById("failureComponent");
  if (!select || !machineId) return;
  const sb = await window.IMMS.getClient();
  const { data } = await sb.from("machine_components").select("id,name").eq("machine_id", machineId).order("name");
  select.innerHTML = '<option value="">Select Component</option>' + (data || [])
    .map(c => `<option value="${c.id}">${window.IMMS.escapeHtml(c.name)}</option>`)
    .join("");
}

async function loadFailures() {
  const { machineId } = window.IMMS.getContext();
  if (!machineId) {
    document.getElementById("pannes-table-body").innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted)">Open a machine first.</td></tr>';
    return;
  }
  const sb = await window.IMMS.getClient();
  const { data, error } = await sb
    .from("failures")
    .select("*, machine_components(name)")
    .eq("machine_id", machineId)
    .order("started_at", { ascending: false });
  if (error) return window.IMMS.notify(error.message, "error");
  failures = data || [];
  renderFailures();
}

function getDuration(start, end) {
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : Date.now();
  const hours = Math.max(0, (b - a) / 36e5);
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function renderFailures() {
  const raw = document.getElementById("sort-failures")?.value || "all";
  let rows = [...failures];
  if (raw === "resolved") rows = rows.filter(f => f.status === "resolved");
  else if (raw === "unresolved") rows = rows.filter(f => f.status === "unresolved");

  document.getElementById("pannes-table-body").innerHTML = rows.map(f => {
    const duration = f.status === "resolved"
      ? getDuration(f.started_at, f.resolved_at)
      : `<span class="live-duration" data-start="${f.started_at}">${getDuration(f.started_at, null)}</span>`;
    const badgeColor = f.status === "resolved" ? "#27ae60" : "#e74c3c";
    return `
      <tr>
        <td>${new Date(f.started_at).toLocaleString()}</td>
        <td>${window.IMMS.escapeHtml(f.machine_components?.name || "N/A")}</td>
        <td><span class="failure-type-badge type-${(f.type || "mechanical").toLowerCase()}">${window.IMMS.escapeHtml(f.type || "")}</span></td>
        <td>${window.IMMS.escapeHtml(f.description || f.title || "")}</td>
        <td class="duration-cell">${duration}</td>
        <td>${window.IMMS.escapeHtml(f.resolution_method || "")}</td>
        <td><button class="status-pill" style="--status:${badgeColor}" onclick="toggleResolved('${f.id}', '${f.status}')">${f.status}</button></td>
      </tr>`;
  }).join("") || '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted)">No failures found.</td></tr>';

  renderKpis();
  renderUnresolved();
  renderFailureTypes();
  renderCriticalComponents();

  // Start live timer for unresolved durations
  if (liveTimer) clearInterval(liveTimer);
  if (failures.some(f => f.status === "unresolved")) {
    liveTimer = setInterval(() => {
      document.querySelectorAll(".live-duration").forEach(el => {
        el.textContent = getDuration(el.dataset.start, null);
      });
    }, 10000);
  }
}

function renderKpis() {
  const resolved = failures.filter(f => f.status === "resolved");
  const unresolved = failures.filter(f => f.status === "unresolved");
  const mttr = resolved.length
    ? resolved.reduce((sum, f) => sum + (new Date(f.resolved_at) - new Date(f.started_at)) / 36e5, 0) / resolved.length
    : 0;
  const totalHours = failures.reduce((sum, f) => {
    const end = f.resolved_at ? new Date(f.resolved_at) : new Date();
    return sum + (end - new Date(f.started_at)) / 36e5;
  }, 0);
  const availability = failures.length && totalHours
    ? ((totalHours - unresolved.length * 8) / totalHours * 100).toFixed(1)
    : "100.0";

  document.getElementById("kpi-grid").innerHTML = `
    <div class="kpi-box"><span>MTTR</span><h1>${mttr.toFixed(1)}h</h1></div>
    <div class="kpi-box"><span>Total Failures</span><h1>${failures.length}</h1></div>
    <div class="kpi-box"><span>Unresolved</span><h1>${unresolved.length}</h1></div>
    <div class="kpi-box"><span>Availability</span><h1>${availability}%</h1></div>
    <div class="kpi-box"><span>Resolved</span><h1>${resolved.length}</h1></div>`;
}

function renderUnresolved() {
  const unresolved = failures.filter(f => f.status === "unresolved");
  document.getElementById("failures-list").innerHTML = unresolved.length
    ? unresolved.map(f => `
      <div class="failure-item">
        <div class="failure-item-header">
          <h4>${window.IMMS.escapeHtml(f.title || f.type || "Failure")}</h4>
          <span class="failure-type-badge type-${(f.type || "").toLowerCase()}">${window.IMMS.escapeHtml(f.type || "")}</span>
        </div>
        <p class="failure-item-desc">${window.IMMS.escapeHtml(f.description || "")}</p>
        <div class="failure-item-footer">
          <span class="failure-item-date">${new Date(f.started_at).toLocaleString()}</span>
          <span class="failure-item-duration">⏱ ${getDuration(f.started_at, null)}</span>
        </div>
      </div>`).join("")
    : '<p class="empty-state">No unresolved failures. ✅</p>';
}

function renderFailureTypes() {
  const counts = failures.reduce((acc, f) => {
    const type = f.type || "other";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const total = failures.length || 1;
  document.getElementById("failure-types-list").innerHTML = Object.entries(counts).length
    ? Object.entries(counts).map(([type, count]) => `
      <div class="failure-type-item">
        <div class="failure-type-header"><h4>${window.IMMS.escapeHtml(type)}</h4><span>${count}</span></div>
        <div class="failure-progress"><div class="failure-progress-bar" style="width:${(count / total) * 100}%"></div></div>
      </div>`).join("")
    : '<p class="empty-state">No failure types yet.</p>';
}

function renderCriticalComponents() {
  const groups = {};
  failures.forEach(f => {
    const name = f.machine_components?.name || "Unassigned";
    if (!groups[name]) groups[name] = { name, count: 0, unresolved: 0 };
    groups[name].count++;
    if (f.status === "unresolved") groups[name].unresolved++;
  });
  const sorted = Object.values(groups).sort((a, b) => b.unresolved - a.unresolved);
  document.getElementById("critical-components-list").innerHTML = sorted.length
    ? sorted.map((c, i) => `
      <div class="critical-component-item">
        <div class="component-left">
          <div class="component-rank">${i + 1}</div>
          <div class="component-info"><h4>${window.IMMS.escapeHtml(c.name)}</h4><span>${c.count} failures (${c.unresolved} unresolved)</span></div>
        </div>
      </div>`).join("")
    : '<p class="empty-state">No components tracked.</p>';
}

async function addFailure(e) {
  e.preventDefault();
  const { machineId } = window.IMMS.getContext();
  if (!machineId) return window.IMMS.notify("Open a machine first.", "error");
  const sb = await window.IMMS.getClient();
  const payload = {
    machine_id: machineId,
    component_id: document.getElementById("failureComponent").value || null,
    title: document.getElementById("failureType").value || "Mechanical",
    type: document.getElementById("failureType").value || "Mechanical",
    severity: "medium",
    status: "unresolved",
    started_at: document.getElementById("failureDate").value
      ? new Date(document.getElementById("failureDate").value).toISOString()
      : new Date().toISOString(),
    description: document.getElementById("failureDescription").value.trim(),
    resolution_method: document.getElementById("failureMethod").value.trim()
  };
  const { error } = await sb.from("failures").insert(payload);
  if (error) return window.IMMS.notify(error.message, "error");
  e.target.reset();
  await loadFailures();
  window.IMMS.notify("Failure recorded.", "success");
}

async function toggleResolved(id, status) {
  const next = status === "resolved" ? "unresolved" : "resolved";
  const sb = await window.IMMS.getClient();
  const { error } = await sb.from("failures").update({
    status: next,
    resolved_at: next === "resolved" ? new Date().toISOString() : null
  }).eq("id", id);
  if (error) return window.IMMS.notify(error.message, "error");
  await loadFailures();
}

function exportFailurePdf() {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) return window.IMMS.notify("PDF library not loaded.", "error");
  const doc = new jsPDF();
  doc.text("Failure History Report", 14, 16);
  const body = Array.from(document.querySelectorAll("#pannes-table-body tr")).map(tr => {
    return Array.from(tr.querySelectorAll("td")).slice(0, 7).map(td => td.textContent.trim());
  });
  doc.autoTable({
    startY: 24,
    head: [["Date", "Component", "Type", "Description", "Duration", "Method", "Status"]],
    body
  });
  doc.save("failure-history.pdf");
}
