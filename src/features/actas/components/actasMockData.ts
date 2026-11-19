import {
  PROGRAMAS_EDUCATIVOS_CATALOGO,
  UNIDADES_ACADEMICAS_CATALOGO,
} from '@/features/tramites/components/tramitesMockData'
import type { Enums } from '@/types/database.types'

export type TipoActaKey = Enums<'tipo_acta'>
export type EstadoActa = Enums<'estado_acta'>

export interface ActaMatrixRow {
  programaId: number
  unidadAcademicaId: number
  claveUa: string
  nombreUa: string
  nivel: 'BACHILLERATO' | 'LICENCIATURA'
  clavePrograma: string
  nombrePrograma: string
  estados: Record<TipoActaKey, EstadoActa>
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
]

/**
 * Un programa esta completo cuando ninguna de sus 3 actas sigue en PENDIENTE.
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

export function buildInitialActasMatrix(): ActaMatrixRow[] {
  const uaMap = new Map(UNIDADES_ACADEMICAS_CATALOGO.map((u) => [u.id, u]))

  return PROGRAMAS_EDUCATIVOS_CATALOGO.map((prog) => {
    const ua = uaMap.get(prog.unidadAcademicaId)
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
    }

    return {
      programaId: prog.id,
      unidadAcademicaId: prog.unidadAcademicaId,
      claveUa: ua?.claveUa ?? '',
      nombreUa: ua?.nombre ?? '',
      nivel: ua?.nivel ?? 'LICENCIATURA',
      clavePrograma: prog.clavePrograma,
      nombrePrograma: prog.nombre,
      estados,
    }
  })
}

export { UNIDADES_ACADEMICAS_CATALOGO }
