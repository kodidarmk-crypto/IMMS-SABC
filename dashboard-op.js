document.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
  const calendar = document.querySelector(".dash-calender");
  const sb = await window.IMMS.getClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: memberships, error } = await sb
    .from("chaine_members")
    .select("chaine_id, chaines(name)")
    .eq("profile_id", user.id);
  if (error) {
    calendar.innerHTML = `<p class="empty-state">${window.IMMS.escapeHtml(error.message)}</p>`;
    return;
  }

  const chaineIds = (memberships || []).map(row => row.chaine_id);
  if (!chaineIds.length) {
    calendar.innerHTML = '<p class="empty-state">No production line assigned to this account.</p>';
    return;
  }

  const monday = startOfWeek(new Date());
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 7);
  const { data: interventions, error: intError } = await sb
    .from("interventions")
    .select("*, machines(name)")
    .in("chaine_id", chaineIds)
    .gte("scheduled_at", monday.toISOString())
    .lt("scheduled_at", sunday.toISOString())
    .order("scheduled_at");

  if (intError) {
    calendar.innerHTML = `<p class="empty-state">${window.IMMS.escapeHtml(intError.message)}</p>`;
    return;
  }

  renderWeek(calendar, monday, interventions || []);
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function renderWeek(container, monday, rows) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

  container.innerHTML = `
    <div class="dash-week-header">
      <h2>Weekly operations</h2>
      <p>${days[0].toLocaleDateString()} - ${days[6].toLocaleDateString()}</p>
    </div>
    <div class="dash-week-grid">
      ${days.map(day => {
        const iso = day.toISOString().slice(0, 10);
        const tasks = rows.filter(row => row.scheduled_at?.slice(0, 10) === iso);
        return `
          <section class="dash-day">
            <h3>${day.toLocaleDateString("en", { weekday: "short", day: "2-digit" })}</h3>
            ${tasks.length ? tasks.map(task => `
              <label class="dash-task">
                <input type="checkbox" ${task.status === "done" ? "checked" : ""} onchange="toggleTask('${task.id}', this.checked)">
                <span>
                  <strong>${window.IMMS.escapeHtml(task.title)}</strong>
                  <small>${window.IMMS.escapeHtml(task.machines?.name || task.type || "")}</small>
                </span>
              </label>`).join("") : '<p class="empty-state">No task</p>'}
          </section>`;
      }).join("")}
    </div>`;
}

async function toggleTask(id, done) {
  const sb = await window.IMMS.getClient();
  const { error } = await sb
    .from("interventions")
    .update({ status: done ? "done" : "scheduled", completed_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) window.IMMS.notify(error.message, "error");
}
