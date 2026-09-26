(function () {
  'use strict';

  /**
   * Convierte un <form> en un objeto plano. Los campos con el mismo name
   * (checkboxes / radios repetidos) se agrupan en un arreglo.
   * @param {HTMLFormElement} form
   * @returns {Object}
   */
  function formToObject(form) {
    const data = {};
    const fd = new FormData(form);
    for (const [key, value] of fd.entries()) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    }
    return data;
  }

  /** True si el canvas no tiene ningún trazo (todos los píxeles transparentes). */
  function canvasVacio(canvas) {
    try {
      const ctx = canvas.getContext('2d');
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return false;
      }
      return true;
    } catch (err) {
      return true;
    }
  }

  /**
   * Lee las firmas dibujadas en los canvas .signature-pad del formulario.
   * @param {HTMLElement} scope
   * @returns {Object|null} { paciente, docente, estudiante } con dataURL PNG, o null
   */
  function leerFirmas(scope) {
    const firmas = {};
    scope.querySelectorAll('.signature-pad[data-signature]').forEach((canvas) => {
      if (canvasVacio(canvas)) return;
      firmas[canvas.dataset.signature] = canvas.toDataURL('image/png');
    });
    return Object.keys(firmas).length ? firmas : null;
  }

  /**
   * Redimensiona y comprime una imagen en el navegador antes de guardarla.
   * @param {File} file
   * @param {number} maxDim  lado mas largo en px
   * @param {number} calidad 0-1 (calidad JPEG)
   * @returns {Promise<string>} dataURL JPEG comprimido
   */
  function comprimirImagen(file, maxDim, calidad) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            } else {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', calidad));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /** Devuelve la fecha de hoy en formato YYYY-MM-DD (hora local). */
  function hoyISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  const RUT_REGEX = /^\d{1,8}-[0-9K]$/;

  function calcularDigitoVerificador(cuerpo) {
    let suma = 0;
    let multiplicador = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += Number(cuerpo[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const resto = 11 - (suma % 11);
    if (resto === 11) return '0';
    if (resto === 10) return 'K';
    return String(resto);
  }

  /**
   * Valida formato estricto "12345678-9" (sin puntos, guion obligatorio) y
   * que el digito verificador sea correcto.
   * @param {string} rut
   * @returns {boolean}
   */
  function esRutValido(rut) {
    const limpio = String(rut || '').trim().toUpperCase();
    const match = RUT_REGEX.exec(limpio);
    if (!match) return false;
    const cuerpo = limpio.slice(0, -2);
    const dv = limpio.slice(-1);
    return dv === calcularDigitoVerificador(cuerpo);
  }

  window.ClinicAppFicha = { formToObject, leerFirmas, hoyISO, esRutValido, comprimirImagen };
})();
