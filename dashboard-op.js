document.addEventListener("DOMContentLoaded", async () => {
  await loadWeeklySchedule();
});

async function loadWeeklySchedule() {
  const sb = await window.IMMS.getClient();
  const { data: { user } } = await sb.auth.getSession();
  if (!user) {
    document.querySelector(".dash-calender").innerHTML = '<div class="empty-state">Please log in to view your schedule.</div>';
    return;
  }

  // Get user's profile and chaine memberships
  const { data: profile } = await sb.from("profiles").select("id, role").eq("id", user.id).single();
  if (!profile) return;

  // Get chaine memberships for this user
  const { data: memberships } = await sb.from("chaine_members").select("chaine_id").eq("profile_id", user.id);
  const chaineIds = memberships?.map(m => m.chaine_id) || [];

  if (chaineIds.length === 0) {
    document.querySelector(".dash-calender").innerHTML = '<div class="empty-state">You are not assigned to any production line.</div>';
    return;
  }

  // Get interventions for the current week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const { data: interventions } = await sb
    .from("interventions")
    .select("id, title, type, scheduled_at, status, description, machine_id, chaine_id")
    .in("chaine_id", chaineIds)
    .gte("scheduled_at", startOfWeek.toISOString())
    .lte("scheduled_at", endOfWeek.toISOString())
    .order("scheduled_at");

  // Also get unresolved failures for these chaines
  const { data: machines } = await sb.from("machines").select("id, name").in("chaine_id", chaineIds);
  const machineIds = machines?.map(m => m.id) || [];
  
  let failures = [];
  if (machineIds.length > 0) {
    const { data: failureData } = await sb
      .from("failures")
      .select("id, title, type, started_at, status, machine_id")
      .in("machine_id", machineIds)
      .eq("status", "unresolved");
    failures = failureData || [];
  }

  renderCalendar(interventions || [], failures || [], startOfWeek, machines || []);
}

function renderCalendar(interventions, failures, startOfWeek, machines) {
  const container = document.querySelector(".dash-calender");
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  const weekStart = new Date(startOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const dateStr = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  let html = `
    <div class="dash-week-header">
      <h2>📅 Weekly Schedule</h2>
      <p>${dateStr}</p>
    </div>
    <div class="dash-week-grid">
  `;

  days.forEach((day, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateStr2 = date.toISOString().split("T")[0];

    const dayInterventions = interventions.filter(i => {
      if (!i.scheduled_at) return false;
      const iDate = new Date(i.scheduled_at).toISOString().split("T")[0];
      return iDate === dateStr2;
    });

    const dayFailures = failures.filter(f => {
      if (!f.started_at) return false;
      const fDate = new Date(f.started_at).toISOString().split("T")[0];
      return fDate === dateStr2;
    });

    html += `
      <div class="dash-day">
        <h3>${day}<br><small>${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small></h3>
    `;

    if (dayInterventions.length === 0 && dayFailures.length === 0) {
      html += `<div style="font-size:0.7rem;color:var(--muted);padding:8px 0;">No tasks</div>`;
    } else {
      dayInterventions.forEach(interv => {
        const machine = machines.find(m => m.id === interv.machine_id);
        html += `
          <label class="dash-task">
            <input type="checkbox" ${interv.status === "done" ? "checked" : ""} onchange="toggleIntervention('${interv.id}', this.checked)">
            <span>
              <strong>${window.IMMS.escapeHtml(interv.title)}</strong>
              <small>${machine ? window.IMMS.escapeHtml(machine.name) : ""} • ${interv.type}</small>
            </span>
          </label>
        `;
      });
      dayFailures.forEach(f => {
        html += `
          <div class="dash-task" style="color:var(--red);">
            <span>⚠️ <strong>${window.IMMS.escapeHtml(f.title)}</strong><small>Unresolved failure</small></span>
          </div>
        `;
      });
    }

    html += `</div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

async function toggleIntervention(id, completed) {
  const sb = await window.IMMS.getClient();
  const updates = {
    status: completed ? "done" : "scheduled",
    completed_at: completed ? new Date().toISOString() : null
  };
  const { error } = await sb.from("interventions").update(updates).eq("id", id);
  if (error) return window.IMMS.notify(error.message, "error");
  window.IMMS.notify(completed ? "Task completed!" : "Task reopened", "success");
}