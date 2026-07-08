// ============================================================
//  IMMS-SABC — change-password.js
// ============================================================
document.addEventListener('supabase:ready', async () => {
  const sb   = window._supabase;
  const form = document.getElementById('changePasswordForm');
  const pw1  = document.getElementById('newPassword');
  const pw2  = document.getElementById('confirmPassword');
  const msg  = document.getElementById('changePwMsg');
  const btn  = document.getElementById('submitBtn');
  if (!form) return;

  // Supabase détecte le token dans l'URL automatiquement
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    showMsg('Lien invalide ou expiré. <a href="forgot-password.html">Redemander un lien</a>.', 'error');
    if (btn) btn.disabled = true; return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = pw1.value;
    const confirm  = pw2.value;
    if (!password || password.length < 8) { showMsg('Minimum 8 caractères.', 'error'); return; }
    if (password !== confirm)              { showMsg('Les mots de passe ne correspondent pas.', 'error'); return; }

    btn.disabled = true; btn.textContent = 'Mise à jour…';
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      showMsg('Erreur : ' + error.message, 'error');
      btn.disabled = false; btn.textContent = 'Confirmer';
    } else {
      showMsg('Mot de passe mis à jour ! Redirection…', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 2500);
    }
  });

  function showMsg(html, type) {
    if (!msg) return;
    msg.innerHTML = html;
    msg.style.cssText = `display:block;margin-top:12px;padding:10px 14px;border-radius:8px;
      background:${type==='error'?'rgba(231,76,60,.15)':'rgba(39,174,96,.15)'};
      color:${type==='error'?'#e74c3c':'#27ae60'};font-size:.9rem;`;
  }
});
