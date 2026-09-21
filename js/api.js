(function () {
  'use strict';

  // El backend Express sirve este mismo frontend, asi que la API es relativa.
  var API_BASE = '';

  var TOKEN_KEY = 'clinicapp_token';
  var USER_KEY = 'clinicapp_user';

  /* ===== Almacenamiento del token / usuario ===== */

  function storageFor(remember) {
    return remember ? window.localStorage : window.sessionStorage;
  }

  function saveAuth(token, usuario, remember) {
    var store = storageFor(remember);
    var other = storageFor(!remember);
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(usuario));
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
  }

  function getToken() {
    return (
      window.localStorage.getItem(TOKEN_KEY) ||
      window.sessionStorage.getItem(TOKEN_KEY) ||
      null
    );
  }

  function getUser() {
    var raw =
      window.localStorage.getItem(USER_KEY) ||
      window.sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function clearAuth() {
    [window.localStorage, window.sessionStorage].forEach(function (s) {
      s.removeItem(TOKEN_KEY);
      s.removeItem(USER_KEY);
    });
  }

  /* ===== Error de API con codigo simbolico ===== */

  function ApiClientError(status, code, message, details) {
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code || 'ERROR';
    this.message = message || 'Error de comunicacion con el servidor.';
    this.details = details;
  }
  ApiClientError.prototype = Object.create(Error.prototype);

  /* ===== Wrapper de fetch ===== */

  async function apiFetch(path, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers);
    var body = options.body;

    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    if (options.auth !== false) {
      var token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }

    var res;
    try {
      res = await fetch(API_BASE + path, {
        method: options.method || 'GET',
        headers: headers,
        body: body,
      });
    } catch (networkErr) {
      throw new ApiClientError(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.');
    }

    var payload = null;
    var text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (err) {
        payload = null;
      }
    }

    if (!res.ok) {
      var e = (payload && payload.error) || {};
      if (res.status === 401) clearAuth();
      throw new ApiClientError(res.status, e.code, e.message, e.details);
    }

    return payload;
  }

  window.ClinicAppApi = {
    apiFetch: apiFetch,
    saveAuth: saveAuth,
    getToken: getToken,
    getUser: getUser,
    clearAuth: clearAuth,
    ApiClientError: ApiClientError,
  };
})();
