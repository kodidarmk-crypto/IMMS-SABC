// ============================================================
//  IMMS-SABC — forgot-password.js  (fix erreur vide)
// ============================================================

window.sendResetLink = async function () {
  const sb = window._supabase;
  if (!sb) { setTimeout(window.sendResetLink, 200); return; }

  const emailEl   = document.getElementById('email');
  const errorEl   = document.getElementById('email-error');
  const spinner   = document.getElementById('btn-send-spinner');
  const label     = document.getElementById('btn-send-label');
  const btn       = document.getElementById('btn-send');
  const stepEmail = document.getElementById('stepEmail');
  const stepOk    = document.getElementById('step-confirm');
  const confirmEl = document.getElementById('confirm-email');

  if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }

  const email = emailEl ? emailEl.value.trim() : '';
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    if (errorEl) { errorEl.textContent = 'Entrez un e-mail valide.'; errorEl.style.display = 'block'; }
    return;
  }

  if (btn)     btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (label)   label.textContent = 'Envoi…';

  const redirectTo = window.location.origin + '/change-password.html';

  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      // Affiche le message complet pour le debug
      const msg = error.message || error.msg || JSON.stringify(error) || 'Erreur inconnue';
      console.error('[IMMS forgot-password] Supabase error:', error);
      if (errorEl) { errorEl.textContent = 'Erreur : ' + msg; errorEl.style.display = 'block'; }
      if (btn)     btn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (label)   label.textContent = 'Send Link!';
      return;
    }

    // Succès — on affiche step 2 même si l'email n'existe pas
    // (Supabase ne révèle pas si l'email existe pour des raisons de sécurité)
    if (confirmEl) confirmEl.textContent = email;
    if (stepEmail) stepEmail.style.display = 'none';
    if (stepOk)    stepOk.style.display    = 'block';

  } catch (e) {
    console.error('[IMMS forgot-password] Exception:', e);
    if (errorEl) { errorEl.textContent = 'Erreur réseau : ' + e.message; errorEl.style.display = 'block'; }
    if (btn)     btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (label)   label.textContent = 'Send Link!';
  }
};
