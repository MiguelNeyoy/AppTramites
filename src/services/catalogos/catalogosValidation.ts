import type { Enums, Tables } from '@/types/database.types'

export type NivelEducativo = Enums<'nivel_educativo'>
export type ModuloTramite = Enums<'modulo_tramite'>

export type UnidadAcademicaRow = Tables<'unidades_academicas'>
export type ProgramaEducativoRow = Tables<'programas_educativos'>
export type TipoTramiteRow = Tables<'tipos_tramite'>
export type PeriodoEscolarRow = Tables<'periodos_escolares'>

export interface UnidadAcademicaCatalogo {
  id: number
  claveUa: string
  nombre: string
  nivel: NivelEducativo
  activa: boolean
  createdAt?: string
}

export interface ProgramaEducativoCatalogo {
  id: number
  unidadAcademicaId: number
  clavePrograma: string
  nombre: string
  activo: boolean
  createdAt?: string
}

export interface TipoTramiteCatalogo {
  id: number
  nombre: string
  modulo: ModuloTramite
  permitePdf: boolean
  activo: boolean
  createdAt?: string
}

export interface PeriodoEscolarCatalogo {
  id: number
  nombre: string
  numeroPeriodo: number
  fechaInicio: string
  fechaFin: string
  activo: boolean
  createdAt?: string
}

export interface CatalogosSnapshot {
  unidades: UnidadAcademicaCatalogo[]
  programas: ProgramaEducativoCatalogo[]
  tiposTramite: TipoTramiteCatalogo[]
  periodos: PeriodoEscolarCatalogo[]
}

export type UnidadAcademicaInput = Omit<
  UnidadAcademicaCatalogo,
  'id' | 'createdAt'
>
export type ProgramaEducativoInput = Omit<
  ProgramaEducativoCatalogo,
  'id' | 'createdAt'
>
export type TipoTramiteInput = Omit<TipoTramiteCatalogo, 'id' | 'createdAt'>
export type PeriodoEscolarInput = Omit<PeriodoEscolarCatalogo, 'id' | 'createdAt'>

export interface ValidationOutcome<T> {
  valid: boolean
  data?: T
  error?: string
  field?: string
}

const VALID_NIVELES: readonly NivelEducativo[] = [
  'BACHILLERATO',
  'LICENCIATURA',
]
const VALID_MODULOS: readonly ModuloTramite[] = [
  'TRAMITES_GENERALES',
  'NUEVO_INGRESO',
]
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false
  }
  const [yearStr, monthStr, dayStr] = value.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function mapUnidadFromDb(row: UnidadAcademicaRow): UnidadAcademicaCatalogo {
  return {
    id: row.id,
    claveUa: row.clave_ua,
    nombre: row.nombre,
    nivel: row.nivel,
    activa: row.activa,
    createdAt: row.created_at,
  }
}

export function mapProgramaFromDb(
  row: ProgramaEducativoRow
): ProgramaEducativoCatalogo {
  return {
    id: row.id,
    unidadAcademicaId: row.unidad_academica_id,
    clavePrograma: row.clave_programa,
    nombre: row.nombre,
    activo: row.activo,
    createdAt: row.created_at,
  }
}

export function mapTipoTramiteFromDb(row: TipoTramiteRow): TipoTramiteCatalogo {
  return {
    id: row.id,
    nombre: row.nombre,
    modulo: row.modulo,
    permitePdf: row.permite_pdf,
    activo: row.activo,
    createdAt: row.created_at,
  }
}

export function mapPeriodoFromDb(row: PeriodoEscolarRow): PeriodoEscolarCatalogo {
  return {
    id: row.id,
    nombre: row.nombre,
    numeroPeriodo: row.numero_periodo,
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    activo: row.activo,
    createdAt: row.created_at,
  }
}

export function validateUnidadInput(
  input: UnidadAcademicaInput
): ValidationOutcome<UnidadAcademicaInput> {
  const claveUa = input.claveUa.trim()
  const nombre = input.nombre.trim()

  if (!claveUa) {
    return {
      valid: false,
      field: 'claveUa',
      error: 'La clave de la unidad académica es obligatoria.',
    }
  }
  if (claveUa.length > 20) {
    return {
      valid: false,
      field: 'claveUa',
      error: 'La clave UA no debe exceder 20 caracteres.',
    }
  }
  if (!nombre) {
    return {
      valid: false,
      field: 'nombre',
      error: 'El nombre de la unidad académica es obligatorio.',
    }
  }
  if (nombre.length > 150) {
    return {
      valid: false,
      field: 'nombre',
      error: 'El nombre de la unidad académica no debe exceder 150 caracteres.',
    }
  }
  if (!VALID_NIVELES.includes(input.nivel)) {
    return {
      valid: false,
      field: 'nivel',
      error: 'Selecciona un nivel educativo válido.',
    }
  }

  return {
    valid: true,
    data: {
      claveUa,
      nombre,
      nivel: input.nivel,
      activa: Boolean(input.activa),
    },
  }
}

export function validateProgramaInput(
  input: ProgramaEducativoInput
): ValidationOutcome<ProgramaEducativoInput> {
  const clavePrograma = input.clavePrograma.trim()
  const nombre = input.nombre.trim()

  if (!Number.isInteger(input.unidadAcademicaId) || input.unidadAcademicaId <= 0) {
    return {
      valid: false,
      field: 'unidadAcademicaId',
      error: 'Selecciona una unidad académica válida.',
    }
  }
  if (!clavePrograma) {
    return {
      valid: false,
      field: 'clavePrograma',
      error: 'La clave del programa educativo es obligatoria.',
    }
  }
  if (clavePrograma.length > 20) {
    return {
      valid: false,
      field: 'clavePrograma',
      error: 'La clave del programa no debe exceder 20 caracteres.',
    }
  }
  if (!nombre) {
    return {
      valid: false,
      field: 'nombre',
      error: 'El nombre del programa educativo es obligatorio.',
    }
  }
  if (nombre.length > 150) {
    return {
      valid: false,
      field: 'nombre',
      error: 'El nombre del programa no debe exceder 150 caracteres.',
    }
  }

  return {
    valid: true,
    data: {
      unidadAcademicaId: input.unidadAcademicaId,
      clavePrograma,
      nombre,
      activo: Boolean(input.activo),
    },
  }
}

export function validateTipoTramiteInput(
  input: TipoTramiteInput
): ValidationOutcome<TipoTramiteInput> {
  const nombre = input.nombre.trim()

  if (!nombre) {
    return {
      valid: false,
      field: 'nombre',
      error: 'El nombre del tipo de trámite es obligatorio.',
    }
  }
  if (nombre.length > 150) {
    return {
      valid: false,
      field: 'nombre',
      error: 'El nombre del trámite no debe exceder 150 caracteres.',
    }
  }
  if (!VALID_MODULOS.includes(input.modulo)) {
    return {
      valid: false,
      field: 'modulo',
      error: 'Selecciona un módulo operativo válido.',
    }
  }

  return {
    valid: true,
    data: {
      nombre,
      modulo: input.modulo,
      permitePdf: Boolean(input.permitePdf),
      activo: Boolean(input.activo),
    },
  }
}

export function validatePeriodoInput(
  input: PeriodoEscolarInput
): ValidationOutcome<PeriodoEscolarInput> {
  const nombre = input.nombre.trim()
  const fechaInicio = input.fechaInicio.trim()
  const fechaFin = input.fechaFin.trim()

  if (!nombre) {
    return {
      valid: false,
      field: 'nombre',
      error: 'El nombre del periodo escolar es obligatorio.',
    }
  }
  if (nombre.length > 100) {
    return {
      valid: false,
      field: 'nombre',
      error: 'El nombre del periodo no debe exceder 100 caracteres.',
    }
  }
  if (!Number.isInteger(input.numeroPeriodo) || input.numeroPeriodo <= 0) {
    return {
      valid: false,
      field: 'numeroPeriodo',
      error: 'El número de periodo debe ser un entero mayor a 0.',
    }
  }
  if (!isValidIsoDate(fechaInicio)) {
    return {
      valid: false,
      field: 'fechaInicio',
      error: 'La fecha de inicio debe tener formato válido YYYY-MM-DD.',
    }
  }
  if (!isValidIsoDate(fechaFin)) {
    return {
      valid: false,
      field: 'fechaFin',
      error: 'La fecha de fin debe tener formato válido YYYY-MM-DD.',
    }
  }
  if (fechaFin < fechaInicio) {
    return {
      valid: false,
      field: 'fechaFin',
      error: 'La fecha de fin no puede ser anterior a la fecha de inicio.',
    }
  }

  return {
    valid: true,
    data: {
      nombre,
      numeroPeriodo: input.numeroPeriodo,
      fechaInicio,
      fechaFin,
      activo: Boolean(input.activo),
    },
  }
}
