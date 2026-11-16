export type NivelFilter = 'TODOS' | 'BACHILLERATO' | 'LICENCIATURA'

export interface MonthlyMetricPoint {
  mes: string
  enviadas: number
  resueltas: number
  pendientes: number
  conError: number
}

export interface TramiteDistributionItem {
  id: number
  nombre: string
  modulo: 'TRAMITES_GENERALES' | 'NUEVO_INGRESO'
  total: number
  chartTokenClass: string
}

export interface SeguimientoSummaryRow {
  id: string
  claveUa: string
  unidadAcademica: string
  nivel: 'BACHILLERATO' | 'LICENCIATURA'
  programa: string
  tipoTramite: string
  fechaCorte: string
  enviadas: number
  resueltas: number
  pendientes: number
  conError: number
}

export interface ActaProgressSummary {
  tipo: 'ORDINARIA' | 'EXTRAORDINARIA' | 'REGULARIZACION'
  etiqueta: string
  generadas: number
  pendientes: number
  noAplica: number
  totalProgramas: number
}

export const PERIODOS_DISPONIBLES = [
  { id: '2026-1', label: '2026-2027 · Periodo 1 (Ago-Ene)' },
  { id: '2025-2', label: '2025-2026 · Periodo 2 (Ene-Jul)' },
] as const

export const MONTHLY_METRICS_BY_NIVEL: Record<NivelFilter, MonthlyMetricPoint[]> = {
  TODOS: [
    { mes: 'Ago', enviadas: 210, resueltas: 184, pendientes: 20, conError: 6 },
    { mes: 'Sep', enviadas: 295, resueltas: 252, pendientes: 34, conError: 9 },
    { mes: 'Oct', enviadas: 380, resueltas: 318, pendientes: 50, conError: 12 },
    { mes: 'Nov', enviadas: 345, resueltas: 274, pendientes: 59, conError: 12 },
    { mes: 'Dic', enviadas: 190, resueltas: 152, pendientes: 32, conError: 6 },
  ],
  BACHILLERATO: [
    { mes: 'Ago', enviadas: 95, resueltas: 84, pendientes: 9, conError: 2 },
    { mes: 'Sep', enviadas: 130, resueltas: 112, pendientes: 14, conError: 4 },
    { mes: 'Oct', enviadas: 175, resueltas: 148, pendientes: 22, conError: 5 },
    { mes: 'Nov', enviadas: 155, resueltas: 124, pendientes: 26, conError: 5 },
    { mes: 'Dic', enviadas: 85, resueltas: 70, pendientes: 12, conError: 3 },
  ],
  LICENCIATURA: [
    { mes: 'Ago', enviadas: 115, resueltas: 100, pendientes: 11, conError: 4 },
    { mes: 'Sep', enviadas: 165, resueltas: 140, pendientes: 20, conError: 5 },
    { mes: 'Oct', enviadas: 205, resueltas: 170, pendientes: 28, conError: 7 },
    { mes: 'Nov', enviadas: 190, resueltas: 150, pendientes: 33, conError: 7 },
    { mes: 'Dic', enviadas: 105, resueltas: 82, pendientes: 20, conError: 3 },
  ],
}

export const TRAMITE_DISTRIBUTION: TramiteDistributionItem[] = [
  {
    id: 1,
    nombre: 'Certificado',
    modulo: 'TRAMITES_GENERALES',
    total: 468,
    chartTokenClass: 'bg-chart-1',
  },
  {
    id: 2,
    nombre: 'Fichas de nuevo ingreso',
    modulo: 'NUEVO_INGRESO',
    total: 356,
    chartTokenClass: 'bg-chart-4',
  },
  {
    id: 3,
    nombre: 'Exámenes especiales',
    modulo: 'TRAMITES_GENERALES',
    total: 242,
    chartTokenClass: 'bg-chart-3',
  },
  {
    id: 4,
    nombre: 'Convalidación',
    modulo: 'TRAMITES_GENERALES',
    total: 164,
    chartTokenClass: 'bg-chart-2',
  },
  {
    id: 5,
    nombre: 'Complementarias y otros',
    modulo: 'TRAMITES_GENERALES',
    total: 190,
    chartTokenClass: 'bg-chart-5',
  },
]

export const SEGUIMIENTOS_RECIENTES: SeguimientoSummaryRow[] = [
  {
    id: 'seg-1',
    claveUa: '8240',
    unidadAcademica: 'Preparatoria Mazatlán',
    nivel: 'BACHILLERATO',
    programa: 'Bachillerato General Escolarizado',
    tipoTramite: 'Certificado',
    fechaCorte: '2026-11-15',
    enviadas: 145,
    resueltas: 128,
    pendientes: 14,
    conError: 3,
  },
  {
    id: 'seg-2',
    claveUa: '4800',
    unidadAcademica: 'Facultad de Derecho Mazatlán',
    nivel: 'LICENCIATURA',
    programa: 'Licenciatura en Derecho',
    tipoTramite: 'Exámenes especiales',
    fechaCorte: '2026-11-15',
    enviadas: 112,
    resueltas: 94,
    pendientes: 13,
    conError: 5,
  },
  {
    id: 'seg-3',
    claveUa: '8210',
    unidadAcademica: 'Preparatoria Concordia',
    nivel: 'BACHILLERATO',
    programa: 'Bachillerato Semiescolarizado',
    tipoTramite: 'Fichas de nuevo ingreso',
    fechaCorte: '2026-11-14',
    enviadas: 96,
    resueltas: 88,
    pendientes: 8,
    conError: 0,
  },
  {
    id: 'seg-4',
    claveUa: '4820',
    unidadAcademica: 'Facultad de Ciencias Sociales',
    nivel: 'LICENCIATURA',
    programa: 'Licenciatura en Sociología',
    tipoTramite: 'Convalidación',
    fechaCorte: '2026-11-14',
    enviadas: 64,
    resueltas: 51,
    pendientes: 10,
    conError: 3,
  },
  {
    id: 'seg-5',
    claveUa: '8220',
    unidadAcademica: 'Preparatoria El Rosario',
    nivel: 'BACHILLERATO',
    programa: 'Bachillerato General',
    tipoTramite: 'Complementarias',
    fechaCorte: '2026-11-13',
    enviadas: 58,
    resueltas: 49,
    pendientes: 7,
    conError: 2,
  },
  {
    id: 'seg-6',
    claveUa: '4850',
    unidadAcademica: 'Facultad de Contaduría y Admón.',
    nivel: 'LICENCIATURA',
    programa: 'Licenciatura en Contaduría Pública',
    tipoTramite: 'Corrección de calificación',
    fechaCorte: '2026-11-12',
    enviadas: 78,
    resueltas: 65,
    pendientes: 11,
    conError: 2,
  },
]

export const CHECKLIST_ACTAS_SUMMARY: ActaProgressSummary[] = [
  {
    tipo: 'ORDINARIA',
    etiqueta: 'Actas Ordinarias',
    generadas: 54,
    pendientes: 10,
    noAplica: 4,
    totalProgramas: 68,
  },
  {
    tipo: 'EXTRAORDINARIA',
    etiqueta: 'Actas Extraordinarias',
    generadas: 41,
    pendientes: 21,
    noAplica: 6,
    totalProgramas: 68,
  },
  {
    tipo: 'REGULARIZACION',
    etiqueta: 'Actas de Regularización',
    generadas: 29,
    pendientes: 18,
    noAplica: 21,
    totalProgramas: 68,
  },
]
