(function () {
  'use strict';

  const usuario = window.ClinicAppAuth.requireLogin();
  if (!usuario) return;

  const ESPECIALIDAD_LABEL = { podologia: 'Podología', cosmetologia: 'Cosmetología', ambas: 'Podología / Cosmetología' };

  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.ClinicAppAuth.logout();
    window.location.href = 'index.html';
  });

  document.getElementById('panelEyebrow').textContent =
    usuario.rol === 'admin' ? 'Administrador' : (ESPECIALIDAD_LABEL[usuario.especialidad] || 'Panel');
  document.getElementById('panelSaludo').textContent = 'Hola, ' + usuario.nombre;

  const puedeElegir = usuario.rol === 'admin' || usuario.especialidad === 'ambas';
  const botones = [];
  if (puedeElegir || usuario.especialidad === 'podologia') {
    botones.push('<a href="ficha-podologia.html" class="btn btn--primary btn--lg">Ficha de Podología</a>');
  }
  if (puedeElegir || usuario.especialidad === 'cosmetologia') {
    botones.push('<a href="ficha-cosmetologia.html" class="btn btn--primary btn--lg">Ficha de Cosmetología</a>');
  }
  document.getElementById('crearFichaActions').innerHTML = botones.join('');
})();
