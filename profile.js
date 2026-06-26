let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  bindToggles();
  bindAvatar();
  document.getElementById("saveInfoBtn").addEventListener("click", saveProfile);
  document.getElementById("savePwBtn").addEventListener("click", savePassword);
  document.querySelector(".profile-item.danger")?.addEventListener("click", logout);
  await loadProfile();
});

function bindToggles() {
  document.getElementById("toggleEditInfo").addEventListener("click", () => toggle("subEditInfo"));
  document.getElementById("toggleChangePw").addEventListener("click", () => toggle("subChangePw"));
}

function toggle(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "flex" ? "none" : "flex";
}

function bindAvatar() {
  document.getElementById("profileAvatarBtn").addEventListener("click", () => document.getElementById("avatarUploadInput").click());
  document.getElementById("avatarUploadInput").addEventListener("change", uploadAvatar);
}

async function loadProfile() {
  const sb = await window.IMMS.getClient();
  const { data: sessionData } = await sb.auth.getSession();
  currentUser = sessionData.session?.user;
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  let { data: profile } = await sb.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
  if (!profile) {
    profile = {
      id: currentUser.id,
      email: currentUser.email,
      full_name: currentUser.user_metadata?.full_name || currentUser.email,
      role: currentUser.user_metadata?.role || "intern"
    };
    await sb.from("profiles").upsert(profile);
  }

  renderProfile(profile);
}

function renderProfile(profile) {
  const name = profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email || "User";
  document.getElementById("profileUserName").textContent = name;
  document.getElementById("profileUserRole").textContent = `${profile.role || "intern"} - SABC GMAO`;
  document.getElementById("fieldNom").value = name;
  document.getElementById("fieldEmail").value = profile.email || "";
  document.getElementById("fieldTel").value = profile.phone || "";
  document.getElementById("profileInitials").textContent = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (profile.avatar_url) {
    document.getElementById("profileAvatarImg").src = window.IMMS.publicUrl(profile.avatar_url, "avatars");
    document.getElementById("profileAvatarImg").style.display = "block";
    document.getElementById("profileInitials").style.display = "none";
  }
}

async function saveProfile() {
  const sb = await window.IMMS.getClient();
  const fullName = document.getElementById("fieldNom").value.trim();
  const email = document.getElementById("fieldEmail").value.trim();
  const phone = document.getElementById("fieldTel").value.trim();
  const { error } = await sb.from("profiles").update({ full_name: fullName, email, phone, updated_at: new Date().toISOString() }).eq("id", currentUser.id);
  if (error) return window.IMMS.notify(error.message, "error");
  window.IMMS.notify("Profile updated.", "success");
  loadProfile();
}

async function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file || !currentUser) return;
  const sb = await window.IMMS.getClient();
  const path = `${currentUser.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
  const { error: uploadError } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
  if (uploadError) return window.IMMS.notify(uploadError.message, "error");
  const { error } = await sb.from("profiles").update({ avatar_url: path }).eq("id", currentUser.id);
  if (error) return window.IMMS.notify(error.message, "error");
  loadProfile();
}

async function savePassword() {
  const newPw = document.getElementById("fieldPwNew").value;
  const confirmPw = document.getElementById("fieldPwConfirm").value;
  if (newPw !== confirmPw) return window.IMMS.notify("Passwords do not match.", "error");
  if (newPw.length < 8) return window.IMMS.notify("Password must contain at least 8 characters.", "error");
  const sb = await window.IMMS.getClient();
  const { error } = await sb.auth.updateUser({ password: newPw });
  if (error) return window.IMMS.notify(error.message, "error");
  window.IMMS.notify("Password updated.", "success");
}

async function logout(e) {
  e.preventDefault();
  const sb = await window.IMMS.getClient();
  await sb.auth.signOut();
  window.location.href = "login.html";
}
