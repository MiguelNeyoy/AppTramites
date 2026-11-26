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
  mapFichaFromDb,
  validateFichaInput,
  type EstatusFichaNuevoIngreso,
  type FichaJoinedDbRow,
  type FichaNuevoIngresoInput,
  type FichaNuevoIngresoRecord,
  type NivelEducativo,
} from './fichasValidation'

const FICHAS_SELECT = `
  id,
  curp,
  a_paterno,
  a_materno,
  nombre,
  sexo,
  unidad_academica_id,
  programa_id,
  fecha_nacimiento,
  celular,
  correo,
  estatus_ficha,
  periodo_id,
  usuario_id,
  fecha_registro,
  created_at,
  updated_at,
  unidades_academicas!inner ( id, clave_ua, nombre, nivel ),
  programas_educativos!fichas_nuevo_ingreso_programa_id_fkey!inner ( id, clave_programa, nombre )
` as const

export interface FetchFichasOptions {
  periodoId?: number
  nivel?: NivelEducativo
  estatus?: EstatusFichaNuevoIngreso
}

export interface FichasCatalogosSnapshot {
  unidades: UnidadAcademicaCatalogo[]
  programas: ProgramaEducativoCatalogo[]
  tiposTramite: TipoTramiteCatalogo[]
  periodos: PeriodoEscolarCatalogo[]
}

/**
 * Consulta fichas nominales de Nuevo Ingreso sin filtrar por nivel escolar
 * salvo cuando el operador aplique filtro explicito en UI.
 */
export async function fetchFichasNuevoIngreso(
  options?: FetchFichasOptions
): Promise<FichaNuevoIngresoRecord[]> {
  let query = supabase
    .from('fichas_nuevo_ingreso')
    .select(FICHAS_SELECT)
    .order('fecha_registro', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.periodoId !== undefined) {
    query = query.eq('periodo_id', options.periodoId)
  }
  if (options?.estatus) {
    query = query.eq('estatus_ficha', options.estatus)
  }
  if (options?.nivel) {
    query = query.eq('unidades_academicas.nivel', options.nivel)
  }

  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error)
  }

  return ((data ?? []) as unknown as FichaJoinedDbRow[]).map(mapFichaFromDb)
}

/**
 * Reutiliza los servicios centralizados de catalogos cubriendo ambos niveles
 * (Bachillerato y Licenciatura) para la operacion transversal de NUEVO_INGRESO.
 */
export async function fetchCatalogosParaFichas(): Promise<FichasCatalogosSnapshot> {
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
 * Registra una nueva ficha nominal de Nuevo Ingreso validando reglas en cliente
 * y delegando unicidad (CURP + periodo) y coherencia escuela/carrera a PostgreSQL.
 */
export async function createFichaNuevoIngreso(
  input: FichaNuevoIngresoInput
): Promise<FichaNuevoIngresoRecord> {
  const validation = validateFichaInput(input)
  if (!validation.valid) {
    throw new AppServiceError('VALIDATION_ERROR', validation.error, {
      field: validation.field,
    })
  }

  const d = validation.data
  const { data, error } = await supabase
    .from('fichas_nuevo_ingreso')
    .insert({
      curp: d.curp,
      a_paterno: d.aPaterno,
      a_materno: d.aMaterno,
      nombre: d.nombre,
      sexo: d.sexo,
      unidad_academica_id: d.unidadAcademicaId,
      programa_id: d.programaId,
      fecha_nacimiento: d.fechaNacimiento,
      celular: d.celular,
      correo: d.correo,
      estatus_ficha: d.estatusFicha,
      periodo_id: d.periodoId,
    })
    .select(FICHAS_SELECT)
    .single()

  if (error || !data) {
    const mapped = mapSupabaseError(error)
    if (mapped.code === 'UNIQUE_VIOLATION') {
      throw new AppServiceError(
        'UNIQUE_VIOLATION',
        'Ya existe una ficha registrada con esa CURP en el periodo escolar seleccionado.',
        { field: 'curp', rawCode: mapped.rawCode }
      )
    }
    throw mapped
  }

  return mapFichaFromDb(data as unknown as FichaJoinedDbRow)
}

/**
 * Actualiza los datos nominales, escuela/carrera o estatus de una ficha existente.
 */
export async function updateFichaNuevoIngreso(
  id: string,
  input: FichaNuevoIngresoInput
): Promise<FichaNuevoIngresoRecord> {
  if (!id || id.trim().length === 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de ficha inválido.'
    )
  }

  const validation = validateFichaInput(input)
  if (!validation.valid) {
    throw new AppServiceError('VALIDATION_ERROR', validation.error, {
      field: validation.field,
    })
  }

  const d = validation.data
  const { data, error } = await supabase
    .from('fichas_nuevo_ingreso')
    .update({
      curp: d.curp,
      a_paterno: d.aPaterno,
      a_materno: d.aMaterno,
      nombre: d.nombre,
      sexo: d.sexo,
      unidad_academica_id: d.unidadAcademicaId,
      programa_id: d.programaId,
      fecha_nacimiento: d.fechaNacimiento,
      celular: d.celular,
      correo: d.correo,
      estatus_ficha: d.estatusFicha,
      periodo_id: d.periodoId,
    })
    .eq('id', id)
    .select(FICHAS_SELECT)
    .single()

  if (error || !data) {
    const mapped = mapSupabaseError(error)
    if (mapped.code === 'UNIQUE_VIOLATION') {
      throw new AppServiceError(
        'UNIQUE_VIOLATION',
        'Ya existe otra ficha registrada con esa CURP en el periodo escolar seleccionado.',
        { field: 'curp', rawCode: mapped.rawCode }
      )
    }
    throw mapped
  }

  return mapFichaFromDb(data as unknown as FichaJoinedDbRow)
}

/**
 * Elimina una ficha erronea de public.fichas_nuevo_ingreso (permitido a ADMIN y NUEVO_INGRESO).
 */
export async function deleteFichaNuevoIngreso(id: string): Promise<void> {
  if (!id || id.trim().length === 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de ficha inválido.'
    )
  }

  const { error } = await supabase
    .from('fichas_nuevo_ingreso')
    .delete()
    .eq('id', id)

  if (error) {
    throw mapSupabaseError(error)
  }
}
