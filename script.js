// ============================================================
//  IMMS-SABC — script.js (login.html) — fix erreur vide
// ============================================================

document.addEventListener('supabase:ready', () => {
  const sb = window._supabase;

  sb.auth.getSession().then(({ data: { session } }) => {
    if (session) redirectByRole(session.user.id);
  });

  const form     = document.getElementById('loginform');
  const emailEl  = document.getElementById('email');
  const pwEl     = document.getElementById('password');
  const termsEl  = document.getElementById('terms');
  const btnEl    = document.getElementById('submitBtn');
  const loader   = document.getElementById('btnLoader');
  const togglePw = document.getElementById('togglePw');

  if (togglePw) {
    togglePw.addEventListener('click', () => {
      pwEl.type = pwEl.type === 'password' ? 'text' : 'password';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email    = emailEl.value.trim();
    const password = pwEl.value;

    let ok = true;
    if (!email || !/\S+@\S+\.\S+/.test(email)) { showErr('emailError', 'E-mail invalide.'); ok = false; }
    if (!password || password.length < 6)        { showErr('pwError', 'Mot de passe trop court (min 6).'); ok = false; }
    if (!termsEl.checked)                         { showErr('termsError', 'Acceptez les conditions.'); ok = false; }
    if (!ok) return;

    setLoad(true);

    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      setLoad(false);
      // Affiche le vrai message d'erreur
      const msg = error.message || error.msg || JSON.stringify(error) || 'Erreur inconnue';
      console.error('[IMMS login] Supabase error:', error);
      // Messages user-friendly
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        showErr('emailError', 'E-mail ou mot de passe incorrect.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        showErr('emailError', 'E-mail non confirmé. Vérifiez votre boîte mail.');
      } else {
        showErr('emailError', msg);
      }
      return;
    }

    await redirectByRole(data.user.id);
  });

  async function redirectByRole(userId) {
    const { data: profile, error } = await sb
      .from('profiles').select('role').eq('id', userId).single();

    if (error || !profile) {
      setLoad(false);
      console.error('[IMMS login] Profile fetch error:', error);
      showErr('emailError', 'Profil introuvable. Contactez un administrateur.');
      await sb.auth.signOut();
      return;
    }

    const r = profile.role;
    if (r === 'intern' || r === 'operateur')
      window.location.href = 'dashboard-op.html';
    else if (r === 'mecanicien' || r === 'administrateur')
      window.location.href = 'Usines.html';
    else {
      await sb.auth.signOut();
      showErr('emailError', `Rôle "${r}" non reconnu. Contactez un administrateur.`);
      setLoad(false);
    }
  }

  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function clearErrors() {
    ['emailError','pwError','termsError'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
  }
  function setLoad(on) {
    btnEl.disabled = on;
    if (loader) loader.style.display = on ? 'inline-block' : 'none';
    const t = btnEl.querySelector('.btn-text');
    if (t) t.textContent = on ? 'Connexion…' : 'Login to account';
  }
});
