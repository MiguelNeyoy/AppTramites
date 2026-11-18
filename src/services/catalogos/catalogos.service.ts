import { supabase } from '@/lib/supabase'
import { AppServiceError, mapSupabaseError } from '../shared/supabaseErrors'
import {
  mapPeriodoFromDb,
  mapProgramaFromDb,
  mapTipoTramiteFromDb,
  mapUnidadFromDb,
  validatePeriodoInput,
  validateProgramaInput,
  validateTipoTramiteInput,
  validateUnidadInput,
  type CatalogosSnapshot,
  type ModuloTramite,
  type NivelEducativo,
  type PeriodoEscolarCatalogo,
  type PeriodoEscolarInput,
  type ProgramaEducativoCatalogo,
  type ProgramaEducativoInput,
  type TipoTramiteCatalogo,
  type TipoTramiteInput,
  type UnidadAcademicaCatalogo,
  type UnidadAcademicaInput,
} from './catalogosValidation'

const UNIDADES_SELECT =
  'id, clave_ua, nombre, nivel, activa, created_at' as const
const PROGRAMAS_SELECT =
  'id, unidad_academica_id, clave_programa, nombre, activo, created_at' as const
const TRAMITES_SELECT =
  'id, nombre, modulo, permite_pdf, activo, created_at' as const
const PERIODOS_SELECT =
  'id, nombre, numero_periodo, fecha_inicio, fecha_fin, activo, created_at' as const

export interface FetchCatalogosOptions {
  onlyActive?: boolean
  nivel?: NivelEducativo
}

export async function fetchUnidadesAcademicas(options?: {
  onlyActive?: boolean
  nivel?: NivelEducativo
}): Promise<UnidadAcademicaCatalogo[]> {
  let query = supabase
    .from('unidades_academicas')
    .select(UNIDADES_SELECT)
    .order('clave_ua', { ascending: true })

  if (options?.onlyActive) {
    query = query.eq('activa', true)
  }
  if (options?.nivel) {
    query = query.eq('nivel', options.nivel)
  }

  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error)
  }

  return (data ?? []).map(mapUnidadFromDb)
}

export async function fetchProgramasEducativos(options?: {
  onlyActive?: boolean
  unidadAcademicaId?: number
}): Promise<ProgramaEducativoCatalogo[]> {
  let query = supabase
    .from('programas_educativos')
    .select(PROGRAMAS_SELECT)
    .order('clave_programa', { ascending: true })

  if (options?.onlyActive) {
    query = query.eq('activo', true)
  }
  if (options?.unidadAcademicaId !== undefined) {
    query = query.eq('unidad_academica_id', options.unidadAcademicaId)
  }

  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error)
  }

  return (data ?? []).map(mapProgramaFromDb)
}

export async function fetchTiposTramite(options?: {
  onlyActive?: boolean
  modulo?: ModuloTramite
}): Promise<TipoTramiteCatalogo[]> {
  let query = supabase
    .from('tipos_tramite')
    .select(TRAMITES_SELECT)
    .order('id', { ascending: true })

  if (options?.onlyActive) {
    query = query.eq('activo', true)
  }
  if (options?.modulo) {
    query = query.eq('modulo', options.modulo)
  }

  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error)
  }

  return (data ?? []).map(mapTipoTramiteFromDb)
}

export async function fetchPeriodosEscolares(options?: {
  onlyActive?: boolean
}): Promise<PeriodoEscolarCatalogo[]> {
  let query = supabase
    .from('periodos_escolares')
    .select(PERIODOS_SELECT)
    .order('fecha_inicio', { ascending: false })
    .order('numero_periodo', { ascending: false })

  if (options?.onlyActive) {
    query = query.eq('activo', true)
  }

  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error)
  }

  return (data ?? []).map(mapPeriodoFromDb)
}

export async function fetchAllCatalogos(
  options?: FetchCatalogosOptions
): Promise<CatalogosSnapshot> {
  const [unidades, programas, tiposTramite, periodos] = await Promise.all([
    fetchUnidadesAcademicas({
      onlyActive: options?.onlyActive,
      nivel: options?.nivel,
    }),
    fetchProgramasEducativos({ onlyActive: options?.onlyActive }),
    fetchTiposTramite({ onlyActive: options?.onlyActive }),
    fetchPeriodosEscolares({ onlyActive: options?.onlyActive }),
  ])

  return {
    unidades,
    programas,
    tiposTramite,
    periodos,
  }
}

/* ========================================================================== */
/* CRUD Unidades Academicas                                                   */
/* ========================================================================== */

export async function createUnidadAcademica(
  input: UnidadAcademicaInput
): Promise<UnidadAcademicaCatalogo> {
  const validation = validateUnidadInput(input)
  if (!validation.valid || !validation.data) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      validation.error ?? 'Datos de unidad académica inválidos.',
      { field: validation.field }
    )
  }

  const { data, error } = await supabase
    .from('unidades_academicas')
    .insert({
      clave_ua: validation.data.claveUa,
      nombre: validation.data.nombre,
      nivel: validation.data.nivel,
      activa: validation.data.activa,
    })
    .select(UNIDADES_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapUnidadFromDb(data)
}

export async function updateUnidadAcademica(
  id: number,
  input: Partial<UnidadAcademicaInput>
): Promise<UnidadAcademicaCatalogo> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de unidad académica inválido.'
    )
  }

  const updatePayload: {
    clave_ua?: string
    nombre?: string
    nivel?: NivelEducativo
    activa?: boolean
  } = {}

  if (input.claveUa !== undefined) {
    const trimmed = input.claveUa.trim()
    if (!trimmed) {
      throw new AppServiceError(
        'VALIDATION_ERROR',
        'La clave de la unidad académica no puede estar vacía.',
        { field: 'claveUa' }
      )
    }
    updatePayload.clave_ua = trimmed
  }
  if (input.nombre !== undefined) {
    const trimmed = input.nombre.trim()
    if (!trimmed) {
      throw new AppServiceError(
        'VALIDATION_ERROR',
        'El nombre de la unidad académica no puede estar vacío.',
        { field: 'nombre' }
      )
    }
    updatePayload.nombre = trimmed
  }
  if (input.nivel !== undefined) {
    updatePayload.nivel = input.nivel
  }
  if (input.activa !== undefined) {
    updatePayload.activa = input.activa
  }

  const { data, error } = await supabase
    .from('unidades_academicas')
    .update(updatePayload)
    .eq('id', id)
    .select(UNIDADES_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapUnidadFromDb(data)
}

export async function deleteUnidadAcademica(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de unidad académica inválido.'
    )
  }

  const { data, error } = await supabase
    .from('unidades_academicas')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }
}

/* ========================================================================== */
/* CRUD Programas Educativos                                                  */
/* ========================================================================== */

export async function createProgramaEducativo(
  input: ProgramaEducativoInput
): Promise<ProgramaEducativoCatalogo> {
  const validation = validateProgramaInput(input)
  if (!validation.valid || !validation.data) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      validation.error ?? 'Datos de programa educativo inválidos.',
      { field: validation.field }
    )
  }

  const { data, error } = await supabase
    .from('programas_educativos')
    .insert({
      unidad_academica_id: validation.data.unidadAcademicaId,
      clave_programa: validation.data.clavePrograma,
      nombre: validation.data.nombre,
      activo: validation.data.activo,
    })
    .select(PROGRAMAS_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapProgramaFromDb(data)
}

export async function updateProgramaEducativo(
  id: number,
  input: Partial<ProgramaEducativoInput>
): Promise<ProgramaEducativoCatalogo> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de programa educativo inválido.'
    )
  }

  const updatePayload: {
    unidad_academica_id?: number
    clave_programa?: string
    nombre?: string
    activo?: boolean
  } = {}

  if (input.unidadAcademicaId !== undefined) {
    updatePayload.unidad_academica_id = input.unidadAcademicaId
  }
  if (input.clavePrograma !== undefined) {
    const trimmed = input.clavePrograma.trim()
    if (!trimmed) {
      throw new AppServiceError(
        'VALIDATION_ERROR',
        'La clave del programa educativo no puede estar vacía.',
        { field: 'clavePrograma' }
      )
    }
    updatePayload.clave_programa = trimmed
  }
  if (input.nombre !== undefined) {
    const trimmed = input.nombre.trim()
    if (!trimmed) {
      throw new AppServiceError(
        'VALIDATION_ERROR',
        'El nombre del programa educativo no puede estar vacío.',
        { field: 'nombre' }
      )
    }
    updatePayload.nombre = trimmed
  }
  if (input.activo !== undefined) {
    updatePayload.activo = input.activo
  }

  const { data, error } = await supabase
    .from('programas_educativos')
    .update(updatePayload)
    .eq('id', id)
    .select(PROGRAMAS_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapProgramaFromDb(data)
}

export async function deleteProgramaEducativo(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de programa educativo inválido.'
    )
  }

  const { data, error } = await supabase
    .from('programas_educativos')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }
}

/* ========================================================================== */
/* CRUD Tipos de Tramite                                                      */
/* ========================================================================== */

export async function createTipoTramite(
  input: TipoTramiteInput
): Promise<TipoTramiteCatalogo> {
  const validation = validateTipoTramiteInput(input)
  if (!validation.valid || !validation.data) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      validation.error ?? 'Datos de tipo de trámite inválidos.',
      { field: validation.field }
    )
  }

  const { data, error } = await supabase
    .from('tipos_tramite')
    .insert({
      nombre: validation.data.nombre,
      modulo: validation.data.modulo,
      permite_pdf: validation.data.permitePdf,
      activo: validation.data.activo,
    })
    .select(TRAMITES_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapTipoTramiteFromDb(data)
}

export async function updateTipoTramite(
  id: number,
  input: Partial<TipoTramiteInput>
): Promise<TipoTramiteCatalogo> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de tipo de trámite inválido.'
    )
  }

  const updatePayload: {
    nombre?: string
    modulo?: ModuloTramite
    permite_pdf?: boolean
    activo?: boolean
  } = {}

  if (input.nombre !== undefined) {
    const trimmed = input.nombre.trim()
    if (!trimmed) {
      throw new AppServiceError(
        'VALIDATION_ERROR',
        'El nombre del tipo de trámite no puede estar vacío.',
        { field: 'nombre' }
      )
    }
    updatePayload.nombre = trimmed
  }
  if (input.modulo !== undefined) {
    updatePayload.modulo = input.modulo
  }
  if (input.permitePdf !== undefined) {
    updatePayload.permite_pdf = input.permitePdf
  }
  if (input.activo !== undefined) {
    updatePayload.activo = input.activo
  }

  const { data, error } = await supabase
    .from('tipos_tramite')
    .update(updatePayload)
    .eq('id', id)
    .select(TRAMITES_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapTipoTramiteFromDb(data)
}

export async function deleteTipoTramite(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de tipo de trámite inválido.'
    )
  }

  const { data, error } = await supabase
    .from('tipos_tramite')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }
}

/* ========================================================================== */
/* CRUD Periodos Escolares                                                    */
/* ========================================================================== */

export async function createPeriodoEscolar(
  input: PeriodoEscolarInput
): Promise<PeriodoEscolarCatalogo> {
  const validation = validatePeriodoInput(input)
  if (!validation.valid || !validation.data) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      validation.error ?? 'Datos del periodo escolar inválidos.',
      { field: validation.field }
    )
  }

  const { data, error } = await supabase
    .from('periodos_escolares')
    .insert({
      nombre: validation.data.nombre,
      numero_periodo: validation.data.numeroPeriodo,
      fecha_inicio: validation.data.fechaInicio,
      fecha_fin: validation.data.fechaFin,
      activo: validation.data.activo,
    })
    .select(PERIODOS_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapPeriodoFromDb(data)
}

export async function updatePeriodoEscolar(
  id: number,
  input: Partial<PeriodoEscolarInput>
): Promise<PeriodoEscolarCatalogo> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de periodo escolar inválido.'
    )
  }

  const updatePayload: {
    nombre?: string
    numero_periodo?: number
    fecha_inicio?: string
    fecha_fin?: string
    activo?: boolean
  } = {}

  if (input.nombre !== undefined) {
    const trimmed = input.nombre.trim()
    if (!trimmed) {
      throw new AppServiceError(
        'VALIDATION_ERROR',
        'El nombre del periodo escolar no puede estar vacío.',
        { field: 'nombre' }
      )
    }
    updatePayload.nombre = trimmed
  }
  if (input.numeroPeriodo !== undefined) {
    if (!Number.isInteger(input.numeroPeriodo) || input.numeroPeriodo <= 0) {
      throw new AppServiceError(
        'VALIDATION_ERROR',
        'El número de periodo debe ser un entero mayor a 0.',
        { field: 'numeroPeriodo' }
      )
    }
    updatePayload.numero_periodo = input.numeroPeriodo
  }
  if (input.fechaInicio !== undefined) {
    updatePayload.fecha_inicio = input.fechaInicio.trim()
  }
  if (input.fechaFin !== undefined) {
    updatePayload.fecha_fin = input.fechaFin.trim()
  }
  if (input.activo !== undefined) {
    updatePayload.activo = input.activo
  }

  const { data, error } = await supabase
    .from('periodos_escolares')
    .update(updatePayload)
    .eq('id', id)
    .select(PERIODOS_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return mapPeriodoFromDb(data)
}

export async function deletePeriodoEscolar(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de periodo escolar inválido.'
    )
  }

  const { data, error } = await supabase
    .from('periodos_escolares')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }
}
