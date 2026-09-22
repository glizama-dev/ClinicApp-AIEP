(function () {
  'use strict';

  /* ===== Control de acceso ===== */
  if (!window.ClinicAppAuth.requireSession('cosmetologia')) return;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.ClinicAppAuth.logout();
      window.location.href = 'index.html';
    });
  }

  /* ===== Sidebar scroll-spy ===== */
  const sections = document.querySelectorAll('.ficha-section');
  const sidebarLinks = document.querySelectorAll('.ficha-sidebar__link');
  const linkByHash = new Map();
  sidebarLinks.forEach((link) => linkByHash.set(link.getAttribute('href'), link));

  if ('IntersectionObserver' in window && sections.length) {
    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = linkByHash.get('#' + entry.target.id);
          if (!link) return;
          if (entry.isIntersecting) {
            sidebarLinks.forEach((l) => l.classList.remove('is-active'));
            link.classList.add('is-active');
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    sections.forEach((section) => spyObserver.observe(section));
  }

  /* ===== Firmas en canvas ===== */
  document.querySelectorAll('.signature-pad').forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#16232b';

    let drawing = false;

    function pointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    canvas.addEventListener('pointerdown', (e) => {
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = pointerPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const { x, y } = pointerPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
      canvas.addEventListener(evt, () => { drawing = false; });
    });
  });

  document.querySelectorAll('.signature-clear').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.clearTarget;
      const canvas = document.querySelector('.signature-pad[data-signature="' + target + '"]');
      if (!canvas) return;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    });
  });

  /* ===== Imprimir ===== */
  ['printFichaBtn', 'printFichaBtnBottom'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => window.print());
  });

  /* ===== Envío al backend ===== */
  const form = document.getElementById('fichaCosmetologiaForm');
  const success = document.getElementById('fichaSuccess');
  const fichaError = document.getElementById('fichaError');
  const ficha = window.ClinicAppFicha;

  function mostrarError(mensaje) {
    fichaError.textContent = mensaje;
    fichaError.hidden = false;
    fichaError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    success.hidden = true;
    fichaError.hidden = true;

    const datos = ficha.formToObject(form);
    const firmas = ficha.leerFirmas(form);

    const rut = String(datos.datRut || datos.consentRut || '').trim().toUpperCase();
    const nombre = String(datos.datNombre || datos.consentNombre || '').trim();
    if (!rut || !nombre) {
      mostrarError('Completa al menos el RUT y el nombre del paciente en la sección Datos personales.');
      return;
    }
    if (!ficha.esRutValido(rut)) {
      mostrarError('El RUT del paciente no es válido. Usa el formato 12345678-9, sin puntos.');
      return;
    }

    const correo = String(datos.datCorreo || '').trim();
    const payload = {
      especialidad: 'cosmetologia',
      fechaAtencion:
        String(datos.datFecha || datos.consentFecha || '').trim() || ficha.hoyISO(),
      paciente: {
        rut: rut,
        nombre: nombre,
        telefono: String(datos.datTelefono || '').trim() || null,
        email: correo || null,
      },
      datos: datos,
      firmas: firmas,
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await window.ClinicAppApi.apiFetch('/api/fichas', {
        method: 'POST',
        body: payload,
      });
      success.textContent = `Ficha registrada correctamente (N° ${res.id}).`;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.reset();
      form.querySelectorAll('.signature-pad').forEach((c) => {
        c.getContext('2d').clearRect(0, 0, c.width, c.height);
      });
    } catch (err) {
      if (err && err.status === 401) {
        window.location.href = 'index.html?login=1';
        return;
      }
      mostrarError((err && err.message) || 'No se pudo guardar la ficha.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
