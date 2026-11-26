import * as React from 'react'
import {
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  ListChecks,
  Search,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { NivelFilter } from '@/features/dashboard/types'
import {
  deriveCicloEscolar,
  extractCiclosEscolares,
  formatCicloEscolarLabel,
  resolvePeriodoByCicloAndNumero,
} from '@/services/catalogos'
import {
  computeChecklistStats,
  filterVisibleActaRows,
  formatPeriodoCortoLabel,
  getActaColumnsForPeriodo,
  getInitialEtapaActiva,
  isActaRowCompleted,
  isEtapaCompleted,
  resolveAutoAdvanceEtapa,
  type ActaMatrixRow,
  type EstadoActa,
  type EtapaChecklistFilter,
  type TipoActa,
} from '@/services/actas'
import { useChecklistActas } from '../hooks/useChecklistActas'
import {
  SeguimientoActasModal,
  type SeguimientoTarget,
} from './SeguimientoActasModal'

const UNASSIGNED_SELECT_VALUE = '__SIN_ASIGNAR__'

interface ChecklistActasViewProps {
  nivel: NivelFilter
  currentUserId?: string
  refreshSignal?: number
  onLoadingChange?: (loading: boolean) => void
}

function getActaCellClass(estado: EstadoActa): string {
  if (estado === 'GENERADA') {
    return 'bg-emerald-500/10'
  }
  if (estado === 'NO_APLICA') {
    return 'bg-muted/60'
  }
  return 'bg-destructive/10'
}

function getPeriodoBadgeClass(numeroPeriodo: number): string {
  if (numeroPeriodo === 1) {
    return 'border-blue-500/30 bg-blue-500/10 font-semibold text-blue-700 dark:text-blue-300'
  }
  return 'border-indigo-500/30 bg-indigo-500/10 font-semibold text-indigo-700 dark:text-indigo-300'
}

function formatUpdatedDateShort(iso: string | null): string | null {
  if (!iso) {
    return null
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function ChecklistActasView({
  nivel,
  currentUserId,
  refreshSignal,
  onLoadingChange,
}: ChecklistActasViewProps) {
  const {
    unidades,
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
  } = useChecklistActas({
    currentUserId,
    refreshSignal,
    onLoadingChange,
  })

  const [searchQuery, setSearchQuery] = React.useState('')
  const [unidadFilter, setUnidadFilter] = React.useState<string>('TODAS')
  const [etapaActiva, setEtapaActiva] =
    React.useState<EtapaChecklistFilter>('ORDINARIA')
  const [limpiezaAutomatica, setLimpiezaAutomatica] = React.useState(true)
  const [mostrarCompletadas, setMostrarCompletadas] = React.useState(false)
  const [seguimientoOpen, setSeguimientoOpen] = React.useState(false)
  const [seguimientoTarget, setSeguimientoTarget] =
    React.useState<SeguimientoTarget>('RESUMEN')

  const numeroPeriodoActual = selectedPeriodo?.numeroPeriodo ?? 1
  const cicloEscolarActual = React.useMemo(() => {
    if (!selectedPeriodo) {
      return '2026-2027'
    }
    return deriveCicloEscolar({
      cicloEscolar: selectedPeriodo.cicloEscolar,
      nombre: selectedPeriodo.nombre,
      fechaInicio: selectedPeriodo.fechaInicio,
      numeroPeriodo: selectedPeriodo.numeroPeriodo,
    })
  }, [selectedPeriodo])

  const ciclosDisponibles = React.useMemo(
    () => extractCiclosEscolares(periodos),
    [periodos]
  )

  const periodosDelCicloActual = React.useMemo(
    () =>
      periodos
        .filter(
          (p) =>
            deriveCicloEscolar({
              cicloEscolar: p.cicloEscolar,
              nombre: p.nombre,
              fechaInicio: p.fechaInicio,
              numeroPeriodo: p.numeroPeriodo,
            }) === cicloEscolarActual
        )
        .sort((a, b) => a.numeroPeriodo - b.numeroPeriodo),
    [cicloEscolarActual, periodos]
  )

  const activeColumns = React.useMemo(
    () => getActaColumnsForPeriodo(numeroPeriodoActual),
    [numeroPeriodoActual]
  )

  const responsablesMap = React.useMemo(
    () => new Map(responsables.map((item) => [item.id, item.nombre])),
    [responsables]
  )

  const rowsByNivel = React.useMemo(
    () => rows.filter((row) => nivel === 'TODOS' || row.nivel === nivel),
    [nivel, rows]
  )

  const unidadesDisponibles = React.useMemo(
    () =>
      unidades.filter((ua) => nivel === 'TODOS' || ua.nivel === nivel),
    [nivel, unidades]
  )

  const lastPeriodoInitializedRef = React.useRef<string>('')
  React.useEffect(() => {
    if (isLoading || !selectedPeriodo) {
      return
    }
    const initKey = `${selectedPeriodo.id}:${nivel}`
    if (lastPeriodoInitializedRef.current === initKey) {
      return
    }
    lastPeriodoInitializedRef.current = initKey
    setEtapaActiva(getInitialEtapaActiva(rowsByNivel, activeColumns))
    setMostrarCompletadas(false)
    setUnidadFilter('TODAS')
  }, [activeColumns, isLoading, nivel, rowsByNivel, selectedPeriodo])

  const stats = React.useMemo(
    () => computeChecklistStats(rowsByNivel, activeColumns),
    [activeColumns, rowsByNivel]
  )

  const displayedActaColumns = React.useMemo(() => {
    if (etapaActiva === 'TODAS') {
      return activeColumns
    }
    const matched = activeColumns.filter((col) => col.key === etapaActiva)
    return matched.length > 0 ? matched : activeColumns
  }, [activeColumns, etapaActiva])

  const isSelectedStageCompleted = React.useMemo(() => {
    if (etapaActiva === 'TODAS') {
      return stats.isAllCompleted
    }
    return isEtapaCompleted(rowsByNivel, etapaActiva)
  }, [etapaActiva, rowsByNivel, stats.isAllCompleted])

  const visibleRows = React.useMemo(
    () =>
      filterVisibleActaRows({
        rows: rowsByNivel,
        activeColumns,
        etapaActiva,
        unidadFilter,
        searchQuery,
        limpiezaAutomatica,
        mostrarCompletadas,
        responsablesMap,
      }),
    [
      activeColumns,
      etapaActiva,
      limpiezaAutomatica,
      mostrarCompletadas,
      responsablesMap,
      rowsByNivel,
      searchQuery,
      unidadFilter,
    ]
  )

  const openSeguimientoModal = (target: SeguimientoTarget) => {
    setSeguimientoTarget(target)
    setSeguimientoOpen(true)
  }

  const handleCicloChange = (nextCiclo: string) => {
    const matched = resolvePeriodoByCicloAndNumero(
      periodos,
      nextCiclo,
      numeroPeriodoActual
    )
    if (matched) {
      void selectPeriodo(matched.id)
    }
  }

  const handlePeriodoChange = (value: string) => {
    const nextId = Number(value)
    if (!Number.isInteger(nextId) || nextId <= 0) {
      return
    }
    void selectPeriodo(nextId)
  }

  const handleEstadoMutation = async (
    row: ActaMatrixRow,
    tipoActa: TipoActa,
    nextEstado: EstadoActa
  ) => {
    const prevSnapshot = rowsByNivel
    const predictedNext = rowsByNivel.map((item) =>
      item.programaId === row.programaId
        ? {
            ...item,
            estados: {
              ...item.estados,
              [tipoActa]: nextEstado,
            },
          }
        : item
    )

    const ok = await changeEstadoActa(row, tipoActa, nextEstado)
    if (!ok) {
      return
    }

    const advance = resolveAutoAdvanceEtapa({
      prevRows: prevSnapshot,
      nextRows: predictedNext,
      currentEtapa: etapaActiva,
      activeColumns,
    })

    if (advance.advancedFrom && advance.advancedTo) {
      setEtapaActiva(advance.nextEtapa)
      if (advance.advancedTo === 'TODAS') {
        toast.success(
          `Etapa ${advance.advancedFrom.label} completada. Todas las actas del periodo quedaron registradas.`
        )
      } else {
        toast.success(
          `${advance.advancedFrom.label} completada al 100%. Pasando a ${advance.advancedTo.label}.`
        )
      }
      return
    }

    if (
      limpiezaAutomatica &&
      !mostrarCompletadas &&
      nextEstado !== 'PENDIENTE'
    ) {
      const targetNextRow = predictedNext.find(
        (item) => item.programaId === row.programaId
      )
      const completedInScope =
        etapaActiva === 'TODAS'
          ? targetNextRow && isActaRowCompleted(targetNextRow, activeColumns)
          : targetNextRow && targetNextRow.estados[etapaActiva] !== 'PENDIENTE'

      if (completedInScope) {
        toast.success(
          `[${row.claveUa}] ${row.nombrePrograma} registrado y guardado.`,
          {
            action: {
              label: 'Ver todas',
              onClick: () => setMostrarCompletadas(true),
            },
          }
        )
      }
    }
  }

  const handleToggleCheckbox = (
    row: ActaMatrixRow,
    tipoActa: TipoActa,
    checked: boolean
  ) => {
    const nextEstado: EstadoActa = checked ? 'GENERADA' : 'PENDIENTE'
    void handleEstadoMutation(row, tipoActa, nextEstado)
  }

  const handleToggleNoAplica = (row: ActaMatrixRow, tipoActa: TipoActa) => {
    const nextEstado: EstadoActa =
      row.estados[tipoActa] === 'NO_APLICA' ? 'PENDIENTE' : 'NO_APLICA'
    void handleEstadoMutation(row, tipoActa, nextEstado)
  }

  const kpiGridCols =
    activeColumns.length <= 3 ? 'xl:grid-cols-4' : 'xl:grid-cols-6'

  return (
    <div className="space-y-4">
      {isOfflinePreview && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          Vista previa local sin sesión activa: los cambios no se persisten en
          Supabase hasta iniciar sesión.
        </div>
      )}

      {/* Tarjetas de avance rápido (clicables para seguimiento detallado por escuela) */}
      <section
        aria-label="Resumen de checklist de actas"
        className={cn(
          'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:pr-24',
          kpiGridCols
        )}
      >
        <Card
          role="button"
          tabIndex={0}
          onClick={() => openSeguimientoModal('RESUMEN')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openSeguimientoModal('RESUMEN')
            }
          }}
          className="cursor-pointer border-border bg-card shadow-sm transition-colors hover:border-primary/50 hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:shadow-none"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Programas Pendientes
            </CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-2">
            <p className="font-mono text-xl font-bold tabular-nums text-foreground">
              {stats.pendientes}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / {stats.totalProgramas}
              </span>
            </p>
            <span className="text-[10px] font-medium text-primary">
              Seguimiento
            </span>
          </CardContent>
        </Card>

        {stats.porActa.map((acta) => (
          <Card
            key={acta.key}
            role="button"
            tabIndex={0}
            onClick={() => openSeguimientoModal(acta.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openSeguimientoModal(acta.key)
              }
            }}
            className={cn(
              'cursor-pointer border-border bg-card shadow-sm transition-colors hover:border-primary/50 hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:shadow-none',
              acta.isStageCompleted && 'border-emerald-500/40 bg-emerald-500/5'
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {acta.key === 'PROMOCION_GRADO' || acta.key === 'CIERRE_CICLO'
                  ? acta.label
                  : `Acta ${acta.label}`}
              </CardTitle>
              {acta.isStageCompleted && (
                <Badge className="h-4 border-emerald-600/30 bg-emerald-500/15 px-1.5 text-[9px] font-semibold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
                  100%
                </Badge>
              )}
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-2">
              <p className="font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {acta.generadas}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / {acta.aplicables}
                </span>
              </p>
              <span className="text-[10px] font-medium text-muted-foreground">
                Ver detalle
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Matriz tipo Excel */}
      <Card className="border-border bg-card shadow-sm dark:shadow-none">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-col gap-2.5 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar escuela, carrera o responsable..."
                  className="h-8 bg-background pl-8 text-xs"
                />
              </div>

              <div className="w-full sm:w-52">
                <Select value={unidadFilter} onValueChange={setUnidadFilter}>
                  <SelectTrigger className="h-8 bg-background text-xs">
                    <SelectValue placeholder="Unidad académica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS" className="text-xs">
                      Todas las unidades
                    </SelectItem>
                    {unidadesDisponibles.map((ua) => (
                      <SelectItem
                        key={ua.id}
                        value={String(ua.id)}
                        className="text-xs"
                      >
                        <span className="font-mono font-semibold">
                          {ua.claveUa}
                        </span>{' '}
                        &mdash; {ua.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-44">
                <Select
                  value={cicloEscolarActual}
                  onValueChange={handleCicloChange}
                  disabled={ciclosDisponibles.length === 0 || isLoading}
                >
                  <SelectTrigger
                    aria-label="Seleccionar ciclo escolar"
                    className="h-8 bg-background text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <SelectValue placeholder="Ciclo escolar" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {ciclosDisponibles.map((ciclo) => (
                      <SelectItem
                        key={ciclo}
                        value={ciclo}
                        className="font-mono text-xs font-semibold tabular-nums"
                      >
                        {formatCicloEscolarLabel(ciclo)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-36">
                <Select
                  value={selectedPeriodoId ? String(selectedPeriodoId) : ''}
                  onValueChange={handlePeriodoChange}
                  disabled={periodosDelCicloActual.length === 0 || isLoading}
                >
                  <SelectTrigger
                    aria-label="Seleccionar periodo del ciclo"
                    className="h-8 bg-background text-xs"
                  >
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodosDelCicloActual.map((periodo) => (
                      <SelectItem
                        key={periodo.id}
                        value={String(periodo.id)}
                        className="font-mono text-xs font-semibold tabular-nums"
                      >
                        {formatPeriodoCortoLabel(periodo.numeroPeriodo)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <Label
                  htmlFor="chk-auto-clean"
                  className="cursor-pointer text-xs font-medium text-foreground"
                >
                  Limpieza automática
                </Label>
                <Switch
                  id="chk-auto-clean"
                  checked={limpiezaAutomatica}
                  onCheckedChange={(checked) => {
                    setLimpiezaAutomatica(checked)
                    if (checked) {
                      setMostrarCompletadas(false)
                    }
                  }}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMostrarCompletadas((prev) => !prev)}
                className="h-9 gap-1.5 text-xs"
              >
                {mostrarCompletadas ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Ocultar completadas</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>
                      Ver todas (
                      <span className="font-mono tabular-nums">
                        {stats.completados}
                      </span>
                      )
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Barra de etapas progresivas (Opción B) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5">
            <Tabs
              value={etapaActiva}
              onValueChange={(value) =>
                setEtapaActiva(value as EtapaChecklistFilter)
              }
            >
              <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/70 p-1">
                <TabsTrigger value="TODAS" className="h-7 gap-1.5 px-2.5 text-xs">
                  <ListChecks className="h-3.5 w-3.5" />
                  <span>Todas ({activeColumns.length})</span>
                </TabsTrigger>
                {stats.porActa.map((acta) => (
                  <TabsTrigger
                    key={acta.key}
                    value={acta.key}
                    className="h-7 gap-1.5 px-2.5 text-xs"
                  >
                    <span>
                      {acta.order}. {acta.label}
                    </span>
                    <span
                      className={cn(
                        'rounded px-1 py-0.5 font-mono text-[10px] tabular-nums',
                        acta.isStageCompleted
                          ? 'bg-emerald-500/15 font-bold text-emerald-700 dark:text-emerald-300'
                          : 'bg-background/80 text-muted-foreground'
                      )}
                    >
                      {acta.generadas}/{acta.aplicables}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {isSelectedStageCompleted && (
              <Badge className="gap-1 border-emerald-600/30 bg-emerald-500/10 text-[11px] font-medium text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {etapaActiva === 'TODAS'
                    ? 'Periodo completado — rastro visual activo'
                    : 'Etapa completada — rastro visual activo'}
                </span>
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table wrapperClassName="max-h-[540px] overflow-y-auto">
              <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead
                    colSpan={4}
                    className="h-7 border-r border-border bg-secondary/70 text-[10px] font-bold uppercase tracking-widest text-foreground"
                  >
                    Adscripción Académica
                  </TableHead>
                  <TableHead
                    colSpan={displayedActaColumns.length}
                    className="h-7 border-r border-border bg-secondary/40 text-center text-[10px] font-bold uppercase tracking-widest text-foreground"
                  >
                    {numeroPeriodoActual === 1
                      ? 'Actas del Periodo 1'
                      : 'Actas y Cierre de Ciclo'}
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="h-7 bg-secondary/70 text-center text-[10px] font-bold uppercase tracking-widest text-foreground"
                  >
                    Responsable y Fecha
                  </TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 w-8 bg-secondary/50 px-1 text-center text-[10px] font-semibold uppercase tracking-widest">
                    #
                  </TableHead>
                  <TableHead className="h-9 w-14 bg-secondary/50 px-1 text-[10px] font-semibold uppercase tracking-widest">
                    Clave UA
                  </TableHead>
                  <TableHead className="h-9 w-36 max-w-[148px] bg-secondary/50 px-1.5 text-[10px] font-semibold uppercase tracking-widest">
                    Unidad Académica
                  </TableHead>
                  <TableHead className="h-9 w-44 max-w-[176px] border-r border-border bg-secondary/50 px-1.5 text-[10px] font-semibold uppercase tracking-widest">
                    Programa Educativo
                  </TableHead>
                  {displayedActaColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        'h-9 min-w-[100px] border-r border-border px-1.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wider',
                        col.headerClass
                      )}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="h-9 min-w-[148px] border-r border-border bg-secondary/50 px-2 text-[10px] font-semibold uppercase tracking-widest">
                    Responsable
                  </TableHead>
                  <TableHead className="h-9 min-w-[128px] bg-secondary/50 px-2 text-[10px] font-semibold uppercase tracking-widest">
                    Fecha
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4 + displayedActaColumns.length + 2}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      Cargando checklist de actas...
                    </TableCell>
                  </TableRow>
                ) : visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4 + displayedActaColumns.length + 2}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        <p className="font-semibold text-foreground">
                          {rowsByNivel.length === 0
                            ? 'No hay programas educativos activos para mostrar'
                            : 'No hay programas pendientes con los filtros actuales'}
                        </p>
                        <p>
                          Ajusta el buscador o unidad, o usa Ver todas para
                          revisar las filas completadas.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row, idx) => {
                    const isCompleted = isActaRowCompleted(row, activeColumns)
                    const updatedShort = formatUpdatedDateShort(row.updatedAt)

                    return (
                      <TableRow
                        key={row.programaId}
                        className={cn(
                          'h-11 transition-colors duration-150 hover:bg-secondary/30',
                          isCompleted && 'bg-emerald-500/5'
                        )}
                      >
                        <TableCell className="w-8 px-1 py-1.5 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="w-14 px-1 py-1.5">
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px] font-bold tabular-nums"
                          >
                            {row.claveUa}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-36 max-w-[148px] px-1.5 py-1.5">
                          <div className="leading-tight">
                            <p className="text-xs font-semibold text-foreground">
                              {row.nombreUa}
                            </p>
                            <span className="text-[10px] text-muted-foreground">
                              {row.nivel === 'BACHILLERATO'
                                ? 'Bachillerato'
                                : 'Licenciatura'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="w-44 max-w-[176px] border-r border-border px-1.5 py-1.5">
                          <div className="text-xs leading-tight">
                            <span className="mr-1.5 font-mono font-bold text-primary">
                              {row.clavePrograma}
                            </span>
                            <span className="text-foreground">
                              {row.nombrePrograma}
                            </span>
                          </div>
                        </TableCell>

                        {displayedActaColumns.map((col) => {
                          const estado = row.estados[col.key]
                          const isGenerada = estado === 'GENERADA'
                          const isNoAplica = estado === 'NO_APLICA'

                          return (
                            <TableCell
                              key={col.key}
                              className={cn(
                                'border-r border-border px-1.5 py-1.5 text-center transition-colors duration-150',
                                getActaCellClass(estado)
                              )}
                            >
                              <div className="inline-flex items-center justify-center gap-1.5">
                                {isNoAplica ? (
                                  <Badge
                                    variant="outline"
                                    className="border-border bg-background/70 font-mono text-[10px] text-muted-foreground"
                                  >
                                    N/A
                                  </Badge>
                                ) : (
                                  <Checkbox
                                    checked={isGenerada}
                                    disabled={isMutating}
                                    onCheckedChange={(checked) =>
                                      handleToggleCheckbox(
                                        row,
                                        col.key,
                                        checked === true
                                      )
                                    }
                                    aria-label={`${col.label} de ${row.nombrePrograma}`}
                                    className={cn(
                                      'h-4 w-4 transition-colors duration-150',
                                      isGenerada
                                        ? 'border-emerald-600 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white'
                                        : 'border-destructive/50 bg-background'
                                    )}
                                  />
                                )}
                                <button
                                  type="button"
                                  disabled={isMutating}
                                  onClick={() =>
                                    handleToggleNoAplica(row, col.key)
                                  }
                                  title={
                                    isNoAplica
                                      ? 'Reactivar acta como pendiente'
                                      : 'Marcar como No Aplica (N/A)'
                                  }
                                  className="rounded px-1 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground transition-colors duration-150 hover:bg-background/80 hover:text-foreground disabled:opacity-50"
                                >
                                  {isNoAplica ? 'Act.' : 'N/A'}
                                </button>
                              </div>
                            </TableCell>
                          )
                        })}

                        <TableCell className="border-r border-border px-2 py-1.5">
                          <Select
                            value={row.responsableId ?? UNASSIGNED_SELECT_VALUE}
                            disabled={isMutating}
                            onValueChange={(value) =>
                              void changeResponsable(
                                row,
                                value === UNASSIGNED_SELECT_VALUE ? null : value
                              )
                            }
                          >
                            <SelectTrigger
                              aria-label={`Responsable de ${row.nombrePrograma}`}
                              className={cn(
                                'h-7 w-full px-2 text-xs transition-colors duration-150',
                                row.responsableId
                                  ? 'border-border bg-background font-medium text-foreground'
                                  : 'border-dashed border-border bg-background/70 text-muted-foreground'
                              )}
                            >
                              <SelectValue placeholder="Sin asignar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value={UNASSIGNED_SELECT_VALUE}
                                className="text-xs text-muted-foreground"
                              >
                                Sin asignar
                              </SelectItem>
                              {responsables.map((responsable) => (
                                <SelectItem
                                  key={responsable.id}
                                  value={responsable.id}
                                  className="text-xs"
                                >
                                  {responsable.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="px-2 py-1.5">
                          <div
                            className="flex flex-col items-start gap-0.5"
                            title={row.periodoNombre}
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                'font-mono text-[10px] tabular-nums',
                                getPeriodoBadgeClass(row.numeroPeriodo)
                              )}
                            >
                              {formatCicloEscolarLabel(cicloEscolarActual)} ·{' '}
                              {row.periodoLabel}
                            </Badge>
                            {updatedShort && (
                              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                {updatedShort}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SeguimientoActasModal
        open={seguimientoOpen}
        onOpenChange={setSeguimientoOpen}
        target={seguimientoTarget}
        onTargetChange={setSeguimientoTarget}
        rows={rowsByNivel}
        activeColumns={activeColumns}
        responsablesMap={responsablesMap}
        periodoLabel={formatPeriodoCortoLabel(numeroPeriodoActual)}
        periodoNombre={selectedPeriodo?.nombre ?? ''}
      />
    </div>
  )
}

export default ChecklistActasView
