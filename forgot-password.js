function setLoading(on) {
  document.getElementById("btn-send-label").style.display = on ? "none" : "inline";
  document.getElementById("btn-send-spinner").style.display = on ? "inline-block" : "none";
  document.getElementById("btn-send").disabled = on;
}

function showError(msg) {
  document.getElementById("email-error").textContent = msg;
  document.getElementById("email").classList.toggle("error", Boolean(msg));
}

async function sendResetLink() {
  const email = document.getElementById("email").value.trim();
  showError("");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Please enter a valid email address.");
    return;
  }

  setLoading(true);
  try {
    const sb = await window.IMMS.getClient();
    const redirectTo = `${window.location.origin}${window.location.pathname.replace(/forgot-password\.html$/i, "change-password.html")}`;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;

    document.getElementById("confirm-email").textContent = email;
    document.getElementById("stepEmail").style.display = "none";
    document.getElementById("step-confirm").style.display = "block";
  } catch (error) {
    showError(error.message || "Unable to send reset link.");
  } finally {
    setLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("email")?.addEventListener("keydown", e => {
    if (e.key === "Enter") sendResetLink();
  });
});
