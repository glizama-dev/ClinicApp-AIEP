(function () {
  'use strict';

  /* ===== Control de acceso ===== */
  if (!window.ClinicAppAuth.requireSession('podologia')) return;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.ClinicAppAuth.logout();
      window.location.href = 'index.html';
    });
  }

  /* ===== Fecha de atencion: solo la fecha actual ===== */
  const HOY = new Date().toISOString().slice(0, 10);
  ['consentFecha', 'antFecha'].forEach((id) => {
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

  /* ===== Registro fotográfico ===== */
  const FOTO_MAX = 6;
  const fotoInput = document.getElementById('fotoInput');
  const fotoGrid = document.getElementById('fotoGrid');
  let fotos = [];

  const SAFE_IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
  const escapeAttr = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  function renderFotos() {
    fotoGrid.innerHTML = fotos.map((f, i) => `
      <div class="foto-card" data-index="${i}">
        <img src="${SAFE_IMAGE_DATA_URL.test(f.dataUrl) ? escapeAttr(f.dataUrl) : ''}" class="foto-card__img" alt="Foto de seguimiento ${i + 1}">
        <input type="text" class="foto-card__desc" placeholder="Descripción (opcional)" value="${escapeAttr(f.descripcion)}">
        <button type="button" class="foto-card__remove" aria-label="Eliminar foto">&times;</button>
      </div>
    `).join('');
  }

  if (fotoInput) {
    fotoInput.addEventListener('change', async () => {
      const archivos = Array.from(fotoInput.files || []);
      for (const archivo of archivos) {
        if (fotos.length >= FOTO_MAX) break;
        try {
          const dataUrl = await ficha.comprimirImagen(archivo, 1280, 0.7);
          fotos.push({ dataUrl, descripcion: '' });
        } catch (err) {
          // Se ignora un archivo que no se pudo procesar como imagen.
        }
      }
      renderFotos();
      fotoInput.value = '';
    });

    fotoGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.foto-card__remove');
      if (!btn) return;
      const idx = Number(btn.closest('.foto-card').dataset.index);
      fotos.splice(idx, 1);
      renderFotos();
    });

    fotoGrid.addEventListener('input', (e) => {
      const input = e.target.closest('.foto-card__desc');
      if (!input) return;
      const idx = Number(input.closest('.foto-card').dataset.index);
      if (fotos[idx]) fotos[idx].descripcion = input.value;
    });
  }

  /* ===== IMC automático ===== */
  const pesoInput = document.getElementById('vitalPeso');
  const tallaInput = document.getElementById('vitalTalla');
  const imcInput = document.getElementById('vitalIMC');

  function recalcImc() {
    const peso = parseFloat(pesoInput.value);
    const tallaCm = parseFloat(tallaInput.value);
    if (!peso || !tallaCm) return;
    const tallaM = tallaCm / 100;
    const imc = peso / (tallaM * tallaM);
    imcInput.value = imc.toFixed(1);
  }
  pesoInput.addEventListener('input', recalcImc);
  tallaInput.addEventListener('input', recalcImc);

  /* ===== Tabla Semmes-Weinstein (10 puntos) ===== */
  const swmeBody = document.getElementById('swmeTableBody');
  if (swmeBody) {
    let rows = '';
    for (let i = 1; i <= 10; i++) {
      rows += '<tr><th>Punto ' + i + '</th><td class="foot-options">' +
        '<label class="radio-pill"><input type="radio" name="swme' + i + '" value="presente"><span>Presente</span></label>' +
        '<label class="radio-pill"><input type="radio" name="swme' + i + '" value="ausente"><span>Ausente</span></label>' +
        '</td></tr>';
    }
    swmeBody.innerHTML = rows;
  }

  /* ===== Imprimir ===== */
  ['printFichaBtn', 'printFichaBtnBottom'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => window.print());
  });

  /* ===== Envío al backend ===== */
  const form = document.getElementById('fichaPodologiaForm');
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
    { name: 'antFecha', label: 'Fecha (Antecedentes personales)' },
    { name: 'antNombre', label: 'Nombre (Antecedentes personales)' },
    { name: 'antRut', label: 'Rut (Antecedentes personales)' },
    { name: 'antNacimiento', label: 'Fecha de nacimiento' },
    { name: 'antPrevision', label: 'Previsión' },
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
    if (faltantes.length) {
      mostrarError('Completa los siguientes campos obligatorios: ' + faltantes.join(', ') + '.');
      return;
    }

    if (String(datos.consentFecha).trim() !== HOY || String(datos.antFecha).trim() !== HOY) {
      mostrarError('La fecha de atención debe ser la fecha actual (' + HOY + ').');
      return;
    }

    const consentRut = String(datos.consentRut).trim().toUpperCase();
    const antRut = String(datos.antRut).trim().toUpperCase();
    if (!ficha.esRutValido(consentRut)) {
      mostrarError('El RUT del paciente en Consentimiento informado no es válido. Usa el formato 12345678-9, sin puntos.');
      return;
    }
    if (!ficha.esRutValido(antRut)) {
      mostrarError('El RUT del paciente en Antecedentes personales no es válido. Usa el formato 12345678-9, sin puntos.');
      return;
    }

    if (!firmas || !firmas.paciente || !firmas.estudiante) {
      mostrarError('Debes registrar la firma del paciente y del estudiante antes de guardar (la firma del docente es opcional).');
      return;
    }

    const payload = {
      especialidad: 'podologia',
      fechaAtencion: String(datos.antFecha).trim(),
      paciente: {
        rut: antRut,
        nombre: String(datos.antNombre).trim(),
        fechaNacimiento: String(datos.antNacimiento).trim(),
        telefono: String(datos.antTelefono || '').trim() || null,
      },
      datos: datos,
      firmas: firmas,
      fotos: fotos.length ? fotos : null,
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
      fotos = [];
      renderFotos();
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
