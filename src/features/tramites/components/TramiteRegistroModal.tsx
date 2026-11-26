import * as React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Save,
  Search,
  UserPlus,
  X,
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
import type { NivelFilter } from '@/features/dashboard/types'
import type {
  ProgramaEducativoCatalogo,
  TipoTramiteCatalogo,
  UnidadAcademicaCatalogo,
} from '@/services/catalogos'
import {
  extractDocumentFromFile,
  resolveCatalogMatchesForFicha,
  resolveCatalogMatchesForTramite,
  type DocumentExtractionResult,
} from '@/services/documentos'
import {
  extractDocumentWithOcr,
  isSupportedOcrImageFile,
  type OcrExtractionMetadata,
  type OcrProgressUpdate,
} from '@/services/ocr'
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
      folio: '',
      numeroCuenta: '',
      nombreAlumno: '',
      fechaRegistro: new Date().toISOString().slice(0, 10),
      estado: 'PENDIENTE',
      observaciones: '',
      archivoPdfNombre: '',
    }
  }

  return {
    folio: initialTramite.folio ?? '',
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
  const [claveUaQuery, setClaveUaQuery] = React.useState<string>(() => {
    if (initialFicha) {
      return initialFicha.claveEscuela
    }
    if (initialTramite) {
      const ua = unidadesBase.find(
        (u) => u.id === initialTramite.unidadAcademicaId
      )
      return ua?.claveUa ?? ''
    }
    return ''
  })
  const [claveProgramaQuery, setClaveProgramaQuery] = React.useState<string>(
    () => {
      if (initialFicha) {
        return initialFicha.claveCarrera
      }
      if (initialTramite) {
        const prog = programasBase.find(
          (p) => p.id === initialTramite.programaId
        )
        return prog?.clavePrograma ?? ''
      }
      return ''
    }
  )
  const [generalDraft, setGeneralDraft] = React.useState<GeneralTramiteDraft>(
    () => createInitialGeneralDraft(initialTramite)
  )
  const [nuevoIngresoDraft, setNuevoIngresoDraft] =
    React.useState<NuevoIngresoDraft>(() =>
      createInitialNuevoIngresoDraft(initialFicha)
    )
  const docInputRef = React.useRef<HTMLInputElement>(null)
  const [isReadingDocument, setIsReadingDocument] = React.useState(false)
  const [extractedResult, setExtractedResult] =
    React.useState<DocumentExtractionResult | null>(null)
  const [activeExtractedIndex, setActiveExtractedIndex] = React.useState(0)
  const [savedExtractedIndices, setSavedExtractedIndices] = React.useState<
    number[]
  >([])
  const [extractionWarnings, setExtractionWarnings] = React.useState<string[]>(
    []
  )
  const [ocrProgress, setOcrProgress] =
    React.useState<OcrProgressUpdate | null>(null)
  const [ocrMetadata, setOcrMetadata] =
    React.useState<OcrExtractionMetadata | null>(null)

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

  const selectedUnidad = unidadesDisponibles.find(
    (ua) => String(ua.id) === effectiveUnidadId
  )

  const unidadesParaSelect = React.useMemo(() => {
    const q = claveUaQuery.trim().toLowerCase()
    if (
      !q ||
      (selectedUnidad && selectedUnidad.claveUa.toLowerCase() === q)
    ) {
      return unidadesDisponibles
    }
    return unidadesDisponibles.filter(
      (ua) =>
        ua.claveUa.toLowerCase().includes(q) ||
        ua.nombre.toLowerCase().includes(q)
    )
  }, [claveUaQuery, selectedUnidad, unidadesDisponibles])

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

  const selectedPrograma = programasDisponibles.find(
    (p) => String(p.id) === effectiveProgramaId
  )

  const programasParaSelect = React.useMemo(() => {
    const q = claveProgramaQuery.trim().toLowerCase()
    if (
      !q ||
      (selectedPrograma && selectedPrograma.clavePrograma.toLowerCase() === q)
    ) {
      return programasDisponibles
    }
    return programasDisponibles.filter(
      (p) =>
        p.clavePrograma.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q)
    )
  }, [claveProgramaQuery, programasDisponibles, selectedPrograma])

  const handleUnidadChange = (nextUnidadId: string, preserveClaveText = false) => {
    const pickedUnidad = unidadesDisponibles.find(
      (ua) => String(ua.id) === nextUnidadId
    )
    setUnidadId(nextUnidadId)
    if (!preserveClaveText) {
      setClaveUaQuery(pickedUnidad?.claveUa ?? '')
    }
    const programasDeUnidad = programasBase.filter(
      (p) => String(p.unidadAcademicaId) === nextUnidadId
    )
    if (programasDeUnidad.length === 1) {
      setProgramaId(String(programasDeUnidad[0].id))
      setClaveProgramaQuery(programasDeUnidad[0].clavePrograma)
    } else {
      setProgramaId('')
      setClaveProgramaQuery('')
    }
  }

  const handleProgramaChange = (
    nextProgramaId: string,
    preserveClaveText = false
  ) => {
    setProgramaId(nextProgramaId)
    if (!preserveClaveText) {
      const pickedPrograma = programasDisponibles.find(
        (p) => String(p.id) === nextProgramaId
      )
      setClaveProgramaQuery(pickedPrograma?.clavePrograma ?? '')
    }
  }

  const handleClaveUaInputChange = (rawValue: string) => {
    const normalized = rawValue.toUpperCase()
    setClaveUaQuery(normalized)
    const q = normalized.trim().toLowerCase()

    if (!q) {
      setUnidadId('')
      setProgramaId('')
      setClaveProgramaQuery('')
      return
    }

    const exactMatch = unidadesDisponibles.find(
      (ua) => ua.claveUa.toLowerCase() === q
    )
    if (exactMatch) {
      handleUnidadChange(String(exactMatch.id), true)
      return
    }

    setUnidadId('')
    setProgramaId('')
    setClaveProgramaQuery('')
  }

  const handleClaveUaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!selectedUnidad && unidadesParaSelect.length > 0) {
      handleUnidadChange(String(unidadesParaSelect[0].id))
    }
  }

  const handleClaveProgramaInputChange = (rawValue: string) => {
    const normalized = rawValue.toUpperCase()
    setClaveProgramaQuery(normalized)
    const q = normalized.trim().toLowerCase()

    if (!q) {
      setProgramaId('')
      return
    }

    const exactMatch = programasDisponibles.find(
      (p) => p.clavePrograma.toLowerCase() === q
    )
    if (exactMatch) {
      handleProgramaChange(String(exactMatch.id), true)
      return
    }

    setProgramaId('')
  }

  const handleClaveProgramaKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!selectedPrograma && programasParaSelect.length > 0) {
      handleProgramaChange(String(programasParaSelect[0].id))
    }
  }

  const handleTipoTramiteChange = (nextTramiteId: string) => {
    setTipoTramiteId(nextTramiteId)
    const nextTramite = tramitesDisponibles.find(
      (t) => String(t.id) === nextTramiteId
    )
    const nextIsNuevoIngreso = nextTramite?.modulo === 'NUEVO_INGRESO'
    if (
      !nextIsNuevoIngreso &&
      nivel !== 'TODOS' &&
      selectedUnidad &&
      selectedUnidad.nivel !== nivel
    ) {
      setUnidadId('')
      setClaveUaQuery('')
      setProgramaId('')
      setClaveProgramaQuery('')
    }
  }

  const clearDocumentImport = () => {
    setExtractedResult(null)
    setActiveExtractedIndex(0)
    setSavedExtractedIndices([])
    setExtractionWarnings([])
    setOcrProgress(null)
    setOcrMetadata(null)
    if (docInputRef.current) {
      docInputRef.current.value = ''
    }
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
    setClaveUaQuery('')
    setProgramaId('')
    setClaveProgramaQuery('')
    setGeneralDraft(createInitialGeneralDraft(null))
    setNuevoIngresoDraft(createInitialNuevoIngresoDraft(null))
    clearDocumentImport()
  }

  const applyExtractedItem = (
    result: DocumentExtractionResult,
    index: number
  ) => {
    if (result.kind === 'FICHAS') {
      const item = result.items[index]
      if (!item) return

      const niTramite = tramitesDisponibles.find(
        (t) => t.modulo === 'NUEVO_INGRESO'
      )
      if (!niTramite) {
        const msg =
          'Tu rol o vista actual no tiene habilitado el formulario de Nuevo Ingreso para cargar esta ficha.'
        setExtractionWarnings([msg])
        toast.warning(msg)
        return
      }

      setTipoTramiteId(String(niTramite.id))

      const match = resolveCatalogMatchesForFicha(item, {
        unidades: unidadesBase,
        programas: programasBase,
        tiposTramite: tramitesDisponibles,
      })

      if (match.unidadAcademicaId) {
        const matchedUa = unidadesBase.find(
          (u) => u.id === match.unidadAcademicaId
        )
        setUnidadId(String(match.unidadAcademicaId))
        setClaveUaQuery(matchedUa?.claveUa ?? item.claveEscuela)
      } else {
        setUnidadId('')
        setClaveUaQuery(item.claveEscuela)
      }

      if (match.programaId) {
        const matchedProg = programasBase.find((p) => p.id === match.programaId)
        setProgramaId(String(match.programaId))
        setClaveProgramaQuery(matchedProg?.clavePrograma ?? item.claveCarrera)
      } else {
        setProgramaId('')
        setClaveProgramaQuery(item.claveCarrera)
      }

      setNuevoIngresoDraft({
        curp: item.curp,
        aPaterno: item.aPaterno,
        aMaterno: item.aMaterno,
        nombre: item.nombre,
        sexo: item.sexo,
        fechaNacimiento: item.fechaNacimiento,
        celular: item.celular,
        correo: item.correo,
        estatusFicha: 'SIN_PROCESO',
      })

      setExtractionWarnings(
        Array.from(
          new Set([...result.warnings, ...item.warnings, ...match.warnings])
        )
      )
      return
    }

    const item = result.items[index]
    if (!item) return

    if (tramitesDisponibles.every((t) => t.modulo === 'NUEVO_INGRESO')) {
      const msg =
        'Tu perfil solo tiene acceso a Nuevo Ingreso; el archivo cargado corresponde a Trámites Generales.'
      setExtractionWarnings([msg])
      toast.warning(msg)
      return
    }

    const match = resolveCatalogMatchesForTramite(item, {
      unidades: unidadesBase,
      programas: programasBase,
      tiposTramite: tramitesDisponibles,
    })

    const matchedTramite = match.tipoTramiteId
      ? tramitesDisponibles.find((t) => t.id === match.tipoTramiteId)
      : undefined
    const effectiveTramite = matchedTramite ?? selectedTramite

    if (matchedTramite) {
      setTipoTramiteId(String(matchedTramite.id))
    }

    const allowedUnidades =
      nivel === 'TODOS'
        ? unidadesBase
        : unidadesBase.filter((u) => u.nivel === nivel)
    const extraWarnings: string[] = []

    if (match.unidadAcademicaId) {
      const matchedUa = unidadesBase.find(
        (u) => u.id === match.unidadAcademicaId
      )
      const isAllowed = allowedUnidades.some(
        (u) => u.id === match.unidadAcademicaId
      )
      if (isAllowed) {
        setUnidadId(String(match.unidadAcademicaId))
        setClaveUaQuery(matchedUa?.claveUa ?? item.claveUa)
        if (match.programaId) {
          const matchedProg = programasBase.find(
            (p) => p.id === match.programaId
          )
          setProgramaId(String(match.programaId))
          setClaveProgramaQuery(
            matchedProg?.clavePrograma ?? item.clavePrograma
          )
        } else {
          setProgramaId('')
          setClaveProgramaQuery(item.clavePrograma)
        }
      } else {
        setUnidadId('')
        setClaveUaQuery(item.claveUa)
        setProgramaId('')
        setClaveProgramaQuery(item.clavePrograma)
        extraWarnings.push(
          `La unidad "${matchedUa?.claveUa ?? item.claveUa} - ${matchedUa?.nombre ?? ''}" pertenece a ${matchedUa?.nivel ?? 'otro nivel'}, pero el filtro activo es ${nivel}.`
        )
      }
    } else {
      setUnidadId('')
      setClaveUaQuery(item.claveUa)
      setProgramaId('')
      setClaveProgramaQuery(item.clavePrograma)
    }

    setGeneralDraft({
      folio: item.folio,
      numeroCuenta: item.numeroCuenta,
      nombreAlumno: item.nombreAlumno,
      fechaRegistro:
        item.fechaRegistro || new Date().toISOString().slice(0, 10),
      estado: 'PENDIENTE',
      observaciones: item.observaciones,
      archivoPdfNombre:
        result.format === 'PDF' && effectiveTramite?.permitePdf
          ? result.fileName
          : '',
    })

    setExtractionWarnings(
      Array.from(
        new Set([
          ...result.warnings,
          ...item.warnings,
          ...match.warnings,
          ...extraWarnings,
        ])
      )
    )
  }

  const preservePdfAttachmentName = (fileName: string) => {
    if (selectedTramite?.permitePdf) {
      setGeneralDraft((prev) => ({
        ...prev,
        archivoPdfNombre: fileName,
      }))
    }
  }

  const handleDocumentFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsReadingDocument(true)
    setOcrMetadata(null)
    setOcrProgress(null)

    try {
      if (isSupportedOcrImageFile(file.name, file.type)) {
        const { extraction, metadata } = await extractDocumentWithOcr(file, {
          onProgress: setOcrProgress,
        })
        setExtractedResult(extraction)
        setOcrMetadata(metadata)
        setSavedExtractedIndices([])
        setActiveExtractedIndex(0)

        if (extraction.items.length === 0) {
          setExtractionWarnings(extraction.warnings)
          toast.warning(
            extraction.warnings[0] ??
              'No se detecto texto suficiente en la imagen.'
          )
          return
        }

        applyExtractedItem(extraction, 0)
        toast.success(
          `Datos extraidos por OCR (${metadata.confidence}%) desde "${file.name}". Revisa y confirma antes de guardar.`
        )
        return
      }

      const result = await extractDocumentFromFile(file)
      setExtractedResult(result)
      setSavedExtractedIndices([])
      setActiveExtractedIndex(0)

      if (result.requiresOcr) {
        toast.info(
          'PDF sin texto seleccionable. Iniciando OCR local en tu navegador...'
        )
        try {
          const { extraction, metadata } = await extractDocumentWithOcr(file, {
            onProgress: setOcrProgress,
          })
          setExtractedResult(extraction)
          setOcrMetadata(metadata)

          if (extraction.items.length === 0) {
            setExtractionWarnings(extraction.warnings)
            preservePdfAttachmentName(file.name)
            toast.warning(
              extraction.warnings[0] ??
                'El motor OCR no detecto campos suficientes en el PDF.'
            )
            return
          }

          applyExtractedItem(extraction, 0)
          toast.success(
            `Datos leidos con OCR (${metadata.confidence}%) desde "${file.name}". Revisa y confirma antes de guardar.`
          )
          return
        } catch (ocrError) {
          const ocrMessage =
            ocrError instanceof Error
              ? ocrError.message
              : 'No se pudo completar el OCR local.'
          setExtractionWarnings(
            Array.from(new Set([...result.warnings, ocrMessage]))
          )
          preservePdfAttachmentName(file.name)
          toast.warning(ocrMessage)
          return
        }
      }

      if (result.items.length === 0) {
        setExtractionWarnings(result.warnings)
        if (result.format === 'PDF') {
          preservePdfAttachmentName(file.name)
        }
        toast.warning(
          result.warnings[0] ??
            'No se encontraron registros compatibles en el documento.'
        )
        return
      }

      applyExtractedItem(result, 0)
      toast.success(
        result.items.length === 1
          ? `Datos cargados desde "${file.name}". Revisa y confirma antes de guardar.`
          : `Se detectaron ${result.items.length} registros en "${file.name}". Revisa cada uno antes de guardar.`
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo leer el documento seleccionado.'
      setExtractedResult(null)
      setOcrMetadata(null)
      setSavedExtractedIndices([])
      setActiveExtractedIndex(0)
      setExtractionWarnings([message])
      toast.error(message)
    } finally {
      setIsReadingDocument(false)
      setOcrProgress(null)
      if (docInputRef.current) {
        docInputRef.current.value = ''
      }
    }
  }

  const handleSelectExtractedIndex = (nextIndex: number) => {
    if (
      !extractedResult ||
      nextIndex < 0 ||
      nextIndex >= extractedResult.items.length
    ) {
      return
    }
    setActiveExtractedIndex(nextIndex)
    applyExtractedItem(extractedResult, nextIndex)
  }

  const advanceOrFinishSave = () => {
    if (extractedResult && extractedResult.items.length > 1) {
      const nextSaved = savedExtractedIndices.includes(activeExtractedIndex)
        ? savedExtractedIndices
        : [...savedExtractedIndices, activeExtractedIndex]
      const nextIndex = extractedResult.items.findIndex(
        (_, idx) => !nextSaved.includes(idx)
      )

      if (nextIndex !== -1) {
        setSavedExtractedIndices(nextSaved)
        setActiveExtractedIndex(nextIndex)
        applyExtractedItem(extractedResult, nextIndex)
        toast.info(
          `Registro ${nextSaved.length} de ${extractedResult.items.length} guardado. Revisa el siguiente registro.`
        )
        return
      }
    }

    if (!isEditingFicha && !isEditingTramite) {
      resetAllDrafts()
    }
    onOpenChange(false)
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

    advanceOrFinishSave()
  }

  const submitTramiteGeneral = async () => {
    if (!selectedUnidad || !selectedPrograma || !selectedTramite) {
      toast.error('Selecciona el trámite, la unidad académica y el programa educativo.')
      return
    }

    const payload: TramiteAlumnoInput = {
      folio: generalDraft.folio,
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

    advanceOrFinishSave()
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
      ? `Editar Trámite ${initialTramite?.folio ?? ''}`.trim()
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
                    : 'Registro individual por alumno con folio manual único por trámite y periodo (sin actas)'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {!isEditingFicha && !isEditingTramite && (
              <section className="space-y-3 rounded-lg border border-dashed border-border bg-secondary/20 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <FileUp className="h-3.5 w-3.5 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Autocompletar desde documento (.pdf / .xlsx / imagen)
                      </h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Lectura local en tu navegador (incluye OCR para escaneos e imágenes); revisa y confirma antes de guardar.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={docInputRef}
                      type="file"
                      accept=".pdf,.xlsx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,image/webp"
                      onChange={(e) => void handleDocumentFileChange(e)}
                      disabled={isReadingDocument || isSubmitting}
                      className="sr-only"
                      aria-label="Seleccionar archivo PDF, Excel o imagen para autocompletar"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isReadingDocument || isSubmitting}
                      onClick={() => docInputRef.current?.click()}
                      className="h-8 gap-1.5 border-border bg-background text-xs font-semibold"
                    >
                      {isReadingDocument ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileUp className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>
                        {isReadingDocument ? 'Leyendo...' : 'Cargar archivo'}
                      </span>
                    </Button>
                    {(extractedResult || extractionWarnings.length > 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isReadingDocument || isSubmitting}
                        onClick={clearDocumentImport}
                        aria-label="Limpiar documento importado"
                        className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Limpiar</span>
                      </Button>
                    )}
                  </div>
                </div>

                {isReadingDocument && ocrProgress && (
                  <div className="space-y-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate font-medium text-foreground">
                        {ocrProgress.message}
                      </span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {ocrProgress.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-150"
                        style={{ width: `${ocrProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {extractedResult && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {extractedResult.format}
                      </Badge>
                      {ocrMetadata?.usedOcr && (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 font-mono tabular-nums text-[10px] font-semibold text-primary"
                        >
                          OCR · {ocrMetadata.confidence}%
                        </Badge>
                      )}
                      <span className="max-w-[260px] truncate font-medium text-foreground">
                        {extractedResult.fileName}
                      </span>
                      {extractedResult.items.length > 0 && (
                        <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                          ({extractedResult.items.length}{' '}
                          {extractedResult.items.length === 1
                            ? 'registro'
                            : 'registros'}
                          )
                        </span>
                      )}
                    </div>

                    {extractedResult.items.length > 1 && (
                      <Badge
                        variant="outline"
                        className="font-mono tabular-nums text-[10px] text-muted-foreground"
                      >
                        Guardados: {savedExtractedIndices.length}/
                        {extractedResult.items.length}
                      </Badge>
                    )}
                  </div>
                )}

                {extractedResult && extractedResult.items.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={
                        activeExtractedIndex <= 0 ||
                        isReadingDocument ||
                        isSubmitting
                      }
                      onClick={() =>
                        handleSelectExtractedIndex(activeExtractedIndex - 1)
                      }
                      aria-label="Registro anterior"
                      className="h-8 w-8 bg-background"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="min-w-[200px] flex-1">
                      <Select
                        value={String(activeExtractedIndex)}
                        onValueChange={(value) =>
                          handleSelectExtractedIndex(Number(value))
                        }
                        disabled={isReadingDocument || isSubmitting}
                      >
                        <SelectTrigger
                          aria-label="Seleccionar registro extraido"
                          className="h-8 bg-background text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {extractedResult.items.map((item, idx) => {
                            const labelText =
                              extractedResult.kind === 'FICHAS'
                                ? `${extractedResult.items[idx].aPaterno} ${extractedResult.items[idx].aMaterno} ${extractedResult.items[idx].nombre}`.trim() ||
                                  extractedResult.items[idx].curp
                                : extractedResult.items[idx].nombreAlumno ||
                                  extractedResult.items[idx].numeroCuenta ||
                                  item.sourceLabel
                            const isSaved = savedExtractedIndices.includes(idx)
                            return (
                              <SelectItem
                                key={`${item.sourceLabel}-${String(idx)}`}
                                value={String(idx)}
                                className="text-xs"
                              >
                                {idx + 1}/{extractedResult.items.length} ·{' '}
                                {labelText}
                                {isSaved ? ' (Guardado)' : ''}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={
                        activeExtractedIndex >=
                          extractedResult.items.length - 1 ||
                        isReadingDocument ||
                        isSubmitting
                      }
                      onClick={() =>
                        handleSelectExtractedIndex(activeExtractedIndex + 1)
                      }
                      aria-label="Siguiente registro"
                      className="h-8 w-8 bg-background"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {extractionWarnings.length > 0 && (
                  <div
                    role="alert"
                    className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <ul className="list-disc space-y-0.5 pl-4">
                        {extractionWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </section>
            )}

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
                  onValueChange={handleTipoTramiteChange}
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
                        {t.modulo === 'NUEVO_INGRESO' && (
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            (Formulario Aspirante)
                          </span>
                        )}
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
                    Clave UA (Buscar)
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="modal-clave-ua"
                      value={claveUaQuery}
                      onChange={(e) => handleClaveUaInputChange(e.target.value)}
                      onKeyDown={handleClaveUaKeyDown}
                      disabled={isSubmitting}
                      autoComplete="off"
                      placeholder="Ej. 4800"
                      className="h-9 bg-background pl-8 font-mono tabular-nums text-xs font-semibold"
                    />
                  </div>
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
                    onValueChange={(value) => handleUnidadChange(value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="modal-select-ua"
                      className="h-9 bg-background text-xs"
                    >
                      <SelectValue
                        placeholder={
                          !selectedUnidad && claveUaQuery.trim()
                            ? unidadesParaSelect.length === 0
                              ? 'Sin coincidencias para esa clave...'
                              : `${unidadesParaSelect.length} ${unidadesParaSelect.length === 1 ? 'coincidencia' : 'coincidencias'} — elige o Enter`
                            : 'Selecciona preparatoria o facultad...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesParaSelect.length === 0 ? (
                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                          Sin unidades que coincidan con &ldquo;
                          {claveUaQuery.trim()}&rdquo;
                        </div>
                      ) : (
                        unidadesParaSelect.map((ua) => (
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
                        ))
                      )}
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
                    Cód. Programa (Buscar)
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="modal-clave-carrera"
                      value={claveProgramaQuery}
                      onChange={(e) =>
                        handleClaveProgramaInputChange(e.target.value)
                      }
                      onKeyDown={handleClaveProgramaKeyDown}
                      disabled={!effectiveUnidadId || isSubmitting}
                      autoComplete="off"
                      placeholder={effectiveUnidadId ? 'Ej. 1' : '-'}
                      className="h-9 bg-background pl-8 font-mono tabular-nums text-xs font-semibold disabled:bg-secondary/40"
                    />
                  </div>
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
                    onValueChange={(value) => handleProgramaChange(value)}
                    disabled={!effectiveUnidadId || isSubmitting}
                  >
                    <SelectTrigger
                      id="modal-select-programa"
                      className="h-9 bg-background text-xs"
                    >
                      <SelectValue
                        placeholder={
                          !effectiveUnidadId
                            ? 'Primero elige una unidad académica'
                            : !selectedPrograma && claveProgramaQuery.trim()
                              ? programasParaSelect.length === 0
                                ? 'Sin coincidencias para esa clave...'
                                : `${programasParaSelect.length} ${programasParaSelect.length === 1 ? 'coincidencia' : 'coincidencias'} — elige o Enter`
                              : 'Selecciona programa educativo...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {programasParaSelect.length === 0 ? (
                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                          Sin programas que coincidan con &ldquo;
                          {claveProgramaQuery.trim()}&rdquo;
                        </div>
                      ) : (
                        programasParaSelect.map((prog) => (
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
                        ))
                      )}
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
