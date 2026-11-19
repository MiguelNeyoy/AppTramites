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
  UNIDADES_ACADEMICAS_CATALOGO,
  buildInitialActasMatrix,
  getActaRowProgress,
  isActaRowCompleted,
  type ActaMatrixRow,
  type EstadoActa,
  type TipoActaKey,
} from './actasMockData'

interface ChecklistActasViewProps {
  nivel: NivelFilter
  rowsExternas?: ActaMatrixRow[]
  onChangeEstadoActa?: (
    programaId: number,
    tipoActa: TipoActaKey,
    nextEstado: EstadoActa
  ) => void
  onToggleAllRow?: (programaId: number, markComplete: boolean) => void
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

export function ChecklistActasView({
  nivel,
  rowsExternas,
  onChangeEstadoActa,
  onToggleAllRow,
  onReincorporarTodas,
}: ChecklistActasViewProps) {
  const [localRows, setLocalRows] = React.useState<ActaMatrixRow[]>(() =>
    buildInitialActasMatrix()
  )
  const [searchQuery, setSearchQuery] = React.useState('')
  const [unidadFilter, setUnidadFilter] = React.useState<string>('TODAS')
  const [limpiezaAutomatica, setLimpiezaAutomatica] = React.useState(true)
  const [mostrarCompletadas, setMostrarCompletadas] = React.useState(false)

  const rows = rowsExternas ?? localRows

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
      if (!q) {
        return true
      }
      return (
        row.claveUa.toLowerCase().includes(q) ||
        row.nombreUa.toLowerCase().includes(q) ||
        row.clavePrograma.toLowerCase().includes(q) ||
        row.nombrePrograma.toLowerCase().includes(q)
      )
    })
  }, [
    limpiezaAutomatica,
    mostrarCompletadas,
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
    let completedLabel: string | null = null

    setLocalRows((prev) =>
      prev.map((row) => {
        if (row.programaId !== programaId) {
          return row
        }
        const updated: ActaMatrixRow = {
          ...row,
          estados: {
            ...row.estados,
            [tipoActa]: nextEstado,
          },
        }
        if (
          limpiezaAutomatica &&
          !mostrarCompletadas &&
          isActaRowCompleted(updated)
        ) {
          completedLabel = `[${updated.claveUa}] ${updated.nombrePrograma}`
        }
        return updated
      })
    )

    if (completedLabel) {
      toast.success(`${completedLabel} completado y limpiado de pendientes.`, {
        action: {
          label: 'Ver todas',
          onClick: () => setMostrarCompletadas(true),
        },
      })
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

  const handleToggleAllRow = (row: ActaMatrixRow, checked: boolean) => {
    if (onToggleAllRow) {
      onToggleAllRow(row.programaId, checked)
      return
    }

    setLocalRows((prev) =>
      prev.map((item) => {
        if (item.programaId !== row.programaId) {
          return item
        }
        const nextEstados: Record<TipoActaKey, EstadoActa> = {
          ORDINARIA:
            item.estados.ORDINARIA === 'NO_APLICA'
              ? 'NO_APLICA'
              : checked
                ? 'GENERADA'
                : 'PENDIENTE',
          EXTRAORDINARIA:
            item.estados.EXTRAORDINARIA === 'NO_APLICA'
              ? 'NO_APLICA'
              : checked
                ? 'GENERADA'
                : 'PENDIENTE',
          REGULARIZACION:
            item.estados.REGULARIZACION === 'NO_APLICA'
              ? 'NO_APLICA'
              : checked
                ? 'GENERADA'
                : 'PENDIENTE',
        }
        return {
          ...item,
          estados: nextEstados,
        }
      })
    )

    if (checked && limpiezaAutomatica && !mostrarCompletadas) {
      toast.success(
        `[${row.claveUa}] ${row.nombrePrograma} marcado completo y limpiado de pendientes.`
      )
    }
  }

  const handleReincorporarTodas = () => {
    setMostrarCompletadas(true)
    if (onReincorporarTodas) {
      onReincorporarTodas()
      return
    }
    toast.info(
      `Se reincorporaron las ${stats.totalProgramas} filas a la tabla (${stats.completados} completadas).`
    )
  }

  return (
    <div className="space-y-4">
      {/* Tarjetas de avance rápido */}
      <section
        aria-label="Resumen de checklist de actas"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:pr-24"
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
                Acta {acta.label}
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
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por clave UA, escuela o carrera..."
                  className="h-8 bg-background pl-8 text-xs"
                />
              </div>

              <div className="w-full sm:w-60">
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
                    <span>Ver todas ({stats.completados})</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleReincorporarTodas}
                className="h-9 gap-1.5 bg-primary font-bold text-xs text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reincorporar Actas</span>
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
                    colSpan={3}
                    className="h-7 border-r border-border bg-secondary/40 text-center text-[10px] font-bold uppercase tracking-widest text-foreground"
                  >
                    Actas Oficiales
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="h-7 bg-secondary/70 text-center text-[10px] font-bold uppercase tracking-widest text-foreground"
                  >
                    Control
                  </TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 w-12 bg-secondary/50 text-center text-[10px] font-semibold uppercase tracking-widest">
                    #
                  </TableHead>
                  <TableHead className="h-9 w-24 bg-secondary/50 text-[10px] font-semibold uppercase tracking-widest">
                    Clave UA
                  </TableHead>
                  <TableHead className="h-9 bg-secondary/50 text-[10px] font-semibold uppercase tracking-widest">
                    Unidad Académica
                  </TableHead>
                  <TableHead className="h-9 border-r border-border bg-secondary/50 text-[10px] font-semibold uppercase tracking-widest">
                    Programa Educativo
                  </TableHead>
                  {ACTA_COLUMNS.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        'h-9 w-32 border-r border-border text-center text-[10px] font-bold uppercase tracking-widest',
                        col.headerClass
                      )}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="h-9 w-28 bg-secondary/50 text-center text-[10px] font-semibold uppercase tracking-widest">
                    Avance
                  </TableHead>
                  <TableHead className="h-9 w-20 bg-secondary/50 text-center text-[10px] font-semibold uppercase tracking-widest">
                    Todo
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        <p className="font-semibold text-foreground">
                          No hay actas pendientes por mostrar
                        </p>
                        <p>
                          Usa el botón <strong>Reincorporar Actas</strong> para volver a visualizar todas las filas completadas.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row, idx) => {
                    const isCompleted = isActaRowCompleted(row)
                    const progress = getActaRowProgress(row)

                    return (
                      <TableRow
                        key={row.programaId}
                        className={cn(
                          'h-11 transition-colors duration-150 hover:bg-secondary/30',
                          isCompleted && 'bg-emerald-500/5'
                        )}
                      >
                        <TableCell className="py-1.5 text-center font-mono tabular-nums text-[11px] text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant="secondary"
                            className="font-mono tabular-nums text-[10px] font-bold"
                          >
                            {row.claveUa}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="min-w-[170px] leading-tight">
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
                        <TableCell className="border-r border-border py-1.5">
                          <div className="min-w-[200px] text-xs">
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
                                'border-r border-border py-1.5 text-center transition-colors duration-150',
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

                        <TableCell className="py-1.5 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-mono tabular-nums text-[10px] font-bold',
                              isCompleted
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            )}
                          >
                            {isCompleted
                              ? 'Completa'
                              : `${progress.done}/${progress.totalAplicables}`}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-1.5 text-center">
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={(checked) =>
                              handleToggleAllRow(row, checked === true)
                            }
                            aria-label={`Marcar todas las actas de ${row.nombrePrograma}`}
                            className="h-4 w-4 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white"
                          />
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
    </div>
  )
}

export default ChecklistActasView
