document.addEventListener("DOMContentLoaded", async () => {
  await loadFactories();
  document.getElementById("Factory")?.addEventListener("change", e => loadChaines(e.target.value));
  document.querySelector(".add-member-form").addEventListener("submit", addMember);
});

async function loadFactories() {
  const sb = await window.IMMS.getClient();
  const { usineId } = window.IMMS.getContext();
  const { data, error } = await sb.from("usines").select("id,name").order("name");
  if (error) return window.IMMS.notify(error.message, "error");
  const select = document.getElementById("Factory");
  select.innerHTML = '<option value="">Select a factory</option>' + (data || [])
    .map(u => `<option value="${u.id}" ${u.id === usineId ? "selected" : ""}>${window.IMMS.escapeHtml(u.name)}</option>`)
    .join("");
  if (usineId) await loadChaines(usineId);
}

async function loadChaines(usineId) {
  const select = document.getElementById("productionline");
  select.innerHTML = '<option value="">Select one or more production lines</option>';
  if (!usineId) return;
  const sb = await window.IMMS.getClient();
  const { chaineId } = window.IMMS.getContext();
  const { data, error } = await sb.from("chaines").select("id,name").eq("usine_id", usineId).order("name");
  if (error) return window.IMMS.notify(error.message, "error");
  select.innerHTML = (data || [])
    .map(c => `<option value="${c.id}" ${c.id === chaineId ? "selected" : ""}>${window.IMMS.escapeHtml(c.name)}</option>`)
    .join("");
}

function normalizeRole(role) {
  return {
    Administrator: "administrator",
    "Admin-worker": "mechanic",
    Intern: "intern",
    Operator: "operator"
  }[role] || "intern";
}

async function addMember(e) {
  e.preventDefault();
  const password = document.getElementById("Password").value;
  const confirm = document.getElementById("ConfirmPassword").value;
  const selectedChaines = Array.from(document.getElementById("productionline").selectedOptions).map(o => o.value).filter(Boolean);

  if (password !== confirm) return window.IMMS.notify("Passwords do not match.", "error");
  if (password.length < 8) return window.IMMS.notify("Password must contain at least 8 characters.", "error");
  if (!selectedChaines.length) return window.IMMS.notify("Select at least one production line.", "error");

  const sb = await window.IMMS.getClient();
  const firstName = document.getElementById("FirstName").value.trim();
  const lastName = document.getElementById("LastName").value.trim();
  const email = document.getElementById("Email").value.trim();
  const phone = document.getElementById("PhoneNumber").value.trim();
  const role = normalizeRole(document.getElementById("Role").value);

  try {
    const { data: authData, error: authError } = await sb.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, role } }
    });
    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) throw new Error("Member account could not be created.");

    const { error: profileError } = await sb.from("profiles").upsert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      role
    });
    if (profileError) throw profileError;

    const memberships = selectedChaines.map(chaine_id => ({ profile_id: userId, chaine_id, role }));
    const { error: linkError } = await sb.from("chaine_members").upsert(memberships, { onConflict: "profile_id,chaine_id" });
    if (linkError) throw linkError;

    window.IMMS.setContext("selectedChaine", selectedChaines[0]);
    window.location.href = "member.html";
  } catch (error) {
    window.IMMS.notify(error.message, "error");
  }
}
