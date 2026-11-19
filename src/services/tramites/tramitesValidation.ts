import type { Enums, Tables } from '@/types/database.types'
import { containsSqlInjectionPattern } from '../login/loginValidation.ts'

export type EstadoTramiteAlumno = Enums<'estado_tramite_alumno'>
export type NivelEducativo = Enums<'nivel_educativo'>

export interface TramiteAlumnoRecord {
  id: string
  folio: number
  numeroCuenta: string
  nombreAlumno: string
  programaId: number
  clavePrograma: string
  nombrePrograma: string
  unidadAcademicaId: number
  claveUa: string
  nombreUa: string
  nivel: NivelEducativo
  tipoTramiteId: number
  nombreTramite: string
  permitePdf: boolean
  periodoId: number
  fechaRegistro: string
  estado: EstadoTramiteAlumno
  observaciones: string | null
  archivoPdfUrl: string | null
  createdAt: string
}

export interface TramiteAlumnoInput {
  numeroCuenta: string
  nombreAlumno: string
  programaId: number
  tipoTramiteId: number
  periodoId: number
  fechaRegistro: string
  estado: EstadoTramiteAlumno
  observaciones?: string | null
  archivoPdfUrl?: string | null
}

export interface TramiteJoinedDbRow extends Tables<'tramites_alumnos'> {
  programas_educativos:
    | (Pick<
        Tables<'programas_educativos'>,
        'id' | 'clave_programa' | 'nombre' | 'unidad_academica_id'
      > & {
        unidades_academicas: Pick<
          Tables<'unidades_academicas'>,
          'id' | 'clave_ua' | 'nombre' | 'nivel'
        > | null
      })
    | null
  tipos_tramite: Pick<
    Tables<'tipos_tramite'>,
    'id' | 'nombre' | 'modulo' | 'permite_pdf'
  > | null
}

export type TramiteValidationResult =
  | { valid: true; data: TramiteAlumnoInput }
  | { valid: false; error: string; field?: string }

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const MAX_CUENTA_LENGTH = 30
const VALID_ESTADOS = new Set<EstadoTramiteAlumno>([
  'PENDIENTE',
  'RESUELTO',
  'CON_ERROR',
])

/**
 * Mapea una fila unida de public.tramites_alumnos al contrato de servicio y UI.
 */
export function mapTramiteFromDb(row: TramiteJoinedDbRow): TramiteAlumnoRecord {
  const prog = row.programas_educativos
  const ua = prog?.unidades_academicas ?? null
  const tipo = row.tipos_tramite

  return {
    id: row.id,
    folio: row.folio,
    numeroCuenta: row.numero_cuenta,
    nombreAlumno: row.nombre_alumno,
    programaId: row.programa_id,
    clavePrograma: prog?.clave_programa ?? '',
    nombrePrograma: prog?.nombre ?? '',
    unidadAcademicaId: prog?.unidad_academica_id ?? ua?.id ?? 0,
    claveUa: ua?.clave_ua ?? '',
    nombreUa: ua?.nombre ?? '',
    nivel: ua?.nivel ?? 'LICENCIATURA',
    tipoTramiteId: row.tipo_tramite_id,
    nombreTramite: tipo?.nombre ?? 'Trámite',
    permitePdf: tipo?.permite_pdf ?? false,
    periodoId: row.periodo_id,
    fechaRegistro: row.fecha_registro,
    estado: row.estado,
    observaciones: row.observaciones,
    archivoPdfUrl: row.archivo_pdf_url,
    createdAt: row.created_at,
  }
}

/**
 * Valida y normaliza un registro individual de tramite general por alumno.
 */
export function validateTramiteAlumnoInput(
  input: TramiteAlumnoInput
): TramiteValidationResult {
  const numeroCuenta =
    typeof input.numeroCuenta === 'string' ? input.numeroCuenta.trim() : ''
  if (!numeroCuenta || numeroCuenta.length > MAX_CUENTA_LENGTH) {
    return {
      valid: false,
      field: 'numeroCuenta',
      error: 'Ingresa un número de cuenta válido (máximo 30 caracteres).',
    }
  }

  if (containsSqlInjectionPattern(numeroCuenta)) {
    return {
      valid: false,
      field: 'numeroCuenta',
      error: 'El número de cuenta contiene caracteres no permitidos.',
    }
  }

  const nombreAlumno =
    typeof input.nombreAlumno === 'string'
      ? input.nombreAlumno.trim().toUpperCase()
      : ''
  if (!nombreAlumno || containsSqlInjectionPattern(nombreAlumno)) {
    return {
      valid: false,
      field: 'nombreAlumno',
      error: 'Ingresa el nombre completo del alumno sin caracteres inválidos.',
    }
  }

  if (!Number.isInteger(input.programaId) || input.programaId <= 0) {
    return {
      valid: false,
      field: 'programaId',
      error: 'Selecciona una unidad académica y programa educativo válidos.',
    }
  }

  if (!Number.isInteger(input.tipoTramiteId) || input.tipoTramiteId <= 0) {
    return {
      valid: false,
      field: 'tipoTramiteId',
      error: 'Selecciona un tipo de trámite válido.',
    }
  }

  if (!Number.isInteger(input.periodoId) || input.periodoId <= 0) {
    return {
      valid: false,
      field: 'periodoId',
      error: 'Selecciona un periodo escolar activo.',
    }
  }

  const fechaRegistro =
    typeof input.fechaRegistro === 'string'
      ? input.fechaRegistro.trim().slice(0, 10)
      : ''
  if (!ISO_DATE_REGEX.test(fechaRegistro)) {
    return {
      valid: false,
      field: 'fechaRegistro',
      error: 'Selecciona una fecha de registro válida.',
    }
  }

  if (!VALID_ESTADOS.has(input.estado)) {
    return {
      valid: false,
      field: 'estado',
      error: 'Selecciona un estado de trámite válido.',
    }
  }

  const observacionesRaw =
    typeof input.observaciones === 'string' ? input.observaciones.trim() : ''
  if (observacionesRaw && containsSqlInjectionPattern(observacionesRaw)) {
    return {
      valid: false,
      field: 'observaciones',
      error: 'Las observaciones contienen secuencias no permitidas.',
    }
  }

  const archivoPdfRaw =
    typeof input.archivoPdfUrl === 'string' ? input.archivoPdfUrl.trim() : ''

  return {
    valid: true,
    data: {
      numeroCuenta,
      nombreAlumno,
      programaId: input.programaId,
      tipoTramiteId: input.tipoTramiteId,
      periodoId: input.periodoId,
      fechaRegistro,
      estado: input.estado,
      observaciones: observacionesRaw || null,
      archivoPdfUrl: archivoPdfRaw || null,
    },
  }
}

/**
 * Resume conteos globales de una lista de tramites por estado operativo.
 */
export function summarizeTramitesByEstado(
  rows: Pick<TramiteAlumnoRecord, 'estado'>[]
): {
  total: number
  pendientes: number
  resueltos: number
  conError: number
} {
  let pendientes = 0
  let resueltos = 0
  let conError = 0

  for (const row of rows) {
    if (row.estado === 'PENDIENTE') {
      pendientes += 1
    } else if (row.estado === 'RESUELTO') {
      resueltos += 1
    } else if (row.estado === 'CON_ERROR') {
      conError += 1
    }
  }

  return {
    total: rows.length,
    pendientes,
    resueltos,
    conError,
  }
}
