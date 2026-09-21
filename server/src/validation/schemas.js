'use strict';

const { z } = require('zod');
const config = require('../config');

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Correo invalido');

const emailInstitucional = email.refine(
  (v) => v.endsWith(config.auth.allowedEmailDomain),
  `Debes usar tu correo institucional (${config.auth.allowedEmailDomain})`
);

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida (formato YYYY-MM-DD)');

const registerSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre demasiado corto').max(150),
  rol: z.enum(['estudiante', 'profesional']),
  especialidad: z.enum(['podologia', 'cosmetologia', 'ambas']),
  email: emailInstitucional,
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres').max(200),
});

const verifySchema = z.object({
  email: emailInstitucional,
  codigo: z.string().trim().regex(/^\d{6}$/, 'El codigo debe tener 6 digitos'),
});

const resendSchema = z.object({ email: emailInstitucional });

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Ingresa tu contrasena'),
});

const pacienteSchema = z.object({
  rut: z.string().trim().min(2, 'RUT invalido').max(15),
  nombre: z.string().trim().min(2, 'Nombre del paciente requerido').max(150),
  fechaNacimiento: fecha.nullish(),
  telefono: z.string().trim().max(30).nullish(),
  email: z.string().trim().toLowerCase().max(190).nullish(),
});

const fichaCreateSchema = z.object({
  especialidad: z.enum(['podologia', 'cosmetologia']),
  fechaAtencion: fecha,
  estado: z.enum(['borrador', 'finalizada']).default('finalizada'),
  paciente: pacienteSchema,
  datos: z.record(z.any()),
  firmas: z.record(z.string()).nullish(),
});

const fichaUpdateSchema = z
  .object({
    datos: z.record(z.any()).optional(),
    firmas: z.record(z.string()).nullable().optional(),
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
  verifySchema,
  resendSchema,
  loginSchema,
  fichaCreateSchema,
  fichaUpdateSchema,
  fichaListQuerySchema,
};
