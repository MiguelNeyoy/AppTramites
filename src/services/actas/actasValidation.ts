import type { Enums, Tables } from '@/types/database.types'
import type {
  PeriodoEscolarCatalogo,
  ProgramaEducativoCatalogo,
  UnidadAcademicaCatalogo,
} from '@/services/catalogos/catalogosValidation'

export type TipoActa = Enums<'tipo_acta'>
export type EstadoActa = Enums<'estado_acta'>
export type RolUsuario = Enums<'rol_usuario'>
export type NivelEducativo = Enums<'nivel_educativo'>
export type ChecklistActaDbRow = Tables<'checklists_actas'>

export type EtapaChecklistFilter = 'TODAS' | TipoActa

export interface ResponsableActaOption {
  id: string
  nombre: string
  rol?: RolUsuario
}

export interface ActaColumnMeta {
  key: TipoActa
  order: number
  shortLabel: string
  label: string
  headerClass: string
}

export interface ChecklistCellDetail {
  estado: EstadoActa
  actualizadoPor: string | null
  responsableId: string | null
  updatedAt: string | null
}

export interface ActaMatrixRow {
  programaId: number
  unidadAcademicaId: number
  claveUa: string
  nombreUa: string
  nivel: NivelEducativo
  clavePrograma: string
  nombrePrograma: string
  periodoId: number
  numeroPeriodo: number
  periodoLabel: string
  periodoNombre: string
  estados: Record<TipoActa, EstadoActa>
  detalles: Record<TipoActa, ChecklistCellDetail>
  responsableId: string | null
  updatedAt: string | null
}

export interface ActaStageStats {
  key: TipoActa
  order: number
  shortLabel: string
  label: string
  generadas: number
  pendientes: number
  noAplica: number
  aplicables: number
  isStageCompleted: boolean
}

export interface ChecklistMatrixStats {
  totalProgramas: number
  completados: number
  pendientes: number
  isAllCompleted: boolean
  porActa: ActaStageStats[]
}

export interface UpsertActaInput {
  periodoId: number
  numeroPeriodo: number
  programaId: number
  tipoActa: TipoActa
  estado: EstadoActa
  responsableId?: string | null
}

export interface AssignResponsableInput {
  periodoId: number
  programaId: number
  responsableId: string | null
}

export interface ValidationOutcome<T> {
  valid: boolean
  data?: T
  error?: string
  field?: string
}

export const ALL_ACTA_COLUMNS: readonly ActaColumnMeta[] = [
  {
    key: 'ORDINARIA',
    order: 1,
    shortLabel: 'Ord.',
    label: 'Ordinaria',
    headerClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  {
    key: 'EXTRAORDINARIA',
    order: 2,
    shortLabel: 'Ext.',
    label: 'Extraordinaria',
    headerClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  },
  {
    key: 'REGULARIZACION',
    order: 3,
    shortLabel: 'Reg.',
    label: 'Regularización',
    headerClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  {
    key: 'PROMOCION_GRADO',
    order: 4,
    shortLabel: 'Prom.',
    label: 'Promoción de Grado',
    headerClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
  {
    key: 'CIERRE_CICLO',
    order: 5,
    shortLabel: 'Cierre',
    label: 'Cierre de Ciclo',
    headerClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  },
] as const

export const PERIODO_1_ACTA_KEYS: readonly TipoActa[] = [
  'ORDINARIA',
  'EXTRAORDINARIA',
  'REGULARIZACION',
]

const VALID_TIPOS_ACTA: readonly TipoActa[] = [
  'ORDINARIA',
  'EXTRAORDINARIA',
  'REGULARIZACION',
  'PROMOCION_GRADO',
  'CIERRE_CICLO',
]

const VALID_ESTADOS_ACTA: readonly EstadoActa[] = [
  'PENDIENTE',
  'GENERADA',
  'NO_APLICA',
]

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function getActaColumnsForPeriodo(
  numeroPeriodo: number
): ActaColumnMeta[] {
  if (numeroPeriodo === 1) {
    return ALL_ACTA_COLUMNS.filter((col) =>
      PERIODO_1_ACTA_KEYS.includes(col.key)
    )
  }
  return [...ALL_ACTA_COLUMNS]
}

export function formatPeriodoCortoLabel(numeroPeriodo: number): string {
  if (numeroPeriodo === 1) {
    return 'Periodo 1'
  }
  if (numeroPeriodo === 2) {
    return 'Periodo 2'
  }
  return `Periodo ${numeroPeriodo}`
}

function createEmptyEstados(): Record<TipoActa, EstadoActa> {
  return {
    ORDINARIA: 'PENDIENTE',
    EXTRAORDINARIA: 'PENDIENTE',
    REGULARIZACION: 'PENDIENTE',
    PROMOCION_GRADO: 'PENDIENTE',
    CIERRE_CICLO: 'PENDIENTE',
  }
}

function createEmptyDetalles(): Record<TipoActa, ChecklistCellDetail> {
  const emptyCell = (): ChecklistCellDetail => ({
    estado: 'PENDIENTE',
    actualizadoPor: null,
    responsableId: null,
    updatedAt: null,
  })
  return {
    ORDINARIA: emptyCell(),
    EXTRAORDINARIA: emptyCell(),
    REGULARIZACION: emptyCell(),
    PROMOCION_GRADO: emptyCell(),
    CIERRE_CICLO: emptyCell(),
  }
}

export function buildActasMatrix(params: {
  unidades: readonly UnidadAcademicaCatalogo[]
  programas: readonly ProgramaEducativoCatalogo[]
  checklistRows: readonly ChecklistActaDbRow[]
  periodo: Pick<PeriodoEscolarCatalogo, 'id' | 'numeroPeriodo' | 'nombre'>
}): ActaMatrixRow[] {
  const { unidades, programas, checklistRows, periodo } = params
  const uaMap = new Map(unidades.map((u) => [u.id, u]))
  const rowsByPrograma = new Map<number, ChecklistActaDbRow[]>()

  for (const item of checklistRows) {
    if (item.periodo_id !== periodo.id) {
      continue
    }
    const list = rowsByPrograma.get(item.programa_id)
    if (list) {
      list.push(item)
    } else {
      rowsByPrograma.set(item.programa_id, [item])
    }
  }

  const matrix: ActaMatrixRow[] = []

  for (const prog of programas) {
    const ua = uaMap.get(prog.unidadAcademicaId)
    if (!ua) {
      continue
    }

    const estados = createEmptyEstados()
    const detalles = createEmptyDetalles()
    const cells = rowsByPrograma.get(prog.id) ?? []

    let latestResponsableId: string | null = null
    let latestResponsableTs = ''
    let latestUpdatedAt: string | null = null

    for (const cell of cells) {
      estados[cell.tipo_acta] = cell.estado
      detalles[cell.tipo_acta] = {
        estado: cell.estado,
        actualizadoPor: cell.actualizado_por,
        responsableId: cell.responsable_id,
        updatedAt: cell.updated_at,
      }

      if (
        cell.updated_at &&
        (!latestUpdatedAt || cell.updated_at > latestUpdatedAt)
      ) {
        latestUpdatedAt = cell.updated_at
      }

      const candidateResponsable = cell.responsable_id ?? cell.actualizado_por
      if (candidateResponsable && cell.updated_at >= latestResponsableTs) {
        latestResponsableId = candidateResponsable
        latestResponsableTs = cell.updated_at
      }
    }

    matrix.push({
      programaId: prog.id,
      unidadAcademicaId: ua.id,
      claveUa: ua.claveUa,
      nombreUa: ua.nombre,
      nivel: ua.nivel,
      clavePrograma: prog.clavePrograma,
      nombrePrograma: prog.nombre,
      periodoId: periodo.id,
      numeroPeriodo: periodo.numeroPeriodo,
      periodoLabel: formatPeriodoCortoLabel(periodo.numeroPeriodo),
      periodoNombre: periodo.nombre,
      estados,
      detalles,
      responsableId: latestResponsableId,
      updatedAt: latestUpdatedAt,
    })
  }

  matrix.sort((a, b) => {
    const uaCmp = a.claveUa.localeCompare(b.claveUa, 'es', { numeric: true })
    if (uaCmp !== 0) {
      return uaCmp
    }
    return a.clavePrograma.localeCompare(b.clavePrograma, 'es', {
      numeric: true,
    })
  })

  return matrix
}

export function isActaRowCompleted(
  row: Pick<ActaMatrixRow, 'estados'>,
  activeColumns: readonly ActaColumnMeta[]
): boolean {
  if (activeColumns.length === 0) {
    return false
  }
  return activeColumns.every((col) => row.estados[col.key] !== 'PENDIENTE')
}

export function isEtapaCompleted(
  rows: readonly Pick<ActaMatrixRow, 'estados'>[],
  tipoActa: TipoActa
): boolean {
  if (rows.length === 0) {
    return false
  }
  return rows.every((row) => row.estados[tipoActa] !== 'PENDIENTE')
}

export function computeChecklistStats(
  rows: readonly ActaMatrixRow[],
  activeColumns: readonly ActaColumnMeta[]
): ChecklistMatrixStats {
  const totalProgramas = rows.length
  const completados = rows.filter((row) =>
    isActaRowCompleted(row, activeColumns)
  ).length
  const pendientes = totalProgramas - completados

  const porActa: ActaStageStats[] = activeColumns.map((col) => {
    let generadas = 0
    let pendingCount = 0
    let noAplica = 0

    for (const row of rows) {
      const estado = row.estados[col.key]
      if (estado === 'GENERADA') {
        generadas += 1
      } else if (estado === 'NO_APLICA') {
        noAplica += 1
      } else {
        pendingCount += 1
      }
    }

    return {
      key: col.key,
      order: col.order,
      shortLabel: col.shortLabel,
      label: col.label,
      generadas,
      pendientes: pendingCount,
      noAplica,
      aplicables: totalProgramas - noAplica,
      isStageCompleted: totalProgramas > 0 && pendingCount === 0,
    }
  })

  return {
    totalProgramas,
    completados,
    pendientes,
    isAllCompleted: totalProgramas > 0 && pendientes === 0,
    porActa,
  }
}

export function getInitialEtapaActiva(
  rows: readonly ActaMatrixRow[],
  activeColumns: readonly ActaColumnMeta[]
): EtapaChecklistFilter {
  if (activeColumns.length === 0) {
    return 'TODAS'
  }
  if (rows.length === 0) {
    return activeColumns[0].key
  }

  const firstPendingColumn = activeColumns.find((col) =>
    rows.some((row) => row.estados[col.key] === 'PENDIENTE')
  )
  return firstPendingColumn ? firstPendingColumn.key : 'TODAS'
}

export function resolveAutoAdvanceEtapa(params: {
  prevRows: readonly ActaMatrixRow[]
  nextRows: readonly ActaMatrixRow[]
  currentEtapa: EtapaChecklistFilter
  activeColumns: readonly ActaColumnMeta[]
}): {
  nextEtapa: EtapaChecklistFilter
  advancedFrom: ActaColumnMeta | null
  advancedTo: ActaColumnMeta | 'TODAS' | null
} {
  const { prevRows, nextRows, currentEtapa, activeColumns } = params

  if (currentEtapa === 'TODAS' || nextRows.length === 0) {
    return {
      nextEtapa: currentEtapa,
      advancedFrom: null,
      advancedTo: null,
    }
  }

  const currentIdx = activeColumns.findIndex((c) => c.key === currentEtapa)
  if (currentIdx === -1) {
    return {
      nextEtapa: activeColumns[0]?.key ?? 'TODAS',
      advancedFrom: null,
      advancedTo: null,
    }
  }

  const hadPendingBefore = prevRows.some(
    (row) => row.estados[currentEtapa] === 'PENDIENTE'
  )
  const hasPendingNow = nextRows.some(
    (row) => row.estados[currentEtapa] === 'PENDIENTE'
  )

  if (!hadPendingBefore || hasPendingNow) {
    return {
      nextEtapa: currentEtapa,
      advancedFrom: null,
      advancedTo: null,
    }
  }

  const currentCol = activeColumns[currentIdx]
  const orderedCandidates = [
    ...activeColumns.slice(currentIdx + 1),
    ...activeColumns.slice(0, currentIdx),
  ]
  const nextPendingCol = orderedCandidates.find((col) =>
    nextRows.some((row) => row.estados[col.key] === 'PENDIENTE')
  )

  if (nextPendingCol) {
    return {
      nextEtapa: nextPendingCol.key,
      advancedFrom: currentCol,
      advancedTo: nextPendingCol,
    }
  }

  return {
    nextEtapa: 'TODAS',
    advancedFrom: currentCol,
    advancedTo: 'TODAS',
  }
}

export function filterVisibleActaRows(params: {
  rows: readonly ActaMatrixRow[]
  activeColumns: readonly ActaColumnMeta[]
  etapaActiva: EtapaChecklistFilter
  unidadFilter: string
  searchQuery: string
  limpiezaAutomatica: boolean
  mostrarCompletadas: boolean
  responsablesMap: ReadonlyMap<string, string>
}): ActaMatrixRow[] {
  const {
    rows,
    activeColumns,
    etapaActiva,
    unidadFilter,
    searchQuery,
    limpiezaAutomatica,
    mostrarCompletadas,
    responsablesMap,
  } = params

  const query = searchQuery.trim().toLowerCase()
  const isAllPeriodCompleted =
    rows.length > 0 &&
    rows.every((row) => isActaRowCompleted(row, activeColumns))
  const isSelectedStageCompleted =
    etapaActiva !== 'TODAS' && isEtapaCompleted(rows, etapaActiva)

  const shouldAutoHideCompleted =
    limpiezaAutomatica &&
    !mostrarCompletadas &&
    (etapaActiva === 'TODAS' ? !isAllPeriodCompleted : !isSelectedStageCompleted)

  return rows.filter((row) => {
    if (shouldAutoHideCompleted) {
      const completedInScope =
        etapaActiva === 'TODAS'
          ? isActaRowCompleted(row, activeColumns)
          : row.estados[etapaActiva] !== 'PENDIENTE'
      if (completedInScope) {
        return false
      }
    }

    if (
      unidadFilter !== 'TODAS' &&
      String(row.unidadAcademicaId) !== unidadFilter
    ) {
      return false
    }

    if (!query) {
      return true
    }

    const responsableNombre = row.responsableId
      ? (responsablesMap.get(row.responsableId) ?? '')
      : ''

    return (
      row.claveUa.toLowerCase().includes(query) ||
      row.nombreUa.toLowerCase().includes(query) ||
      row.clavePrograma.toLowerCase().includes(query) ||
      row.nombrePrograma.toLowerCase().includes(query) ||
      responsableNombre.toLowerCase().includes(query) ||
      row.periodoLabel.toLowerCase().includes(query) ||
      row.periodoNombre.toLowerCase().includes(query)
    )
  })
}

export function validateUpsertActaInput(
  input: UpsertActaInput
): ValidationOutcome<UpsertActaInput> {
  if (!Number.isInteger(input.periodoId) || input.periodoId <= 0) {
    return {
      valid: false,
      field: 'periodoId',
      error: 'El periodo escolar seleccionado no es válido.',
    }
  }
  if (!Number.isInteger(input.numeroPeriodo) || input.numeroPeriodo <= 0) {
    return {
      valid: false,
      field: 'numeroPeriodo',
      error: 'El número de periodo escolar no es válido.',
    }
  }
  if (!Number.isInteger(input.programaId) || input.programaId <= 0) {
    return {
      valid: false,
      field: 'programaId',
      error: 'El programa educativo seleccionado no es válido.',
    }
  }
  if (!VALID_TIPOS_ACTA.includes(input.tipoActa)) {
    return {
      valid: false,
      field: 'tipoActa',
      error: 'El tipo de acta no es válido.',
    }
  }
  if (
    input.numeroPeriodo === 1 &&
    !PERIODO_1_ACTA_KEYS.includes(input.tipoActa)
  ) {
    return {
      valid: false,
      field: 'tipoActa',
      error:
        'El Periodo 1 solo admite actas Ordinaria, Extraordinaria y Regularización.',
    }
  }
  if (!VALID_ESTADOS_ACTA.includes(input.estado)) {
    return {
      valid: false,
      field: 'estado',
      error: 'El estado del acta no es válido.',
    }
  }
  if (
    input.responsableId !== undefined &&
    input.responsableId !== null &&
    !UUID_REGEX.test(input.responsableId)
  ) {
    return {
      valid: false,
      field: 'responsableId',
      error: 'El identificador del responsable no es válido.',
    }
  }

  return { valid: true, data: input }
}

export function validateAssignResponsableInput(
  input: AssignResponsableInput
): ValidationOutcome<AssignResponsableInput> {
  if (!Number.isInteger(input.periodoId) || input.periodoId <= 0) {
    return {
      valid: false,
      field: 'periodoId',
      error: 'El periodo escolar seleccionado no es válido.',
    }
  }
  if (!Number.isInteger(input.programaId) || input.programaId <= 0) {
    return {
      valid: false,
      field: 'programaId',
      error: 'El programa educativo seleccionado no es válido.',
    }
  }
  if (input.responsableId !== null && !UUID_REGEX.test(input.responsableId)) {
    return {
      valid: false,
      field: 'responsableId',
      error: 'El identificador del responsable no es válido.',
    }
  }

  return { valid: true, data: input }
}
