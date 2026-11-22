import * as React from 'react'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { cn } from '@/lib/utils'
import type { NivelFilter } from '@/features/dashboard/types'
import {
  ACTA_COLUMNS,
  PERIODO_ACTA_OPTIONS,
  RESPONSABLES_ACTA_CATALOGO,
  UNIDADES_ACADEMICAS_CATALOGO,
  buildInitialActasMatrix,
  getPeriodoActaLabel,
  isActaRowCompleted,
  resetCompletedActaRows,
  type ActaMatrixRow,
  type EstadoActa,
  type PeriodoActaKey,
  type PeriodoActaOption,
  type ResponsableActaOption,
  type TipoActaKey,
} from './actasMockData'

const UNASSIGNED_SELECT_VALUE = '__SIN_ASIGNAR__'

interface ChecklistActasViewProps {
  nivel: NivelFilter
  rowsExternas?: ActaMatrixRow[]
  responsablesExternos?: ResponsableActaOption[]
  periodosExternos?: PeriodoActaOption[]
  onChangeEstadoActa?: (
    programaId: number,
    tipoActa: TipoActaKey,
    nextEstado: EstadoActa
  ) => void
  onChangeResponsable?: (
    programaId: number,
    responsableId: string | null
  ) => void
  onChangePeriodo?: (
    programaId: number,
    periodo: PeriodoActaKey | null
  ) => void
  onReincorporarTodas?: () => void
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

function getPeriodoTriggerClass(periodo: PeriodoActaKey | null): string {
  if (periodo === 'PERIODO_1') {
    return 'border-blue-500/30 bg-blue-500/10 font-semibold text-blue-700 dark:text-blue-300'
  }
  if (periodo === 'PERIODO_2') {
    return 'border-indigo-500/30 bg-indigo-500/10 font-semibold text-indigo-700 dark:text-indigo-300'
  }
  return 'border-dashed border-border bg-background/70 text-muted-foreground'
}

export function ChecklistActasView({
  nivel,
  rowsExternas,
  responsablesExternos,
  periodosExternos,
  onChangeEstadoActa,
  onChangeResponsable,
  onChangePeriodo,
  onReincorporarTodas,
}: ChecklistActasViewProps) {
  const [localRows, setLocalRows] = React.useState<ActaMatrixRow[]>(() =>
    buildInitialActasMatrix()
  )
  const [searchQuery, setSearchQuery] = React.useState('')
  const [unidadFilter, setUnidadFilter] = React.useState<string>('TODAS')
  const [periodoFilter, setPeriodoFilter] = React.useState<
    'TODOS' | PeriodoActaKey | 'SIN_ASIGNAR'
  >('TODOS')
  const [limpiezaAutomatica, setLimpiezaAutomatica] = React.useState(true)
  const [mostrarCompletadas, setMostrarCompletadas] = React.useState(false)
  const [reincorporarDialogOpen, setReincorporarDialogOpen] =
    React.useState(false)

  const rows = rowsExternas ?? localRows
  const responsablesCatalogo =
    responsablesExternos ?? RESPONSABLES_ACTA_CATALOGO
  const periodosCatalogo = periodosExternos ?? PERIODO_ACTA_OPTIONS

  const responsablesMap = React.useMemo(
    () => new Map(responsablesCatalogo.map((item) => [item.id, item.nombre])),
    [responsablesCatalogo]
  )

  const rowsByNivel = React.useMemo(
    () =>
      rows.filter((row) => nivel === 'TODOS' || row.nivel === nivel),
    [nivel, rows]
  )

  const unidadesDisponibles = React.useMemo(
    () =>
      UNIDADES_ACADEMICAS_CATALOGO.filter(
        (ua) => nivel === 'TODOS' || ua.nivel === nivel
      ),
    [nivel]
  )

  const visibleRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const shouldHideCompleted = limpiezaAutomatica && !mostrarCompletadas

    return rowsByNivel.filter((row) => {
      if (shouldHideCompleted && isActaRowCompleted(row)) {
        return false
      }
      if (
        unidadFilter !== 'TODAS' &&
        String(row.unidadAcademicaId) !== unidadFilter
      ) {
        return false
      }
      if (periodoFilter === 'SIN_ASIGNAR' && row.periodo !== null) {
        return false
      }
      if (
        periodoFilter !== 'TODOS' &&
        periodoFilter !== 'SIN_ASIGNAR' &&
        row.periodo !== periodoFilter
      ) {
        return false
      }
      if (!q) {
        return true
      }

      const responsableNombre = row.responsableId
        ? (responsablesMap.get(row.responsableId) ?? '')
        : ''
      const periodoLabel = getPeriodoActaLabel(row.periodo)

      return (
        row.claveUa.toLowerCase().includes(q) ||
        row.nombreUa.toLowerCase().includes(q) ||
        row.clavePrograma.toLowerCase().includes(q) ||
        row.nombrePrograma.toLowerCase().includes(q) ||
        responsableNombre.toLowerCase().includes(q) ||
        periodoLabel.toLowerCase().includes(q)
      )
    })
  }, [
    limpiezaAutomatica,
    mostrarCompletadas,
    periodoFilter,
    responsablesMap,
    rowsByNivel,
    searchQuery,
    unidadFilter,
  ])

  const stats = React.useMemo(() => {
    const totalProgramas = rowsByNivel.length
    const completados = rowsByNivel.filter(isActaRowCompleted).length
    const pendientes = totalProgramas - completados

    const porActa = ACTA_COLUMNS.map((col) => {
      let generadas = 0
      let aplicables = 0
      for (const r of rowsByNivel) {
        if (r.estados[col.key] !== 'NO_APLICA') {
          aplicables += 1
          if (r.estados[col.key] === 'GENERADA') {
            generadas += 1
          }
        }
      }
      return {
        key: col.key,
        label: col.label,
        generadas,
        aplicables,
      }
    })

    return {
      totalProgramas,
      completados,
      pendientes,
      porActa,
    }
  }, [rowsByNivel])

  const applyLocalEstadoChange = (
    programaId: number,
    tipoActa: TipoActaKey,
    nextEstado: EstadoActa
  ) => {
    const targetRow = localRows.find((row) => row.programaId === programaId)
    const updatedPreview: ActaMatrixRow | null = targetRow
      ? {
          ...targetRow,
          estados: {
            ...targetRow.estados,
            [tipoActa]: nextEstado,
          },
        }
      : null

    setLocalRows((prev) =>
      prev.map((row) =>
        row.programaId !== programaId
          ? row
          : {
              ...row,
              estados: {
                ...row.estados,
                [tipoActa]: nextEstado,
              },
            }
      )
    )

    if (
      updatedPreview &&
      limpiezaAutomatica &&
      !mostrarCompletadas &&
      isActaRowCompleted(updatedPreview)
    ) {
      toast.success(
        `[${updatedPreview.claveUa}] ${updatedPreview.nombrePrograma} completado y limpiado de pendientes.`,
        {
          action: {
            label: 'Ver todas',
            onClick: () => setMostrarCompletadas(true),
          },
        }
      )
    }
  }

  const handleToggleCheckbox = (
    row: ActaMatrixRow,
    tipoActa: TipoActaKey,
    checked: boolean
  ) => {
    const nextEstado: EstadoActa = checked ? 'GENERADA' : 'PENDIENTE'
    if (onChangeEstadoActa) {
      onChangeEstadoActa(row.programaId, tipoActa, nextEstado)
      return
    }
    applyLocalEstadoChange(row.programaId, tipoActa, nextEstado)
  }

  const handleToggleNoAplica = (row: ActaMatrixRow, tipoActa: TipoActaKey) => {
    const nextEstado: EstadoActa =
      row.estados[tipoActa] === 'NO_APLICA' ? 'PENDIENTE' : 'NO_APLICA'
    if (onChangeEstadoActa) {
      onChangeEstadoActa(row.programaId, tipoActa, nextEstado)
      return
    }
    applyLocalEstadoChange(row.programaId, tipoActa, nextEstado)
  }

  const handleChangeResponsable = (
    row: ActaMatrixRow,
    nextResponsableId: string | null
  ) => {
    if (onChangeResponsable) {
      onChangeResponsable(row.programaId, nextResponsableId)
      return
    }
    setLocalRows((prev) =>
      prev.map((item) =>
        item.programaId === row.programaId
          ? { ...item, responsableId: nextResponsableId }
          : item
      )
    )
  }

  const handleChangePeriodo = (
    row: ActaMatrixRow,
    nextPeriodo: PeriodoActaKey | null
  ) => {
    if (onChangePeriodo) {
      onChangePeriodo(row.programaId, nextPeriodo)
      return
    }
    setLocalRows((prev) =>
      prev.map((item) =>
        item.programaId === row.programaId
          ? { ...item, periodo: nextPeriodo }
          : item
      )
    )
  }

  const handleClickReincorporar = () => {
    if (stats.completados === 0) {
      toast.info('No hay programas completados para reincorporar.')
      return
    }
    setReincorporarDialogOpen(true)
  }

  const handleConfirmReincorporar = () => {
    setReincorporarDialogOpen(false)
    setMostrarCompletadas(false)
    if (onReincorporarTodas) {
      onReincorporarTodas()
      return
    }
    const { nextRows, reincorporatedCount } = resetCompletedActaRows(
      localRows,
      nivel
    )
    setLocalRows(nextRows)
    toast.success(
      reincorporatedCount === 1
        ? 'Se reincorporó 1 programa completado con las casillas vacías.'
        : `Se reincorporaron ${reincorporatedCount} programas completados con las casillas vacías.`
    )
  }

  return (
    <div className="space-y-4">
      {/* Tarjetas de avance rápido */}
      <section
        aria-label="Resumen de checklist de actas"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 lg:pr-24"
      >
        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Programas Pendientes
            </CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="font-mono tabular-nums text-xl font-bold text-foreground">
              {stats.pendientes}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / {stats.totalProgramas}
              </span>
            </p>
          </CardContent>
        </Card>

        {stats.porActa.map((acta) => (
          <Card
            key={acta.key}
            className="border-border bg-card shadow-sm dark:shadow-none"
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {acta.key === 'PROMOCION_GRADO' || acta.key === 'CIERRE_CICLO'
                  ? acta.label
                  : `Acta ${acta.label}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono tabular-nums text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {acta.generadas}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / {acta.aplicables}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Matriz tipo Excel */}
      <Card className="border-border bg-card shadow-sm dark:shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2.5 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por clave UA, escuela, carrera o responsable..."
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

              <div className="w-full sm:w-40">
                <Select
                  value={periodoFilter}
                  onValueChange={(value) =>
                    setPeriodoFilter(
                      value as 'TODOS' | PeriodoActaKey | 'SIN_ASIGNAR'
                    )
                  }
                >
                  <SelectTrigger
                    aria-label="Filtrar por fecha (periodo)"
                    className="h-8 bg-background text-xs"
                  >
                    <SelectValue placeholder="Fecha (Periodo)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">
                      Todas las fechas
                    </SelectItem>
                    {periodosCatalogo.map((periodo) => (
                      <SelectItem
                        key={periodo.value}
                        value={periodo.value}
                        className="font-mono tabular-nums text-xs"
                      >
                        {periodo.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="SIN_ASIGNAR" className="text-xs">
                      Sin periodo
                    </SelectItem>
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

              <Button
                type="button"
                size="sm"
                onClick={handleClickReincorporar}
                className="h-9 gap-1.5 bg-primary text-xs font-bold text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reincorporar Actas</span>
                {stats.completados > 0 && (
                  <span className="rounded bg-primary-foreground/20 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                    {stats.completados}
                  </span>
                )}
              </Button>
            </div>
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
                    colSpan={ACTA_COLUMNS.length}
                    className="h-7 border-r border-border bg-secondary/40 text-center text-[10px] font-bold uppercase tracking-widest text-foreground"
                  >
                    Actas y Cierre de Ciclo
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
                  {ACTA_COLUMNS.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        'h-9 min-w-[88px] border-r border-border px-1.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wider',
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
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4 + ACTA_COLUMNS.length + 2}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        <p className="font-semibold text-foreground">
                          {stats.completados > 0 && stats.pendientes === 0
                            ? 'Todas las actas del filtro están completadas'
                            : 'No hay programas por mostrar'}
                        </p>
                        <p>
                          {stats.completados > 0 && stats.pendientes === 0
                            ? 'Usa Ver todas para consultarlas o Reincorporar Actas para restablecerlas con casillas vacías.'
                            : 'Ajusta los filtros de búsqueda, unidad o fecha, o usa Ver todas si deseas revisar programas completados.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row, idx) => {
                    const isCompleted = isActaRowCompleted(row)

                    return (
                      <TableRow
                        key={row.programaId}
                        className={cn(
                          'h-11 transition-colors duration-150 hover:bg-secondary/30',
                          isCompleted && 'bg-emerald-500/5'
                        )}
                      >
                        <TableCell className="w-8 px-1 py-1.5 text-center font-mono tabular-nums text-[11px] text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="w-14 px-1 py-1.5">
                          <Badge
                            variant="secondary"
                            className="font-mono tabular-nums text-[10px] font-bold"
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

                        {ACTA_COLUMNS.map((col) => {
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
                                  onClick={() =>
                                    handleToggleNoAplica(row, col.key)
                                  }
                                  title={
                                    isNoAplica
                                      ? 'Reactivar acta como pendiente'
                                      : 'Marcar como No Aplica (N/A)'
                                  }
                                  className="rounded px-1 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground transition-colors duration-150 hover:bg-background/80 hover:text-foreground"
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
                            onValueChange={(value) =>
                              handleChangeResponsable(
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
                              {responsablesCatalogo.map((responsable) => (
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
                          <Select
                            value={row.periodo ?? UNASSIGNED_SELECT_VALUE}
                            onValueChange={(value) =>
                              handleChangePeriodo(
                                row,
                                value === UNASSIGNED_SELECT_VALUE
                                  ? null
                                  : (value as PeriodoActaKey)
                              )
                            }
                          >
                            <SelectTrigger
                              aria-label={`Fecha (periodo) de ${row.nombrePrograma}`}
                              className={cn(
                                'h-7 w-full px-2 font-mono tabular-nums text-xs transition-colors duration-150',
                                getPeriodoTriggerClass(row.periodo)
                              )}
                            >
                              <SelectValue placeholder="Sin periodo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value={UNASSIGNED_SELECT_VALUE}
                                className="text-xs text-muted-foreground"
                              >
                                Sin periodo
                              </SelectItem>
                              {periodosCatalogo.map((periodo) => (
                                <SelectItem
                                  key={periodo.value}
                                  value={periodo.value}
                                  className="font-mono tabular-nums text-xs"
                                >
                                  {periodo.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

      <Dialog
        open={reincorporarDialogOpen}
        onOpenChange={setReincorporarDialogOpen}
      >
        <DialogContent className="max-w-md gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
          <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Reincorporar actas completadas
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Se restablecerán{' '}
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {stats.completados}
                  </span>{' '}
                  {stats.completados === 1
                    ? 'programa completado'
                    : 'programas completados'}{' '}
                  al listado de pendientes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 px-5 py-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              <p>
                Los programas ya completados volverán a mostrarse{' '}
                <strong className="font-semibold text-foreground">
                  vacíos (sin casillas activas)
                </strong>
                , limpiando también el responsable y la fecha asignada para
                iniciar un nuevo ciclo de captura.
              </p>
              <p className="mt-2">
                Los{' '}
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {stats.pendientes}
                </span>{' '}
                {stats.pendientes === 1
                  ? 'programa actualmente en progreso conservará'
                  : 'programas actualmente en progreso conservarán'}{' '}
                su avance sin cambios.
              </p>
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReincorporarDialogOpen(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmReincorporar}
              className="h-8 gap-1.5 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reincorporar vacías</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ChecklistActasView
