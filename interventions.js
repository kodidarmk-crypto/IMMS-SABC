let interventions = [];
let failures = [];
let currentDate = new Date();
let selectedDate = null;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("prev-month")?.addEventListener("click", () => changeMonth(-1));
  document.getElementById("next-month")?.addEventListener("click", () => changeMonth(1));
  ["schedule-filter-type", "schedule-sort", "overdue-filter-type", "overdue-sort"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", renderAll);
  });
  document.getElementById("toggle-view-btn")?.addEventListener("click", () => {
    selectedDate = null;
    renderAll();
  });
  document.getElementById("export-schedule-pdf")?.addEventListener("click", () => exportPdf("Scheduled Operations", getScheduledRows()));
  document.getElementById("export-overdue-pdf")?.addEventListener("click", () => exportPdf("Overdue Operations", getOverdueRows()));
  await loadData();
});

async function loadData() {
  const { machineId } = window.IMMS.getContext();
  const scheduleEl = document.getElementById("operations-list");
  if (!machineId) {
    scheduleEl.innerHTML = '<p class="empty-state">Open a machine first.</p>';
    return;
  }

  const sb = await window.IMMS.getClient();
  const [interventionsRes, failuresRes] = await Promise.all([
    sb.from("interventions").select("*, machines(name)").eq("machine_id", machineId).order("scheduled_at"),
    sb.from("failures").select("*").eq("machine_id", machineId).eq("status", "unresolved").order("started_at")
  ]);

  if (interventionsRes.error) {
    scheduleEl.innerHTML = `<p class="empty-state">${window.IMMS.escapeHtml(interventionsRes.error.message)}</p>`;
    return;
  }
  interventions = interventionsRes.data || [];
  failures = failuresRes.data || [];
  renderAll();
}

function renderAll() {
  renderCalendar();
  renderScheduled();
  renderOverdue();
  renderAlerts();
  renderKpi();
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
}

function renderCalendar() {
  const title = document.getElementById("calendar-title");
  const days = document.getElementById("calendar-days");
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  title.textContent = currentDate.toLocaleString("en", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  let cells = "";
  for (let i = 0; i < firstDay; i++) cells += '<button class="calendar-day empty" type="button"></button>';
  for (let day = 1; day <= totalDays; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const count = interventions.filter(i => i.scheduled_at?.slice(0, 10) === iso).length;
    cells += `<button class="calendar-day ${count ? "has-items" : ""} ${selectedDate === iso ? "selected" : ""}" type="button" onclick="selectDate('${iso}')"><span>${day}</span>${count ? `<small>${count}</small>` : ""}</button>`;
  }
  days.innerHTML = cells;
}

function selectDate(iso) {
  selectedDate = iso;
  renderAll();
}

function normalizeType(value) {
  return String(value || "").toLowerCase();
}

function applyTypeAndSort(rows, typeFilterId, sortId) {
  const type = document.getElementById(typeFilterId)?.value || "all";
  const sort = document.getElementById(sortId)?.value || "date-asc";
  let result = type === "all" ? [...rows] : rows.filter(row => normalizeType(row.type || row.title) === type);

  if (sort === "date-asc") result.sort((a, b) => new Date(a.scheduled_at || a.started_at) - new Date(b.scheduled_at || b.started_at));
  if (sort === "date-desc") result.sort((a, b) => new Date(b.scheduled_at || b.started_at) - new Date(a.scheduled_at || a.started_at));
  if (sort === "type-asc") result.sort((a, b) => normalizeType(a.type || a.title).localeCompare(normalizeType(b.type || b.title)));
  if (sort === "type-desc") result.sort((a, b) => normalizeType(b.type || b.title).localeCompare(normalizeType(a.type || a.title)));
  return result;
}

function getScheduledRows() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let rows = interventions.filter(i => i.status !== "done" && (!i.scheduled_at || new Date(i.scheduled_at) >= today));
  if (selectedDate) rows = rows.filter(i => i.scheduled_at?.slice(0, 10) === selectedDate);
  return applyTypeAndSort(rows, "schedule-filter-type", "schedule-sort");
}

function getOverdueRows() {
  const now = new Date();
  const lateInterventions = interventions.filter(i => i.status !== "done" && i.scheduled_at && new Date(i.scheduled_at) < now);
  const failureRows = failures.map(f => ({
    id: `failure-${f.id}`,
    title: f.title || "Unresolved failure",
    type: f.type || "corrective",
    status: "unresolved",
    scheduled_at: f.started_at,
    description: f.description || "Failure still unresolved"
  }));
  return applyTypeAndSort([...lateInterventions, ...failureRows], "overdue-filter-type", "overdue-sort");
}

function renderScheduled() {
  const container = document.getElementById("operations-list");
  const rows = getScheduledRows();
  if (!rows.length) {
    container.innerHTML = '<p class="empty-state">No scheduled operations for this selection.</p>';
    return;
  }
  container.innerHTML = rows.map(i => `
    <div class="operation-card">
      <div class="operation-card-left">
        <input type="checkbox" class="operation-checkbox" ${i.status === "done" ? "checked" : ""} onchange="markDone('${i.id}', this.checked)">
        <div class="operation-info">
          <h4>${window.IMMS.escapeHtml(i.title)}</h4>
          <p class="operation-description">${window.IMMS.escapeHtml(i.description || i.machines?.name || "")}</p>
        </div>
      </div>
      <div class="operation-card-center">
        <span class="operation-type ${(i.type || "preventive").toLowerCase()}">${window.IMMS.escapeHtml(i.type || "preventive")}</span>
        <span class="operation-date">${i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString() : ""}</span>
      </div>
      <div class="operation-card-right">
        <span class="operation-status ${i.status === "done" ? "status-completed" : "status-pending"}">${i.status}</span>
      </div>
    </div>`).join("");
}

function renderOverdue() {
  const container = document.getElementById("overdue-list");
  const rows = getOverdueRows();
  if (!rows.length) {
    container.innerHTML = '<p class="empty-state">No overdue operations. ✅</p>';
    return;
  }
  container.innerHTML = rows.map(i => `
    <div class="operation-card ${i.id?.startsWith("failure") ? "is-overdue-failure" : ""}">
      <div class="operation-card-left">
        <div class="operation-info">
          <h4>${window.IMMS.escapeHtml(i.title)}</h4>
          <p class="operation-description">${window.IMMS.escapeHtml(i.description || "")}</p>
        </div>
      </div>
      <div class="operation-card-center">
        <span class="operation-type ${(i.type || "corrective").toLowerCase()}">${window.IMMS.escapeHtml(i.type || "")}</span>
        <span class="operation-date">${i.scheduled_at ? new Date(i.scheduled_at).toLocaleString() : ""}</span>
      </div>
      <div class="operation-card-right">
        <span class="operation-status status-pending">${i.status}</span>
      </div>
    </div>`).join("");
}

function renderAlerts() {
  const el = document.querySelector(".alert-intervention");
  el.innerHTML = failures.length
    ? `<div class="alert-card"><div class="alert-header"><span class="alert-icon">⚠️</span><h3>Unresolved Alerts</h3><span class="alert-count">${failures.length}</span></div><div class="alert-list">${failures.map(f => `
      <div class="alert-item">
        <div class="alert-item-info">
          <h5>${window.IMMS.escapeHtml(f.title || "Failure")}</h5>
          <p>${window.IMMS.escapeHtml(f.description || "")}</p>
          <span class="alert-item-date">${new Date(f.started_at).toLocaleString()}</span>
        </div>
        <button class="alert-action-btn" onclick="location.href='pannes.html'">View</button>
      </div>`).join("")}</div></div>`
    : "";
}

function renderKpi() {
  const done = interventions.filter(i => i.status === "done").length;
  const scheduled = getScheduledRows().length;
  const overdue = getOverdueRows().length;
  const total = interventions.length || 1;
  const el = document.getElementById("intervention-kpi");
  if (!el) return;
  el.innerHTML = `
    <div class="kpi-box"><span>Total</span><h1>${interventions.length}</h1></div>
    <div class="kpi-box"><span>Done</span><h1>${done}</h1></div>
    <div class="kpi-box"><span>Scheduled</span><h1>${scheduled}</h1></div>
    <div class="kpi-box"><span>Overdue</span><h1>${overdue}</h1></div>
    <div class="kpi-box"><span>Completion</span><h1>${Math.round((done / total) * 100)}%</h1></div>`;
}

async function markDone(id, checked) {
  const sb = await window.IMMS.getClient();
  const status = checked ? "done" : "scheduled";
  const updates = { status };
  if (checked) updates.completed_at = new Date().toISOString();
  else updates.completed_at = null;
  const { error } = await sb.from("interventions").update(updates).eq("id", id);
  if (error) return window.IMMS.notify(error.message, "error");
  await loadData();
}

function exportPdf(title, rows) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) return window.IMMS.notify("PDF library is not loaded.", "error");
  const doc = new jsPDF();
  doc.text(title, 14, 16);
  doc.autoTable({
    startY: 24,
    head: [["Title", "Type", "Status", "Date"]],
    body: rows.map(r => [r.title || "", r.type || "", r.status || "", r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : ""])
  });
  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
