(function () {
  'use strict';

  var api = window.ClinicAppApi;

  var PAGE_BY_SPECIALTY = {
    podologia: 'ficha-podologia.html',
    cosmetologia: 'ficha-cosmetologia.html',
  };

  /* ===== Utilidades de sesion ===== */

  function getSession() {
    return api.getUser();
  }

  function logout() {
    api.clearAuth();
  }

  // Decodifica el payload del JWT sin verificar la firma (solo para saber si expiro).
  function tokenExpirado() {
    var token = api.getToken();
    if (!token) return true;
    try {
      var payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch (err) {
      return true;
    }
  }

  function especialidadPermitida(usuario, especialidad) {
    if (!usuario) return false;
    if (usuario.rol === 'admin') return true;
    return usuario.especialidad === especialidad || usuario.especialidad === 'ambas';
  }

  /** Pagina de ficha a la que redirigir tras iniciar sesion. */
  function pageForUser(usuario) {
    if (!usuario) return 'index.html';
    if (usuario.especialidad === 'ambas' || usuario.rol === 'admin') {
      return PAGE_BY_SPECIALTY.podologia;
    }
    return PAGE_BY_SPECIALTY[usuario.especialidad] || 'index.html';
  }

  /**
   * Protege una pagina de ficha. Redirige al login si no hay sesion valida
   * o si la especialidad no corresponde.
   * @param {string} especialidad
   * @returns {object|null} usuario
   */
  function requireSession(especialidad) {
    var usuario = getSession();
    if (!usuario || tokenExpirado()) {
      logout();
      window.location.href = 'index.html?login=1';
      return null;
    }
    if (!especialidadPermitida(usuario, especialidad)) {
      window.location.href = 'index.html?login=1';
      return null;
    }
    return usuario;
  }

  /**
   * Protege una pagina que no depende de una especialidad puntual (ej. historial).
   * Redirige al login si no hay sesion valida.
   * @returns {object|null} usuario
   */
  function requireLogin() {
    var usuario = getSession();
    if (!usuario || tokenExpirado()) {
      logout();
      window.location.href = 'index.html?login=1';
      return null;
    }
    return usuario;
  }

  /* ===== Llamadas a la API de autenticacion ===== */

  async function login(email, password, remember) {
    var data = await api.apiFetch('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: email, password: password },
    });
    api.saveAuth(data.token, data.usuario, !!remember);
    return data.usuario;
  }

  async function register(payload, remember) {
    var data = await api.apiFetch('/api/auth/register', {
      method: 'POST',
      auth: false,
      body: payload,
    });
    api.saveAuth(data.token, data.usuario, !!remember);
    return data.usuario;
  }

  window.ClinicAppAuth = {
    login: login,
    register: register,
    getSession: getSession,
    logout: logout,
    requireSession: requireSession,
    requireLogin: requireLogin,
    pageForUser: pageForUser,
  };
})();
