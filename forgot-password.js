// ============================================================
//  IMMS-SABC — forgot-password.js
//  Envoie un lien de réinitialisation par email via Supabase
// ============================================================

document.addEventListener('supabase:ready', () => {
  const sb   = window._supabase;
  const form = document.getElementById('forgotForm');
  const emailEl = document.getElementById('email');
  const msgEl   = document.getElementById('forgotMsg');   // div feedback
  const btnEl   = document.getElementById('submitBtn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailEl.value.trim();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      showMsg('Entrez un e-mail valide.', 'error'); return;
    }

    btnEl.disabled = true;
    btnEl.textContent = 'Envoi en cours…';

    // L'URL de redirect doit correspondre à l'URL de ton site Vercel
    // Configure aussi dans Supabase Dashboard > Auth > URL Configuration > Redirect URLs
    const redirectTo = `${window.location.origin}/change-password.html`;

    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });

    btnEl.disabled = false;
    btnEl.textContent = 'Envoyer le lien';

    if (error) {
      showMsg('Erreur : ' + error.message, 'error');
    } else {
      showMsg(
        `Un lien de réinitialisation a été envoyé à <strong>${email}</strong>. Vérifiez votre boîte mail.`,
        'success'
      );
      form.reset();
    }
  });

  function showMsg(html, type) {
    if (!msgEl) return;
    msgEl.innerHTML = html;
    msgEl.className = 'forgot-msg ' + type;
    msgEl.style.display = 'block';
  }
});
