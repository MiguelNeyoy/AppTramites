import * as React from 'react'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import {
  assignResponsableProgramaPeriodo,
  buildActasMatrix,
  fetchCatalogosParaActas,
  fetchChecklistsByPeriodo,
  upsertEstadoActa,
  type ActaMatrixRow,
  type ChecklistActaDbRow,
  type EstadoActa,
  type ResponsableActaOption,
  type TipoActa,
} from '@/services/actas'
import type {
  PeriodoEscolarCatalogo,
  ProgramaEducativoCatalogo,
  UnidadAcademicaCatalogo,
} from '@/services/catalogos'
import { mapSupabaseError } from '@/services/shared'
import {
  buildOfflineActasCatalogos,
  buildOfflineChecklistRowsByPeriodo,
} from '../components/actasMockData'

interface UseChecklistActasOptions {
  currentUserId?: string
  refreshSignal?: number
  onLoadingChange?: (loading: boolean) => void
}

interface ActasBootstrapResult {
  unidades: UnidadAcademicaCatalogo[]
  programas: ProgramaEducativoCatalogo[]
  periodos: PeriodoEscolarCatalogo[]
  responsables: ResponsableActaOption[]
  selectedPeriodoId: number
  checklistRows: ChecklistActaDbRow[]
  offlineRowsByPeriodo: Record<number, ChecklistActaDbRow[]>
  isOfflinePreview: boolean
  errorMessage?: string
}

function pickInitialPeriodo(
  periodos: readonly PeriodoEscolarCatalogo[]
): PeriodoEscolarCatalogo | undefined {
  return periodos.find((p) => p.activo) ?? periodos[0]
}

async function resolveInitialActas(
  preferredPeriodoId?: number
): Promise<ActasBootstrapResult> {
  const buildLocalPreview = (errorMessage?: string): ActasBootstrapResult => {
    const mock = buildOfflineActasCatalogos()
    const targetPeriodo =
      mock.periodos.find((p) => p.id === preferredPeriodoId) ??
      pickInitialPeriodo(mock.periodos)
    const targetId = targetPeriodo?.id ?? 1
    const offlineMap = buildOfflineChecklistRowsByPeriodo(mock.periodos)

    return {
      unidades: mock.unidades,
      programas: mock.programas,
      periodos: mock.periodos,
      responsables: mock.responsables,
      selectedPeriodoId: targetId,
      checklistRows: offlineMap[targetId] ?? [],
      offlineRowsByPeriodo: offlineMap,
      isOfflinePreview: true,
      errorMessage,
    }
  }

  try {
    const { data: sessionRes } = await supabase.auth.getSession()
    if (!sessionRes.session) {
      return buildLocalPreview()
    }

    const catalogos = await fetchCatalogosParaActas()
    const targetPeriodo =
      catalogos.periodos.find((p) => p.id === preferredPeriodoId) ??
      pickInitialPeriodo(catalogos.periodos)

    const checklistRows = targetPeriodo
      ? await fetchChecklistsByPeriodo(targetPeriodo.id)
      : []

    return {
      unidades: catalogos.unidades,
      programas: catalogos.programas,
      periodos: catalogos.periodos,
      responsables: catalogos.responsables,
      selectedPeriodoId: targetPeriodo?.id ?? 0,
      checklistRows,
      offlineRowsByPeriodo: {},
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
      periodos: [],
      responsables: [],
      selectedPeriodoId: 0,
      checklistRows: [],
      offlineRowsByPeriodo: {},
      isOfflinePreview: false,
      errorMessage: mapped.message,
    }
  }
}

function mergeUpsertedChecklistRow(
  prev: readonly ChecklistActaDbRow[],
  saved: ChecklistActaDbRow
): ChecklistActaDbRow[] {
  const index = prev.findIndex(
    (item) =>
      item.periodo_id === saved.periodo_id &&
      item.programa_id === saved.programa_id &&
      item.tipo_acta === saved.tipo_acta
  )

  if (index === -1) {
    return [...prev, saved]
  }

  return prev.map((item, idx) => (idx === index ? saved : item))
}

export function useChecklistActas({
  currentUserId,
  refreshSignal,
  onLoadingChange,
}: UseChecklistActasOptions) {
  const [unidades, setUnidades] = React.useState<UnidadAcademicaCatalogo[]>([])
  const [programas, setProgramas] = React.useState<ProgramaEducativoCatalogo[]>(
    []
  )
  const [periodos, setPeriodos] = React.useState<PeriodoEscolarCatalogo[]>([])
  const [responsables, setResponsables] = React.useState<
    ResponsableActaOption[]
  >([])
  const [selectedPeriodoId, setSelectedPeriodoId] = React.useState<number>(0)
  const [checklistRows, setChecklistRows] = React.useState<ChecklistActaDbRow[]>(
    []
  )
  const [offlineRowsByPeriodo, setOfflineRowsByPeriodo] = React.useState<
    Record<number, ChecklistActaDbRow[]>
  >({})

  const [isLoading, setIsLoading] = React.useState(true)
  const [isMutating, setIsMutating] = React.useState(false)
  const [isOfflinePreview, setIsOfflinePreview] = React.useState(false)

  const selectedPeriodoIdRef = React.useRef<number>(0)

  React.useEffect(() => {
    selectedPeriodoIdRef.current = selectedPeriodoId
  }, [selectedPeriodoId])

  React.useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  const applyBootstrap = React.useCallback((res: ActasBootstrapResult) => {
    setUnidades(res.unidades)
    setProgramas(res.programas)
    setPeriodos(res.periodos)
    setResponsables(res.responsables)
    setSelectedPeriodoId(res.selectedPeriodoId)
    setChecklistRows(res.checklistRows)
    setOfflineRowsByPeriodo(res.offlineRowsByPeriodo)
    setIsOfflinePreview(res.isOfflinePreview)

    if (res.errorMessage) {
      toast.error(res.errorMessage)
    }
    setIsLoading(false)
  }, [])

  const loadAll = React.useCallback(
    async (preferredPeriodoId?: number) => {
      setIsLoading(true)
      const res = await resolveInitialActas(preferredPeriodoId)
      applyBootstrap(res)
    },
    [applyBootstrap]
  )

  React.useEffect(() => {
    let active = true
    const run = async () => {
      const preferred =
        selectedPeriodoIdRef.current > 0
          ? selectedPeriodoIdRef.current
          : undefined
      const res = await resolveInitialActas(preferred)
      if (!active) {
        return
      }
      applyBootstrap(res)
    }
    void run()
    return () => {
      active = false
    }
  }, [applyBootstrap, refreshSignal])

  const selectedPeriodo = React.useMemo(
    () => periodos.find((p) => p.id === selectedPeriodoId) ?? periodos[0] ?? null,
    [periodos, selectedPeriodoId]
  )

  const rows: ActaMatrixRow[] = React.useMemo(() => {
    if (!selectedPeriodo) {
      return []
    }
    return buildActasMatrix({
      unidades,
      programas,
      checklistRows,
      periodo: selectedPeriodo,
    })
  }, [checklistRows, programas, selectedPeriodo, unidades])

  const selectPeriodo = React.useCallback(
    async (nextPeriodoId: number) => {
      if (nextPeriodoId === selectedPeriodoId) {
        return
      }

      setSelectedPeriodoId(nextPeriodoId)

      if (isOfflinePreview) {
        setChecklistRows(offlineRowsByPeriodo[nextPeriodoId] ?? [])
        return
      }

      setIsLoading(true)
      try {
        const fetched = await fetchChecklistsByPeriodo(nextPeriodoId)
        setChecklistRows(fetched)
      } catch (error) {
        const mapped = mapSupabaseError(error)
        toast.error(mapped.message)
      } finally {
        setIsLoading(false)
      }
    },
    [isOfflinePreview, offlineRowsByPeriodo, selectedPeriodoId]
  )

  const changeEstadoActa = React.useCallback(
    async (
      row: ActaMatrixRow,
      tipoActa: TipoActa,
      nextEstado: EstadoActa
    ): Promise<boolean> => {
      if (!selectedPeriodo) {
        return false
      }

      const nowIso = new Date().toISOString()
      const nextResponsable =
        row.responsableId ??
        (nextEstado === 'GENERADA' ? (currentUserId ?? null) : null)

      const optimisticRow: ChecklistActaDbRow = {
        id: `opt-${selectedPeriodo.id}-${row.programaId}-${tipoActa}`,
        periodo_id: selectedPeriodo.id,
        programa_id: row.programaId,
        tipo_acta: tipoActa,
        estado: nextEstado,
        responsable_id: nextResponsable,
        actualizado_por: currentUserId ?? null,
        updated_at: nowIso,
      }

      const previousRows = checklistRows
      const nextOptimisticList = mergeUpsertedChecklistRow(
        previousRows,
        optimisticRow
      )
      setChecklistRows(nextOptimisticList)

      if (isOfflinePreview) {
        setOfflineRowsByPeriodo((prev) => ({
          ...prev,
          [selectedPeriodo.id]: nextOptimisticList,
        }))
        return true
      }

      setIsMutating(true)
      try {
        const saved = await upsertEstadoActa({
          periodoId: selectedPeriodo.id,
          numeroPeriodo: selectedPeriodo.numeroPeriodo,
          programaId: row.programaId,
          tipoActa,
          estado: nextEstado,
          responsableId: nextResponsable,
        })
        setChecklistRows((prev) => mergeUpsertedChecklistRow(prev, saved))
        return true
      } catch (error) {
        setChecklistRows(previousRows)
        const mapped = mapSupabaseError(error)
        toast.error(mapped.message)
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [checklistRows, currentUserId, isOfflinePreview, selectedPeriodo]
  )

  const changeResponsable = React.useCallback(
    async (row: ActaMatrixRow, nextResponsableId: string | null) => {
      if (!selectedPeriodo) {
        return
      }

      const nowIso = new Date().toISOString()
      const previousRows = checklistRows
      const existingForProgram = previousRows.filter(
        (item) =>
          item.periodo_id === selectedPeriodo.id &&
          item.programa_id === row.programaId
      )

      const nextOptimisticList =
        existingForProgram.length > 0
          ? previousRows.map((item) =>
              item.periodo_id === selectedPeriodo.id &&
              item.programa_id === row.programaId
                ? { ...item, responsable_id: nextResponsableId, updated_at: nowIso }
                : item
            )
          : nextResponsableId !== null
            ? [
                ...previousRows,
                {
                  id: `opt-${selectedPeriodo.id}-${row.programaId}-ORDINARIA`,
                  periodo_id: selectedPeriodo.id,
                  programa_id: row.programaId,
                  tipo_acta: 'ORDINARIA' as TipoActa,
                  estado: 'PENDIENTE' as EstadoActa,
                  responsable_id: nextResponsableId,
                  actualizado_por: currentUserId ?? null,
                  updated_at: nowIso,
                },
              ]
            : previousRows

      setChecklistRows(nextOptimisticList)

      if (isOfflinePreview) {
        setOfflineRowsByPeriodo((prev) => ({
          ...prev,
          [selectedPeriodo.id]: nextOptimisticList,
        }))
        return
      }

      setIsMutating(true)
      try {
        const savedRows = await assignResponsableProgramaPeriodo({
          periodoId: selectedPeriodo.id,
          programaId: row.programaId,
          responsableId: nextResponsableId,
        })
        if (savedRows.length > 0) {
          setChecklistRows((prev) => {
            let acc = [...prev]
            for (const saved of savedRows) {
              acc = mergeUpsertedChecklistRow(acc, saved)
            }
            return acc
          })
        }
      } catch (error) {
        setChecklistRows(previousRows)
        const mapped = mapSupabaseError(error)
        toast.error(mapped.message)
      } finally {
        setIsMutating(false)
      }
    },
    [checklistRows, currentUserId, isOfflinePreview, selectedPeriodo]
  )

  return {
    unidades,
    programas,
    periodos,
    responsables,
    selectedPeriodo,
    selectedPeriodoId,
    rows,
    isLoading,
    isMutating,
    isOfflinePreview,
    selectPeriodo,
    changeEstadoActa,
    changeResponsable,
    reload: () => loadAll(selectedPeriodoId || undefined),
  }
}
