import * as React from 'react'
import { FileSpreadsheet, Loader2, Save, UserPlus } from 'lucide-react'
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
import type { NivelFilter } from '@/features/dashboard/types'
import type {
  ProgramaEducativoCatalogo,
  TipoTramiteCatalogo,
  UnidadAcademicaCatalogo,
} from '@/services/catalogos'
import {
  validateFichaInput,
  type FichaNuevoIngresoRecord,
} from '@/services/fichas'
import type { RolUsuario } from '@/services/login'
import {
  validateTramiteAlumnoInput,
  type TramiteAlumnoInput,
  type TramiteAlumnoRecord,
} from '@/services/tramites'
import {
  GeneralTramiteFields,
  type GeneralTramiteDraft,
} from './GeneralTramiteFields'
import {
  NuevoIngresoFields,
  type NuevoIngresoDraft,
} from './NuevoIngresoFields'
import {
  PROGRAMAS_EDUCATIVOS_CATALOGO,
  TIPOS_TRAMITE_CATALOGO,
  UNIDADES_ACADEMICAS_CATALOGO,
} from './tramitesMockData'

interface TramiteRegistroModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nivel: NivelFilter
  userRol?: RolUsuario
  defaultModulo?: 'TRAMITES_GENERALES' | 'NUEVO_INGRESO'
  periodoId?: number
  unidadesCatalogo?: UnidadAcademicaCatalogo[]
  programasCatalogo?: ProgramaEducativoCatalogo[]
  tiposTramiteCatalogo?: TipoTramiteCatalogo[]
  initialFicha?: FichaNuevoIngresoRecord | null
  initialTramite?: TramiteAlumnoRecord | null
  isSubmitting?: boolean
  onSaveTramite?: (
    input: TramiteAlumnoInput,
    editId?: string
  ) => Promise<boolean | void> | boolean | void
  onSaveFicha?: (
    ficha: FichaNuevoIngresoRecord,
    isEdit: boolean
  ) => Promise<boolean | void> | boolean | void
}

function createInitialGeneralDraft(
  initialTramite?: TramiteAlumnoRecord | null
): GeneralTramiteDraft {
  if (!initialTramite) {
    return {
      numeroCuenta: '',
      nombreAlumno: '',
      fechaRegistro: new Date().toISOString().slice(0, 10),
      estado: 'PENDIENTE',
      observaciones: '',
      archivoPdfNombre: '',
    }
  }

  return {
    numeroCuenta: initialTramite.numeroCuenta,
    nombreAlumno: initialTramite.nombreAlumno,
    fechaRegistro: initialTramite.fechaRegistro,
    estado: initialTramite.estado,
    observaciones: initialTramite.observaciones ?? '',
    archivoPdfNombre: initialTramite.archivoPdfUrl ?? '',
  }
}

function createInitialNuevoIngresoDraft(
  initialFicha?: FichaNuevoIngresoRecord | null
): NuevoIngresoDraft {
  if (!initialFicha) {
    return {
      curp: '',
      aPaterno: '',
      aMaterno: '',
      nombre: '',
      sexo: '1',
      fechaNacimiento: '',
      celular: '',
      correo: '',
      estatusFicha: 'SIN_PROCESO',
    }
  }

  return {
    curp: initialFicha.curp,
    aPaterno: initialFicha.aPaterno,
    aMaterno: initialFicha.aMaterno,
    nombre: initialFicha.nombre,
    sexo: String(initialFicha.sexo) as '1' | '2',
    fechaNacimiento: initialFicha.fechaNacimiento,
    celular: initialFicha.celular,
    correo: initialFicha.correo,
    estatusFicha: initialFicha.estatusFicha,
  }
}

function resolveDefaultTramiteId(
  tramites: { id: number; modulo: 'TRAMITES_GENERALES' | 'NUEVO_INGRESO' }[],
  userRol?: RolUsuario,
  defaultModulo?: 'TRAMITES_GENERALES' | 'NUEVO_INGRESO',
  initialFicha?: FichaNuevoIngresoRecord | null,
  initialTramite?: TramiteAlumnoRecord | null
): string {
  if (initialTramite) {
    return String(initialTramite.tipoTramiteId)
  }
  if (
    initialFicha ||
    userRol === 'NUEVO_INGRESO' ||
    defaultModulo === 'NUEVO_INGRESO'
  ) {
    const niTramite = tramites.find((t) => t.modulo === 'NUEVO_INGRESO')
    if (niTramite) return String(niTramite.id)
  }
  return tramites[0] ? String(tramites[0].id) : ''
}

export function TramiteRegistroModal({
  open,
  onOpenChange,
  nivel,
  userRol,
  defaultModulo,
  periodoId = 1,
  unidadesCatalogo,
  programasCatalogo,
  tiposTramiteCatalogo,
  initialFicha,
  initialTramite,
  isSubmitting = false,
  onSaveTramite,
  onSaveFicha,
}: TramiteRegistroModalProps) {
  const isEditingFicha = Boolean(initialFicha)
  const isEditingTramite = Boolean(initialTramite)

  const unidadesBase = React.useMemo(
    () =>
      unidadesCatalogo && unidadesCatalogo.length > 0
        ? unidadesCatalogo
        : UNIDADES_ACADEMICAS_CATALOGO,
    [unidadesCatalogo]
  )

  const programasBase = React.useMemo(
    () =>
      programasCatalogo && programasCatalogo.length > 0
        ? programasCatalogo
        : PROGRAMAS_EDUCATIVOS_CATALOGO,
    [programasCatalogo]
  )

  const tramitesBase = React.useMemo(
    () =>
      tiposTramiteCatalogo && tiposTramiteCatalogo.length > 0
        ? tiposTramiteCatalogo
        : TIPOS_TRAMITE_CATALOGO,
    [tiposTramiteCatalogo]
  )

  const tramitesDisponibles = React.useMemo(() => {
    if (isEditingFicha || userRol === 'NUEVO_INGRESO') {
      return tramitesBase.filter((t) => t.modulo === 'NUEVO_INGRESO')
    }
    if (
      isEditingTramite ||
      userRol === 'LICENCIATURA' ||
      userRol === 'BACHILLERATO'
    ) {
      return tramitesBase.filter((t) => t.modulo === 'TRAMITES_GENERALES')
    }
    return tramitesBase
  }, [isEditingFicha, isEditingTramite, tramitesBase, userRol])

  const [tipoTramiteId, setTipoTramiteId] = React.useState<string>(() =>
    resolveDefaultTramiteId(
      tramitesDisponibles,
      userRol,
      defaultModulo,
      initialFicha,
      initialTramite
    )
  )
  const [unidadId, setUnidadId] = React.useState<string>(() =>
    initialFicha
      ? String(initialFicha.unidadAcademicaId)
      : initialTramite
        ? String(initialTramite.unidadAcademicaId)
        : ''
  )
  const [programaId, setProgramaId] = React.useState<string>(() =>
    initialFicha
      ? String(initialFicha.programaId)
      : initialTramite
        ? String(initialTramite.programaId)
        : ''
  )
  const [generalDraft, setGeneralDraft] = React.useState<GeneralTramiteDraft>(
    () => createInitialGeneralDraft(initialTramite)
  )
  const [nuevoIngresoDraft, setNuevoIngresoDraft] =
    React.useState<NuevoIngresoDraft>(() =>
      createInitialNuevoIngresoDraft(initialFicha)
    )

  const selectedTramite =
    tramitesDisponibles.find((t) => String(t.id) === tipoTramiteId) ??
    tramitesDisponibles[0]
  const isNuevoIngreso = selectedTramite?.modulo === 'NUEVO_INGRESO'

  // Regla de negocio: NUEVO_INGRESO es transversal (muestra Bachillerato y Licenciatura juntos)
  const unidadesDisponibles = React.useMemo(() => {
    if (isNuevoIngreso || nivel === 'TODOS') {
      return unidadesBase
    }
    return unidadesBase.filter((ua) => ua.nivel === nivel)
  }, [isNuevoIngreso, nivel, unidadesBase])

  const effectiveUnidadId = unidadesDisponibles.some(
    (ua) => String(ua.id) === unidadId
  )
    ? unidadId
    : ''

  const programasDisponibles = React.useMemo(() => {
    if (!effectiveUnidadId) return []
    return programasBase.filter(
      (p) => String(p.unidadAcademicaId) === effectiveUnidadId
    )
  }, [effectiveUnidadId, programasBase])

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
    const programasDeUnidad = programasBase.filter(
      (p) => String(p.unidadAcademicaId) === nextUnidadId
    )
    setProgramaId(
      programasDeUnidad.length === 1 ? String(programasDeUnidad[0].id) : ''
    )
  }

  const resetAllDrafts = () => {
    setTipoTramiteId(
      resolveDefaultTramiteId(
        tramitesDisponibles,
        userRol,
        defaultModulo,
        initialFicha,
        initialTramite
      )
    )
    setUnidadId('')
    setProgramaId('')
    setGeneralDraft(createInitialGeneralDraft(null))
    setNuevoIngresoDraft(createInitialNuevoIngresoDraft(null))
  }

  const submitNuevoIngreso = async () => {
    if (!selectedUnidad || !selectedPrograma) {
      toast.error('Selecciona la escuela (ESCUELA) y la carrera (CARRERA).')
      return
    }

    const validation = validateFichaInput({
      curp: nuevoIngresoDraft.curp,
      aPaterno: nuevoIngresoDraft.aPaterno,
      aMaterno: nuevoIngresoDraft.aMaterno,
      nombre: nuevoIngresoDraft.nombre,
      sexo: Number(nuevoIngresoDraft.sexo) as 1 | 2,
      unidadAcademicaId: selectedUnidad.id,
      programaId: selectedPrograma.id,
      fechaNacimiento: nuevoIngresoDraft.fechaNacimiento,
      celular: nuevoIngresoDraft.celular,
      correo: nuevoIngresoDraft.correo,
      estatusFicha: nuevoIngresoDraft.estatusFicha,
      periodoId: initialFicha?.periodoId ?? periodoId,
    })

    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    const d = validation.data
    const savedFicha: FichaNuevoIngresoRecord = {
      id: initialFicha?.id ?? `ficha-${Date.now()}`,
      curp: d.curp,
      aPaterno: d.aPaterno,
      aMaterno: d.aMaterno,
      nombre: d.nombre,
      sexo: d.sexo,
      unidadAcademicaId: selectedUnidad.id,
      claveEscuela: selectedUnidad.claveUa,
      nombreEscuela: selectedUnidad.nombre,
      nivel: selectedUnidad.nivel,
      programaId: selectedPrograma.id,
      claveCarrera: selectedPrograma.clavePrograma,
      nombreCarrera: selectedPrograma.nombre,
      fechaNacimiento: d.fechaNacimiento,
      celular: d.celular,
      correo: d.correo,
      estatusFicha: d.estatusFicha,
      periodoId: d.periodoId,
      fechaRegistro:
        initialFicha?.fechaRegistro ?? new Date().toISOString().slice(0, 10),
    }

    const outcome = await onSaveFicha?.(savedFicha, isEditingFicha)
    if (outcome === false) {
      return
    }

    if (!onSaveFicha) {
      toast.success(
        isEditingFicha
          ? `Ficha de ${savedFicha.curp} actualizada.`
          : `Ficha de ${savedFicha.curp} registrada en ${selectedUnidad.claveUa}.`
      )
    }

    if (!isEditingFicha) {
      resetAllDrafts()
    }
    onOpenChange(false)
  }

  const submitTramiteGeneral = async () => {
    if (!selectedUnidad || !selectedPrograma || !selectedTramite) {
      toast.error('Selecciona el trámite, la unidad académica y el programa educativo.')
      return
    }

    const payload: TramiteAlumnoInput = {
      numeroCuenta: generalDraft.numeroCuenta,
      nombreAlumno: generalDraft.nombreAlumno,
      programaId: selectedPrograma.id,
      tipoTramiteId: selectedTramite.id,
      periodoId: initialTramite?.periodoId ?? periodoId,
      fechaRegistro: generalDraft.fechaRegistro,
      estado: generalDraft.estado,
      observaciones: generalDraft.observaciones || null,
      archivoPdfUrl: selectedTramite.permitePdf
        ? generalDraft.archivoPdfNombre || null
        : null,
    }

    const validation = validateTramiteAlumnoInput(payload)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    const outcome = await onSaveTramite?.(validation.data, initialTramite?.id)
    if (outcome === false) {
      return
    }

    if (!onSaveTramite) {
      toast.success(
        `Trámite "${selectedTramite.nombre}" registrado para ${validation.data.nombreAlumno}.`
      )
    }

    if (!isEditingTramite) {
      resetAllDrafts()
    }
    onOpenChange(false)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isNuevoIngreso) {
      void submitNuevoIngreso()
      return
    }
    void submitTramiteGeneral()
  }

  const modalTitle = isEditingFicha
    ? 'Editar Ficha de Nuevo Ingreso'
    : isEditingTramite
      ? `Editar Trámite #${String(initialTramite?.folio ?? '').padStart(4, '0')}`
      : isNuevoIngreso
        ? 'Captura de Ficha de Nuevo Ingreso'
        : 'Captura de Trámite en Ventanilla'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-border px-6 py-4 pr-12 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                {isNuevoIngreso ? (
                  <UserPlus className="h-5 w-5" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base font-bold tracking-tight">
                    {modalTitle}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={
                      isNuevoIngreso
                        ? 'border-purple-500/25 bg-purple-500/10 text-[10px] font-bold text-purple-600 dark:text-purple-400'
                        : 'border-amber-500/25 bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-400'
                    }
                  >
                    {isNuevoIngreso
                      ? 'Nuevo Ingreso · Transversal'
                      : 'Trámites Generales'}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {isNuevoIngreso
                    ? 'Registro nominal de aspirante para Bachillerato y Licenciatura (formato Excel oficial)'
                    : 'Registro individual por alumno con folio consecutivo automático (sin actas)'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-uas-gold" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    1. Tipo de Trámite y Adscripción
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

              <div className="space-y-1.5">
                <Label
                  htmlFor="modal-select-tramite"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Tipo de Trámite *
                </Label>
                <Select
                  value={selectedTramite ? String(selectedTramite.id) : ''}
                  onValueChange={setTipoTramiteId}
                  disabled={
                    isEditingFicha ||
                    isEditingTramite ||
                    tramitesDisponibles.length === 1 ||
                    isSubmitting
                  }
                >
                  <SelectTrigger
                    id="modal-select-tramite"
                    className="h-9 bg-background text-xs font-medium"
                  >
                    <SelectValue placeholder="Selecciona el trámite..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tramitesDisponibles.map((t) => (
                      <SelectItem
                        key={t.id}
                        value={String(t.id)}
                        className="text-xs"
                      >
                        <span className="font-medium">{t.nombre}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          {t.modulo === 'NUEVO_INGRESO'
                            ? '(Formulario Aspirante)'
                            : '(Por Alumno)'}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="space-y-1.5 sm:col-span-3">
                  <Label
                    htmlFor="modal-clave-ua"
                    className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Clave UA (Escuela)
                  </Label>
                  <Input
                    id="modal-clave-ua"
                    readOnly
                    value={selectedUnidad?.claveUa ?? ''}
                    placeholder="----"
                    className="h-9 bg-secondary/40 font-mono tabular-nums text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-9">
                  <Label
                    htmlFor="modal-select-ua"
                    className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Unidad Académica (Escuela / Facultad) *
                  </Label>
                  <Select
                    value={effectiveUnidadId}
                    onValueChange={handleUnidadChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="modal-select-ua"
                      className="h-9 bg-background text-xs"
                    >
                      <SelectValue placeholder="Selecciona preparatoria o facultad..." />
                    </SelectTrigger>
                    <SelectContent>
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="space-y-1.5 sm:col-span-3">
                  <Label
                    htmlFor="modal-clave-carrera"
                    className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Carrera (Cód.)
                  </Label>
                  <Input
                    id="modal-clave-carrera"
                    readOnly
                    value={selectedPrograma?.clavePrograma ?? ''}
                    placeholder="-"
                    className="h-9 bg-secondary/40 font-mono tabular-nums text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-9">
                  <Label
                    htmlFor="modal-select-programa"
                    className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Programa Educativo / Carrera *
                  </Label>
                  <Select
                    value={effectiveProgramaId}
                    onValueChange={setProgramaId}
                    disabled={!effectiveUnidadId || isSubmitting}
                  >
                    <SelectTrigger
                      id="modal-select-programa"
                      className="h-9 bg-background text-xs"
                    >
                      <SelectValue
                        placeholder={
                          effectiveUnidadId
                            ? 'Selecciona programa educativo...'
                            : 'Primero elige una unidad académica'
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
                          <span className="font-mono font-semibold">
                            {prog.clavePrograma}
                          </span>{' '}
                          &mdash; {prog.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {isNuevoIngreso ? (
              <NuevoIngresoFields
                draft={nuevoIngresoDraft}
                claveEscuela={selectedUnidad?.claveUa}
                claveCarrera={selectedPrograma?.clavePrograma}
                onChange={(patch) =>
                  setNuevoIngresoDraft((prev) => ({ ...prev, ...patch }))
                }
              />
            ) : (
              <GeneralTramiteFields
                draft={generalDraft}
                permitePdf={Boolean(selectedTramite?.permitePdf)}
                folioPreview={initialTramite?.folio}
                onChange={(patch) =>
                  setGeneralDraft((prev) => ({ ...prev, ...patch }))
                }
              />
            )}
          </div>

          <DialogFooter className="border-t border-border bg-secondary/20 px-6 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 gap-1.5 bg-primary font-bold text-xs text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>
                {isEditingFicha
                  ? 'Guardar Ficha'
                  : isEditingTramite
                    ? 'Guardar Cambios'
                    : isNuevoIngreso
                      ? 'Registrar Ficha'
                      : 'Guardar Trámite'}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
