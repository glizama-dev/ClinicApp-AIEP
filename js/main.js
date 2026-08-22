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

  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

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
    tabLogin.classList.toggle('modal__tab--active', isLogin);
    tabRegister.classList.toggle('modal__tab--active', !isLogin);
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
  }

  openBtns.forEach((btn) => btn.addEventListener('click', () => openModal('login')));
  openRegisterBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
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

  /* ===== Login form ===== */
  const loginError = document.getElementById('loginError');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.hidden = true;

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = loginForm.elements.remember.checked;

    if (!email || !password) {
      loginError.textContent = 'Completa tu correo y contraseña.';
      loginError.hidden = false;
      return;
    }

    const user = window.ClinicAppAuth.login(email, password);

    if (!user) {
      loginError.textContent = 'Correo o contraseña incorrectos.';
      loginError.hidden = false;
      return;
    }

    window.ClinicAppAuth.saveSession(user, remember);
    loginForm.reset();
    window.location.href = user.page;
  });

  // Si llegamos redirigidos desde una ficha protegida, abrir el login.
  if (new URLSearchParams(window.location.search).get('login') === '1') {
    openModal('login');
  }

  /* ===== Register form (UI only, no backend yet) ===== */
  const registerError = document.getElementById('registerError');

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    registerError.hidden = true;

    const email = document.getElementById('registerEmail').value.trim();

    if (!email.toLowerCase().endsWith(INSTITUTIONAL_EMAIL_DOMAIN)) {
      registerError.hidden = false;
      return;
    }

    // Placeholder: no hay backend conectado todavía.
    console.log('Register submitted:', {
      name: document.getElementById('registerName').value,
      role: document.getElementById('registerRole').value,
      specialty: document.getElementById('registerSpecialty').value,
      email,
    });

    alert('Cuenta creada (simulado). Aún no hay backend conectado.');
    closeModal();
    registerForm.reset();
  });

  /* ===== Contact form (UI only) ===== */
  const contactForm = document.getElementById('contactForm');
  const contactSuccess = document.getElementById('contactSuccess');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    contactSuccess.hidden = false;
    contactForm.reset();
    setTimeout(() => { contactSuccess.hidden = true; }, 5000);
  });
})();
