// ============================================================
//  IMMS-SABC — forgot-password.js
//  Adapté aux IDs exacts de forgot-password.html :
//  - bouton : onclick="sendResetLink()"  → fonction globale
//  - input  : #email
//  - erreur : #email-error
//  - spinner: #btn-send-spinner
//  - label  : #btn-send-label
//  - step 2 : #step-confirm  +  #confirm-email
//  NB : Le SDK Supabase est déjà chargé en dur dans le HTML
//       supabase-config.js crée window._supabase via UMD global
// ============================================================

// sendResetLink() est appelée par onclick dans le HTML
// On l'expose donc sur window directement, sans attendre l'event
// On utilise une retry courte si _supabase n'est pas encore prêt

window.sendResetLink = async function () {
  const sb = window._supabase;

  // Sécurité : si Supabase pas encore chargé, on attend
  if (!sb) {
    setTimeout(window.sendResetLink, 200);
    return;
  }

  const emailEl   = document.getElementById('email');
  const errorEl   = document.getElementById('email-error');
  const spinner   = document.getElementById('btn-send-spinner');
  const label     = document.getElementById('btn-send-label');
  const btn       = document.getElementById('btn-send');
  const stepEmail = document.getElementById('stepEmail');
  const stepOk    = document.getElementById('step-confirm');
  const confirmEl = document.getElementById('confirm-email');

  // Reset erreur
  if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }

  const email = emailEl ? emailEl.value.trim() : '';

  // Validation
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    if (errorEl) {
      errorEl.textContent = 'Entrez un e-mail valide.';
      errorEl.style.display = 'block';
    }
    return;
  }

  // Loading
  if (btn)     btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (label)   label.textContent = 'Envoi…';

  // URL de redirection vers change-password.html
  const redirectTo = window.location.origin + '/change-password.html';

  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });

  // Reset loading
  if (btn)     btn.disabled = false;
  if (spinner) spinner.style.display = 'none';
  if (label)   label.textContent = 'Send Link!';

  if (error) {
    if (errorEl) {
      errorEl.textContent = 'Erreur : ' + error.message;
      errorEl.style.display = 'block';
    }
    return;
  }

  // Succès → affiche step 2
  if (confirmEl) confirmEl.textContent = email;
  if (stepEmail) stepEmail.style.display = 'none';
  if (stepOk)    stepOk.style.display    = 'block';
};
