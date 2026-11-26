import { supabase } from '@/lib/supabase'
import {
  fetchPeriodosEscolares,
  fetchProgramasEducativos,
  fetchUnidadesAcademicas,
  type PeriodoEscolarCatalogo,
  type ProgramaEducativoCatalogo,
  type UnidadAcademicaCatalogo,
} from '../catalogos'
import { AppServiceError, mapSupabaseError } from '../shared/supabaseErrors'
import {
  validateAssignResponsableInput,
  validateUpsertActaInput,
  type AssignResponsableInput,
  type ChecklistActaDbRow,
  type ResponsableActaOption,
  type UpsertActaInput,
} from './actasValidation'

const CHECKLIST_SELECT =
  'id, periodo_id, programa_id, tipo_acta, estado, responsable_id, actualizado_por, updated_at' as const

export interface ActasCatalogosSnapshot {
  unidades: UnidadAcademicaCatalogo[]
  programas: ProgramaEducativoCatalogo[]
  periodos: PeriodoEscolarCatalogo[]
  responsables: ResponsableActaOption[]
}

/**
 * Obtiene el catalogo de responsables activos (excluyendo NUEVO_INGRESO) mediante RPC seguro.
 */
export async function fetchResponsablesActas(): Promise<
  ResponsableActaOption[]
> {
  const { data, error } = await supabase.rpc('list_responsables_actas')
  if (error) {
    throw mapSupabaseError(error)
  }
  return (data ?? []).map((item) => ({
    id: item.id,
    nombre: item.nombre,
    rol: item.rol,
  }))
}

/**
 * Obtiene en paralelo unidades academicas activas, programas activos, periodos y responsables.
 */
export async function fetchCatalogosParaActas(): Promise<ActasCatalogosSnapshot> {
  const [unidades, programas, periodosRaw, responsables] = await Promise.all([
    fetchUnidadesAcademicas({ onlyActive: true }),
    fetchProgramasEducativos({ onlyActive: true }),
    fetchPeriodosEscolares(),
    fetchResponsablesActas(),
  ])

  const periodos = [...periodosRaw].sort((a, b) => {
    const cicloA = a.cicloEscolar ?? a.fechaInicio
    const cicloB = b.cicloEscolar ?? b.fechaInicio
    const cicloCmp = cicloA.localeCompare(cicloB, 'es', { numeric: true })
    if (cicloCmp !== 0) {
      return cicloCmp
    }
    return a.numeroPeriodo - b.numeroPeriodo
  })

  return {
    unidades,
    programas,
    periodos,
    responsables,
  }
}

/**
 * Consulta todos los registros de public.checklists_actas para un periodo escolar.
 */
export async function fetchChecklistsByPeriodo(
  periodoId: number
): Promise<ChecklistActaDbRow[]> {
  if (!Number.isInteger(periodoId) || periodoId <= 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'El periodo escolar seleccionado no es válido.',
      { field: 'periodoId' }
    )
  }

  const { data, error } = await supabase
    .from('checklists_actas')
    .select(CHECKLIST_SELECT)
    .eq('periodo_id', periodoId)
    .order('programa_id', { ascending: true })

  if (error) {
    throw mapSupabaseError(error)
  }

  return data ?? []
}

/**
 * Crea o actualiza el estado de un acta para un (periodo_id, programa_id, tipo_acta).
 */
export async function upsertEstadoActa(
  input: UpsertActaInput
): Promise<ChecklistActaDbRow> {
  const validation = validateUpsertActaInput(input)
  if (!validation.valid || !validation.data) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      validation.error ?? 'Datos de acta inválidos.',
      { field: validation.field }
    )
  }

  const d = validation.data
  const payload: {
    periodo_id: number
    programa_id: number
    tipo_acta: UpsertActaInput['tipoActa']
    estado: UpsertActaInput['estado']
    responsable_id?: string | null
  } = {
    periodo_id: d.periodoId,
    programa_id: d.programaId,
    tipo_acta: d.tipoActa,
    estado: d.estado,
  }

  if (d.responsableId !== undefined) {
    payload.responsable_id = d.responsableId
  }

  const { data, error } = await supabase
    .from('checklists_actas')
    .upsert(payload, { onConflict: 'periodo_id,programa_id,tipo_acta' })
    .select(CHECKLIST_SELECT)
    .single()

  if (error || !data) {
    throw mapSupabaseError(error)
  }

  return data
}

/**
 * Asigna o retira el responsable de un programa educativo dentro de un periodo escolar.
 * Si el programa aun no tiene filas en checklists_actas para ese periodo, crea la fila base ORDINARIA en PENDIENTE.
 */
export async function assignResponsableProgramaPeriodo(
  input: AssignResponsableInput
): Promise<ChecklistActaDbRow[]> {
  const validation = validateAssignResponsableInput(input)
  if (!validation.valid || !validation.data) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      validation.error ?? 'Datos de responsable inválidos.',
      { field: validation.field }
    )
  }

  const { periodoId, programaId, responsableId } = validation.data

  const { data: updatedRows, error: updateError } = await supabase
    .from('checklists_actas')
    .update({ responsable_id: responsableId })
    .eq('periodo_id', periodoId)
    .eq('programa_id', programaId)
    .select(CHECKLIST_SELECT)

  if (updateError) {
    throw mapSupabaseError(updateError)
  }

  if ((updatedRows?.length ?? 0) > 0 || responsableId === null) {
    return updatedRows ?? []
  }

  const { data: insertedRow, error: upsertError } = await supabase
    .from('checklists_actas')
    .upsert(
      {
        periodo_id: periodoId,
        programa_id: programaId,
        tipo_acta: 'ORDINARIA',
        estado: 'PENDIENTE',
        responsable_id: responsableId,
      },
      { onConflict: 'periodo_id,programa_id,tipo_acta' }
    )
    .select(CHECKLIST_SELECT)
    .single()

  if (upsertError || !insertedRow) {
    throw mapSupabaseError(upsertError)
  }

  return [insertedRow]
}
