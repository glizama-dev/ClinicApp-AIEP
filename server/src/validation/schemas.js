'use strict';

const { z } = require('zod');
const config = require('../config');
const { esRutValido } = require('../lib/rut');

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Correo invalido');

function esFechaReal(value) {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida (formato YYYY-MM-DD)')
  .refine(esFechaReal, 'Fecha invalida');

// Contrasena: minimo 8 caracteres, al menos una letra y un numero.
const password = z
  .string()
  .min(8, 'La contrasena debe tener al menos 8 caracteres')
  .max(200)
  .regex(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, 'La contrasena debe incluir al menos una letra')
  .regex(/\d/, 'La contrasena debe incluir al menos un numero');

// Imagenes en dataURL: solo formatos raster en base64. Bloquea XSS por
// atributos inyectados y esquemas peligrosos (javascript:, data:text/html, SVG).
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const imageDataUrl = z
  .string()
  .max(3 * 1024 * 1024, 'Imagen demasiado grande')
  .regex(IMAGE_DATA_URL, 'Imagen invalida');

// Los estudiantes deben usar el correo institucional; los profesionales
// pueden registrarse con cualquier correo valido.
const registerSchema = z
  .object({
    nombre: z.string().trim().min(2, 'Nombre demasiado corto').max(150),
    rol: z.enum(['estudiante', 'profesional']),
    especialidad: z.enum(['podologia', 'cosmetologia']),
    email,
    password,
  })
  .refine(
    (v) => v.rol !== 'estudiante' || v.email.endsWith(config.auth.allowedEmailDomain),
    {
      message: `Los estudiantes deben usar su correo institucional (${config.auth.allowedEmailDomain})`,
      path: ['email'],
    }
  );

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Ingresa tu contrasena').max(200),
});

const forgotPasswordSchema = z.object({
  email,
});

const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Token invalido'),
  password,
});

const rut = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{1,8}-[0-9K]$/, 'RUT invalido. Formato: 12345678-9 (sin puntos)')
  .refine(esRutValido, 'El digito verificador del RUT no es correcto');

const pacienteSchema = z.object({
  rut,
  nombre: z.string().trim().min(2, 'Nombre del paciente requerido').max(150),
  fechaNacimiento: fecha.nullish(),
  telefono: z.string().trim().max(30).nullish(),
  email: z.union([email.max(190), z.literal('')]).nullish(),
});

const fotoSchema = z.object({
  dataUrl: imageDataUrl,
  descripcion: z.string().trim().max(200).nullish(),
});

const fotos = z.array(fotoSchema).max(6, 'Maximo 6 fotos por ficha');

const fichaCreateSchema = z.object({
  especialidad: z.enum(['podologia', 'cosmetologia']),
  fechaAtencion: fecha,
  estado: z.enum(['borrador', 'finalizada']).default('finalizada'),
  paciente: pacienteSchema,
  datos: z.record(z.string(), z.any()),
  firmas: z.record(z.string().max(50), imageDataUrl).nullish(),
  fotos: fotos.nullish(),
});

const fichaUpdateSchema = z
  .object({
    datos: z.record(z.string(), z.any()).optional(),
    firmas: z.record(z.string().max(50), imageDataUrl).nullable().optional(),
    fotos: fotos.nullable().optional(),
    estado: z.enum(['borrador', 'finalizada']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nada que actualizar');

const fichaListQuerySchema = z.object({
  rut: z.string().trim().max(15).optional(),
  especialidad: z.enum(['podologia', 'cosmetologia']).optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  fichaCreateSchema,
  fichaUpdateSchema,
  fichaListQuerySchema,
};
