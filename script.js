const form = document.getElementById("loginform");
const emailEl = document.getElementById("email");
const pwEl = document.getElementById("password");
const termsEl = document.getElementById("terms");
const togglePw = document.getElementById("togglePw");
const submitBtn = document.getElementById("submitBtn");
const btnLoader = document.getElementById("btnLoader");
const btnText = submitBtn.querySelector(".btn-text");

togglePw.addEventListener("click", () => {
  const isHidden = pwEl.type === "password";
  pwEl.type = isHidden ? "text" : "password";
});

function setError(inputEl, errorId, msg) {
  const errEl = document.getElementById(errorId);
  errEl.textContent = msg;
  inputEl.classList.toggle("error", Boolean(msg));
}

function validateEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let valid = true;
  if (!validateEmail(emailEl.value)) {
    setError(emailEl, "emailError", "Please enter a valid email address.");
    valid = false;
  } else {
    setError(emailEl, "emailError", "");
  }

  if (pwEl.value.length < 8) {
    setError(pwEl, "pwError", "The password must contain at least 8 characters.");
    valid = false;
  } else {
    setError(pwEl, "pwError", "");
  }

  document.getElementById("termsError").textContent = termsEl.checked
    ? ""
    : "You must accept the terms and conditions.";
  valid = valid && termsEl.checked;
  if (!valid) return;

  btnText.textContent = "Logging in...";
  btnLoader.classList.add("active");
  submitBtn.disabled = true;

  try {
    const sb = await window.IMMS.getClient();
    const { data, error } = await sb.auth.signInWithPassword({
      email: emailEl.value.trim(),
      password: pwEl.value
    });
    if (error) throw error;

    const user = data.user;
    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile?.role || user.user_metadata?.role || "").toLowerCase();
    window.location.href = role === "intern" || role === "operator"
      ? "dashboard-op.html"
      : "Usines.html";
  } catch (error) {
    window.IMMS.notify(error.message || "Login failed.", "error");
    btnText.textContent = "Login to account";
    btnLoader.classList.remove("active");
    submitBtn.disabled = false;
  }
});
