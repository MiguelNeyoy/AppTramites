import { supabase } from '@/lib/supabase'
import {
  fetchPeriodosEscolares,
  fetchProgramasEducativos,
  fetchTiposTramite,
  fetchUnidadesAcademicas,
  type PeriodoEscolarCatalogo,
  type ProgramaEducativoCatalogo,
  type TipoTramiteCatalogo,
  type UnidadAcademicaCatalogo,
} from '../catalogos'
import { AppServiceError, mapSupabaseError } from '../shared/supabaseErrors'
import {
  mapTramiteFromDb,
  validateTramiteAlumnoInput,
  type EstadoTramiteAlumno,
  type NivelEducativo,
  type TramiteAlumnoInput,
  type TramiteAlumnoRecord,
  type TramiteJoinedDbRow,
} from './tramitesValidation'

const TRAMITES_SELECT = `
  id,
  folio,
  numero_cuenta,
  nombre_alumno,
  programa_id,
  tipo_tramite_id,
  periodo_id,
  usuario_id,
  fecha_registro,
  estado,
  observaciones,
  archivo_pdf_url,
  created_at,
  updated_at,
  programas_educativos!inner (
    id,
    clave_programa,
    nombre,
    unidad_academica_id,
    unidades_academicas!inner ( id, clave_ua, nombre, nivel )
  ),
  tipos_tramite!inner ( id, nombre, modulo, permite_pdf )
` as const

export interface FetchTramitesOptions {
  periodoId?: number
  nivel?: NivelEducativo
  tipoTramiteId?: number
  estado?: EstadoTramiteAlumno
}

export interface TramitesCatalogosSnapshot {
  unidades: UnidadAcademicaCatalogo[]
  programas: ProgramaEducativoCatalogo[]
  tiposTramite: TipoTramiteCatalogo[]
  periodos: PeriodoEscolarCatalogo[]
}

/**
 * Consulta tramites por alumno en public.tramites_alumnos aplicando filtros opcionales.
 * PostgreSQL filtra automaticamente por nivel o unidad_academica_id segun RLS del rol.
 */
export async function fetchTramitesAlumnos(
  options?: FetchTramitesOptions
): Promise<TramiteAlumnoRecord[]> {
  let query = supabase
    .from('tramites_alumnos')
    .select(TRAMITES_SELECT)
    .order('fecha_registro', { ascending: false })
    .order('folio', { ascending: false })

  if (options?.periodoId !== undefined) {
    query = query.eq('periodo_id', options.periodoId)
  }
  if (options?.tipoTramiteId !== undefined) {
    query = query.eq('tipo_tramite_id', options.tipoTramiteId)
  }
  if (options?.estado) {
    query = query.eq('estado', options.estado)
  }
  if (options?.nivel) {
    query = query.eq(
      'programas_educativos.unidades_academicas.nivel',
      options.nivel
    )
  }

  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error)
  }

  return ((data ?? []) as unknown as TramiteJoinedDbRow[]).map(mapTramiteFromDb)
}

/**
 * Reutiliza los servicios de catalogos para poblar los selectores de Trámites y Alumnos.
 */
export async function fetchCatalogosParaTramites(): Promise<TramitesCatalogosSnapshot> {
  const [unidades, programas, tiposTramite, periodos] = await Promise.all([
    fetchUnidadesAcademicas({ onlyActive: true }),
    fetchProgramasEducativos({ onlyActive: true }),
    fetchTiposTramite({ onlyActive: true }),
    fetchPeriodosEscolares(),
  ])

  return {
    unidades,
    programas,
    tiposTramite,
    periodos,
  }
}

/**
 * Registra un tramite por alumno en public.tramites_alumnos; Postgres genera el folio consecutivo.
 */
export async function createTramiteAlumno(
  input: TramiteAlumnoInput
): Promise<TramiteAlumnoRecord> {
  const validation = validateTramiteAlumnoInput(input)
  if (!validation.valid) {
    throw new AppServiceError('VALIDATION_ERROR', validation.error, {
      field: validation.field,
    })
  }

  const d = validation.data
  const { data, error } = await supabase
    .from('tramites_alumnos')
    .insert({
      numero_cuenta: d.numeroCuenta,
      nombre_alumno: d.nombreAlumno,
      programa_id: d.programaId,
      tipo_tramite_id: d.tipoTramiteId,
      periodo_id: d.periodoId,
      fecha_registro: d.fechaRegistro,
      estado: d.estado,
      observaciones: d.observaciones,
      archivo_pdf_url: d.archivoPdfUrl,
    })
    .select(TRAMITES_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapTramiteFromDb(data as unknown as TramiteJoinedDbRow)
}

/**
 * Actualiza un tramite existente por alumno.
 */
export async function updateTramiteAlumno(
  id: string,
  input: TramiteAlumnoInput
): Promise<TramiteAlumnoRecord> {
  if (!id || id.trim().length === 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de trámite inválido.'
    )
  }

  const validation = validateTramiteAlumnoInput(input)
  if (!validation.valid) {
    throw new AppServiceError('VALIDATION_ERROR', validation.error, {
      field: validation.field,
    })
  }

  const d = validation.data
  const { data, error } = await supabase
    .from('tramites_alumnos')
    .update({
      numero_cuenta: d.numeroCuenta,
      nombre_alumno: d.nombreAlumno,
      programa_id: d.programaId,
      tipo_tramite_id: d.tipoTramiteId,
      periodo_id: d.periodoId,
      fecha_registro: d.fechaRegistro,
      estado: d.estado,
      observaciones: d.observaciones,
      archivo_pdf_url: d.archivoPdfUrl,
    })
    .eq('id', id)
    .select(TRAMITES_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapTramiteFromDb(data as unknown as TramiteJoinedDbRow)
}

/**
 * Actualiza rapidamente el estado de atencion de un tramite en la tabla de alumnos.
 */
export async function updateEstadoTramiteAlumno(
  id: string,
  estado: EstadoTramiteAlumno
): Promise<TramiteAlumnoRecord> {
  if (!id || id.trim().length === 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de trámite inválido.'
    )
  }

  const { data, error } = await supabase
    .from('tramites_alumnos')
    .update({ estado })
    .eq('id', id)
    .select(TRAMITES_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapTramiteFromDb(data as unknown as TramiteJoinedDbRow)
}

/**
 * Elimina un tramite por alumno (restringido a rol ADMIN por politica RLS en Postgres).
 */
export async function deleteTramiteAlumno(id: string): Promise<void> {
  if (!id || id.trim().length === 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de trámite inválido.'
    )
  }

  const { error } = await supabase
    .from('tramites_alumnos')
    .delete()
    .eq('id', id)

  if (error) {
    throw mapSupabaseError(error)
  }
}
