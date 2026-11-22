import {
  PROGRAMAS_EDUCATIVOS_CATALOGO,
  UNIDADES_ACADEMICAS_CATALOGO,
} from '@/features/tramites/components/tramitesMockData'
import type { Enums } from '@/types/database.types'

export type TipoActaKey =
  | Enums<'tipo_acta'>
  | 'PROMOCION_GRADO'
  | 'CIERRE_CICLO'
export type EstadoActa = Enums<'estado_acta'>
export type PeriodoActaKey = 'PERIODO_1' | 'PERIODO_2'

export interface PeriodoActaOption {
  value: PeriodoActaKey
  numeroPeriodo: 1 | 2
  label: string
}

export interface ResponsableActaOption {
  id: string
  nombre: string
}

export const PERIODO_ACTA_OPTIONS: PeriodoActaOption[] = [
  { value: 'PERIODO_1', numeroPeriodo: 1, label: 'Periodo 1' },
  { value: 'PERIODO_2', numeroPeriodo: 2, label: 'Periodo 2' },
]

export const RESPONSABLES_ACTA_CATALOGO: ResponsableActaOption[] = [
  { id: '00000000-0000-0000-0000-000000000001', nombre: 'Administrador' },
  { id: '00000000-0000-0000-0000-000000000002', nombre: 'Iris' },
  { id: '00000000-0000-0000-0000-000000000003', nombre: 'Juan Carlos' },
  { id: '00000000-0000-0000-0000-000000000004', nombre: 'Ismael' },
]

export interface ActaMatrixRow {
  programaId: number
  unidadAcademicaId: number
  claveUa: string
  nombreUa: string
  nivel: 'BACHILLERATO' | 'LICENCIATURA'
  clavePrograma: string
  nombrePrograma: string
  estados: Record<TipoActaKey, EstadoActa>
  responsableId: string | null
  periodo: PeriodoActaKey | null
}

export interface ActaColumnMeta {
  key: TipoActaKey
  shortLabel: string
  label: string
  headerClass: string
}

export const ACTA_COLUMNS: ActaColumnMeta[] = [
  {
    key: 'ORDINARIA',
    shortLabel: 'Ord.',
    label: 'Ordinaria',
    headerClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  {
    key: 'EXTRAORDINARIA',
    shortLabel: 'Ext.',
    label: 'Extraordinaria',
    headerClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  },
  {
    key: 'REGULARIZACION',
    shortLabel: 'Reg.',
    label: 'Regularización',
    headerClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  {
    key: 'PROMOCION_GRADO',
    shortLabel: 'Prom.',
    label: 'Promoción de Grado',
    headerClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
  {
    key: 'CIERRE_CICLO',
    shortLabel: 'Cierre',
    label: 'Cierre de Ciclo',
    headerClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  },
]

/**
 * Un programa esta completo cuando ninguna de sus columnas aplicables sigue en PENDIENTE.
 */
export function isActaRowCompleted(row: ActaMatrixRow): boolean {
  return ACTA_COLUMNS.every(
    (col) => row.estados[col.key] !== 'PENDIENTE'
  )
}

export function getActaRowProgress(row: ActaMatrixRow): {
  done: number
  totalAplicables: number
} {
  let done = 0
  let totalAplicables = 0
  for (const col of ACTA_COLUMNS) {
    const estado = row.estados[col.key]
    if (estado !== 'NO_APLICA') {
      totalAplicables += 1
      if (estado === 'GENERADA') {
        done += 1
      }
    }
  }
  return { done, totalAplicables }
}

export function getPeriodoActaLabel(periodo: PeriodoActaKey | null): string {
  if (periodo === 'PERIODO_1') {
    return 'Periodo 1'
  }
  if (periodo === 'PERIODO_2') {
    return 'Periodo 2'
  }
  return 'Sin periodo'
}

export function resetCompletedActaRows(
  rows: ActaMatrixRow[],
  nivel: 'TODOS' | 'BACHILLERATO' | 'LICENCIATURA'
): { nextRows: ActaMatrixRow[]; reincorporatedCount: number } {
  let reincorporatedCount = 0

  const nextRows = rows.map((row) => {
    const matchesNivel = nivel === 'TODOS' || row.nivel === nivel
    if (!matchesNivel || !isActaRowCompleted(row)) {
      return row
    }

    reincorporatedCount += 1
    const allNoAplica = ACTA_COLUMNS.every(
      (col) => row.estados[col.key] === 'NO_APLICA'
    )

    const nextEstados = ACTA_COLUMNS.reduce(
      (acc, col) => {
        const current = row.estados[col.key]
        acc[col.key] =
          !allNoAplica && current === 'NO_APLICA' ? 'NO_APLICA' : 'PENDIENTE'
        return acc
      },
      {} as Record<TipoActaKey, EstadoActa>
    )

    return {
      ...row,
      estados: nextEstados,
      responsableId: null,
      periodo: null,
    }
  })

  return { nextRows, reincorporatedCount }
}

export function buildInitialActasMatrix(): ActaMatrixRow[] {
  const uaMap = new Map(UNIDADES_ACADEMICAS_CATALOGO.map((u) => [u.id, u]))

  return PROGRAMAS_EDUCATIVOS_CATALOGO.map((prog) => {
    const ua = uaMap.get(prog.unidadAcademicaId)
    const nivelUa = ua?.nivel ?? 'LICENCIATURA'
    const isCompletedUnit =
      prog.unidadAcademicaId === 2 || prog.unidadAcademicaId === 8
    const isPartialInformatica = prog.id === 601
    const isPartialMazatlan = prog.id === 101

    const estados: Record<TipoActaKey, EstadoActa> = {
      ORDINARIA:
        isCompletedUnit || isPartialInformatica || isPartialMazatlan
          ? 'GENERADA'
          : 'PENDIENTE',
      EXTRAORDINARIA:
        isCompletedUnit || isPartialInformatica ? 'GENERADA' : 'PENDIENTE',
      REGULARIZACION: isCompletedUnit
        ? 'GENERADA'
        : prog.unidadAcademicaId === 4
          ? 'NO_APLICA'
          : 'PENDIENTE',
      PROMOCION_GRADO: isCompletedUnit ? 'GENERADA' : 'PENDIENTE',
      CIERRE_CICLO: isCompletedUnit ? 'GENERADA' : 'PENDIENTE',
    }

    const defaultResponsableNivel =
      nivelUa === 'BACHILLERATO'
        ? '00000000-0000-0000-0000-000000000003'
        : '00000000-0000-0000-0000-000000000002'

    let responsableId: string | null = null
    let periodo: PeriodoActaKey | null = null

    if (isCompletedUnit || isPartialInformatica || isPartialMazatlan) {
      responsableId = defaultResponsableNivel
      periodo = 'PERIODO_1'
    } else if (prog.id === 102 || prog.id === 602) {
      responsableId = defaultResponsableNivel
      periodo = 'PERIODO_2'
    }

    return {
      programaId: prog.id,
      unidadAcademicaId: prog.unidadAcademicaId,
      claveUa: ua?.claveUa ?? '',
      nombreUa: ua?.nombre ?? '',
      nivel: nivelUa,
      clavePrograma: prog.clavePrograma,
      nombrePrograma: prog.nombre,
      estados,
      responsableId,
      periodo,
    }
  })
}

export { UNIDADES_ACADEMICAS_CATALOGO }
