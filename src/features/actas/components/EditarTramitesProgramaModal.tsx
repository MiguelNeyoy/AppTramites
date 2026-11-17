import * as React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileEdit,
  FileText,
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
import {
  TIPOS_TRAMITE_CATALOGO,
  type ProgramaChecklistItem,
  type TramiteConteoPrograma,
} from './actasMockData'

interface EditarTramitesProgramaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unidadClave: string
  unidadNombre: string
  programa: ProgramaChecklistItem | null
  onSaveConteo: (programaId: number, conteo: TramiteConteoPrograma) => void
}

function parseNonNegative(val: string): number {
  const parsed = Number.parseInt(val, 10)
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed
}

export function EditarTramitesProgramaModal({
  open,
  onOpenChange,
  unidadClave,
  unidadNombre,
  programa,
  onSaveConteo,
}: EditarTramitesProgramaModalProps) {
  const defaultTramiteId = String(TIPOS_TRAMITE_CATALOGO[2].id)
  const initialTramiteId = React.useMemo(() => {
    if (!programa) return defaultTramiteId
    const existingKeys = Object.keys(programa.tramitesPorTipo)
    return existingKeys.length > 0 ? existingKeys[0] : defaultTramiteId
  }, [programa, defaultTramiteId])

  const initialConteo = programa?.tramitesPorTipo[Number(initialTramiteId)]

  const [tipoTramiteId, setTipoTramiteId] = React.useState<string>(initialTramiteId)
  const [enviadas, setEnviadas] = React.useState<string>(
    String(initialConteo?.enviadas ?? 0)
  )
  const [resueltas, setResueltas] = React.useState<string>(
    String(initialConteo?.resueltas ?? 0)
  )
  const [pendientes, setPendientes] = React.useState<string>(
    String(initialConteo?.pendientes ?? 0)
  )
  const [conError, setConError] = React.useState<string>(
    String(initialConteo?.conError ?? 0)
  )
  const [pdfNombre, setPdfNombre] = React.useState<string>('')
  const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string>('')

  const selectedTramite = TIPOS_TRAMITE_CATALOGO.find(
    (t) => String(t.id) === tipoTramiteId
  )

  const handleSelectTramite = (nextTramiteId: string) => {
    setTipoTramiteId(nextTramiteId)
    const existing = programa?.tramitesPorTipo[Number(nextTramiteId)]
    setEnviadas(String(existing?.enviadas ?? 0))
    setResueltas(String(existing?.resueltas ?? 0))
    setPendientes(String(existing?.pendientes ?? 0))
    setConError(String(existing?.conError ?? 0))
  }

  const handleAttachPdf = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl)
    }
    const nextUrl = URL.createObjectURL(file)
    setPdfNombre(file.name)
    setPdfPreviewUrl(nextUrl)
    toast.success(`PDF "${file.name}" adjuntado en vista previa.`)
  }

  const handleOpenPdf = () => {
    if (pdfPreviewUrl) {
      window.open(pdfPreviewUrl, '_blank', 'noopener,noreferrer')
      return
    }
    toast.info(
      'Adjunta primero un archivo .pdf para abrirlo en una pestaña nueva.'
    )
  }

  const handleRemovePdf = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl)
    }
    setPdfNombre('')
    setPdfPreviewUrl('')
  }

  const envNum = parseNonNegative(enviadas)
  const resNum = parseNonNegative(resueltas)
  const pendNum = parseNonNegative(pendientes)
  const errNum = parseNonNegative(conError)
  const sumaDesglose = resNum + pendNum + errNum
  const excedeEnviadas = envNum > 0 && sumaDesglose > envNum

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!programa) return

    if (excedeEnviadas) {
      toast.error(
        'La suma de resueltas, pendientes y con error no puede superar las enviadas.'
      )
      return
    }

    const tramiteInfo = TIPOS_TRAMITE_CATALOGO.find(
      (t) => String(t.id) === tipoTramiteId
    )
    if (!tramiteInfo) return

    onSaveConteo(programa.programaId, {
      tipoTramiteId: tramiteInfo.id,
      tramiteNombre: tramiteInfo.nombre,
      enviadas: envNum,
      resueltas: resNum,
      pendientes: pendNum,
      conError: errNum,
    })

    toast.success(
      `Conteo de "${tramiteInfo.nombre}" actualizado en ${programa.nombrePrograma}.`
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <FileEdit className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight">
                  Editar Número de Trámites
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Actualización de cantidades por carrera
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            {/* Contexto fijo: Escuela y Carrera */}
            <div className="space-y-1.5 rounded-lg border border-border bg-secondary/35 p-3 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Escuela
                </span>
                <span className="truncate font-semibold text-foreground">
                  <span className="mr-1.5 font-mono tabular-nums text-primary">
                    {unidadClave}
                  </span>
                  - {unidadNombre}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Carrera
                </span>
                <span className="truncate font-semibold text-foreground">
                  <span className="mr-1.5 font-mono tabular-nums text-muted-foreground">
                    {programa?.clavePrograma}
                  </span>
                  - {programa?.nombrePrograma}
                </span>
              </div>
            </div>

            {/* Selector de Trámite */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="edit-select-tramite"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Trámite
                </Label>
                {selectedTramite?.permitePdf && (
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                  >
                    Permite PDF de respaldo
                  </Badge>
                )}
              </div>
              <Select value={tipoTramiteId} onValueChange={handleSelectTramite}>
                <SelectTrigger
                  id="edit-select-tramite"
                  className="h-9 bg-background text-xs"
                >
                  <SelectValue placeholder="Selecciona trámite..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_TRAMITE_CATALOGO.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cuadrícula 2x2: Enviadas, Resueltas, Pendientes, Con Error */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-enviadas"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Enviadas
                </Label>
                <Input
                  id="edit-enviadas"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={enviadas}
                  onChange={(e) => setEnviadas(e.target.value)}
                  className="h-9 bg-background font-mono tabular-nums text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-resueltas"
                  className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
                >
                  Resueltas
                </Label>
                <Input
                  id="edit-resueltas"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={resueltas}
                  onChange={(e) => setResueltas(e.target.value)}
                  className="h-9 bg-background font-mono tabular-nums text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-pendientes"
                  className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400"
                >
                  Pendientes
                </Label>
                <Input
                  id="edit-pendientes"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={pendientes}
                  onChange={(e) => setPendientes(e.target.value)}
                  className="h-9 bg-background font-mono tabular-nums text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-con-error"
                  className="text-[10px] font-semibold uppercase tracking-widest text-destructive"
                >
                  Con Error
                </Label>
                <Input
                  id="edit-con-error"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={conError}
                  onChange={(e) => setConError(e.target.value)}
                  className="h-9 bg-background font-mono tabular-nums text-sm"
                />
              </div>
            </div>

            {/* Bloque opcional para Adjuntar y Abrir PDF en Complementarias y Anular Folio */}
            {selectedTramite?.permitePdf && (
              <div className="space-y-2 rounded-lg border border-dashed border-border bg-secondary/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-xs font-semibold text-foreground">
                      {pdfNombre || 'Respaldo PDF opcional (Oficio / Solicitud)'}
                    </span>
                  </div>
                  {pdfNombre && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemovePdf}
                      aria-label="Quitar PDF"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-secondary">
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    <span>{pdfNombre ? 'Cambiar PDF' : 'Adjuntar PDF'}</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={handleAttachPdf}
                    />
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenPdf}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-primary" />
                    <span>Abrir / Ver PDF</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Estado del balance numérico */}
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/20 px-3 py-2 text-[11px]">
              {excedeEnviadas ? (
                <div className="flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono tabular-nums font-medium">
                    Desglose ({sumaDesglose}) supera enviadas ({envNum})
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-mono tabular-nums">
                    Balance: {sumaDesglose} / {envNum} enviadas
                  </span>
                </div>
              )}

              <Badge variant="outline" className="font-mono tabular-nums text-[10px]">
                {envNum > 0 ? `${Math.round((resNum / envNum) * 100)}% res.` : '0%'}
              </Badge>
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3 sm:justify-end sm:space-x-2">
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
              <span>Guardar</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
