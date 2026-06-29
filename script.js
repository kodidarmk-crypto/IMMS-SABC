// ============================================================
//  IMMS-SABC — script.js (login.html)
//  Rôles réels BDD : intern, operator, mechanic, administrator
// ============================================================

document.addEventListener('supabase:ready', () => {
  const sb = window._supabase;

  // Redirige si session déjà active
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
      const msg = error.message || '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
        showErr('emailError', 'E-mail ou mot de passe incorrect.');
      } else if (msg.toLowerCase().includes('not confirmed')) {
        showErr('emailError', 'E-mail non confirmé. Vérifiez votre boîte mail.');
      } else if (msg.toLowerCase().includes('network') || msg === '') {
        showErr('emailError', 'Erreur réseau. Vérifiez votre connexion.');
      } else {
        showErr('emailError', msg);
      }
      return;
    }

    await redirectByRole(data.user.id);
  });

  async function redirectByRole(userId) {
    const { data: profile, error } = await sb
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      setLoad(false);
      showErr('emailError', 'Profil introuvable. Contactez un administrateur.');
      await sb.auth.signOut();
      return;
    }

    const r = profile.role;
    // Rôles exacts de la BDD
    if (r === 'intern' || r === 'operator') {
      window.location.href = 'dashboard-op.html';
    } else if (r === 'mechanic' || r === 'administrator') {
      window.location.href = 'Usines.html';
    } else {
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