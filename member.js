document.addEventListener("DOMContentLoaded", loadMembers);

async function loadMembers() {
  const { chaineId } = window.IMMS.getContext();
  const container = document.querySelector(".member-page");
  if (!chaineId) {
    container.innerHTML = '<p class="empty-state">Open a production line first.</p>';
    return;
  }

  try {
    const sb = await window.IMMS.getClient();
    const { data, error } = await sb
      .from("chaine_members")
      .select("id, role, profiles(id, full_name, email, phone, role)")
      .eq("chaine_id", chaineId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    displayMembers(data || []);
  } catch (error) {
    container.innerHTML = `<p class="empty-state">${window.IMMS.escapeHtml(error.message)}</p>`;
  }
}

function displayMembers(rows) {
  const container = document.querySelector(".member-page");
  if (!rows.length) {
    container.innerHTML = '<p class="empty-state">No members assigned to this production line.</p>';
    return;
  }

  container.innerHTML = rows.map(row => {
    const member = row.profiles || {};
    const role = row.role || member.role || "intern";
    return `
      <div class="member-list-card">
        <div>
          <h3>${window.IMMS.escapeHtml(member.full_name || "Unnamed member")}</h3>
          <p>${window.IMMS.escapeHtml(member.email || "No email")}</p>
          <p>${window.IMMS.escapeHtml(member.phone || "No phone")}</p>
        </div>
        <span class="role-pill">${window.IMMS.escapeHtml(role)}</span>
        <button class="delete-member-btn" onclick="deleteMember('${row.id}')">Delete</button>
      </div>`;
  }).join("");
}

async function deleteMember(linkId) {
  if (!confirm("Remove this member from the production line?")) return;
  const sb = await window.IMMS.getClient();
  const { error } = await sb.from("chaine_members").delete().eq("id", linkId);
  if (error) return window.IMMS.notify(error.message, "error");
  loadMembers();
}
