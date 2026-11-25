import {
  buildInitialPeriodos,
  buildInitialProgramas,
  buildInitialUnidades,
} from '@/features/catalogos/components/catalogosMockData'
import type {
  ChecklistActaDbRow,
  ResponsableActaOption,
} from '@/services/actas'
import type {
  PeriodoEscolarCatalogo,
  ProgramaEducativoCatalogo,
  UnidadAcademicaCatalogo,
} from '@/services/catalogos'

export const RESPONSABLES_ACTA_MOCK: ResponsableActaOption[] = [
  { id: '00000000-0000-0000-0000-000000000001', nombre: 'Admin', rol: 'ADMIN' },
  {
    id: '00000000-0000-0000-0000-000000000002',
    nombre: 'Iris',
    rol: 'LICENCIATURA',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    nombre: 'Juan Carlos',
    rol: 'BACHILLERATO',
  },
]

export function buildOfflineActasCatalogos(): {
  unidades: UnidadAcademicaCatalogo[]
  programas: ProgramaEducativoCatalogo[]
  periodos: PeriodoEscolarCatalogo[]
  responsables: ResponsableActaOption[]
} {
  const periodos = buildInitialPeriodos().map((p) =>
    p.id === 2
      ? {
          ...p,
          nombre: '2026-2027 Periodo 2',
          numeroPeriodo: 2,
          activo: false,
        }
      : {
          ...p,
          nombre: '2026-2027 Periodo 1',
          numeroPeriodo: 1,
          activo: true,
        }
  )

  return {
    unidades: buildInitialUnidades().filter((u) => u.activa),
    programas: buildInitialProgramas().filter((p) => p.activo),
    periodos,
    responsables: RESPONSABLES_ACTA_MOCK,
  }
}

export function buildOfflineChecklistRowsByPeriodo(
  periodos: readonly PeriodoEscolarCatalogo[]
): Record<number, ChecklistActaDbRow[]> {
  const map: Record<number, ChecklistActaDbRow[]> = {}

  for (const periodo of periodos) {
    if (periodo.numeroPeriodo === 1) {
      const ts = '2026-10-15T10:30:00Z'
      map[periodo.id] = [
        {
          id: 'mock-p1-101-ord',
          periodo_id: periodo.id,
          programa_id: 101,
          tipo_acta: 'ORDINARIA',
          estado: 'GENERADA',
          responsable_id: '00000000-0000-0000-0000-000000000002',
          actualizado_por: '00000000-0000-0000-0000-000000000002',
          updated_at: ts,
        },
        {
          id: 'mock-p1-201-ord',
          periodo_id: periodo.id,
          programa_id: 201,
          tipo_acta: 'ORDINARIA',
          estado: 'GENERADA',
          responsable_id: '00000000-0000-0000-0000-000000000002',
          actualizado_por: '00000000-0000-0000-0000-000000000002',
          updated_at: ts,
        },
        {
          id: 'mock-p1-201-ext',
          periodo_id: periodo.id,
          programa_id: 201,
          tipo_acta: 'EXTRAORDINARIA',
          estado: 'GENERADA',
          responsable_id: '00000000-0000-0000-0000-000000000002',
          actualizado_por: '00000000-0000-0000-0000-000000000002',
          updated_at: ts,
        },
        {
          id: 'mock-p1-201-reg',
          periodo_id: periodo.id,
          programa_id: 201,
          tipo_acta: 'REGULARIZACION',
          estado: 'GENERADA',
          responsable_id: '00000000-0000-0000-0000-000000000002',
          actualizado_por: '00000000-0000-0000-0000-000000000002',
          updated_at: ts,
        },
        {
          id: 'mock-p1-601-ord',
          periodo_id: periodo.id,
          programa_id: 601,
          tipo_acta: 'ORDINARIA',
          estado: 'GENERADA',
          responsable_id: '00000000-0000-0000-0000-000000000003',
          actualizado_por: '00000000-0000-0000-0000-000000000003',
          updated_at: ts,
        },
        {
          id: 'mock-p1-801-ord',
          periodo_id: periodo.id,
          programa_id: 801,
          tipo_acta: 'ORDINARIA',
          estado: 'GENERADA',
          responsable_id: '00000000-0000-0000-0000-000000000003',
          actualizado_por: '00000000-0000-0000-0000-000000000003',
          updated_at: ts,
        },
        {
          id: 'mock-p1-801-ext',
          periodo_id: periodo.id,
          programa_id: 801,
          tipo_acta: 'EXTRAORDINARIA',
          estado: 'GENERADA',
          responsable_id: '00000000-0000-0000-0000-000000000003',
          actualizado_por: '00000000-0000-0000-0000-000000000003',
          updated_at: ts,
        },
        {
          id: 'mock-p1-801-reg',
          periodo_id: periodo.id,
          programa_id: 801,
          tipo_acta: 'REGULARIZACION',
          estado: 'GENERADA',
          responsable_id: '00000000-0000-0000-0000-000000000003',
          actualizado_por: '00000000-0000-0000-0000-000000000003',
          updated_at: ts,
        },
      ]
    } else {
      map[periodo.id] = []
    }
  }

  return map
}
