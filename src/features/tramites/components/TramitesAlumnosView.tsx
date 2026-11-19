import * as React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import type { NivelFilter } from '@/features/dashboard/types'
import type { RolUsuario } from '@/services/login'
import {
  summarizeTramitesByEstado,
  type EstadoTramiteAlumno,
  type TramiteAlumnoRecord,
} from '@/services/tramites'
import { useTramites } from '../hooks/useTramites'
import { TramiteRegistroModal } from './TramiteRegistroModal'
import {
  ESTADO_TRAMITE_OPTIONS,
  MESES_CICLO_ESCOLAR,
  getEstadoTramiteMeta,
} from './tramitesMockData'

interface TramitesAlumnosViewProps {
  nivel: NivelFilter
  userRol?: RolUsuario
  refreshSignal?: number
  onLoadingChange?: (loading: boolean) => void
}

export function TramitesAlumnosView({
  nivel,
  userRol,
  refreshSignal,
  onLoadingChange,
}: TramitesAlumnosViewProps) {
  const {
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
    reloadTramites,
    handleSaveTramite,
    handleChangeEstado,
    handleDeleteTramite,
    handleSaveFichaDesdeModal,
  } = useTramites()

  const reloadRef = React.useRef(reloadTramites)
  const prevRefreshSignalRef = React.useRef(refreshSignal)
  React.useEffect(() => {
    reloadRef.current = reloadTramites
  }, [reloadTramites])

  React.useEffect(() => {
    if (
      refreshSignal !== undefined &&
      refreshSignal !== prevRefreshSignalRef.current
    ) {
      prevRefreshSignalRef.current = refreshSignal
      void reloadRef.current()
    }
  }, [refreshSignal])

  React.useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  const [selectedMes, setSelectedMes] = React.useState<string>('TODOS')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [tipoFilter, setTipoFilter] = React.useState<string>('TODOS')
  const [estadoFilter, setEstadoFilter] = React.useState<
    'TODOS' | EstadoTramiteAlumno
  >('TODOS')

  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingTramite, setEditingTramite] =
    React.useState<TramiteAlumnoRecord | null>(null)
  const [deletingTramite, setDeletingTramite] =
    React.useState<TramiteAlumnoRecord | null>(null)

  const isAdmin = !userRol || userRol === 'ADMIN'

  const baseTramites = React.useMemo(() => {
    return tramites.filter((row) => {
      const matchesPeriodo =
        periodos.length === 0 || row.periodoId === selectedPeriodoId
      const matchesNivel = nivel === 'TODOS' || row.nivel === nivel
      return matchesPeriodo && matchesNivel
    })
  }, [nivel, periodos.length, selectedPeriodoId, tramites])

  const monthCounts = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const row of baseTramites) {
      const monthKey = row.fechaRegistro.slice(5, 7)
      map.set(monthKey, (map.get(monthKey) ?? 0) + 1)
    }
    return map
  }, [baseTramites])

  const filteredTramites = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return baseTramites.filter((row) => {
      const matchesMes =
        selectedMes === 'TODOS' || row.fechaRegistro.slice(5, 7) === selectedMes
      const matchesTipo =
        tipoFilter === 'TODOS' || String(row.tipoTramiteId) === tipoFilter
      const matchesEstado =
        estadoFilter === 'TODOS' || row.estado === estadoFilter
      const matchesQuery =
        !q ||
        String(row.folio).includes(q) ||
        row.numeroCuenta.toLowerCase().includes(q) ||
        row.nombreAlumno.toLowerCase().includes(q) ||
        row.claveUa.toLowerCase().includes(q) ||
        row.nombreUa.toLowerCase().includes(q) ||
        row.nombrePrograma.toLowerCase().includes(q) ||
        row.nombreTramite.toLowerCase().includes(q)

      return matchesMes && matchesTipo && matchesEstado && matchesQuery
    })
  }, [baseTramites, estadoFilter, searchQuery, selectedMes, tipoFilter])

  const summary = React.useMemo(
    () => summarizeTramitesByEstado(filteredTramites),
    [filteredTramites]
  )

  const tiposGenerales = React.useMemo(
    () => tiposTramite.filter((t) => t.modulo === 'TRAMITES_GENERALES'),
    [tiposTramite]
  )

  const handleConfirmDelete = async () => {
    if (!deletingTramite) {
      return
    }
    const ok = await handleDeleteTramite(deletingTramite)
    if (ok) {
      setDeletingTramite(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Selector de periodo y tira mensual compacta */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm dark:shadow-none lg:mr-24 xl:flex-row xl:items-center xl:gap-4">
        <div className="w-full xl:w-64 xl:shrink-0">
          <Select
            value={String(selectedPeriodoId)}
            onValueChange={(v) => setSelectedPeriodoId(Number(v))}
          >
            <SelectTrigger className="h-8 bg-background font-mono text-xs">
              <SelectValue placeholder="Periodo escolar" />
            </SelectTrigger>
            <SelectContent>
              {periodos.map((p) => (
                <SelectItem
                  key={p.id}
                  value={String(p.id)}
                  className="font-mono text-xs"
                >
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-start gap-1 xl:justify-between">
          <button
            type="button"
            onClick={() => setSelectedMes('TODOS')}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-150',
              selectedMes === 'TODOS'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            Todos ({baseTramites.length})
          </button>
          {MESES_CICLO_ESCOLAR.map((m) => {
            const count = monthCounts.get(m.key) ?? 0
            const isSelected = selectedMes === m.key
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMes(m.key)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
                  isSelected
                    ? 'bg-primary font-bold text-primary-foreground shadow-sm'
                    : count > 0
                      ? 'bg-secondary/70 text-foreground hover:bg-secondary'
                      : 'text-muted-foreground hover:bg-secondary/50'
                )}
              >
                {m.label}
                {count > 0 && (
                  <span className="ml-1 font-mono tabular-nums text-[10px] opacity-90">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 4 tarjetas compactas derivadas del padrón filtrado */}
      <section
        aria-label="Conteos de trámites "
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Total Registros
            </CardTitle>
            <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-mono tabular-nums text-xl font-bold text-foreground">
              {summary.total}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Pendientes
            </CardTitle>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="font-mono tabular-nums text-xl font-bold text-amber-600 dark:text-amber-400">
              {summary.pendientes}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Resueltos
            </CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="font-mono tabular-nums text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.resueltos}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Con Error
            </CardTitle>
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="font-mono tabular-nums text-xl font-bold text-destructive">
              {summary.conError}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Tabla operativa principal */}
      <Card className="border-border bg-card shadow-sm dark:shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Folio, cuenta, alumno o clave UA..."
                  className="h-8 bg-background pl-8 text-xs"
                />
              </div>

              <div className="w-full sm:w-48">
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="h-8 bg-background text-xs">
                    <SelectValue placeholder="Tipo de trámite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">
                      Todos los trámites
                    </SelectItem>
                    {tiposGenerales.map((t) => (
                      <SelectItem
                        key={t.id}
                        value={String(t.id)}
                        className="text-xs"
                      >
                        {t.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-36">
                <Select
                  value={estadoFilter}
                  onValueChange={(v) =>
                    setEstadoFilter(v as 'TODOS' | EstadoTramiteAlumno)
                  }
                >
                  <SelectTrigger className="h-8 bg-background text-xs">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">
                      Todos
                    </SelectItem>
                    {ESTADO_TRAMITE_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {isOfflinePreview && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium text-muted-foreground"
                >
                  Vista previa local
                </Badge>
              )}

              <Button
                type="button"
                size="sm"
                disabled={isMutating}
                onClick={() => {
                  setEditingTramite(null)
                  setModalOpen(true)
                }}
                className="h-9 gap-1.5 bg-primary font-bold text-xs text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                <span>Nuevo Trámite</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Folio
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    No. Cuenta
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Nombre del Alumno
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Unidad y Carrera
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Trámite
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Fecha
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Estado
                  </TableHead>
                  <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-widest">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-xs text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Cargando solicitudes de trámites...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : filteredTramites.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-xs text-muted-foreground"
                    >
                      No hay trámites registrados con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTramites.map((row) => {
                    const estadoMeta = getEstadoTramiteMeta(row.estado)
                    return (
                      <TableRow
                        key={row.id}
                        className="h-12 transition-colors duration-150 hover:bg-secondary/30"
                      >
                        <TableCell className="py-2">
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/10 font-mono tabular-nums text-[10px] font-bold text-amber-600 dark:text-amber-400"
                          >
                            #{String(row.folio).padStart(4, '0')}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-2 font-mono tabular-nums text-xs font-semibold text-primary">
                          {row.numeroCuenta}
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="min-w-[180px]">
                            <p className="text-xs font-semibold text-foreground">
                              {row.nombreAlumno}
                            </p>
                            {row.observaciones && (
                              <p className="truncate text-[11px] text-muted-foreground max-w-[240px]">
                                {row.observaciones}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="min-w-[190px] leading-tight">
                            <p className="text-xs font-medium text-foreground">
                              <span className="font-mono font-bold">
                                {row.claveUa}
                              </span>{' '}
                              &middot; {row.nombreUa}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {row.nombrePrograma}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <span>{row.nombreTramite}</span>
                            {row.archivoPdfUrl && (
                              <FileText
                                className="h-3.5 w-3.5 shrink-0 text-primary"
                                aria-label="Incluye PDF"
                              />
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-2 font-mono tabular-nums text-xs text-muted-foreground">
                          {row.fechaRegistro}
                        </TableCell>

                        <TableCell className="py-2">
                          <Select
                            value={row.estado}
                            disabled={isMutating}
                            onValueChange={(next) =>
                              void handleChangeEstado(
                                row,
                                next as EstadoTramiteAlumno
                              )
                            }
                          >
                            <SelectTrigger
                              aria-label={`Estado de folio ${row.folio}`}
                              className={cn(
                                'h-7 w-[112px] rounded-full px-2.5 text-[10px] font-bold',
                                estadoMeta.badgeClass
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ESTADO_TRAMITE_OPTIONS.map((opt) => (
                                <SelectItem
                                  key={opt.value}
                                  value={opt.value}
                                  className="text-xs"
                                >
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isMutating}
                              onClick={() => {
                                setEditingTramite(row)
                                setModalOpen(true)
                              }}
                              aria-label={`Editar folio ${row.folio}`}
                              className="h-7 w-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isMutating}
                                onClick={() => setDeletingTramite(row)}
                                aria-label={`Eliminar folio ${row.folio}`}
                                className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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

      <TramiteRegistroModal
        key={`alumnos-modal-${editingTramite?.id ?? 'new'}-${String(modalOpen)}`}
        open={modalOpen}
        onOpenChange={setModalOpen}
        nivel={nivel}
        userRol={userRol}
        periodoId={selectedPeriodoId}
        unidadesCatalogo={unidades}
        programasCatalogo={programas}
        tiposTramiteCatalogo={tiposTramite}
        initialTramite={editingTramite}
        isSubmitting={isMutating}
        onSaveTramite={handleSaveTramite}
        onSaveFicha={handleSaveFichaDesdeModal}
      />

      <Dialog
        open={Boolean(deletingTramite)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingTramite(null)
        }}
      >
        <DialogContent className="max-w-sm gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
          <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Eliminar Trámite
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Registro de trámite 
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-5 py-4 text-xs text-foreground">
            ¿Confirmas eliminar el trámite folio{' '}
            <strong className="font-mono">
              #{String(deletingTramite?.folio ?? '').padStart(4, '0')}
            </strong>{' '}
            de <strong>{deletingTramite?.nombreAlumno}</strong>?
          </div>
          <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isMutating}
              onClick={() => setDeletingTramite(null)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isMutating}
              onClick={() => void handleConfirmDelete()}
              className="h-8 gap-1.5 font-semibold text-xs"
            >
              {isMutating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>Eliminar</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TramitesAlumnosView
