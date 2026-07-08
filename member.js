document.addEventListener("DOMContentLoaded", async () => {
  await loadMembers();
});

async function loadMembers() {
  const sb = await window.IMMS.getClient();
  const { chaineId } = window.IMMS.getContext();
  
  if (!chaineId) {
    document.querySelector(".member-page").innerHTML = '<div class="empty-state">No production line selected.</div>';
    return;
  }

  // Get members of this chaine
  const { data: memberships, error } = await sb
    .from("chaine_members")
    .select("id, profile_id, role, profiles:profile_id(id, full_name, email, phone, role, avatar_url)")
    .eq("chaine_id", chaineId);

  if (error) return window.IMMS.notify(error.message, "error");
  
  const container = document.querySelector(".member-page");
  
  if (!memberships || memberships.length === 0) {
    container.innerHTML = '<div class="empty-state">No members assigned to this production line.</div>';
    return;
  }

  container.innerHTML = memberships.map(m => {
    const profile = m.profiles;
    if (!profile) return '';
    const roleMap = { intern: "Intern", operator: "Operator", mechanic: "Mechanic", administrator: "Administrator" };
    const displayRole = roleMap[profile.role] || profile.role;
    return `
      <div class="member-list-card" data-id="${m.id}">
        <div>
          <h3>${window.IMMS.escapeHtml(profile.full_name || profile.email)}</h3>
          <p>📧 ${window.IMMS.escapeHtml(profile.email || "N/A")}</p>
          <p>📞 ${window.IMMS.escapeHtml(profile.phone || "N/A")}</p>
        </div>
        <div>
          <span class="role-pill" style="--status: #2980b9">${displayRole}</span>
        </div>
        <div>
          <button class="delete-member-btn" onclick="deleteMember('${m.id}', '${window.IMMS.escapeHtml(profile.full_name || profile.email)}')">Remove</button>
        </div>
      </div>
    `;
  }).join("");
}

async function deleteMember(membershipId, name) {
  if (!confirm(`Are you sure you want to remove "${name}" from this production line?`)) return;
  
  const sb = await window.IMMS.getClient();
  const { error } = await sb.from("chaine_members").delete().eq("id", membershipId);
  if (error) return window.IMMS.notify(error.message, "error");
  
  window.IMMS.notify("Member removed successfully.", "success");
  await loadMembers();
}