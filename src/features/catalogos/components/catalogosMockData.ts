import {
  PROGRAMAS_EDUCATIVOS_CATALOGO,
  TIPOS_TRAMITE_CATALOGO,
  UNIDADES_ACADEMICAS_CATALOGO,
} from '@/features/tramites/components/tramitesMockData'
import type {
  PeriodoEscolarCatalogo,
  ProgramaEducativoCatalogo,
  TipoTramiteCatalogo,
  UnidadAcademicaCatalogo,
} from '@/services/catalogos'

export type {
  PeriodoEscolarCatalogo,
  ProgramaEducativoCatalogo,
  TipoTramiteCatalogo,
  UnidadAcademicaCatalogo,
}

export function buildInitialUnidades(): UnidadAcademicaCatalogo[] {
  const base: UnidadAcademicaCatalogo[] = UNIDADES_ACADEMICAS_CATALOGO.map((ua) => ({
    ...ua,
    activa: true,
  }))

  return [
    ...base,
    {
      id: 10,
      claveUa: '8212',
      nombre: 'Preparatoria Concordia Ext. Potrerillos',
      nivel: 'BACHILLERATO',
      activa: true,
    },
    {
      id: 11,
      claveUa: '8231',
      nombre: 'Preparatoria Escuinapa Ext. Isla del Bosque',
      nivel: 'BACHILLERATO',
      activa: false,
    },
  ]
}

export function buildInitialProgramas(): ProgramaEducativoCatalogo[] {
  const base: ProgramaEducativoCatalogo[] = PROGRAMAS_EDUCATIVOS_CATALOGO.map(
    (prog) => ({
      ...prog,
      activo: true,
    })
  )

  return [
    ...base,
    {
      id: 1001,
      unidadAcademicaId: 10,
      clavePrograma: '1',
      nombre: 'Bachillerato General',
      activo: true,
    },
    {
      id: 1101,
      unidadAcademicaId: 11,
      clavePrograma: '1',
      nombre: 'Bachillerato General (Inactivo)',
      activo: false,
    },
  ]
}

export function buildInitialTiposTramite(): TipoTramiteCatalogo[] {
  return TIPOS_TRAMITE_CATALOGO.map((t) => ({
    ...t,
    activo: true,
  }))
}

export function buildInitialPeriodos(): PeriodoEscolarCatalogo[] {
  return [
    {
      id: 1,
      nombre: '2026-2027',
      numeroPeriodo: 1,
      fechaInicio: '2026-08-18',
      fechaFin: '2027-01-31',
      activo: true,
    },
    {
      id: 2,
      nombre: '2025-2026',
      numeroPeriodo: 2,
      fechaInicio: '2026-02-02',
      fechaFin: '2026-07-15',
      activo: false,
    },
  ]
}
