// ============================================================
//  IMMS-SABC — script.js  (Login Page)
//  Gère : authentification + redirection selon rôle
// ============================================================

document.addEventListener('supabase:ready', () => {
  const sb = window._supabase;

  const form      = document.getElementById('loginform');
  const emailEl   = document.getElementById('email');
  const pwEl      = document.getElementById('password');
  const termsEl   = document.getElementById('terms');
  const submitBtn = document.getElementById('submitBtn');
  const btnLoader = document.getElementById('btnLoader');
  const togglePw  = document.getElementById('togglePw');

  // ── Vérif session déjà active ──────────────────────────────
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session) redirectByRole(session.user.id);
  });

  // ── Toggle mot de passe visible ───────────────────────────
  if (togglePw) {
    togglePw.addEventListener('click', () => {
      const isText = pwEl.type === 'text';
      pwEl.type = isText ? 'password' : 'text';
      togglePw.querySelector('svg').style.opacity = isText ? '1' : '0.5';
    });
  }

  // ── Soumission du formulaire ───────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email    = emailEl.value.trim();
    const password = pwEl.value;
    const terms    = termsEl.checked;

    // Validation frontend
    let valid = true;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      showError('emailError', 'Entrez un e-mail valide.'); valid = false;
    }
    if (!password || password.length < 6) {
      showError('pwError', 'Mot de passe trop court (min 6 caractères).'); valid = false;
    }
    if (!terms) {
      showError('termsError', 'Vous devez accepter les conditions.'); valid = false;
    }
    if (!valid) return;

    // UI loading
    setLoading(true);

    // Connexion Supabase Auth
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      const msg = error.message.includes('Invalid login')
        ? 'E-mail ou mot de passe incorrect.'
        : error.message;
      showError('emailError', msg);
      return;
    }

    // Redirection selon rôle
    await redirectByRole(data.user.id);
  });

  // ── Redirection selon rôle ─────────────────────────────────
  async function redirectByRole(userId) {
    const { data: profile, error } = await sb
      .from('profiles')
      .select('role, nom, prenom')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      // Profil introuvable → on reste sur login
      setLoading(false);
      showError('emailError', 'Profil introuvable. Contactez un administrateur.');
      await sb.auth.signOut();
      return;
    }

    const role = profile.role;

    if (role === 'intern' || role === 'operateur') {
      window.location.href = 'dashboard-op.html';
    } else if (role === 'mecanicien' || role === 'administrateur') {
      window.location.href = 'Usines.html';
    } else {
      // Rôle inconnu → logout par sécurité
      await sb.auth.signOut();
      showError('emailError', 'Rôle non reconnu. Contactez un administrateur.');
      setLoading(false);
    }
  }

  // ── Helpers UI ─────────────────────────────────────────────
  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function clearErrors() {
    ['emailError', 'pwError', 'termsError'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
  }
  function setLoading(on) {
    submitBtn.disabled = on;
    if (btnLoader) btnLoader.style.display = on ? 'inline-block' : 'none';
    const txt = submitBtn.querySelector('.btn-text');
    if (txt) txt.textContent = on ? 'Connexion…' : 'Login to account';
  }
});
