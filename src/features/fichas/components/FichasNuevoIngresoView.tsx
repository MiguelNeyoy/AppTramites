import * as React from 'react'
import {
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  XCircle,
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
import { TramiteRegistroModal } from '@/features/tramites'
import type { FichaNuevoIngresoRecord } from '@/services/fichas'
import type { RolUsuario } from '@/services/login'
import { useFichas } from '../hooks/useFichas'
import {
  ESTATUS_FICHA_OPTIONS,
  formatFechaExcel,
  getEstatusFichaMeta,
  type EstatusFichaNuevoIngreso,
} from './fichasMockData'

interface FichasNuevoIngresoViewProps {
  userRol?: RolUsuario
  fichasExternas?: FichaNuevoIngresoRecord[]
  onSaveFicha?: (
    ficha: FichaNuevoIngresoRecord,
    isEdit: boolean
  ) => Promise<boolean | void> | boolean | void
  onDeleteFicha?: (
    ficha: FichaNuevoIngresoRecord
  ) => Promise<boolean | void> | boolean | void
  onExportExcel?: (
    fichas: FichaNuevoIngresoRecord[]
  ) => Promise<boolean | void> | boolean | void
  refreshSignal?: number
  onLoadingChange?: (loading: boolean) => void
}

export function FichasNuevoIngresoView({
  userRol,
  fichasExternas,
  onSaveFicha,
  onDeleteFicha,
  onExportExcel,
  refreshSignal,
  onLoadingChange,
}: FichasNuevoIngresoViewProps) {
  const {
    fichas: serviceFichas,
    unidades,
    programas,
    periodos,
    selectedPeriodoId,
    setSelectedPeriodoId,
    isLoading,
    isMutating,
    isExporting,
    isOfflinePreview,
    reloadFichas,
    handleCreateFicha,
    handleUpdateFicha,
    handleDeleteFicha,
    handleExportExcel,
  } = useFichas()

  const reloadRef = React.useRef(reloadFichas)
  const prevRefreshSignalRef = React.useRef(refreshSignal)
  React.useEffect(() => {
    reloadRef.current = reloadFichas
  }, [reloadFichas])

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
    onLoadingChange?.(isLoading && !fichasExternas)
  }, [isLoading, fichasExternas, onLoadingChange])

  const [searchQuery, setSearchQuery] = React.useState('')
  const [nivelFilter, setNivelFilter] = React.useState<
    'TODOS' | 'BACHILLERATO' | 'LICENCIATURA'
  >('TODOS')
  const [estatusFilter, setEstatusFilter] = React.useState<
    'TODOS' | EstatusFichaNuevoIngreso
  >('TODOS')

  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingFicha, setEditingFicha] =
    React.useState<FichaNuevoIngresoRecord | null>(null)
  const [deletingFicha, setDeletingFicha] =
    React.useState<FichaNuevoIngresoRecord | null>(null)

  const fichas = fichasExternas ?? serviceFichas

  const fichasByPeriodo = React.useMemo(() => {
    if (fichasExternas || periodos.length === 0) {
      return fichas
    }
    return fichas.filter((f) => f.periodoId === selectedPeriodoId)
  }, [fichas, fichasExternas, periodos.length, selectedPeriodoId])

  const filteredFichas = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return fichasByPeriodo.filter((f) => {
      const matchesNivel = nivelFilter === 'TODOS' || f.nivel === nivelFilter
      const matchesEstatus =
        estatusFilter === 'TODOS' || f.estatusFicha === estatusFilter
      const fullName = `${f.aPaterno} ${f.aMaterno} ${f.nombre}`.toLowerCase()
      const matchesQuery =
        !q ||
        f.curp.toLowerCase().includes(q) ||
        fullName.includes(q) ||
        f.claveEscuela.toLowerCase().includes(q) ||
        f.nombreEscuela.toLowerCase().includes(q) ||
        f.correo.toLowerCase().includes(q)
      return matchesNivel && matchesEstatus && matchesQuery
    })
  }, [estatusFilter, fichasByPeriodo, nivelFilter, searchQuery])

  const counts = React.useMemo(() => {
    let sinProcesoOPago = 0
    let vencidas = 0
    let canceladas = 0
    for (const f of fichasByPeriodo) {
      if (f.estatusFicha === 'SIN_PROCESO' || f.estatusFicha === 'SIN_PAGO') {
        sinProcesoOPago += 1
      } else if (f.estatusFicha === 'FICHA_VENCIDA') {
        vencidas += 1
      } else if (f.estatusFicha === 'FICHA_CANCELADA') {
        canceladas += 1
      }
    }
    return {
      total: fichasByPeriodo.length,
      sinProcesoOPago,
      vencidas,
      canceladas,
    }
  }, [fichasByPeriodo])

  const handleSave = async (
    ficha: FichaNuevoIngresoRecord,
    isEdit: boolean
  ): Promise<boolean> => {
    if (onSaveFicha) {
      const res = await onSaveFicha(ficha, isEdit)
      return res !== false
    }
    return isEdit ? handleUpdateFicha(ficha) : handleCreateFicha(ficha)
  }

  const handleConfirmDelete = async () => {
    if (!deletingFicha) {
      return
    }
    if (onDeleteFicha) {
      const res = await onDeleteFicha(deletingFicha)
      if (res !== false) {
        setDeletingFicha(null)
      }
      return
    }
    const ok = await handleDeleteFicha(deletingFicha)
    if (ok) {
      setDeletingFicha(null)
    }
  }

  const handleExport = () => {
    if (onExportExcel) {
      void onExportExcel(filteredFichas)
      return
    }
    void handleExportExcel(filteredFichas)
  }

  return (
    <div className="space-y-5">
      <section
        aria-label="Indicadores de nuevo ingreso"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:pr-24 xl:grid-cols-4"
      >
        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Total Aspirantes
            </CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="font-mono tabular-nums text-2xl font-bold text-foreground">
              {counts.total}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Ambas divisiones académicas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Sin Proceso / Pago
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="font-mono tabular-nums text-2xl font-bold text-amber-600 dark:text-amber-400">
              {counts.sinProcesoOPago}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Seguimiento de pago pendiente
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Fichas Vencidas
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="font-mono tabular-nums text-2xl font-bold text-orange-600 dark:text-orange-400">
              {counts.vencidas}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Vigencia de recibo expirada
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Fichas Canceladas
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="font-mono tabular-nums text-2xl font-bold text-destructive">
              {counts.canceladas}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Bajas registradas en ciclo
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border bg-card shadow-sm dark:shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por CURP, nombre, escuela o correo..."
                  className="h-8 bg-background pl-8 text-xs"
                />
              </div>

              {periodos.length > 0 && (
                <div className="w-full sm:w-52">
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
              )}

              <div className="w-full sm:w-36">
                <Select
                  value={nivelFilter}
                  onValueChange={(v) =>
                    setNivelFilter(v as 'TODOS' | 'BACHILLERATO' | 'LICENCIATURA')
                  }
                >
                  <SelectTrigger className="h-8 bg-background text-xs">
                    <SelectValue placeholder="Nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">
                      Ambos niveles
                    </SelectItem>
                    <SelectItem value="BACHILLERATO" className="text-xs">
                      Bachillerato
                    </SelectItem>
                    <SelectItem value="LICENCIATURA" className="text-xs">
                      Licenciatura
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-36">
                <Select
                  value={estatusFilter}
                  onValueChange={(v) =>
                    setEstatusFilter(v as 'TODOS' | EstatusFichaNuevoIngreso)
                  }
                >
                  <SelectTrigger className="h-8 bg-background text-xs">
                    <SelectValue placeholder="Estatus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">
                      Todos los estatus
                    </SelectItem>
                    {ESTATUS_FICHA_OPTIONS.map((opt) => (
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
                disabled={isExporting || isLoading}
                onClick={handleExport}
                className="h-9 gap-1.5 bg-emerald-600 font-bold text-xs text-white shadow-sm transition-all duration-150 hover:bg-emerald-700"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                <span>Exportar Excel ({filteredFichas.length})</span>
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isMutating}
                onClick={() => {
                  setEditingFicha(null)
                  setModalOpen(true)
                }}
                className="h-9 gap-1.5 bg-primary font-bold text-xs text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva Ficha</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    CURP
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Aspirante
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Sexo
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Escuela / Carrera
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Fecha Nac
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Contacto
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Estatus
                  </TableHead>
                  <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-widest">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !fichasExternas ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-xs text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Cargando fichas de nuevo ingreso...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : filteredFichas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-xs text-muted-foreground"
                    >
                      No hay fichas registradas con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFichas.map((ficha) => {
                    const estatusMeta = getEstatusFichaMeta(ficha.estatusFicha)
                    return (
                      <TableRow
                        key={ficha.id}
                        className="h-12 transition-colors duration-150 hover:bg-secondary/30"
                      >
                        <TableCell className="py-2 font-mono tabular-nums text-xs font-semibold text-foreground">
                          {ficha.curp}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="min-w-[180px]">
                            <p className="text-xs font-semibold text-foreground">
                              {ficha.aPaterno} {ficha.aMaterno} {ficha.nombre}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                'mt-0.5 text-[10px] font-semibold',
                                ficha.nivel === 'LICENCIATURA'
                                  ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                  : 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              )}
                            >
                              {ficha.nivel}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 font-mono tabular-nums text-xs text-muted-foreground">
                          {ficha.sexo}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="min-w-[180px] text-xs">
                            <p className="font-medium text-foreground">
                              <span className="font-mono font-bold text-primary">
                                {ficha.claveEscuela}
                              </span>{' '}
                              &middot; {ficha.nombreEscuela}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Carrera{' '}
                              <span className="font-mono font-semibold text-foreground">
                                {ficha.claveCarrera}
                              </span>{' '}
                              &mdash; {ficha.nombreCarrera}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 font-mono tabular-nums text-xs text-muted-foreground">
                          {formatFechaExcel(ficha.fechaNacimiento)}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="min-w-[150px] font-mono text-xs">
                            <p className="tabular-nums text-foreground">
                              {ficha.celular}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {ficha.correo}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'whitespace-nowrap text-[10px] font-bold',
                              estatusMeta.badgeClass
                            )}
                          >
                            {estatusMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isMutating}
                              onClick={() => {
                                setEditingFicha(ficha)
                                setModalOpen(true)
                              }}
                              aria-label={`Editar ficha de ${ficha.curp}`}
                              className="h-7 w-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isMutating}
                              onClick={() => setDeletingFicha(ficha)}
                              aria-label={`Eliminar ficha de ${ficha.curp}`}
                              className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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
        key={`ficha-modal-${editingFicha?.id ?? 'new'}-${String(modalOpen)}`}
        open={modalOpen}
        onOpenChange={setModalOpen}
        nivel="TODOS"
        userRol={userRol}
        defaultModulo="NUEVO_INGRESO"
        periodoId={selectedPeriodoId}
        unidadesCatalogo={unidades}
        programasCatalogo={programas}
        initialFicha={editingFicha}
        isSubmitting={isMutating}
        onSaveFicha={handleSave}
      />

      <Dialog
        open={Boolean(deletingFicha)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingFicha(null)
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
                  Eliminar Ficha
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Registro nominal de Nuevo Ingreso
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-5 py-4 text-xs text-foreground">
            ¿Confirmas eliminar la ficha de{' '}
            <strong className="font-mono">{deletingFicha?.curp}</strong>?
          </div>
          <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isMutating}
              onClick={() => setDeletingFicha(null)}
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

export default FichasNuevoIngresoView
