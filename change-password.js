function showState(id) {
  ["state-loading", "state-invalid", "state-form", "state-success"].forEach(stateId => {
    document.getElementById(stateId).style.display = stateId === id ? "block" : "none";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  showState("state-loading");
  const sb = await window.IMMS.getClient();

  sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") showState("state-form");
  });

  const { data } = await sb.auth.getSession();
  if (data.session) showState("state-form");

  setTimeout(() => {
    if (document.getElementById("state-loading").style.display !== "none") showState("state-invalid");
  }, 2000);

  document.getElementById("new-password")?.addEventListener("input", onPwInput);
  document.getElementById("confirm-password")?.addEventListener("keydown", e => {
    if (e.key === "Enter") changePassword();
  });
});

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btn.style.opacity = isHidden ? "1" : "0.55";
}

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function onPwInput() {
  const pw = document.getElementById("new-password").value;
  const score = getStrength(pw);
  const fill = document.getElementById("strength-fill");
  const label = document.getElementById("strength-label");
  const levels = [
    { pct: "10%", color: "#E74C3C", text: "Very low" },
    { pct: "25%", color: "#E74C3C", text: "Low" },
    { pct: "50%", color: "#F39C12", text: "Medium" },
    { pct: "75%", color: "#2980B9", text: "High" },
    { pct: "90%", color: "#27AE60", text: "Very high" },
    { pct: "100%", color: "#1E8449", text: "Excellent" }
  ];
  const level = levels[Math.min(score, 5)];
  fill.style.width = pw.length ? level.pct : "0%";
  fill.style.background = level.color;
  label.textContent = pw.length ? level.text : "";
  label.style.color = level.color;
}

async function changePassword() {
  const pw = document.getElementById("new-password").value;
  const confirm = document.getElementById("confirm-password").value;
  document.getElementById("pw-error").textContent = "";
  document.getElementById("confirm-error").textContent = "";

  if (pw.length < 8) {
    document.getElementById("pw-error").textContent = "Minimum 8 characters.";
    return;
  }
  if (pw !== confirm) {
    document.getElementById("confirm-error").textContent = "Passwords do not match.";
    return;
  }

  document.getElementById("btn-change-label").style.display = "none";
  document.getElementById("btn-change-spinner").style.display = "inline-block";
  document.getElementById("btn-change").disabled = true;

  const sb = await window.IMMS.getClient();
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) {
    document.getElementById("pw-error").textContent = error.message;
    document.getElementById("btn-change-label").style.display = "inline";
    document.getElementById("btn-change-spinner").style.display = "none";
    document.getElementById("btn-change").disabled = false;
    return;
  }

  showState("state-success");
  let n = 3;
  const tick = setInterval(async () => {
    n -= 1;
    document.getElementById("countdown").textContent = n;
    if (n <= 0) {
      clearInterval(tick);
      await sb.auth.signOut();
      window.location.href = "login.html";
    }
  }, 1000);
}
