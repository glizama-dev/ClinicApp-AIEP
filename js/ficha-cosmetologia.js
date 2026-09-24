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

  /* ===== Fecha de atencion: solo la fecha actual ===== */
  const HOY = new Date().toISOString().slice(0, 10);
  ['consentFecha', 'datFecha'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.min = HOY;
      el.max = HOY;
      el.value = HOY;
    }
  });

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

  const CAMPOS_OBLIGATORIOS = [
    { name: 'consentFecha', label: 'Fecha (Consentimiento informado)' },
    { name: 'consentLugar', label: 'Lugar de la actividad' },
    { name: 'consentEstudiante', label: 'Estudiante que realiza la atención' },
    { name: 'consentNombre', label: 'Nombre del paciente (Consentimiento)' },
    { name: 'consentRut', label: 'Rut del paciente (Consentimiento)' },
    { name: 'datNombre', label: 'Nombre completo (Datos personales)' },
    { name: 'datRut', label: 'Rut (Datos personales)' },
    { name: 'datFecha', label: 'Fecha (Datos personales)' },
  ];

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    success.hidden = true;
    fichaError.hidden = true;

    const datos = ficha.formToObject(form);
    const firmas = ficha.leerFirmas(form);

    const faltantes = CAMPOS_OBLIGATORIOS
      .filter((campo) => !String(datos[campo.name] || '').trim())
      .map((campo) => campo.label);
    if (!datos.consentDecision) {
      faltantes.push('Decisión de participación (Consentimiento)');
    }
    const telefono = String(datos.datTelefono || '').trim();
    const correo = String(datos.datCorreo || '').trim();
    if (!telefono && !correo) {
      faltantes.push('Teléfono o Correo electrónico (Datos personales)');
    }
    if (faltantes.length) {
      mostrarError('Completa los siguientes campos obligatorios: ' + faltantes.join(', ') + '.');
      return;
    }

    if (String(datos.consentFecha).trim() !== HOY || String(datos.datFecha).trim() !== HOY) {
      mostrarError('La fecha de atención debe ser la fecha actual (' + HOY + ').');
      return;
    }

    const consentRut = String(datos.consentRut).trim().toUpperCase();
    const datRut = String(datos.datRut).trim().toUpperCase();
    if (!ficha.esRutValido(consentRut)) {
      mostrarError('El RUT del paciente en Consentimiento informado no es válido. Usa el formato 12345678-9, sin puntos.');
      return;
    }
    if (!ficha.esRutValido(datRut)) {
      mostrarError('El RUT del paciente en Datos personales no es válido. Usa el formato 12345678-9, sin puntos.');
      return;
    }

    if (!firmas || !firmas.paciente || !firmas.estudiante) {
      mostrarError('Debes registrar la firma del paciente y del estudiante antes de guardar (la firma del docente es opcional).');
      return;
    }

    const payload = {
      especialidad: 'cosmetologia',
      fechaAtencion: String(datos.datFecha).trim(),
      paciente: {
        rut: datRut,
        nombre: String(datos.datNombre).trim(),
        telefono: telefono || null,
        email: correo || null,
      },
      datos: datos,
      firmas: firmas,
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await window.ClinicAppApi.apiFetch('/api/fichas', {
        method: 'POST',
        body: payload,
      });
      success.textContent = 'Ficha guardada con éxito';
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
