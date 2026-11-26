import * as React from 'react'
import {
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  GraduationCap,
  Save,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

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
import {
  validatePeriodoInput,
  validateProgramaInput,
  validateTipoTramiteInput,
  validateUnidadInput,
  type PeriodoEscolarCatalogo,
  type PeriodoEscolarInput,
  type ProgramaEducativoCatalogo,
  type ProgramaEducativoInput,
  type TipoTramiteCatalogo,
  type TipoTramiteInput,
  type UnidadAcademicaCatalogo,
  type UnidadAcademicaInput,
} from '@/services/catalogos'

/* ========================================================================== */
/* Modal: Crear / Editar Unidad Académica (Preparatoria o Facultad)           */
/* ========================================================================== */

interface UnidadFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: UnidadAcademicaCatalogo | null
  defaultNivel?: 'BACHILLERATO' | 'LICENCIATURA'
  onSave: (
    payload: UnidadAcademicaInput,
    editId?: number
  ) => Promise<boolean> | boolean | void
}

export function UnidadFormModal({
  open,
  onOpenChange,
  initialData,
  defaultNivel = 'BACHILLERATO',
  onSave,
}: UnidadFormModalProps) {
  const [claveUa, setClaveUa] = React.useState(initialData?.claveUa ?? '')
  const [nombre, setNombre] = React.useState(initialData?.nombre ?? '')
  const [nivel, setNivel] = React.useState<'BACHILLERATO' | 'LICENCIATURA'>(
    initialData?.nivel ?? defaultNivel
  )
  const [activa, setActiva] = React.useState(initialData?.activa ?? true)

  const isEditing = Boolean(initialData)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const validation = validateUnidadInput({ claveUa, nombre, nivel, activa })
    if (!validation.valid || !validation.data) {
      toast.error(
        validation.error ?? 'Ingresa la clave UA y el nombre de la unidad académica.'
      )
      return
    }
    const result = await onSave(validation.data, initialData?.id)
    if (result !== false) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {isEditing ? 'Editar Unidad Académica' : 'Nueva Unidad Académica'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Preparatoria o facultad registrada en el catálogo URS
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="ua-clave"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Clave UA *
                </Label>
                <Input
                  id="ua-clave"
                  placeholder="Ej. 8240"
                  value={claveUa}
                  onChange={(e) => setClaveUa(e.target.value)}
                  className="h-9 bg-background font-mono tabular-nums text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="ua-nivel"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Nivel Educativo *
                </Label>
                <Select
                  value={nivel}
                  onValueChange={(v) => setNivel(v as 'BACHILLERATO' | 'LICENCIATURA')}
                >
                  <SelectTrigger id="ua-nivel" className="h-9 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BACHILLERATO" className="text-xs">
                      Preparatoria (Bachillerato)
                    </SelectItem>
                    <SelectItem value="LICENCIATURA" className="text-xs">
                      Facultad (Licenciatura)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="ua-nombre"
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Nombre de la Unidad Académica *
              </Label>
              <Input
                id="ua-nombre"
                placeholder="Ej. Preparatoria Mazatlán"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="h-9 bg-background text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
              <div>
                <Label htmlFor="ua-activa" className="text-xs font-semibold cursor-pointer">
                  Unidad activa en formularios
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Disponible para captura de trámites y checklist
                </p>
              </div>
              <Switch id="ua-activa" checked={activa} onCheckedChange={setActiva} />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
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
              className="h-8 gap-1.5 bg-primary font-bold text-xs text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isEditing ? 'Guardar cambios' : 'Crear unidad'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ========================================================================== */
/* Modal: Crear / Editar Programa Educativo                                   */
/* ========================================================================== */

interface ProgramaFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unidadPadre: UnidadAcademicaCatalogo | null
  initialData: ProgramaEducativoCatalogo | null
  onSave: (
    payload: ProgramaEducativoInput,
    editId?: number
  ) => Promise<boolean> | boolean | void
}

export function ProgramaFormModal({
  open,
  onOpenChange,
  unidadPadre,
  initialData,
  onSave,
}: ProgramaFormModalProps) {
  const [clavePrograma, setClavePrograma] = React.useState(
    initialData?.clavePrograma ?? ''
  )
  const [nombre, setNombre] = React.useState(initialData?.nombre ?? '')
  const [activo, setActivo] = React.useState(initialData?.activo ?? true)

  const isEditing = Boolean(initialData)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!unidadPadre) return
    const validation = validateProgramaInput({
      unidadAcademicaId: unidadPadre.id,
      clavePrograma,
      nombre,
      activo,
    })
    if (!validation.valid || !validation.data) {
      toast.error(
        validation.error ?? 'Ingresa la clave y el nombre del programa educativo.'
      )
      return
    }
    const result = await onSave(validation.data, initialData?.id)
    if (result !== false) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {isEditing ? 'Editar Programa Educativo' : 'Nuevo Programa Educativo'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {unidadPadre
                    ? `[${unidadPadre.claveUa}] ${unidadPadre.nombre}`
                    : 'Carrera o plan asignado a la unidad'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="prog-clave"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Clave Prog. *
                </Label>
                <Input
                  id="prog-clave"
                  placeholder="Ej. 1"
                  value={clavePrograma}
                  onChange={(e) => setClavePrograma(e.target.value)}
                  className="h-9 bg-background font-mono tabular-nums text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="prog-nombre"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Nombre del Programa *
                </Label>
                <Input
                  id="prog-nombre"
                  placeholder="Ej. Licenciatura en Derecho"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-9 bg-background text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
              <div>
                <Label htmlFor="prog-activo" className="text-xs font-semibold cursor-pointer">
                  Programa activo
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Visible en listas de captura y checklist de actas
                </p>
              </div>
              <Switch id="prog-activo" checked={activo} onCheckedChange={setActivo} />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
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
              className="h-8 gap-1.5 bg-primary font-bold text-xs text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isEditing ? 'Guardar cambios' : 'Agregar programa'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ========================================================================== */
/* Modal: Crear / Editar Tipo de Trámite                                      */
/* ========================================================================== */

interface TramiteCatalogoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: TipoTramiteCatalogo | null
  onSave: (
    payload: TipoTramiteInput,
    editId?: number
  ) => Promise<boolean> | boolean | void
}

export function TramiteCatalogoModal({
  open,
  onOpenChange,
  initialData,
  onSave,
}: TramiteCatalogoModalProps) {
  const [nombre, setNombre] = React.useState(initialData?.nombre ?? '')
  const [modulo, setModulo] = React.useState<'TRAMITES_GENERALES' | 'NUEVO_INGRESO'>(
    initialData?.modulo ?? 'TRAMITES_GENERALES'
  )
  const [permitePdf, setPermitePdf] = React.useState(initialData?.permitePdf ?? false)
  const [activo, setActivo] = React.useState(initialData?.activo ?? true)

  const isEditing = Boolean(initialData)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const validation = validateTipoTramiteInput({
      nombre,
      modulo,
      permitePdf,
      activo,
    })
    if (!validation.valid || !validation.data) {
      toast.error(validation.error ?? 'Ingresa el nombre del tipo de trámite.')
      return
    }
    const result = await onSave(validation.data, initialData?.id)
    if (result !== false) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {isEditing ? 'Editar Tipo de Trámite' : 'Nuevo Tipo de Trámite'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Configuración del catálogo oficial de trámites
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="tram-nombre"
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Nombre del Trámite *
              </Label>
              <Input
                id="tram-nombre"
                placeholder="Ej. Equivalencia de estudios"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="h-9 bg-background text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="tram-modulo"
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Módulo Operativo *
              </Label>
              <Select
                value={modulo}
                onValueChange={(v) =>
                  setModulo(v as 'TRAMITES_GENERALES' | 'NUEVO_INGRESO')
                }
              >
                <SelectTrigger id="tram-modulo" className="h-9 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRAMITES_GENERALES" className="text-xs">
                    Trámites Generales
                  </SelectItem>
                  <SelectItem value="NUEVO_INGRESO" className="text-xs">
                    Nuevo Ingreso (Fichas)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
              <div>
                <Label htmlFor="tram-pdf" className="text-xs font-semibold cursor-pointer">
                  Permite adjuntar respaldo PDF
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Habilita carga de oficio en captura (ej. Complementarias)
                </p>
              </div>
              <Switch
                id="tram-pdf"
                checked={permitePdf}
                onCheckedChange={setPermitePdf}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
              <div>
                <Label htmlFor="tram-activo" className="text-xs font-semibold cursor-pointer">
                  Trámite activo
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Disponible para nuevas capturas de corte
                </p>
              </div>
              <Switch id="tram-activo" checked={activo} onCheckedChange={setActivo} />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
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
              className="h-8 gap-1.5 bg-primary font-bold text-xs text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isEditing ? 'Guardar cambios' : 'Crear trámite'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ========================================================================== */
/* Modal: Crear / Editar Periodo Escolar                                      */
/* ========================================================================== */

interface PeriodoFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: PeriodoEscolarCatalogo | null
  onSave: (
    payload: PeriodoEscolarInput,
    editId?: number
  ) => Promise<boolean> | boolean | void
}

export function PeriodoFormModal({
  open,
  onOpenChange,
  initialData,
  onSave,
}: PeriodoFormModalProps) {
  const [nombre, setNombre] = React.useState(initialData?.nombre ?? '')
  const [numeroPeriodo, setNumeroPeriodo] = React.useState(
    String(initialData?.numeroPeriodo ?? 1)
  )
  const [fechaInicio, setFechaInicio] = React.useState(
    initialData?.fechaInicio ?? ''
  )
  const [fechaFin, setFechaFin] = React.useState(initialData?.fechaFin ?? '')
  const [activo, setActivo] = React.useState(initialData?.activo ?? true)

  const isEditing = Boolean(initialData)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const validation = validatePeriodoInput({
      nombre,
      numeroPeriodo: Number.parseInt(numeroPeriodo, 10),
      fechaInicio,
      fechaFin,
      activo,
    })
    if (!validation.valid || !validation.data) {
      toast.error(validation.error ?? 'Verifica los datos del periodo escolar.')
      return
    }
    const result = await onSave(validation.data, initialData?.id)
    if (result !== false) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {isEditing ? 'Editar Periodo Escolar' : 'Nuevo Periodo Escolar'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Ciclo oficial y rango de fechas para cortes y actas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="per-nombre"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Ciclo / Nombre *
                </Label>
                <Input
                  id="per-nombre"
                  placeholder="Ej. 2026-2027"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-9 bg-background font-mono text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="per-numero"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  No. Periodo *
                </Label>
                <Input
                  id="per-numero"
                  type="number"
                  min={1}
                  max={10}
                  value={numeroPeriodo}
                  onChange={(e) => setNumeroPeriodo(e.target.value)}
                  className="h-9 bg-background font-mono tabular-nums text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="per-inicio"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Fecha Inicio *
                </Label>
                <Input
                  id="per-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="h-9 bg-background font-mono tabular-nums text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="per-fin"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Fecha Fin *
                </Label>
                <Input
                  id="per-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="h-9 bg-background font-mono tabular-nums text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
              <div>
                <Label htmlFor="per-activo" className="text-xs font-semibold cursor-pointer">
                  Periodo escolar activo
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Habilitado para nuevas capturas y reportes
                </p>
              </div>
              <Switch id="per-activo" checked={activo} onCheckedChange={setActivo} />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
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
              className="h-8 gap-1.5 bg-primary font-bold text-xs text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isEditing ? 'Guardar cambios' : 'Crear periodo'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ========================================================================== */
/* Modal: Confirmación Destructiva de Eliminación                             */
/* ========================================================================== */

interface ConfirmarEliminacionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipoElemento: string
  nombreElemento: string
  advertenciaHistorial?: string
  onConfirm: () => void
}

export function ConfirmarEliminacionModal({
  open,
  onOpenChange,
  tipoElemento,
  nombreElemento,
  advertenciaHistorial,
  onConfirm,
}: ConfirmarEliminacionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Eliminar {tipoElemento}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Esta acción quitará el registro del catálogo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4 text-xs">
          <p className="text-foreground">
            ¿Confirmas que deseas eliminar{' '}
            <strong className="font-semibold">{nombreElemento}</strong>?
          </p>
          {advertenciaHistorial && (
            <p className="rounded-lg border border-border bg-secondary/40 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
              {advertenciaHistorial}
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
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
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className="h-8 gap-1.5 font-semibold text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Eliminar</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
