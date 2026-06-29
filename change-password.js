// ============================================================
//  IMMS-SABC — change-password.js
//  Permet à l'utilisateur de définir un nouveau mot de passe
//  après avoir cliqué sur le lien reçu par email
// ============================================================

document.addEventListener('supabase:ready', async () => {
  const sb    = window._supabase;
  const form  = document.getElementById('changePasswordForm');
  const pw1   = document.getElementById('newPassword');
  const pw2   = document.getElementById('confirmPassword');
  const msgEl = document.getElementById('changePwMsg');
  const btnEl = document.getElementById('submitBtn');

  if (!form) return;

  // Supabase met automatiquement la session à jour depuis l'URL (#access_token=...)
  // On vérifie qu'une session de type "recovery" est bien active
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    showMsg(
      'Lien invalide ou expiré. <a href="forgot-password.html">Redemander un lien</a>.',
      'error'
    );
    if (btnEl) btnEl.disabled = true;
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = pw1.value;
    const confirm  = pw2.value;

    if (!password || password.length < 8) {
      showMsg('Le mot de passe doit contenir au moins 8 caractères.', 'error'); return;
    }
    if (password !== confirm) {
      showMsg('Les deux mots de passe ne correspondent pas.', 'error'); return;
    }

    btnEl.disabled = true;
    btnEl.textContent = 'Mise à jour…';

    const { error } = await sb.auth.updateUser({ password });

    if (error) {
      showMsg('Erreur : ' + error.message, 'error');
      btnEl.disabled = false;
      btnEl.textContent = 'Confirmer';
    } else {
      showMsg('Mot de passe mis à jour avec succès ! Redirection…', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 2500);
    }
  });

  function showMsg(html, type) {
    if (!msgEl) return;
    msgEl.innerHTML = html;
    msgEl.className = 'changepw-msg ' + type;
    msgEl.style.display = 'block';
  }
});
