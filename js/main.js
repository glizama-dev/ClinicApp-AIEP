(function () {
  'use strict';

  // Dominio de correo institucional habilitado para el registro.
  const INSTITUTIONAL_EMAIL_DOMAIN = '@correoaiep.cl';

  /* ===== Header shadow on scroll ===== */
  const header = document.getElementById('header');

  function updateHeaderState() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });

  /* ===== Scroll reveal ===== */
  const revealTargets = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealTargets.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  }

  /* ===== Mobile nav ===== */
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');

  hamburger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ===== Login modal ===== */
  const overlay = document.getElementById('loginOverlay');
  const openBtns = [
    document.getElementById('openLoginBtn'),
    document.getElementById('openLoginBtnMobile'),
  ].filter(Boolean);
  const openRegisterBtns = [
    document.getElementById('openRegisterBtn'),
    document.getElementById('openRegisterBtnMobile'),
    document.getElementById('openRegisterBtnHero'),
    document.getElementById('openRegisterBtnFooter'),
  ].filter(Boolean);
  const closeBtn = document.getElementById('closeLoginBtn');

  /* ===== Header segun estado de sesion ===== */
  const sesionActiva = window.ClinicAppAuth.sesionValida();
  if (sesionActiva) {
    openBtns.forEach((btn) => {
      btn.textContent = 'Mi panel';
      btn.classList.remove('btn--ghost');
      btn.classList.add('btn--primary');
    });
    openRegisterBtns.forEach((btn) => {
      if (btn.id === 'openRegisterBtnHero') {
        btn.textContent = 'Mi panel';
      } else {
        btn.textContent = 'Cerrar sesión';
        btn.classList.remove('btn--primary');
        btn.classList.add('btn--ghost');
      }
    });
  }

  const modalTabs = document.querySelector('.modal__tabs');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const forgotForm = document.getElementById('forgotForm');

  function openModal(tab) {
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    switchTab(tab || 'login');
  }

  function closeModal() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function switchTab(tab) {
    const isLogin = tab === 'login';
    const isRegister = tab === 'register';
    modalTabs.hidden = false;
    tabLogin.classList.toggle('modal__tab--active', isLogin);
    tabRegister.classList.toggle('modal__tab--active', isRegister);
    loginForm.hidden = !isLogin;
    registerForm.hidden = !isRegister;
    forgotForm.hidden = true;
  }

  function showForgotForm() {
    modalTabs.hidden = true;
    loginForm.hidden = true;
    registerForm.hidden = true;
    forgotForm.hidden = false;
    forgotError.hidden = true;
    forgotSuccess.hidden = true;
  }

  openBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (sesionActiva) { window.location.href = 'panel.html'; return; }
      openModal('login');
    });
  });
  openRegisterBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (sesionActiva) {
        if (btn.id === 'openRegisterBtnHero') {
          window.location.href = 'panel.html';
        } else {
          window.ClinicAppAuth.logout();
          window.location.reload();
        }
        return;
      }
      openModal('register');
    });
  });
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeModal();
  });

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabRegister.addEventListener('click', () => switchTab('register'));

  /* ===== Password visibility toggle ===== */
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

  function setFormLoading(form, loading) {
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = loading;
      if (loading && !btn.dataset.label) btn.dataset.label = btn.textContent;
      if (btn.dataset.label) btn.textContent = loading ? 'Procesando…' : btn.dataset.label;
    }
  }

  function showError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }

  /* ===== Login form ===== */
  const loginError = document.getElementById('loginError');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = loginForm.elements.remember.checked;

    if (!email || !password) {
      showError(loginError, 'Completa tu correo y contraseña.');
      return;
    }

    setFormLoading(loginForm, true);
    try {
      const user = await window.ClinicAppAuth.login(email, password, remember);
      loginForm.reset();
      closeModal();
      window.location.href = window.ClinicAppAuth.pageForUser(user);
    } catch (err) {
      showError(loginError, (err && err.message) || 'No se pudo iniciar sesión.');
    } finally {
      setFormLoading(loginForm, false);
    }
  });

  // Si llegamos redirigidos desde una ficha protegida, abrir el login.
  if (new URLSearchParams(window.location.search).get('login') === '1') {
    openModal('login');
  }

  /* ===== Forgot password form ===== */
  const forgotError = document.getElementById('forgotError');
  const forgotSuccess = document.getElementById('forgotSuccess');
  const openForgotBtn = document.getElementById('openForgotBtn');
  const backToLoginFromForgot = document.getElementById('backToLoginFromForgot');

  openForgotBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showForgotForm();
  });

  backToLoginFromForgot.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('login');
  });

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    forgotError.hidden = true;
    forgotSuccess.hidden = true;

    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) {
      showError(forgotError, 'Ingresa tu correo electrónico.');
      return;
    }

    setFormLoading(forgotForm, true);
    try {
      await window.ClinicAppApi.apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: { email },
      });
      forgotForm.reset();
      forgotSuccess.hidden = false;
    } catch (err) {
      showError(forgotError, (err && err.message) || 'No se pudo procesar la solicitud.');
    } finally {
      setFormLoading(forgotForm, false);
    }
  });

  /* ===== Register form ===== */
  const registerError = document.getElementById('registerError');
  const registerRole = document.getElementById('registerRole');
  const registerEmailLabel = document.getElementById('registerEmailLabel');
  const registerEmailInput = document.getElementById('registerEmail');
  const registerEmailHint = document.getElementById('registerEmailHint');

  // Ajusta los textos del correo segun el perfil: estudiantes usan el
  // correo institucional, profesionales cualquier correo.
  function updateRegisterEmailHint() {
    if (registerRole.value === 'profesional') {
      registerEmailLabel.textContent = 'Correo electrónico';
      registerEmailInput.placeholder = 'tucorreo@ejemplo.cl';
      registerEmailHint.textContent = 'Puedes registrarte con cualquier correo';
    } else {
      registerEmailLabel.textContent = 'Correo institucional';
      registerEmailInput.placeholder = `tucorreo${INSTITUTIONAL_EMAIL_DOMAIN}`;
      registerEmailHint.textContent = `Los estudiantes deben registrarse con su correo ${INSTITUTIONAL_EMAIL_DOMAIN}`;
    }
  }

  registerRole.addEventListener('change', updateRegisterEmailHint);
  registerForm.addEventListener('reset', () => setTimeout(updateRegisterEmailHint, 0));

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.hidden = true;

    const payload = {
      nombre: document.getElementById('registerName').value.trim(),
      rol: document.getElementById('registerRole').value,
      especialidad: document.getElementById('registerSpecialty').value,
      email: document.getElementById('registerEmail').value.trim().toLowerCase(),
      password: document.getElementById('registerPassword').value,
    };

    if (payload.password.length < 8 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(payload.password) || !/\d/.test(payload.password)) {
      showError(registerError, 'La contraseña debe tener al menos 8 caracteres e incluir letras y números.');
      return;
    }

    if (payload.rol === 'estudiante' && !payload.email.endsWith(INSTITUTIONAL_EMAIL_DOMAIN)) {
      showError(registerError, `Los estudiantes deben registrarse con su correo institucional ${INSTITUTIONAL_EMAIL_DOMAIN}`);
      return;
    }

    setFormLoading(registerForm, true);
    try {
      const user = await window.ClinicAppAuth.register(payload);
      registerForm.reset();
      closeModal();
      window.location.href = window.ClinicAppAuth.pageForUser(user);
    } catch (err) {
      showError(registerError, (err && err.message) || 'No se pudo crear la cuenta.');
    } finally {
      setFormLoading(registerForm, false);
    }
  });

  /* ===== Contact form ===== */
  const contactForm = document.getElementById('contactForm');
  const contactSuccess = document.getElementById('contactSuccess');
  const contactError = document.getElementById('contactError');
  let contactSuccessTimer = null;

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    contactError.hidden = true;
    contactSuccess.hidden = true;

    const payload = {
      nombre: document.getElementById('contactName').value.trim(),
      email: document.getElementById('contactEmail').value.trim(),
      mensaje: document.getElementById('contactMessage').value.trim(),
    };

    setFormLoading(contactForm, true);
    try {
      await window.ClinicAppApi.apiFetch('/api/contacto', {
        method: 'POST',
        auth: false,
        body: payload,
      });
      contactForm.reset();
      contactSuccess.hidden = false;
      clearTimeout(contactSuccessTimer);
      contactSuccessTimer = setTimeout(() => { contactSuccess.hidden = true; }, 6000);
    } catch (err) {
      const detalle = err && Array.isArray(err.details) && err.details[0] && err.details[0].mensaje;
      showError(contactError, detalle || (err && err.message) || 'No se pudo enviar el mensaje.');
    } finally {
      setFormLoading(contactForm, false);
    }
  });
})();
