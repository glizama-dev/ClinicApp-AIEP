(function () {
  'use strict';

  const form = document.getElementById('resetForm');
  const passwordInput = document.getElementById('resetPassword');
  const confirmInput = document.getElementById('resetPasswordConfirm');
  const success = document.getElementById('resetSuccess');
  const errorMsg = document.getElementById('resetError');

  const eyeIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeOffIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A11 11 0 0 1 12 5c7 0 11 7 11 7a13.2 13.2 0 0 1-3.2 3.9M6.5 6.6C3.8 8.4 2 12 2 12s4 7 11 7a10 10 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  document.querySelectorAll('.password-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const input = document.getElementById(toggle.dataset.target);
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggle.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
    });
  });

  function mostrarError(mensaje) {
    errorMsg.textContent = mensaje;
    errorMsg.hidden = false;
  }

  // El token llega en el fragmento (#token=...), que el navegador no envia al
  // servidor. Se acepta tambien ?token= por compatibilidad con enlaces antiguos.
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = hashParams.get('token') || new URLSearchParams(window.location.search).get('token');
  if (token) {
    // Saca el token de la barra de direcciones y del historial.
    window.history.replaceState(null, '', window.location.pathname);
  }
  if (!token) {
    mostrarError('Este enlace no es válido. Solicita uno nuevo desde la página de inicio.');
    form.querySelectorAll('input, button').forEach((el) => { el.disabled = true; });
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.hidden = true;
    success.hidden = true;

    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (password.length < 8 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(password) || !/\d/.test(password)) {
      mostrarError('La contraseña debe tener al menos 8 caracteres e incluir letras y números.');
      return;
    }
    if (password !== confirm) {
      mostrarError('Las contraseñas no coinciden.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      await window.ClinicAppApi.apiFetch('/api/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: { token: token, password: password },
      });
      form.reset();
      form.querySelectorAll('input').forEach((el) => { el.disabled = true; });
      submitBtn.hidden = true;
      success.hidden = false;
    } catch (err) {
      mostrarError((err && err.message) || 'No se pudo actualizar la contraseña.');
      submitBtn.disabled = false;
    }
  });
})();
