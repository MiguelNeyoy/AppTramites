import {
  PROGRAMAS_EDUCATIVOS_CATALOGO,
  TIPOS_TRAMITE_CATALOGO,
  UNIDADES_ACADEMICAS_CATALOGO,
} from '@/features/tramites/components/tramitesMockData'

export type TipoActaKey = 'ORDINARIA' | 'EXTRAORDINARIA' | 'REGULARIZACION'

export interface TramiteConteoPrograma {
  tipoTramiteId: number
  tramiteNombre: string
  enviadas: number
  resueltas: number
  pendientes: number
  conError: number
}

export interface ProgramaChecklistItem {
  programaId: number
  unidadAcademicaId: number
  clavePrograma: string
  nombrePrograma: string
  actasResueltas: Record<TipoActaKey, boolean>
  tramitesPorTipo: Record<number, TramiteConteoPrograma>
}

export const TIPOS_ACTA_TABS: { id: TipoActaKey; label: string }[] = [
  { id: 'ORDINARIA', label: 'Actas Ordinarias' },
  { id: 'EXTRAORDINARIA', label: 'Actas Extraordinarias' },
  { id: 'REGULARIZACION', label: 'Regularización' },
]

export function buildInitialProgramasChecklist(): ProgramaChecklistItem[] {
  return PROGRAMAS_EDUCATIVOS_CATALOGO.map((prog) => {
    // Dejar unidades 2 (8210 Concordia), 4 (8230 Escuinapa) y 8 (4820 Ciencias Sociales)
    // completamente resueltas en ORDINARIA para mostrar ambas listas desde el inicio.
    const isUnitFullyResolvedOrd =
      prog.unidadAcademicaId === 2 ||
      prog.unidadAcademicaId === 4 ||
      prog.unidadAcademicaId === 8

    // En 4800 (Fac. Informática, id=6), dejar el programa 1 resuelto y 4, 5 pendientes como en la imagen de referencia
    const isProg1OfInformatica = prog.id === 601

    const ordinariaResuelta = isUnitFullyResolvedOrd || isProg1OfInformatica
    const extraordinariaResuelta =
      prog.unidadAcademicaId === 2 || prog.unidadAcademicaId === 8
    const regularizacionResuelta = prog.unidadAcademicaId === 2

    const defaultTramite = TIPOS_TRAMITE_CATALOGO[2] // Convalidación
    const initialCounts: Record<number, TramiteConteoPrograma> = {}

    if (prog.id === 601) {
      initialCounts[defaultTramite.id] = {
        tipoTramiteId: defaultTramite.id,
        tramiteNombre: defaultTramite.nombre,
        enviadas: 50,
        resueltas: 20,
        pendientes: 10,
        conError: 0,
      }
    } else if (prog.id === 701) {
      initialCounts[1] = {
        tipoTramiteId: 1,
        tramiteNombre: TIPOS_TRAMITE_CATALOGO[0].nombre,
        enviadas: 35,
        resueltas: 28,
        pendientes: 5,
        conError: 2,
      }
    }

    return {
      programaId: prog.id,
      unidadAcademicaId: prog.unidadAcademicaId,
      clavePrograma: prog.clavePrograma,
      nombrePrograma: prog.nombre,
      actasResueltas: {
        ORDINARIA: ordinariaResuelta,
        EXTRAORDINARIA: extraordinariaResuelta,
        REGULARIZACION: regularizacionResuelta,
      },
      tramitesPorTipo: initialCounts,
    }
  })
}

export { UNIDADES_ACADEMICAS_CATALOGO, TIPOS_TRAMITE_CATALOGO }
