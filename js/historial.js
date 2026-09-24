(function () {
  'use strict';

  const usuario = window.ClinicAppAuth.requireLogin();
  if (!usuario) return;

  const ESPECIALIDAD_LABEL = { podologia: 'Podología', cosmetologia: 'Cosmetología', ambas: 'Podología / Cosmetología' };
  const ESTADO_LABEL = { borrador: 'Borrador', finalizada: 'Finalizada' };

  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.ClinicAppAuth.logout();
    window.location.href = 'index.html';
  });

  document.getElementById('backToFichaBtn').setAttribute('href', window.ClinicAppAuth.pageForUser(usuario));

  document.getElementById('historialEyebrow').textContent =
    usuario.rol === 'admin' ? 'Administrador' : (ESPECIALIDAD_LABEL[usuario.especialidad] || 'Historial');

  const puedeElegirEspecialidad = usuario.rol === 'admin' || usuario.especialidad === 'ambas';
  const especialidadGroup = document.getElementById('filtroEspecialidadGroup');
  if (puedeElegirEspecialidad) especialidadGroup.hidden = false;

  const form = document.getElementById('historialFilterForm');
  const tbody = document.getElementById('historialTbody');
  const emptyMsg = document.getElementById('historialEmpty');
  const errorMsg = document.getElementById('historialError');
  const resultCount = document.getElementById('resultCount');
  const pagination = document.getElementById('historialPagination');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');

  const PAGE_SIZE = 20;
  let page = 1;
  let totalPages = 1;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function formatFecha(iso) {
    if (!iso) return '—';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    if (!y || !m || !d) return String(iso);
    return `${d}-${m}-${y}`;
  }

  function humanizeKey(key) {
    const withSpaces = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  }

  function buildQuery() {
    const params = new URLSearchParams();
    const rut = form.elements.rut.value.trim();
    const especialidad = puedeElegirEspecialidad ? form.elements.especialidad.value : '';

    if (rut) params.set('rut', rut);
    if (especialidad) params.set('especialidad', especialidad);
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    return params.toString();
  }

  function renderRows(items) {
    tbody.innerHTML = items.map((f) => `
      <tr>
        <td>${formatFecha(f.fecha_atencion)}</td>
        <td>${escapeHtml(f.paciente_nombre)}</td>
        <td>${escapeHtml(f.paciente_rut)}</td>
        <td>${ESPECIALIDAD_LABEL[f.especialidad] || f.especialidad}</td>
        <td>${ESTADO_LABEL[f.estado] || f.estado}</td>
        <td><button type="button" class="btn btn--ghost btn--sm" data-ver="${f.id}">Ver</button></td>
      </tr>
    `).join('');
  }

  const PROMPT_TEXT = 'Ingresa un RUT u otro filtro y presiona Buscar para ver fichas.';
  const EMPTY_TEXT = 'No se encontraron fichas con estos filtros.';

  function mostrarPrompt() {
    tbody.innerHTML = '';
    errorMsg.hidden = true;
    pagination.hidden = true;
    resultCount.textContent = '0 fichas';
    emptyMsg.textContent = PROMPT_TEXT;
    emptyMsg.hidden = false;
  }

  async function cargar() {
    errorMsg.hidden = true;
    try {
      const data = await window.ClinicAppApi.apiFetch('/api/fichas?' + buildQuery());
      totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
      renderRows(data.items);
      emptyMsg.textContent = EMPTY_TEXT;
      emptyMsg.hidden = data.items.length > 0;
      pagination.hidden = data.total === 0;
      resultCount.textContent = `${data.total} ficha${data.total === 1 ? '' : 's'}`;
      pageInfo.textContent = `Página ${data.page} de ${totalPages}`;
      prevBtn.disabled = data.page <= 1;
      nextBtn.disabled = data.page >= totalPages;
    } catch (err) {
      if (err && err.status === 401) {
        window.location.href = 'index.html?login=1';
        return;
      }
      tbody.innerHTML = '';
      emptyMsg.hidden = true;
      pagination.hidden = true;
      errorMsg.textContent = (err && err.message) || 'No se pudieron cargar las fichas.';
      errorMsg.hidden = false;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    page = 1;
    cargar();
  });

  document.getElementById('limpiarFiltrosBtn').addEventListener('click', () => {
    form.reset();
    page = 1;
    mostrarPrompt();
  });

  prevBtn.addEventListener('click', () => {
    if (page > 1) {
      page -= 1;
      cargar();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (page < totalPages) {
      page += 1;
      cargar();
    }
  });

  /* ===== Detalle de ficha ===== */
  const overlay = document.getElementById('detalleOverlay');
  const detalleContent = document.getElementById('detalleContent');

  function cerrarDetalle() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  document.getElementById('closeDetalleBtn').addEventListener('click', cerrarDetalle);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrarDetalle();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) cerrarDetalle();
  });

  function renderDetalle(ficha) {
    const entradas = Object.entries(ficha.datos || {}).filter(
      ([, value]) => value !== '' && value != null && !(Array.isArray(value) && value.length === 0)
    );
    const filas = entradas
      .map(([key, value]) => `<tr><th>${escapeHtml(humanizeKey(key))}</th><td>${escapeHtml(Array.isArray(value) ? value.join(', ') : value)}</td></tr>`)
      .join('');

    const firmas = ficha.firmas ? Object.entries(ficha.firmas) : [];
    const firmasHtml = firmas.length
      ? `<h4 class="detalle-subtitulo">Firmas</h4><div class="signature-grid">${firmas
          .map(
            ([nombre, dataUrl]) => `
              <div class="signature-card">
                <span class="signature-card__label">Firma ${escapeHtml(humanizeKey(nombre))}</span>
                <div class="signature-card__canvas-wrap">
                  <img src="${dataUrl}" alt="Firma ${escapeHtml(humanizeKey(nombre))}" class="detalle-firma-img">
                </div>
              </div>
            `
          )
          .join('')}</div>`
      : '';

    detalleContent.innerHTML = `
      <div class="detalle-meta">
        <p><strong>Paciente:</strong> ${escapeHtml(ficha.paciente_nombre)} (${escapeHtml(ficha.paciente_rut)})</p>
        <p><strong>Especialidad:</strong> ${ESPECIALIDAD_LABEL[ficha.especialidad] || ficha.especialidad}</p>
        <p><strong>Fecha de atención:</strong> ${formatFecha(ficha.fecha_atencion)}</p>
        <p><strong>Estado:</strong> ${ESTADO_LABEL[ficha.estado] || ficha.estado}</p>
      </div>
      <div class="table-wrap">
        <table class="plain-table detalle-table">
          <tbody>${filas || '<tr><td>Sin datos registrados en esta ficha.</td></tr>'}</tbody>
        </table>
      </div>
      ${firmasHtml}
    `;
  }

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-ver]');
    if (!btn) return;
    btn.disabled = true;
    try {
      const ficha = await window.ClinicAppApi.apiFetch('/api/fichas/' + btn.dataset.ver);
      renderDetalle(ficha);
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    } catch (err) {
      if (err && err.status === 401) {
        window.location.href = 'index.html?login=1';
        return;
      }
      errorMsg.textContent = (err && err.message) || 'No se pudo abrir la ficha.';
      errorMsg.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  mostrarPrompt();
})();
