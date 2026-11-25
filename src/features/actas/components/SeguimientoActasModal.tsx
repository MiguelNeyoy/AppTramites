import * as React from 'react'
import { CheckCircle2, ClipboardCheck, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  isActaRowCompleted,
  type ActaColumnMeta,
  type ActaMatrixRow,
  type EstadoActa,
  type TipoActa,
} from '@/services/actas'

export type SeguimientoTarget = 'RESUMEN' | TipoActa

type EstadoFiltroSeguimiento = 'TODOS' | EstadoActa
type ResumenFiltroSeguimiento = 'TODOS' | 'COMPLETADOS' | 'PENDIENTES'

interface SeguimientoActasModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: SeguimientoTarget
  onTargetChange: (nextTarget: SeguimientoTarget) => void
  rows: readonly ActaMatrixRow[]
  activeColumns: readonly ActaColumnMeta[]
  responsablesMap: ReadonlyMap<string, string>
  periodoLabel: string
  periodoNombre: string
}

function formatDateTimeShort(iso: string | null): string {
  if (!iso) {
    return 'Sin registro'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return 'Sin registro'
  }
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function renderEstadoBadge(estado: EstadoActa) {
  if (estado === 'GENERADA') {
    return (
      <Badge className="border-emerald-600/30 bg-emerald-500/15 font-semibold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
        Generada
      </Badge>
    )
  }
  if (estado === 'NO_APLICA') {
    return (
      <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
        N/A
      </Badge>
    )
  }
  return (
    <Badge
      variant="destructive"
      className="border-destructive/30 bg-destructive/15 font-semibold text-destructive hover:bg-destructive/15"
    >
      Pendiente
    </Badge>
  )
}

export function SeguimientoActasModal({
  open,
  onOpenChange,
  target,
  onTargetChange,
  rows,
  activeColumns,
  responsablesMap,
  periodoLabel,
  periodoNombre,
}: SeguimientoActasModalProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [estadoFilter, setEstadoFilter] =
    React.useState<EstadoFiltroSeguimiento>('TODOS')
  const [resumenFilter, setResumenFilter] =
    React.useState<ResumenFiltroSeguimiento>('TODOS')

  const resetFilters = React.useCallback(() => {
    setSearchQuery('')
    setEstadoFilter('TODOS')
    setResumenFilter('TODOS')
  }, [])

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetFilters()
    }
    onOpenChange(nextOpen)
  }

  const handleSelectTarget = (nextTarget: SeguimientoTarget) => {
    resetFilters()
    onTargetChange(nextTarget)
  }

  const selectedCol = React.useMemo(
    () => activeColumns.find((col) => col.key === target) ?? null,
    [activeColumns, target]
  )

  const summaryCounts = React.useMemo(() => {
    if (target === 'RESUMEN') {
      const completados = rows.filter((r) =>
        isActaRowCompleted(r, activeColumns)
      ).length
      return {
        primaryLabel: 'Completados',
        primaryCount: completados,
        secondaryLabel: 'Pendientes',
        secondaryCount: rows.length - completados,
        naCount: 0,
      }
    }

    let generadas = 0
    let pendientes = 0
    let noAplica = 0
    for (const row of rows) {
      const est = row.estados[target]
      if (est === 'GENERADA') {
        generadas += 1
      } else if (est === 'NO_APLICA') {
        noAplica += 1
      } else {
        pendientes += 1
      }
    }
    return {
      primaryLabel: 'Generadas',
      primaryCount: generadas,
      secondaryLabel: 'Pendientes',
      secondaryCount: pendientes,
      naCount: noAplica,
    }
  }, [activeColumns, rows, target])

  const filteredRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return rows.filter((row) => {
      if (target === 'RESUMEN') {
        const done = isActaRowCompleted(row, activeColumns)
        if (resumenFilter === 'COMPLETADOS' && !done) {
          return false
        }
        if (resumenFilter === 'PENDIENTES' && done) {
          return false
        }
      } else {
        const estado = row.estados[target]
        if (estadoFilter !== 'TODOS' && estado !== estadoFilter) {
          return false
        }
      }

      if (!q) {
        return true
      }

      const cellRespId =
        target === 'RESUMEN'
          ? row.responsableId
          : (row.detalles[target].responsableId ??
            row.detalles[target].actualizadoPor ??
            row.responsableId)
      const respNombre = cellRespId ? (responsablesMap.get(cellRespId) ?? '') : ''

      return (
        row.claveUa.toLowerCase().includes(q) ||
        row.nombreUa.toLowerCase().includes(q) ||
        row.clavePrograma.toLowerCase().includes(q) ||
        row.nombrePrograma.toLowerCase().includes(q) ||
        respNombre.toLowerCase().includes(q)
      )
    })
  }, [
    activeColumns,
    estadoFilter,
    responsablesMap,
    resumenFilter,
    rows,
    searchQuery,
    target,
  ])

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {selectedCol
                    ? `Seguimiento: Acta ${selectedCol.label}`
                    : 'Seguimiento General de Actas'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {periodoLabel}
                  </span>{' '}
                  &mdash; {periodoNombre}
                </DialogDescription>
              </div>
            </div>

            <div className="w-full sm:w-56">
              <Select
                value={target}
                onValueChange={(value) =>
                  handleSelectTarget(value as SeguimientoTarget)
                }
              >
                <SelectTrigger className="h-8 bg-background text-xs">
                  <SelectValue placeholder="Seleccionar seguimiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESUMEN" className="text-xs font-medium">
                    Resumen por Programa
                  </SelectItem>
                  {activeColumns.map((col) => (
                    <SelectItem
                      key={col.key}
                      value={col.key}
                      className="text-xs"
                    >
                      {col.order}. {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/25 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-600/30 bg-emerald-500/15 font-mono tabular-nums text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
              {summaryCounts.primaryLabel}: {summaryCounts.primaryCount}
            </Badge>
            <Badge
              variant="destructive"
              className="border-destructive/30 bg-destructive/15 font-mono tabular-nums text-destructive hover:bg-destructive/15"
            >
              {summaryCounts.secondaryLabel}: {summaryCounts.secondaryCount}
            </Badge>
            {target !== 'RESUMEN' && summaryCounts.naCount > 0 && (
              <Badge
                variant="outline"
                className="font-mono tabular-nums text-muted-foreground"
              >
                N/A: {summaryCounts.naCount}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar escuela o carrera..."
                className="h-8 bg-background pl-8 text-xs"
              />
            </div>

            {target === 'RESUMEN' ? (
              <Select
                value={resumenFilter}
                onValueChange={(value) =>
                  setResumenFilter(value as ResumenFiltroSeguimiento)
                }
              >
                <SelectTrigger className="h-8 w-36 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS" className="text-xs">
                    Todos
                  </SelectItem>
                  <SelectItem value="COMPLETADOS" className="text-xs">
                    Completados
                  </SelectItem>
                  <SelectItem value="PENDIENTES" className="text-xs">
                    Con pendientes
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={estadoFilter}
                onValueChange={(value) =>
                  setEstadoFilter(value as EstadoFiltroSeguimiento)
                }
              >
                <SelectTrigger className="h-8 w-36 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS" className="text-xs">
                    Todos los estados
                  </SelectItem>
                  <SelectItem value="GENERADA" className="text-xs">
                    Generadas
                  </SelectItem>
                  <SelectItem value="PENDIENTE" className="text-xs">
                    Pendientes
                  </SelectItem>
                  <SelectItem value="NO_APLICA" className="text-xs">
                    No aplica (N/A)
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 w-16 text-[10px] font-semibold uppercase tracking-widest">
                    Clave
                  </TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold uppercase tracking-widest">
                    Unidad Académica y Programa
                  </TableHead>
                  <TableHead className="h-8 w-32 text-center text-[10px] font-semibold uppercase tracking-widest">
                    Estado
                  </TableHead>
                  <TableHead className="h-8 w-40 text-[10px] font-semibold uppercase tracking-widest">
                    Responsable
                  </TableHead>
                  <TableHead className="h-8 w-36 text-[10px] font-semibold uppercase tracking-widest">
                    Actualización
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-xs text-muted-foreground"
                    >
                      No hay registros que coincidan con el filtro aplicado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const isResumen = target === 'RESUMEN'
                    const doneInResumen = isActaRowCompleted(row, activeColumns)
                    const aplicablesCount = activeColumns.filter(
                      (c) => row.estados[c.key] !== 'NO_APLICA'
                    ).length
                    const generadasCount = activeColumns.filter(
                      (c) => row.estados[c.key] === 'GENERADA'
                    ).length

                    const detail = isResumen ? null : row.detalles[target]
                    const respId = isResumen
                      ? row.responsableId
                      : (detail?.responsableId ??
                        detail?.actualizadoPor ??
                        row.responsableId)
                    const respName = respId
                      ? (responsablesMap.get(respId) ?? 'Usuario asignado')
                      : 'Sin asignar'
                    const updatedIso = isResumen
                      ? row.updatedAt
                      : (detail?.updatedAt ?? null)

                    return (
                      <TableRow
                        key={row.programaId}
                        className={cn(
                          'h-10 transition-colors',
                          ((isResumen && doneInResumen) ||
                            (!isResumen && row.estados[target] === 'GENERADA')) &&
                            'bg-emerald-500/5'
                        )}
                      >
                        <TableCell className="py-1.5">
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px] font-bold"
                          >
                            {row.claveUa}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="leading-tight">
                            <p className="text-xs font-semibold text-foreground">
                              {row.nombreUa}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              <span className="mr-1 font-mono font-bold text-primary">
                                {row.clavePrograma}
                              </span>
                              {row.nombrePrograma}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5 text-center">
                          {isResumen ? (
                            doneInResumen ? (
                              <Badge className="gap-1 border-emerald-600/30 bg-emerald-500/15 font-mono text-[10px] text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                {generadasCount}/{aplicablesCount}
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="border-destructive/30 bg-destructive/15 font-mono text-[10px] text-destructive hover:bg-destructive/15"
                              >
                                {generadasCount}/{aplicablesCount}
                              </Badge>
                            )
                          ) : (
                            renderEstadoBadge(row.estados[target])
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-foreground">
                          <span
                            className={cn(
                              !respId && 'italic text-muted-foreground'
                            )}
                          >
                            {respName}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                          {formatDateTimeShort(updatedIso)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleDialogOpenChange(false)}
            className="h-8 text-xs"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
