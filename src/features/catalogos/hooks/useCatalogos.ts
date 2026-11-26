import * as React from 'react'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import {
  createPeriodoEscolar,
  createProgramaEducativo,
  createTipoTramite,
  createUnidadAcademica,
  deletePeriodoEscolar,
  deleteProgramaEducativo,
  deleteTipoTramite,
  deleteUnidadAcademica,
  deriveCicloEscolar,
  fetchAllCatalogos,
  generarSiguienteCicloEscolar,
  updatePeriodoEscolar,
  updateProgramaEducativo,
  updateTipoTramite,
  updateUnidadAcademica,
  type PeriodoEscolarCatalogo,
  type PeriodoEscolarInput,
  type ProgramaEducativoCatalogo,
  type ProgramaEducativoInput,
  type TipoTramiteCatalogo,
  type TipoTramiteInput,
  type UnidadAcademicaCatalogo,
  type UnidadAcademicaInput,
} from '@/services/catalogos'
import { mapSupabaseError } from '@/services/shared'
import {
  buildInitialPeriodos,
  buildInitialProgramas,
  buildInitialTiposTramite,
  buildInitialUnidades,
} from '../components/catalogosMockData'

export type DeleteTarget =
  | { kind: 'unidad'; item: UnidadAcademicaCatalogo }
  | { kind: 'programa'; item: ProgramaEducativoCatalogo }
  | { kind: 'tramite'; item: TipoTramiteCatalogo }
  | { kind: 'periodo'; item: PeriodoEscolarCatalogo }

async function resolveCatalogosSnapshot(): Promise<{
  unidades: UnidadAcademicaCatalogo[]
  programas: ProgramaEducativoCatalogo[]
  tramites: TipoTramiteCatalogo[]
  periodos: PeriodoEscolarCatalogo[]
  isOfflinePreview: boolean
  errorMessage?: string
}> {
  const buildLocalPreview = (errorMessage?: string) => ({
    unidades: buildInitialUnidades(),
    programas: buildInitialProgramas(),
    tramites: buildInitialTiposTramite(),
    periodos: buildInitialPeriodos(),
    isOfflinePreview: true,
    errorMessage,
  })

  try {
    const { data: sessionRes } = await supabase.auth.getSession()
    if (!sessionRes.session) {
      return buildLocalPreview()
    }

    const snapshot = await fetchAllCatalogos()
    return {
      unidades: snapshot.unidades,
      programas: snapshot.programas,
      tramites: snapshot.tiposTramite,
      periodos: snapshot.periodos,
      isOfflinePreview: false,
    }
  } catch (error) {
    const mapped = mapSupabaseError(error)
    if (mapped.code === 'NETWORK_ERROR') {
      return buildLocalPreview(mapped.message)
    }
    return {
      unidades: [],
      programas: [],
      tramites: [],
      periodos: [],
      isOfflinePreview: false,
      errorMessage: mapped.message,
    }
  }
}

export function useCatalogos() {
  const [unidades, setUnidades] = React.useState<UnidadAcademicaCatalogo[]>([])
  const [programas, setProgramas] = React.useState<ProgramaEducativoCatalogo[]>([])
  const [tramites, setTramites] = React.useState<TipoTramiteCatalogo[]>([])
  const [periodos, setPeriodos] = React.useState<PeriodoEscolarCatalogo[]>([])

  const [isLoading, setIsLoading] = React.useState(true)
  const [isMutating, setIsMutating] = React.useState(false)
  const [isOfflinePreview, setIsOfflinePreview] = React.useState(false)

  const applyResolvedSnapshot = React.useCallback(
    (resolved: Awaited<ReturnType<typeof resolveCatalogosSnapshot>>) => {
      setUnidades(resolved.unidades)
      setProgramas(resolved.programas)
      setTramites(resolved.tramites)
      setPeriodos(resolved.periodos)
      setIsOfflinePreview(resolved.isOfflinePreview)
      if (resolved.errorMessage) {
        toast.error(resolved.errorMessage)
      }
      setIsLoading(false)
    },
    []
  )

  const loadCatalogos = React.useCallback(async () => {
    setIsLoading(true)
    const resolved = await resolveCatalogosSnapshot()
    applyResolvedSnapshot(resolved)
  }, [applyResolvedSnapshot])

  React.useEffect(() => {
    let active = true

    const bootstrap = async () => {
      const resolved = await resolveCatalogosSnapshot()
      if (!active) {
        return
      }
      setUnidades(resolved.unidades)
      setProgramas(resolved.programas)
      setTramites(resolved.tramites)
      setPeriodos(resolved.periodos)
      setIsOfflinePreview(resolved.isOfflinePreview)
      if (resolved.errorMessage) {
        toast.error(resolved.errorMessage)
      }
      setIsLoading(false)
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [])

  const saveUnidad = async (
    payload: UnidadAcademicaInput,
    editId?: number
  ): Promise<number | null> => {
    if (isOfflinePreview) {
      if (editId !== undefined) {
        setUnidades((prev) =>
          prev.map((u) => (u.id === editId ? { ...u, ...payload } : u))
        )
        toast.success(`Unidad "${payload.nombre}" actualizada (vista previa).`)
        return editId
      }
      const nextId = Math.max(0, ...unidades.map((u) => u.id)) + 1
      setUnidades((prev) => [{ id: nextId, ...payload }, ...prev])
      toast.success(`Unidad "${payload.nombre}" agregada (vista previa).`)
      return nextId
    }

    setIsMutating(true)
    try {
      if (editId !== undefined) {
        const updated = await updateUnidadAcademica(editId, payload)
        setUnidades((prev) => prev.map((u) => (u.id === editId ? updated : u)))
        toast.success(`Unidad "${updated.nombre}" actualizada.`)
        return updated.id
      }
      const created = await createUnidadAcademica(payload)
      setUnidades((prev) => [created, ...prev])
      toast.success(`Unidad "${created.nombre}" agregada al catálogo.`)
      return created.id
    } catch (error) {
      toast.error(mapSupabaseError(error).message)
      return null
    } finally {
      setIsMutating(false)
    }
  }

  const toggleUnidadActiva = async (ua: UnidadAcademicaCatalogo) => {
    const nextState = !ua.activa
    if (isOfflinePreview) {
      setUnidades((prev) =>
        prev.map((u) => (u.id === ua.id ? { ...u, activa: nextState } : u))
      )
      toast.info(`"${ua.nombre}" marcada como ${nextState ? 'activa' : 'inactiva'}.`)
      return
    }

    setIsMutating(true)
    try {
      const updated = await updateUnidadAcademica(ua.id, { activa: nextState })
      setUnidades((prev) => prev.map((u) => (u.id === ua.id ? updated : u)))
      toast.info(
        `"${updated.nombre}" marcada como ${updated.activa ? 'activa' : 'inactiva'}.`
      )
    } catch (error) {
      toast.error(mapSupabaseError(error).message)
    } finally {
      setIsMutating(false)
    }
  }

  const savePrograma = async (
    payload: ProgramaEducativoInput,
    editId?: number
  ): Promise<boolean> => {
    if (isOfflinePreview) {
      if (editId !== undefined) {
        setProgramas((prev) =>
          prev.map((p) => (p.id === editId ? { ...p, ...payload } : p))
        )
        toast.success(`Programa "${payload.nombre}" actualizado (vista previa).`)
        return true
      }
      const nextId = Math.max(0, ...programas.map((p) => p.id)) + 1
      setProgramas((prev) => [...prev, { id: nextId, ...payload }])
      toast.success(`Programa "${payload.nombre}" agregado (vista previa).`)
      return true
    }

    setIsMutating(true)
    try {
      if (editId !== undefined) {
        const updated = await updateProgramaEducativo(editId, payload)
        setProgramas((prev) => prev.map((p) => (p.id === editId ? updated : p)))
        toast.success(`Programa "${updated.nombre}" actualizado.`)
        return true
      }
      const created = await createProgramaEducativo(payload)
      setProgramas((prev) => [...prev, created])
      toast.success(`Programa "${created.nombre}" agregado.`)
      return true
    } catch (error) {
      toast.error(mapSupabaseError(error).message)
      return false
    } finally {
      setIsMutating(false)
    }
  }

  const toggleProgramaActivo = async (prog: ProgramaEducativoCatalogo) => {
    const nextState = !prog.activo
    if (isOfflinePreview) {
      setProgramas((prev) =>
        prev.map((p) => (p.id === prog.id ? { ...p, activo: nextState } : p))
      )
      toast.info(
        `"${prog.nombre}" marcado como ${nextState ? 'activo' : 'inactivo'}.`
      )
      return
    }

    setIsMutating(true)
    try {
      const updated = await updateProgramaEducativo(prog.id, { activo: nextState })
      setProgramas((prev) => prev.map((p) => (p.id === prog.id ? updated : p)))
      toast.info(
        `"${updated.nombre}" marcado como ${updated.activo ? 'activo' : 'inactivo'}.`
      )
    } catch (error) {
      toast.error(mapSupabaseError(error).message)
    } finally {
      setIsMutating(false)
    }
  }

  const saveTramite = async (
    payload: TipoTramiteInput,
    editId?: number
  ): Promise<boolean> => {
    if (isOfflinePreview) {
      if (editId !== undefined) {
        setTramites((prev) =>
          prev.map((t) => (t.id === editId ? { ...t, ...payload } : t))
        )
        toast.success(`Trámite "${payload.nombre}" actualizado (vista previa).`)
        return true
      }
      const nextId = Math.max(0, ...tramites.map((t) => t.id)) + 1
      setTramites((prev) => [...prev, { id: nextId, ...payload }])
      toast.success(`Trámite "${payload.nombre}" creado (vista previa).`)
      return true
    }

    setIsMutating(true)
    try {
      if (editId !== undefined) {
        const updated = await updateTipoTramite(editId, payload)
        setTramites((prev) => prev.map((t) => (t.id === editId ? updated : t)))
        toast.success(`Trámite "${updated.nombre}" actualizado.`)
        return true
      }
      const created = await createTipoTramite(payload)
      setTramites((prev) => [...prev, created])
      toast.success(`Trámite "${created.nombre}" creado en catálogo.`)
      return true
    } catch (error) {
      toast.error(mapSupabaseError(error).message)
      return false
    } finally {
      setIsMutating(false)
    }
  }

  const toggleTramiteActivo = async (tramite: TipoTramiteCatalogo) => {
    const nextState = !tramite.activo
    if (isOfflinePreview) {
      setTramites((prev) =>
        prev.map((t) => (t.id === tramite.id ? { ...t, activo: nextState } : t))
      )
      toast.info(
        `"${tramite.nombre}" marcado como ${nextState ? 'activo' : 'inactivo'}.`
      )
      return
    }

    setIsMutating(true)
    try {
      const updated = await updateTipoTramite(tramite.id, { activo: nextState })
      setTramites((prev) =>
        prev.map((t) => (t.id === tramite.id ? updated : t))
      )
      toast.info(
        `"${updated.nombre}" marcado como ${updated.activo ? 'activo' : 'inactivo'}.`
      )
    } catch (error) {
      toast.error(mapSupabaseError(error).message)
    } finally {
      setIsMutating(false)
    }
  }

  const savePeriodo = async (
    payload: PeriodoEscolarInput,
    editId?: number
  ): Promise<boolean> => {
    if (isOfflinePreview) {
      if (editId !== undefined) {
        setPeriodos((prev) =>
          prev.map((p) => (p.id === editId ? { ...p, ...payload } : p))
        )
        toast.success(`Periodo "${payload.nombre}" actualizado (vista previa).`)
        return true
      }
      const nextId = Math.max(0, ...periodos.map((p) => p.id)) + 1
      setPeriodos((prev) => [{ id: nextId, ...payload }, ...prev])
      toast.success(`Periodo "${payload.nombre}" creado (vista previa).`)
      return true
    }

    setIsMutating(true)
    try {
      if (editId !== undefined) {
        const updated = await updatePeriodoEscolar(editId, payload)
        setPeriodos((prev) => prev.map((p) => (p.id === editId ? updated : p)))
        toast.success(`Periodo "${updated.nombre}" actualizado.`)
        return true
      }
      const created = await createPeriodoEscolar(payload)
      setPeriodos((prev) => [created, ...prev])
      toast.success(`Periodo "${created.nombre}" creado en catálogo.`)
      return true
    } catch (error) {
      toast.error(mapSupabaseError(error).message)
      return false
    } finally {
      setIsMutating(false)
    }
  }

  const generateNextCiclo = async (): Promise<boolean> => {
    if (isOfflinePreview) {
      const maxStartYear = periodos.reduce((acc, p) => {
        const ciclo = deriveCicloEscolar({
          cicloEscolar: p.cicloEscolar,
          nombre: p.nombre,
          fechaInicio: p.fechaInicio,
          numeroPeriodo: p.numeroPeriodo,
        })
        const year = Number(ciclo.slice(0, 4))
        return Number.isInteger(year) && year > acc ? year : acc
      }, 2025)
      const nextYear = Math.max(2026, maxStartYear + 1)
      const nextCiclo = `${nextYear}-${nextYear + 1}`
      const maxId = Math.max(0, ...periodos.map((p) => p.id))
      const created: PeriodoEscolarCatalogo[] = [
        {
          id: maxId + 1,
          nombre: `${nextCiclo} Periodo 1 (Ago-Ene)`,
          cicloEscolar: nextCiclo,
          numeroPeriodo: 1,
          fechaInicio: `${nextYear}-08-01`,
          fechaFin: `${nextYear + 1}-01-31`,
          activo: false,
        },
        {
          id: maxId + 2,
          nombre: `${nextCiclo} Periodo 2 (Feb-Jul)`,
          cicloEscolar: nextCiclo,
          numeroPeriodo: 2,
          fechaInicio: `${nextYear + 1}-02-01`,
          fechaFin: `${nextYear + 1}-07-31`,
          activo: false,
        },
      ]
      setPeriodos((prev) => [...prev, ...created])
      toast.success(
        `Ciclo ${nextYear} - ${nextYear + 1} generado con Periodo 1 y Periodo 2 (vista previa).`
      )
      return true
    }

    setIsMutating(true)
    try {
      const created = await generarSiguienteCicloEscolar()
      if (created.length > 0) {
        setPeriodos((prev) => {
          const existingIds = new Set(prev.map((item) => item.id))
          const merged = [
            ...prev,
            ...created.filter((item) => !existingIds.has(item.id)),
          ]
          return merged.sort((a, b) => {
            const cicloA = deriveCicloEscolar({
              cicloEscolar: a.cicloEscolar,
              nombre: a.nombre,
              fechaInicio: a.fechaInicio,
              numeroPeriodo: a.numeroPeriodo,
            })
            const cicloB = deriveCicloEscolar({
              cicloEscolar: b.cicloEscolar,
              nombre: b.nombre,
              fechaInicio: b.fechaInicio,
              numeroPeriodo: b.numeroPeriodo,
            })
            const cmp = cicloA.localeCompare(cicloB, 'es', { numeric: true })
            return cmp !== 0 ? cmp : a.numeroPeriodo - b.numeroPeriodo
          })
        })
        const cicloLabel = created[0].cicloEscolar ?? created[0].nombre
        toast.success(
          `Ciclo ${cicloLabel} generado con Periodo 1 y Periodo 2.`
        )
      }
      return true
    } catch (error) {
      toast.error(mapSupabaseError(error).message)
      return false
    } finally {
      setIsMutating(false)
    }
  }

  const togglePeriodoActivo = async (periodo: PeriodoEscolarCatalogo) => {
    const nextState = !periodo.activo
    if (isOfflinePreview) {
      setPeriodos((prev) =>
        prev.map((p) => (p.id === periodo.id ? { ...p, activo: nextState } : p))
      )
      toast.info(
        `Periodo "${periodo.nombre}" marcado como ${nextState ? 'activo' : 'inactivo'}.`
      )
      return
    }

    setIsMutating(true)
    try {
      const updated = await updatePeriodoEscolar(periodo.id, { activo: nextState })
      setPeriodos((prev) => prev.map((p) => (p.id === periodo.id ? updated : p)))
      toast.info(
        `Periodo "${updated.nombre}" marcado como ${updated.activo ? 'activo' : 'inactivo'}.`
      )
    } catch (error) {
      toast.error(mapSupabaseError(error).message)
    } finally {
      setIsMutating(false)
    }
  }

  const removeItem = async (target: DeleteTarget): Promise<boolean> => {
    if (isOfflinePreview) {
      if (target.kind === 'unidad') {
        const targetId = target.item.id
        setUnidades((prev) => prev.filter((u) => u.id !== targetId))
        setProgramas((prev) =>
          prev.filter((p) => p.unidadAcademicaId !== targetId)
        )
      } else if (target.kind === 'programa') {
        setProgramas((prev) => prev.filter((p) => p.id !== target.item.id))
      } else if (target.kind === 'tramite') {
        setTramites((prev) => prev.filter((t) => t.id !== target.item.id))
      } else {
        setPeriodos((prev) => prev.filter((p) => p.id !== target.item.id))
      }
      toast.success('Registro eliminado (vista previa).')
      return true
    }

    setIsMutating(true)
    try {
      if (target.kind === 'unidad') {
        await deleteUnidadAcademica(target.item.id)
        setUnidades((prev) => prev.filter((u) => u.id !== target.item.id))
        setProgramas((prev) =>
          prev.filter((p) => p.unidadAcademicaId !== target.item.id)
        )
        toast.success(`Unidad "${target.item.nombre}" eliminada del catálogo.`)
      } else if (target.kind === 'programa') {
        await deleteProgramaEducativo(target.item.id)
        setProgramas((prev) => prev.filter((p) => p.id !== target.item.id))
        toast.success(`Programa "${target.item.nombre}" eliminado.`)
      } else if (target.kind === 'tramite') {
        await deleteTipoTramite(target.item.id)
        setTramites((prev) => prev.filter((t) => t.id !== target.item.id))
        toast.success(`Trámite "${target.item.nombre}" eliminado.`)
      } else {
        await deletePeriodoEscolar(target.item.id)
        setPeriodos((prev) => prev.filter((p) => p.id !== target.item.id))
        toast.success(`Periodo "${target.item.nombre}" eliminado.`)
      }
      return true
    } catch (error) {
      toast.error(mapSupabaseError(error).message)
      return false
    } finally {
      setIsMutating(false)
    }
  }

  return {
    unidades,
    programas,
    tramites,
    periodos,
    isLoading,
    isMutating,
    isOfflinePreview,
    reload: loadCatalogos,
    saveUnidad,
    toggleUnidadActiva,
    savePrograma,
    toggleProgramaActivo,
    saveTramite,
    toggleTramiteActivo,
    savePeriodo,
    generateNextCiclo,
    togglePeriodoActivo,
    removeItem,
  }
}
