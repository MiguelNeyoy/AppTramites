import type {
  EstadoTramiteAlumno,
  TramiteAlumnoRecord,
} from '@/services/tramites'

export interface UnidadAcademicaOption {
  id: number
  claveUa: string
  nombre: string
  nivel: 'BACHILLERATO' | 'LICENCIATURA'
}

export interface ProgramaEducativoOption {
  id: number
  unidadAcademicaId: number
  clavePrograma: string
  nombre: string
}

export interface TipoTramiteOption {
  id: number
  nombre: string
  modulo: 'TRAMITES_GENERALES' | 'NUEVO_INGRESO'
  permitePdf: boolean
}

export interface EstadoTramiteMeta {
  value: EstadoTramiteAlumno
  label: string
  badgeClass: string
}

export const ESTADO_TRAMITE_OPTIONS: EstadoTramiteMeta[] = [
  {
    value: 'PENDIENTE',
    label: 'Pendiente',
    badgeClass:
      'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    value: 'RESUELTO',
    label: 'Resuelto',
    badgeClass:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    value: 'CON_ERROR',
    label: 'Con Error',
    badgeClass: 'border-destructive/25 bg-destructive/10 text-destructive',
  },
]

const ESTADO_TRAMITE_MAP = new Map<EstadoTramiteAlumno, EstadoTramiteMeta>(
  ESTADO_TRAMITE_OPTIONS.map((item) => [item.value, item])
)

export function getEstadoTramiteMeta(
  estado: EstadoTramiteAlumno
): EstadoTramiteMeta {
  return ESTADO_TRAMITE_MAP.get(estado) ?? ESTADO_TRAMITE_OPTIONS[0]
}

export const MESES_CICLO_ESCOLAR = [
  { key: '08', label: 'Ago' },
  { key: '09', label: 'Sep' },
  { key: '10', label: 'Oct' },
  { key: '11', label: 'Nov' },
  { key: '12', label: 'Dic' },
  { key: '01', label: 'Ene' },
  { key: '02', label: 'Feb' },
  { key: '03', label: 'Mar' },
  { key: '04', label: 'Abr' },
  { key: '05', label: 'May' },
  { key: '06', label: 'Jun' },
  { key: '07', label: 'Jul' },
] as const

export const UNIDADES_ACADEMICAS_CATALOGO: UnidadAcademicaOption[] = [
  { id: 1, claveUa: '8240', nombre: 'Preparatoria Mazatlán', nivel: 'BACHILLERATO' },
  { id: 2, claveUa: '8210', nombre: 'Preparatoria Concordia', nivel: 'BACHILLERATO' },
  { id: 3, claveUa: '8220', nombre: 'Preparatoria El Rosario', nivel: 'BACHILLERATO' },
  { id: 4, claveUa: '8230', nombre: 'Preparatoria Escuinapa', nivel: 'BACHILLERATO' },
  { id: 5, claveUa: '8260', nombre: 'Preparatoria Rubén Jaramillo', nivel: 'BACHILLERATO' },
  { id: 6, claveUa: '4800', nombre: 'Facultad de Informática Mazatlán', nivel: 'LICENCIATURA' },
  { id: 7, claveUa: '4520', nombre: 'Facultad de Derecho Mazatlán', nivel: 'LICENCIATURA' },
  { id: 8, claveUa: '4820', nombre: 'Facultad de Ciencias Sociales', nivel: 'LICENCIATURA' },
  { id: 9, claveUa: '4850', nombre: 'Facultad de Contaduría y Administración', nivel: 'LICENCIATURA' },
]

export const PROGRAMAS_EDUCATIVOS_CATALOGO: ProgramaEducativoOption[] = [
  { id: 101, unidadAcademicaId: 1, clavePrograma: '1', nombre: 'Bachillerato General Escolarizado' },
  { id: 102, unidadAcademicaId: 1, clavePrograma: '2', nombre: 'Bachillerato Semiescolarizado' },
  { id: 201, unidadAcademicaId: 2, clavePrograma: '1', nombre: 'Bachillerato General' },
  { id: 202, unidadAcademicaId: 2, clavePrograma: '3', nombre: 'Extensión Mesillas / Malpica' },
  { id: 301, unidadAcademicaId: 3, clavePrograma: '1', nombre: 'Bachillerato General' },
  { id: 401, unidadAcademicaId: 4, clavePrograma: '1', nombre: 'Bachillerato General' },
  { id: 501, unidadAcademicaId: 5, clavePrograma: '1', nombre: 'Bachillerato Escolarizado' },
  { id: 502, unidadAcademicaId: 5, clavePrograma: '4', nombre: 'Bachillerato Nocturno' },
  { id: 601, unidadAcademicaId: 6, clavePrograma: '1', nombre: 'Licenciatura en Informática' },
  { id: 602, unidadAcademicaId: 6, clavePrograma: '4', nombre: 'Ing. en Sistemas de Información' },
  { id: 603, unidadAcademicaId: 6, clavePrograma: '5', nombre: 'Licenciatura en Informática (Virtual)' },
  { id: 701, unidadAcademicaId: 7, clavePrograma: '1', nombre: 'Licenciatura en Derecho' },
  { id: 702, unidadAcademicaId: 7, clavePrograma: '2', nombre: 'Licenciatura en Derecho (Semiescolarizada)' },
  { id: 801, unidadAcademicaId: 8, clavePrograma: '1', nombre: 'Licenciatura en Sociología' },
  { id: 802, unidadAcademicaId: 8, clavePrograma: '2', nombre: 'Licenciatura en Ciencias de la Comunicación' },
  { id: 901, unidadAcademicaId: 9, clavePrograma: '1', nombre: 'Licenciatura en Contaduría Pública' },
  { id: 902, unidadAcademicaId: 9, clavePrograma: '2', nombre: 'Licenciatura en Administración de Empresas' },
]

export const TIPOS_TRAMITE_CATALOGO: TipoTramiteOption[] = [
  { id: 1, nombre: 'Exámenes especiales', modulo: 'TRAMITES_GENERALES', permitePdf: false },
  { id: 2, nombre: 'Certificado', modulo: 'TRAMITES_GENERALES', permitePdf: false },
  { id: 3, nombre: 'Convalidación', modulo: 'TRAMITES_GENERALES', permitePdf: false },
  { id: 4, nombre: 'Dictámenes especiales', modulo: 'TRAMITES_GENERALES', permitePdf: false },
  { id: 5, nombre: 'Complementarias', modulo: 'TRAMITES_GENERALES', permitePdf: true },
  { id: 6, nombre: 'Anular Folio', modulo: 'TRAMITES_GENERALES', permitePdf: true },
  { id: 7, nombre: 'Corrección de calificación', modulo: 'TRAMITES_GENERALES', permitePdf: false },
  { id: 8, nombre: 'Migración de calificaciones', modulo: 'TRAMITES_GENERALES', permitePdf: false },
  { id: 9, nombre: 'Fichas de nuevo ingreso', modulo: 'NUEVO_INGRESO', permitePdf: false },
]

export function buildInitialTramitesAlumnosMock(): TramiteAlumnoRecord[] {
  const now = '2026-11-19T12:00:00Z'
  return [
    {
      id: 'tr-1',
      folio: 104,
      numeroCuenta: '20210041',
      nombreAlumno: 'LOPEZ HERNANDEZ JUAN CARLOS',
      programaId: 101,
      clavePrograma: '1',
      nombrePrograma: 'Bachillerato General Escolarizado',
      unidadAcademicaId: 1,
      claveUa: '8240',
      nombreUa: 'Preparatoria Mazatlán',
      nivel: 'BACHILLERATO',
      tipoTramiteId: 2,
      nombreTramite: 'Certificado',
      permitePdf: false,
      periodoId: 1,
      fechaRegistro: '2026-11-18',
      estado: 'RESUELTO',
      observaciones: null,
      archivoPdfUrl: null,
      createdAt: now,
    },
    {
      id: 'tr-2',
      folio: 103,
      numeroCuenta: '20224819',
      nombreAlumno: 'SANCHEZ MORALES DANIELA',
      programaId: 601,
      clavePrograma: '1',
      nombrePrograma: 'Licenciatura en Informática',
      unidadAcademicaId: 6,
      claveUa: '4800',
      nombreUa: 'Facultad de Informática Mazatlán',
      nivel: 'LICENCIATURA',
      tipoTramiteId: 5,
      nombreTramite: 'Complementarias',
      permitePdf: true,
      periodoId: 1,
      fechaRegistro: '2026-11-17',
      estado: 'PENDIENTE',
      observaciones: 'En espera de oficio firmado.',
      archivoPdfUrl: 'oficio-complementaria-103.pdf',
      createdAt: now,
    },
    {
      id: 'tr-3',
      folio: 102,
      numeroCuenta: '20231088',
      nombreAlumno: 'RAMIREZ TORRES JESUS ALBERTO',
      programaId: 201,
      clavePrograma: '1',
      nombrePrograma: 'Bachillerato General',
      unidadAcademicaId: 2,
      claveUa: '8210',
      nombreUa: 'Preparatoria Concordia',
      nivel: 'BACHILLERATO',
      tipoTramiteId: 7,
      nombreTramite: 'Corrección de calificación',
      permitePdf: false,
      periodoId: 1,
      fechaRegistro: '2026-10-22',
      estado: 'RESUELTO',
      observaciones: null,
      archivoPdfUrl: null,
      createdAt: now,
    },
    {
      id: 'tr-4',
      folio: 101,
      numeroCuenta: '20209912',
      nombreAlumno: 'GARCIA VEGA SOFIA VALENTINA',
      programaId: 701,
      clavePrograma: '1',
      nombrePrograma: 'Licenciatura en Derecho',
      unidadAcademicaId: 7,
      claveUa: '4520',
      nombreUa: 'Facultad de Derecho Mazatlán',
      nivel: 'LICENCIATURA',
      tipoTramiteId: 6,
      nombreTramite: 'Anular Folio',
      permitePdf: true,
      periodoId: 1,
      fechaRegistro: '2026-09-14',
      estado: 'CON_ERROR',
      observaciones: 'Folio capturado no coincide con recibo.',
      archivoPdfUrl: null,
      createdAt: now,
    },
  ]
}
