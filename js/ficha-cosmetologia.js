(function () {
  'use strict';

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

  /* ===== Envío (simulado, sin backend aún) ===== */
  const form = document.getElementById('fichaCosmetologiaForm');
  const success = document.getElementById('fichaSuccess');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    success.hidden = false;
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { success.hidden = true; }, 5000);
  });
})();
