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
