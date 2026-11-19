import type { Enums, Tables } from '@/types/database.types'
import {
  containsSqlInjectionPattern,
  validateEmail,
} from '../login/loginValidation.ts'

export type EstatusFichaNuevoIngreso = Enums<'estatus_ficha_nuevo_ingreso'>
export type NivelEducativo = Enums<'nivel_educativo'>

export interface FichaNuevoIngresoRecord {
  id: string
  curp: string
  aPaterno: string
  aMaterno: string
  nombre: string
  sexo: 1 | 2
  unidadAcademicaId: number
  claveEscuela: string
  nombreEscuela: string
  nivel: NivelEducativo
  programaId: number
  claveCarrera: string
  nombreCarrera: string
  fechaNacimiento: string
  celular: string
  correo: string
  estatusFicha: EstatusFichaNuevoIngreso
  periodoId: number
  fechaRegistro: string
}

export interface FichaNuevoIngresoInput {
  curp: string
  aPaterno: string
  aMaterno: string
  nombre: string
  sexo: 1 | 2
  unidadAcademicaId: number
  programaId: number
  fechaNacimiento: string
  celular: string
  correo: string
  estatusFicha: EstatusFichaNuevoIngreso
  periodoId: number
}

export interface FichaJoinedDbRow extends Tables<'fichas_nuevo_ingreso'> {
  unidades_academicas: Pick<
    Tables<'unidades_academicas'>,
    'id' | 'clave_ua' | 'nombre' | 'nivel'
  > | null
  programas_educativos: Pick<
    Tables<'programas_educativos'>,
    'id' | 'clave_programa' | 'nombre'
  > | null
}

export type FichaValidationResult =
  | { valid: true; data: FichaNuevoIngresoInput }
  | { valid: false; error: string; field?: string }

const CURP_REGEX = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z]{2}$/
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const PHONE_10_REGEX = /^[0-9]{10}$/

const VALID_ESTATUS = new Set<EstatusFichaNuevoIngreso>([
  'SIN_PROCESO',
  'SIN_PAGO',
  'FICHA_VENCIDA',
  'FICHA_CANCELADA',
])

/**
 * Convierte fecha ISO YYYY-MM-DD al formato oficial del Excel AAAA/MM/DD.
 */
export function formatFechaExcel(isoDate: string): string {
  if (!isoDate) {
    return ''
  }
  return isoDate.slice(0, 10).replaceAll('-', '/')
}

/**
 * Mapea una fila de public.fichas_nuevo_ingreso con sus joins de catalogo al modelo UI/servicio.
 */
export function mapFichaFromDb(row: FichaJoinedDbRow): FichaNuevoIngresoRecord {
  const ua = row.unidades_academicas
  const prog = row.programas_educativos

  return {
    id: row.id,
    curp: row.curp,
    aPaterno: row.a_paterno,
    aMaterno: row.a_materno,
    nombre: row.nombre,
    sexo: row.sexo === 2 ? 2 : 1,
    unidadAcademicaId: row.unidad_academica_id,
    claveEscuela: ua?.clave_ua ?? '',
    nombreEscuela: ua?.nombre ?? '',
    nivel: ua?.nivel ?? 'LICENCIATURA',
    programaId: row.programa_id,
    claveCarrera: prog?.clave_programa ?? '',
    nombreCarrera: prog?.nombre ?? '',
    fechaNacimiento: row.fecha_nacimiento,
    celular: row.celular,
    correo: row.correo,
    estatusFicha: row.estatus_ficha,
    periodoId: row.periodo_id,
    fechaRegistro: row.fecha_registro,
  }
}

/**
 * Valida y normaliza los 10 campos nominales de Nuevo Ingreso mas periodo y estatus.
 */
export function validateFichaInput(
  input: FichaNuevoIngresoInput
): FichaValidationResult {
  const curp = typeof input.curp === 'string' ? input.curp.trim().toUpperCase() : ''
  if (!CURP_REGEX.test(curp)) {
    return {
      valid: false,
      field: 'curp',
      error: 'Ingresa una CURP válida de 18 caracteres.',
    }
  }

  const aPaterno =
    typeof input.aPaterno === 'string' ? input.aPaterno.trim().toUpperCase() : ''
  if (!aPaterno || containsSqlInjectionPattern(aPaterno)) {
    return {
      valid: false,
      field: 'aPaterno',
      error: 'Ingresa un apellido paterno válido (A_Paterno).',
    }
  }

  const aMaterno =
    typeof input.aMaterno === 'string' ? input.aMaterno.trim().toUpperCase() : ''
  if (aMaterno && containsSqlInjectionPattern(aMaterno)) {
    return {
      valid: false,
      field: 'aMaterno',
      error: 'El apellido materno contiene caracteres no permitidos.',
    }
  }

  const nombre =
    typeof input.nombre === 'string' ? input.nombre.trim().toUpperCase() : ''
  if (!nombre || containsSqlInjectionPattern(nombre)) {
    return {
      valid: false,
      field: 'nombre',
      error: 'Ingresa un nombre válido (NOMBRE).',
    }
  }

  if (input.sexo !== 1 && input.sexo !== 2) {
    return {
      valid: false,
      field: 'sexo',
      error: 'Selecciona un sexo válido (1 = Masculino, 2 = Femenino).',
    }
  }

  if (!Number.isInteger(input.unidadAcademicaId) || input.unidadAcademicaId <= 0) {
    return {
      valid: false,
      field: 'unidadAcademicaId',
      error: 'Selecciona una escuela válida (ESCUELA).',
    }
  }

  if (!Number.isInteger(input.programaId) || input.programaId <= 0) {
    return {
      valid: false,
      field: 'programaId',
      error: 'Selecciona una carrera válida (CARRERA).',
    }
  }

  const fechaNacimiento =
    typeof input.fechaNacimiento === 'string'
      ? input.fechaNacimiento.trim().slice(0, 10)
      : ''
  if (!ISO_DATE_REGEX.test(fechaNacimiento)) {
    return {
      valid: false,
      field: 'fechaNacimiento',
      error: 'Ingresa una fecha de nacimiento válida (FECHA NAC).',
    }
  }

  const celular =
    typeof input.celular === 'string' ? input.celular.replace(/\D+/g, '') : ''
  if (!PHONE_10_REGEX.test(celular)) {
    return {
      valid: false,
      field: 'celular',
      error: 'El celular debe contener exactamente 10 dígitos.',
    }
  }

  const emailResult = validateEmail(input.correo)
  if (!emailResult.valid) {
    return {
      valid: false,
      field: 'correo',
      error: emailResult.error ?? 'Ingresa un correo electrónico válido.',
    }
  }

  if (!VALID_ESTATUS.has(input.estatusFicha)) {
    return {
      valid: false,
      field: 'estatusFicha',
      error: 'Selecciona un estatus de ficha válido.',
    }
  }

  if (!Number.isInteger(input.periodoId) || input.periodoId <= 0) {
    return {
      valid: false,
      field: 'periodoId',
      error: 'Selecciona un periodo escolar activo.',
    }
  }

  return {
    valid: true,
    data: {
      curp,
      aPaterno,
      aMaterno,
      nombre,
      sexo: input.sexo,
      unidadAcademicaId: input.unidadAcademicaId,
      programaId: input.programaId,
      fechaNacimiento,
      celular,
      correo: emailResult.email,
      estatusFicha: input.estatusFicha,
      periodoId: input.periodoId,
    },
  }
}
