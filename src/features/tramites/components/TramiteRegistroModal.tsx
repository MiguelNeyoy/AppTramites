import * as React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Layers,
  ListPlus,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type {
  NivelFilter,
  SeguimientoSummaryRow,
} from '@/features/dashboard/components/dashboardMockData'
import {
  PROGRAMAS_EDUCATIVOS_CATALOGO,
  TIPOS_TRAMITE_CATALOGO,
  UNIDADES_ACADEMICAS_CATALOGO,
} from './tramitesMockData'

interface TramiteRegistroModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nivel: NivelFilter
  onRegisterRows?: (rows: SeguimientoSummaryRow[]) => void
}

interface TramiteLineDraft {
  uid: string
  tipoTramiteId: string
  enviadas: string
  resueltas: string
  pendientes: string
  conError: string
  archivoPdfNombre: string
  archivoPdfUrl: string
  observaciones: string
}

function createEmptyLine(tipoTramiteId = ''): TramiteLineDraft {
  return {
    uid: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipoTramiteId,
    enviadas: '',
    resueltas: '',
    pendientes: '',
    conError: '',
    archivoPdfNombre: '',
    archivoPdfUrl: '',
    observaciones: '',
  }
}

function parseCount(value: string): number {
  const n = Number.parseInt(value, 10)
  return Number.isNaN(n) || n < 0 ? 0 : n
}

export function TramiteRegistroModal({
  open,
  onOpenChange,
  nivel,
  onRegisterRows,
}: TramiteRegistroModalProps) {
  const unidadesDisponibles = React.useMemo(
    () =>
      UNIDADES_ACADEMICAS_CATALOGO.filter(
        (ua) => nivel === 'TODOS' || ua.nivel === nivel
      ),
    [nivel]
  )

  const [unidadId, setUnidadId] = React.useState<string>('')
  const [programaId, setProgramaId] = React.useState<string>('')
  const [modoLote, setModoLote] = React.useState<boolean>(false)
  const [lineas, setLineas] = React.useState<TramiteLineDraft[]>(() => [
    createEmptyLine(String(TIPOS_TRAMITE_CATALOGO[0].id)),
  ])

  const effectiveUnidadId = unidadesDisponibles.some(
    (ua) => String(ua.id) === unidadId
  )
    ? unidadId
    : ''

  const programasDisponibles = React.useMemo(() => {
    if (!effectiveUnidadId) return []
    return PROGRAMAS_EDUCATIVOS_CATALOGO.filter(
      (p) => String(p.unidadAcademicaId) === effectiveUnidadId
    )
  }, [effectiveUnidadId])

  const effectiveProgramaId = programasDisponibles.some(
    (p) => String(p.id) === programaId
  )
    ? programaId
    : ''

  const selectedUnidad = unidadesDisponibles.find(
    (ua) => String(ua.id) === effectiveUnidadId
  )
  const selectedPrograma = programasDisponibles.find(
    (p) => String(p.id) === effectiveProgramaId
  )

  const handleUnidadChange = (nextUnidadId: string) => {
    setUnidadId(nextUnidadId)
    const programasDeUnidad = PROGRAMAS_EDUCATIVOS_CATALOGO.filter(
      (p) => String(p.unidadAcademicaId) === nextUnidadId
    )
    setProgramaId(
      programasDeUnidad.length === 1 ? String(programasDeUnidad[0].id) : ''
    )
  }

  const handleToggleModoLote = (enabled: boolean) => {
    setModoLote(enabled)
    if (!enabled && lineas.length > 1) {
      setLineas((prev) => [prev[0]])
    } else if (enabled && lineas.length === 1) {
      const usedId = lineas[0].tipoTramiteId
      const nextTramite = TIPOS_TRAMITE_CATALOGO.find(
        (t) => String(t.id) !== usedId
      )
      setLineas((prev) => [
        ...prev,
        createEmptyLine(nextTramite ? String(nextTramite.id) : ''),
      ])
    }
  }

  const handleAddLine = () => {
    const usedIds = new Set(lineas.map((l) => l.tipoTramiteId))
    const nextAvailable = TIPOS_TRAMITE_CATALOGO.find(
      (t) => !usedIds.has(String(t.id))
    )
    setLineas((prev) => [
      ...prev,
      createEmptyLine(nextAvailable ? String(nextAvailable.id) : ''),
    ])
  }

  const handleLoadAllGeneralTramites = () => {
    setModoLote(true)
    setLineas(TIPOS_TRAMITE_CATALOGO.map((t) => createEmptyLine(String(t.id))))
    toast.info('Se cargaron los 9 trámites en el lote.')
  }

  const handleRemoveLine = (uid: string) => {
    if (lineas.length <= 1) return
    setLineas((prev) => prev.filter((item) => item.uid !== uid))
  }

  const updateLine = (uid: string, patch: Partial<TramiteLineDraft>) => {
    setLineas((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item))
    )
  }

  const handleReset = () => {
    setUnidadId('')
    setProgramaId('')
    setModoLote(false)
    setLineas([createEmptyLine(String(TIPOS_TRAMITE_CATALOGO[0].id))])
  }

  const totalEnviadasLote = lineas.reduce(
    (sum, item) => sum + parseCount(item.enviadas),
    0
  )

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedUnidad || !selectedPrograma) {
      toast.error('Selecciona la unidad académica y el programa educativo.')
      return
    }

    const validLines = lineas.filter((l) => l.tipoTramiteId)
    if (validLines.length === 0) {
      toast.error('Selecciona al menos un tipo de trámite.')
      return
    }

    const activeLines = validLines.filter(
      (l) =>
        parseCount(l.enviadas) > 0 ||
        parseCount(l.resueltas) > 0 ||
        parseCount(l.pendientes) > 0 ||
        parseCount(l.conError) > 0
    )

    if (activeLines.length === 0) {
      toast.error('Captura al menos una cantidad mayor a cero para registrar.')
      return
    }

    const inconsistente = activeLines.find((l) => {
      const env = parseCount(l.enviadas)
      const desglose =
        parseCount(l.resueltas) +
        parseCount(l.pendientes) +
        parseCount(l.conError)
      return env > 0 && desglose > env
    })

    if (inconsistente) {
      const tramiteInfo = TIPOS_TRAMITE_CATALOGO.find(
        (t) => String(t.id) === inconsistente.tipoTramiteId
      )
      toast.error(
        `En "${tramiteInfo?.nombre ?? 'Trámite'}", la suma de resueltas + pendientes + con error supera las enviadas.`
      )
      return
    }

    const todayIso = new Date().toISOString().slice(0, 10)
    const createdRows: SeguimientoSummaryRow[] = activeLines.map((l) => {
      const tramite = TIPOS_TRAMITE_CATALOGO.find(
        (t) => String(t.id) === l.tipoTramiteId
      )
      return {
        id: `seg-${Date.now()}-${l.uid}`,
        claveUa: selectedUnidad.claveUa,
        unidadAcademica: selectedUnidad.nombre,
        nivel: selectedUnidad.nivel,
        programa: selectedPrograma.nombre,
        tipoTramite: tramite?.nombre ?? 'Trámite',
        fechaCorte: todayIso,
        enviadas: parseCount(l.enviadas),
        resueltas: parseCount(l.resueltas),
        pendientes: parseCount(l.pendientes),
        conError: parseCount(l.conError),
      }
    })

    onRegisterRows?.(createdRows)
    toast.success(
      createdRows.length > 1
        ? `Lote de ${createdRows.length} trámites registrado para ${selectedUnidad.nombre}.`
        : `Trámite "${createdRows[0].tipoTramite}" registrado para ${selectedUnidad.nombre}.`
    )
    handleReset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <form onSubmit={handleSubmit} className="flex max-h-[88vh] flex-col">
          {/* Encabezado del Modal */}
          <DialogHeader className="border-b border-border px-6 py-4 pr-12 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base font-bold tracking-tight">
                      Registrar Trámites
                    </DialogTitle>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold"
                    >
                      Sin actas
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Captura por unidad académica y programa educativo
                  </DialogDescription>
                </div>
              </div>

              {/* Switch Individual vs Envío por Lote */}
              <div className="flex items-center gap-2 self-start rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 sm:self-auto">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <Label
                  htmlFor="modal-modo-lote"
                  className="cursor-pointer text-xs font-medium text-foreground"
                >
                  Envío por lote
                </Label>
                <Switch
                  id="modal-modo-lote"
                  checked={modoLote}
                  onCheckedChange={handleToggleModoLote}
                />
              </div>
            </div>
          </DialogHeader>

          {/* Cuerpo con scroll interno */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Sección 1: Adscripción (Unidad Académica y Programa) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-uas-gold" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    1. Unidad Académica y Programa Educativo
                  </h3>
                </div>
                {selectedUnidad && (
                  <Badge
                    variant="outline"
                    className="font-mono tabular-nums text-[10px]"
                  >
                    UA {selectedUnidad.claveUa} &middot; {selectedUnidad.nivel}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="modal-select-ua"
                    className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Unidad Académica *
                  </Label>
                  <Select
                    value={effectiveUnidadId}
                    onValueChange={handleUnidadChange}
                  >
                    <SelectTrigger
                      id="modal-select-ua"
                      className="h-9 bg-background text-xs"
                    >
                      <SelectValue placeholder="Selecciona clave y escuela..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesDisponibles.map((ua) => (
                        <SelectItem
                          key={ua.id}
                          value={String(ua.id)}
                          className="text-xs"
                        >
                          <span className="mr-1.5 font-mono font-semibold text-primary">
                            [{ua.claveUa}]
                          </span>
                          {ua.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="modal-select-programa"
                    className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Programa Educativo / Carrera *
                  </Label>
                  <Select
                    value={effectiveProgramaId}
                    onValueChange={setProgramaId}
                    disabled={!effectiveUnidadId}
                  >
                    <SelectTrigger
                      id="modal-select-programa"
                      className="h-9 bg-background text-xs"
                    >
                      <SelectValue
                        placeholder={
                          effectiveUnidadId
                            ? 'Selecciona el programa educativo...'
                            : 'Elige primero una unidad académica'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {programasDisponibles.map((prog) => (
                        <SelectItem
                          key={prog.id}
                          value={String(prog.id)}
                          className="text-xs"
                        >
                          <span className="mr-1.5 font-mono font-semibold text-muted-foreground">
                            [{prog.clavePrograma}]
                          </span>
                          {prog.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Sección 2: Trámite(s) y Cantidades */}
            <section className="space-y-3 border-t border-border pt-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-uas-gold" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    2. Qué Trámite es y Cuántos son
                  </h3>
                </div>

                {modoLote && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLoadAllGeneralTramites}
                      className="h-7 gap-1.5 text-[11px]"
                    >
                      <ListPlus className="h-3.5 w-3.5 text-primary" />
                      <span>Precargar 9 trámites</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddLine}
                      className="h-7 gap-1.5 text-[11px]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Agregar trámite</span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {lineas.map((linea, index) => {
                  const selectedTramite = TIPOS_TRAMITE_CATALOGO.find(
                    (t) => String(t.id) === linea.tipoTramiteId
                  )
                  const env = parseCount(linea.enviadas)
                  const res = parseCount(linea.resueltas)
                  const pend = parseCount(linea.pendientes)
                  const err = parseCount(linea.conError)
                  const sumaDesglose = res + pend + err
                  const excedeEnviadas = env > 0 && sumaDesglose > env

                  return (
                    <div
                      key={linea.uid}
                      className={cn(
                        'rounded-xl border p-3.5 transition-colors duration-150',
                        excedeEnviadas
                          ? 'border-destructive/50 bg-destructive/5'
                          : 'border-border bg-secondary/20'
                      )}
                    >
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="font-mono tabular-nums text-[10px]"
                          >
                            #{index + 1}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground">
                            {selectedTramite?.nombre ?? 'Selecciona un trámite'}
                          </span>
                          {selectedTramite?.permitePdf && (
                            <Badge
                              variant="outline"
                              className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                            >
                              PDF opcional
                            </Badge>
                          )}
                        </div>

                        {modoLote && lineas.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLine(linea.uid)}
                            aria-label={`Quitar trámite ${index + 1}`}
                            className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Trámite *
                          </Label>
                          <Select
                            value={linea.tipoTramiteId}
                            onValueChange={(value) =>
                              updateLine(linea.uid, { tipoTramiteId: value })
                            }
                          >
                            <SelectTrigger className="h-8 bg-background text-xs">
                              <SelectValue placeholder="Elegir trámite..." />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS_TRAMITE_CATALOGO.map((t) => (
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

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Enviadas *
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            placeholder="0"
                            value={linea.enviadas}
                            onChange={(e) =>
                              updateLine(linea.uid, { enviadas: e.target.value })
                            }
                            className="h-8 bg-background font-mono tabular-nums text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Resueltas
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            placeholder="0"
                            value={linea.resueltas}
                            onChange={(e) =>
                              updateLine(linea.uid, {
                                resueltas: e.target.value,
                              })
                            }
                            className="h-8 bg-background font-mono tabular-nums text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            Pendientes
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            placeholder="0"
                            value={linea.pendientes}
                            onChange={(e) =>
                              updateLine(linea.uid, {
                                pendientes: e.target.value,
                              })
                            }
                            className="h-8 bg-background font-mono tabular-nums text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold uppercase tracking-widest text-destructive">
                            Con Error
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            placeholder="0"
                            value={linea.conError}
                            onChange={(e) =>
                              updateLine(linea.uid, { conError: e.target.value })
                            }
                            className="h-8 bg-background font-mono tabular-nums text-xs"
                          />
                        </div>
                      </div>

                      {(env > 0 || selectedTramite?.permitePdf) && (
                        <div className="mt-2.5 flex flex-col gap-2 border-t border-border/60 pt-2 sm:flex-row sm:items-center sm:justify-between">
                          {env > 0 ? (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              {excedeEnviadas ? (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                                  <span className="font-mono tabular-nums font-medium text-destructive">
                                    El desglose ({sumaDesglose}) supera las enviadas ({env})
                                  </span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="font-mono tabular-nums text-muted-foreground">
                                    Balance: {sumaDesglose} / {env} enviadas
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div />
                          )}

                          {selectedTramite?.permitePdf && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                                <FileText className="h-3.5 w-3.5 text-primary" />
                                <span className="max-w-44 truncate">
                                  {linea.archivoPdfNombre || 'Respaldo PDF opcional'}
                                </span>
                              </span>

                              <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-secondary">
                                <Upload className="h-3 w-3 text-primary" />
                                <span>
                                  {linea.archivoPdfNombre ? 'Cambiar PDF' : 'Adjuntar PDF'}
                                </span>
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="sr-only"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    if (linea.archivoPdfUrl) {
                                      URL.revokeObjectURL(linea.archivoPdfUrl)
                                    }
                                    const nextUrl = URL.createObjectURL(file)
                                    updateLine(linea.uid, {
                                      archivoPdfNombre: file.name,
                                      archivoPdfUrl: nextUrl,
                                    })
                                    toast.success(
                                      `PDF "${file.name}" adjuntado en vista previa.`
                                    )
                                  }}
                                />
                              </label>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (linea.archivoPdfUrl) {
                                    window.open(
                                      linea.archivoPdfUrl,
                                      '_blank',
                                      'noopener,noreferrer'
                                    )
                                    return
                                  }
                                  toast.info(
                                    'Adjunta primero un archivo .pdf para abrirlo en una pestaña nueva.'
                                  )
                                }}
                                className="h-7 gap-1 px-2.5 text-[11px]"
                              >
                                <ExternalLink className="h-3 w-3 text-primary" />
                                <span>Abrir / Ver PDF</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {!modoLote && (
                        <div className="mt-2.5 space-y-1">
                          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Observaciones (Opcional)
                          </Label>
                          <Textarea
                            rows={2}
                            placeholder="Notas breves sobre incidencias o comentarios..."
                            value={linea.observaciones}
                            onChange={(e) =>
                              updateLine(linea.uid, {
                                observaciones: e.target.value,
                              })
                            }
                            className="resize-none bg-background text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Pie del Modal */}
          <DialogFooter className="flex flex-col gap-3 border-t border-border bg-secondary/20 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
            <div className="flex items-center gap-3 font-mono tabular-nums text-xs text-muted-foreground">
              <span>
                Trámites:{' '}
                <strong className="text-foreground">{lineas.length}</strong>
              </span>
              <span>&middot;</span>
              <span>
                Total enviadas:{' '}
                <strong className="text-primary">{totalEnviadasLote}</strong>
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 gap-1.5 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Limpiar</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                size="sm"
                className="h-8 gap-1.5 bg-primary font-bold text-xs text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
              >
                <Save className="h-3.5 w-3.5" />
                <span>
                  {lineas.length > 1
                    ? `Guardar Lote (${lineas.length})`
                    : 'Registrar Trámite'}
                </span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TramiteRegistroModal
