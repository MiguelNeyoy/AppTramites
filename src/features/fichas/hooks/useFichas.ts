import * as React from 'react'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import {
  buildInitialPeriodos,
  buildInitialProgramas,
  buildInitialUnidades,
} from '@/features/catalogos/components/catalogosMockData'
import type {
  PeriodoEscolarCatalogo,
  ProgramaEducativoCatalogo,
  UnidadAcademicaCatalogo,
} from '@/services/catalogos'
import {
  createFichaNuevoIngreso,
  deleteFichaNuevoIngreso,
  downloadFichasXlsx,
  fetchCatalogosParaFichas,
  fetchFichasNuevoIngreso,
  updateFichaNuevoIngreso,
  type FichaNuevoIngresoInput,
  type FichaNuevoIngresoRecord,
} from '@/services/fichas'
import { mapSupabaseError } from '@/services/shared'
import { buildInitialFichasMock } from '../components/fichasMockData'

interface FichasSnapshot {
  fichas: FichaNuevoIngresoRecord[]
  unidades: UnidadAcademicaCatalogo[]
  programas: ProgramaEducativoCatalogo[]
  periodos: PeriodoEscolarCatalogo[]
  isOfflinePreview: boolean
  errorMessage?: string
}

async function resolveFichasSnapshot(): Promise<FichasSnapshot> {
  const buildLocalPreview = (errorMessage?: string): FichasSnapshot => ({
    fichas: buildInitialFichasMock(),
    unidades: buildInitialUnidades().filter((u) => u.activa),
    programas: buildInitialProgramas().filter((p) => p.activo),
    periodos: buildInitialPeriodos(),
    isOfflinePreview: true,
    errorMessage,
  })

  try {
    const { data: sessionRes } = await supabase.auth.getSession()
    if (!sessionRes.session) {
      return buildLocalPreview()
    }

    const [fichas, catalogos] = await Promise.all([
      fetchFichasNuevoIngreso(),
      fetchCatalogosParaFichas(),
    ])

    return {
      fichas,
      unidades: catalogos.unidades,
      programas: catalogos.programas,
      periodos: catalogos.periodos,
      isOfflinePreview: false,
    }
  } catch (error) {
    const mapped = mapSupabaseError(error)
    if (mapped.code === 'NETWORK_ERROR') {
      return buildLocalPreview(mapped.message)
    }
    return {
      fichas: [],
      unidades: [],
      programas: [],
      periodos: [],
      isOfflinePreview: false,
      errorMessage: mapped.message,
    }
  }
}

/**
 * Hook de estado, mutaciones y exportacion Excel para Fichas de Nuevo Ingreso.
 */
export function useFichas() {
  const [fichas, setFichas] = React.useState<FichaNuevoIngresoRecord[]>([])
  const [unidades, setUnidades] = React.useState<UnidadAcademicaCatalogo[]>([])
  const [programas, setProgramas] = React.useState<ProgramaEducativoCatalogo[]>([])
  const [periodos, setPeriodos] = React.useState<PeriodoEscolarCatalogo[]>([])
  const [selectedPeriodoId, setSelectedPeriodoId] = React.useState<number>(1)

  const [isLoading, setIsLoading] = React.useState(true)
  const [isMutating, setIsMutating] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isOfflinePreview, setIsOfflinePreview] = React.useState(false)

  const applyResolvedSnapshot = React.useCallback((resolved: FichasSnapshot) => {
    setFichas(resolved.fichas)
    setUnidades(resolved.unidades)
    setProgramas(resolved.programas)
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

  const loadFichas = React.useCallback(async () => {
    setIsLoading(true)
    const resolved = await resolveFichasSnapshot()
    applyResolvedSnapshot(resolved)
  }, [applyResolvedSnapshot])

  React.useEffect(() => {
    let active = true
    const bootstrap = async () => {
      const resolved = await resolveFichasSnapshot()
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

  const handleCreateFicha = React.useCallback(
    async (draft: FichaNuevoIngresoRecord): Promise<boolean> => {
      const input: FichaNuevoIngresoInput = {
        curp: draft.curp,
        aPaterno: draft.aPaterno,
        aMaterno: draft.aMaterno,
        nombre: draft.nombre,
        sexo: draft.sexo,
        unidadAcademicaId: draft.unidadAcademicaId,
        programaId: draft.programaId,
        fechaNacimiento: draft.fechaNacimiento,
        celular: draft.celular,
        correo: draft.correo,
        estatusFicha: draft.estatusFicha,
        periodoId: draft.periodoId || selectedPeriodoId,
      }

      if (isOfflinePreview) {
        setFichas((prev) => [{ ...draft, periodoId: input.periodoId }, ...prev])
        toast.success(
          `Ficha de ${draft.curp} registrada (vista previa local).`
        )
        return true
      }

      return runMutation(async () => {
        const created = await createFichaNuevoIngreso(input)
        setFichas((prev) => [created, ...prev])
        return `Ficha de ${created.curp} registrada en ${created.claveEscuela}.`
      })
    },
    [isOfflinePreview, runMutation, selectedPeriodoId]
  )

  const handleUpdateFicha = React.useCallback(
    async (draft: FichaNuevoIngresoRecord): Promise<boolean> => {
      const input: FichaNuevoIngresoInput = {
        curp: draft.curp,
        aPaterno: draft.aPaterno,
        aMaterno: draft.aMaterno,
        nombre: draft.nombre,
        sexo: draft.sexo,
        unidadAcademicaId: draft.unidadAcademicaId,
        programaId: draft.programaId,
        fechaNacimiento: draft.fechaNacimiento,
        celular: draft.celular,
        correo: draft.correo,
        estatusFicha: draft.estatusFicha,
        periodoId: draft.periodoId || selectedPeriodoId,
      }

      if (isOfflinePreview) {
        setFichas((prev) =>
          prev.map((item) => (item.id === draft.id ? draft : item))
        )
        toast.success(
          `Ficha de ${draft.curp} actualizada (vista previa local).`
        )
        return true
      }

      return runMutation(async () => {
        const updated = await updateFichaNuevoIngreso(draft.id, input)
        setFichas((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        )
        return `Ficha de ${updated.curp} actualizada.`
      })
    },
    [isOfflinePreview, runMutation, selectedPeriodoId]
  )

  const handleDeleteFicha = React.useCallback(
    async (ficha: FichaNuevoIngresoRecord): Promise<boolean> => {
      if (isOfflinePreview) {
        setFichas((prev) => prev.filter((item) => item.id !== ficha.id))
        toast.success(`Ficha de ${ficha.curp} eliminada de la vista previa.`)
        return true
      }

      return runMutation(async () => {
        await deleteFichaNuevoIngreso(ficha.id)
        setFichas((prev) => prev.filter((item) => item.id !== ficha.id))
        return `Ficha de ${ficha.curp} eliminada del padrón.`
      })
    },
    [isOfflinePreview, runMutation]
  )

  const handleExportExcel = React.useCallback(
    async (rowsToExport: FichaNuevoIngresoRecord[]): Promise<boolean> => {
      if (rowsToExport.length === 0) {
        toast.error('No hay fichas visibles para exportar a Excel.')
        return false
      }

      setIsExporting(true)
      try {
        const activePeriodo = periodos.find((p) => p.id === selectedPeriodoId)
        const cicloLabel = activePeriodo?.nombre.split(' ')[0] ?? '2026-2027'
        const fileName = await downloadFichasXlsx(rowsToExport, { cicloLabel })
        toast.success(
          `Archivo ${fileName} descargado con ${rowsToExport.length} registro(s).`
        )
        return true
      } catch {
        toast.error('No se pudo generar el archivo .xlsx de Nuevo Ingreso.')
        return false
      } finally {
        setIsExporting(false)
      }
    },
    [periodos, selectedPeriodoId]
  )

  return {
    fichas,
    unidades,
    programas,
    periodos,
    selectedPeriodoId,
    setSelectedPeriodoId,
    isLoading,
    isMutating,
    isExporting,
    isOfflinePreview,
    reloadFichas: loadFichas,
    handleCreateFicha,
    handleUpdateFicha,
    handleDeleteFicha,
    handleExportExcel,
  }
}
