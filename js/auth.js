(function () {
  'use strict';

  // Usuarios de prueba (sin backend real: sirve solo para la demo estática).
  const TEST_USERS = [
    {
      email: 'podologia@correoaiep.cl',
      password: '12345678',
      name: 'Usuario Podología',
      specialty: 'podologia',
      page: 'ficha-podologia.html',
    },
    {
      email: 'cosmetologia@correoaiep.cl',
      password: '12345678',
      name: 'Usuario Cosmetología',
      specialty: 'cosmetologia',
      page: 'ficha-cosmetologia.html',
    },
  ];

  const SESSION_KEY = 'clinicapp_session';

  function login(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = TEST_USERS.find(
      (u) => u.email === normalizedEmail && u.password === password
    );
    return user || null;
  }

  function saveSession(user, remember) {
    const data = JSON.stringify({
      email: user.email,
      name: user.name,
      specialty: user.specialty,
    });
    const storage = remember ? window.localStorage : window.sessionStorage;
    storage.setItem(SESSION_KEY, data);
  }

  function getSession() {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ||
      window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  }

  function requireSession(specialty) {
    const session = getSession();
    if (!session || session.specialty !== specialty) {
      window.location.href = 'index.html?login=1';
      return null;
    }
    return session;
  }

  window.ClinicAppAuth = {
    login,
    saveSession,
    getSession,
    logout,
    requireSession,
  };
})();
