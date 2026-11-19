import * as React from 'react'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import {
  buildInitialPeriodos,
  buildInitialProgramas,
  buildInitialTiposTramite,
  buildInitialUnidades,
} from '@/features/catalogos/components/catalogosMockData'
import type {
  PeriodoEscolarCatalogo,
  ProgramaEducativoCatalogo,
  TipoTramiteCatalogo,
  UnidadAcademicaCatalogo,
} from '@/services/catalogos'
import {
  createFichaNuevoIngreso,
  type FichaNuevoIngresoRecord,
} from '@/services/fichas'
import { mapSupabaseError } from '@/services/shared'
import {
  createTramiteAlumno,
  deleteTramiteAlumno,
  fetchCatalogosParaTramites,
  fetchTramitesAlumnos,
  updateEstadoTramiteAlumno,
  updateTramiteAlumno,
  type EstadoTramiteAlumno,
  type TramiteAlumnoInput,
  type TramiteAlumnoRecord,
} from '@/services/tramites'
import { buildInitialTramitesAlumnosMock } from '../components/tramitesMockData'

interface TramitesSnapshot {
  tramites: TramiteAlumnoRecord[]
  unidades: UnidadAcademicaCatalogo[]
  programas: ProgramaEducativoCatalogo[]
  tiposTramite: TipoTramiteCatalogo[]
  periodos: PeriodoEscolarCatalogo[]
  isOfflinePreview: boolean
  errorMessage?: string
}

async function resolveTramitesSnapshot(): Promise<TramitesSnapshot> {
  const buildLocalPreview = (errorMessage?: string): TramitesSnapshot => ({
    tramites: buildInitialTramitesAlumnosMock(),
    unidades: buildInitialUnidades().filter((u) => u.activa),
    programas: buildInitialProgramas().filter((p) => p.activo),
    tiposTramite: buildInitialTiposTramite().filter((t) => t.activo),
    periodos: buildInitialPeriodos(),
    isOfflinePreview: true,
    errorMessage,
  })

  try {
    const { data: sessionRes } = await supabase.auth.getSession()
    if (!sessionRes.session) {
      return buildLocalPreview()
    }

    const [tramites, catalogos] = await Promise.all([
      fetchTramitesAlumnos(),
      fetchCatalogosParaTramites(),
    ])

    return {
      tramites,
      unidades: catalogos.unidades,
      programas: catalogos.programas,
      tiposTramite: catalogos.tiposTramite,
      periodos: catalogos.periodos,
      isOfflinePreview: false,
    }
  } catch (error) {
    const mapped = mapSupabaseError(error)
    if (mapped.code === 'NETWORK_ERROR') {
      return buildLocalPreview(mapped.message)
    }
    return {
      tramites: [],
      unidades: [],
      programas: [],
      tiposTramite: [],
      periodos: [],
      isOfflinePreview: false,
      errorMessage: mapped.message,
    }
  }
}

/**
 * Hook de estado y mutaciones para el registro de tramites por alumno (#7 y #14).
 */
export function useTramites() {
  const [tramites, setTramites] = React.useState<TramiteAlumnoRecord[]>([])
  const [unidades, setUnidades] = React.useState<UnidadAcademicaCatalogo[]>([])
  const [programas, setProgramas] = React.useState<ProgramaEducativoCatalogo[]>([])
  const [tiposTramite, setTiposTramite] = React.useState<TipoTramiteCatalogo[]>([])
  const [periodos, setPeriodos] = React.useState<PeriodoEscolarCatalogo[]>([])
  const [selectedPeriodoId, setSelectedPeriodoId] = React.useState<number>(1)

  const [isLoading, setIsLoading] = React.useState(true)
  const [isMutating, setIsMutating] = React.useState(false)
  const [isOfflinePreview, setIsOfflinePreview] = React.useState(false)

  const applyResolvedSnapshot = React.useCallback((resolved: TramitesSnapshot) => {
    setTramites(resolved.tramites)
    setUnidades(resolved.unidades)
    setProgramas(resolved.programas)
    setTiposTramite(resolved.tiposTramite)
    setPeriodos(resolved.periodos)
    setIsOfflinePreview(resolved.isOfflinePreview)

    const activePeriodo =
      resolved.periodos.find((p) => p.activo) ?? resolved.periodos[0]
    if (activePeriodo) {
      setSelectedPeriodoId(activePeriodo.id)
    }

    if (resolved.errorMessage) {
      toast.error(resolved.errorMessage)
    }
    setIsLoading(false)
  }, [])

  const loadTramites = React.useCallback(async () => {
    setIsLoading(true)
    const resolved = await resolveTramitesSnapshot()
    applyResolvedSnapshot(resolved)
  }, [applyResolvedSnapshot])

  React.useEffect(() => {
    let active = true
    const bootstrap = async () => {
      const resolved = await resolveTramitesSnapshot()
      if (!active) {
        return
      }
      applyResolvedSnapshot(resolved)
    }
    void bootstrap()
    return () => {
      active = false
    }
  }, [applyResolvedSnapshot])

  const runMutation = React.useCallback(
    async (action: () => Promise<string>): Promise<boolean> => {
      setIsMutating(true)
      try {
        const message = await action()
        toast.success(message)
        return true
      } catch (error) {
        toast.error(mapSupabaseError(error).message)
        return false
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const handleSaveTramite = React.useCallback(
    async (input: TramiteAlumnoInput, editId?: string): Promise<boolean> => {
      const effectiveInput: TramiteAlumnoInput = {
        ...input,
        periodoId: input.periodoId || selectedPeriodoId,
      }

      if (isOfflinePreview) {
        const prog = programas.find((p) => p.id === effectiveInput.programaId)
        const ua = unidades.find((u) => u.id === prog?.unidadAcademicaId)
        const tipo = tiposTramite.find((t) => t.id === effectiveInput.tipoTramiteId)

        if (editId) {
          setTramites((prev) =>
            prev.map((row) =>
              row.id === editId
                ? {
                    ...row,
                    ...effectiveInput,
                    clavePrograma: prog?.clavePrograma ?? row.clavePrograma,
                    nombrePrograma: prog?.nombre ?? row.nombrePrograma,
                    unidadAcademicaId: ua?.id ?? row.unidadAcademicaId,
                    claveUa: ua?.claveUa ?? row.claveUa,
                    nombreUa: ua?.nombre ?? row.nombreUa,
                    nivel: ua?.nivel ?? row.nivel,
                    nombreTramite: tipo?.nombre ?? row.nombreTramite,
                    permitePdf: tipo?.permitePdf ?? row.permitePdf,
                    observaciones: effectiveInput.observaciones ?? null,
                    archivoPdfUrl: effectiveInput.archivoPdfUrl ?? null,
                  }
                : row
            )
          )
          toast.success('Trámite actualizado (vista previa local).')
          return true
        }

        const nextFolio =
          tramites.reduce((max, r) => Math.max(max, r.folio), 100) + 1
        const createdMock: TramiteAlumnoRecord = {
          id: `tr-${Date.now()}`,
          folio: nextFolio,
          numeroCuenta: effectiveInput.numeroCuenta.trim(),
          nombreAlumno: effectiveInput.nombreAlumno.trim().toUpperCase(),
          programaId: effectiveInput.programaId,
          clavePrograma: prog?.clavePrograma ?? '',
          nombrePrograma: prog?.nombre ?? '',
          unidadAcademicaId: ua?.id ?? 0,
          claveUa: ua?.claveUa ?? '',
          nombreUa: ua?.nombre ?? '',
          nivel: ua?.nivel ?? 'LICENCIATURA',
          tipoTramiteId: effectiveInput.tipoTramiteId,
          nombreTramite: tipo?.nombre ?? 'Trámite',
          permitePdf: tipo?.permitePdf ?? false,
          periodoId: effectiveInput.periodoId,
          fechaRegistro: effectiveInput.fechaRegistro,
          estado: effectiveInput.estado,
          observaciones: effectiveInput.observaciones ?? null,
          archivoPdfUrl: effectiveInput.archivoPdfUrl ?? null,
          createdAt: new Date().toISOString(),
        }
        setTramites((prev) => [createdMock, ...prev])
        toast.success(
          `Trámite registrado con folio #${createdMock.folio} (vista previa local).`
        )
        return true
      }

      if (editId) {
        return runMutation(async () => {
          const updated = await updateTramiteAlumno(editId, effectiveInput)
          setTramites((prev) =>
            prev.map((row) => (row.id === updated.id ? updated : row))
          )
          return `Trámite folio #${updated.folio} actualizado.`
        })
      }

      return runMutation(async () => {
        const created = await createTramiteAlumno(effectiveInput)
        setTramites((prev) => [created, ...prev])
        return `Trámite registrado con folio #${created.folio}.`
      })
    },
    [
      isOfflinePreview,
      programas,
      runMutation,
      selectedPeriodoId,
      tiposTramite,
      tramites,
      unidades,
    ]
  )

  const handleChangeEstado = React.useCallback(
    async (
      tramite: TramiteAlumnoRecord,
      nextEstado: EstadoTramiteAlumno
    ): Promise<boolean> => {
      if (tramite.estado === nextEstado) {
        return true
      }

      if (isOfflinePreview) {
        setTramites((prev) =>
          prev.map((row) =>
            row.id === tramite.id ? { ...row, estado: nextEstado } : row
          )
        )
        toast.info(`Folio #${tramite.folio} marcado como ${nextEstado}.`)
        return true
      }

      return runMutation(async () => {
        const updated = await updateEstadoTramiteAlumno(tramite.id, nextEstado)
        setTramites((prev) =>
          prev.map((row) => (row.id === updated.id ? updated : row))
        )
        return `Folio #${updated.folio} actualizado a ${updated.estado}.`
      })
    },
    [isOfflinePreview, runMutation]
  )

  const handleDeleteTramite = React.useCallback(
    async (tramite: TramiteAlumnoRecord): Promise<boolean> => {
      if (isOfflinePreview) {
        setTramites((prev) => prev.filter((row) => row.id !== tramite.id))
        toast.success(`Trámite folio #${tramite.folio} eliminado de la vista previa.`)
        return true
      }

      return runMutation(async () => {
        await deleteTramiteAlumno(tramite.id)
        setTramites((prev) => prev.filter((row) => row.id !== tramite.id))
        return `Trámite folio #${tramite.folio} eliminado.`
      })
    },
    [isOfflinePreview, runMutation]
  )

  /**
   * Permite que al seleccionar "Fichas de nuevo ingreso" desde el mismo modal adaptativo
   * tambien persista en public.fichas_nuevo_ingreso sin duplicar logica.
   */
  const handleSaveFichaDesdeModal = React.useCallback(
    async (ficha: FichaNuevoIngresoRecord): Promise<boolean> => {
      if (isOfflinePreview) {
        toast.success(
          `Ficha de ${ficha.curp} registrada (vista previa local).`
        )
        return true
      }

      return runMutation(async () => {
        const created = await createFichaNuevoIngreso({
          curp: ficha.curp,
          aPaterno: ficha.aPaterno,
          aMaterno: ficha.aMaterno,
          nombre: ficha.nombre,
          sexo: ficha.sexo,
          unidadAcademicaId: ficha.unidadAcademicaId,
          programaId: ficha.programaId,
          fechaNacimiento: ficha.fechaNacimiento,
          celular: ficha.celular,
          correo: ficha.correo,
          estatusFicha: ficha.estatusFicha,
          periodoId: ficha.periodoId || selectedPeriodoId,
        })
        return `Ficha de ${created.curp} registrada en Nuevo Ingreso (${created.claveEscuela}).`
      })
    },
    [isOfflinePreview, runMutation, selectedPeriodoId]
  )

  return {
    tramites,
    unidades,
    programas,
    tiposTramite,
    periodos,
    selectedPeriodoId,
    setSelectedPeriodoId,
    isLoading,
    isMutating,
    isOfflinePreview,
    reloadTramites: loadTramites,
    handleSaveTramite,
    handleChangeEstado,
    handleDeleteTramite,
    handleSaveFichaDesdeModal,
  }
}
