import {
  formatFechaExcel,
  type EstatusFichaNuevoIngreso,
  type FichaNuevoIngresoRecord,
} from '@/services/fichas'

export { formatFechaExcel }
export type { EstatusFichaNuevoIngreso }
export type FichaNuevoIngresoDraft = FichaNuevoIngresoRecord

export interface EstatusFichaMeta {
  value: EstatusFichaNuevoIngreso
  label: string
  badgeClass: string
}

export const ESTATUS_FICHA_OPTIONS: EstatusFichaMeta[] = [
  {
    value: 'SIN_PROCESO',
    label: 'Sin Proceso',
    badgeClass:
      'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    value: 'SIN_PAGO',
    label: 'Sin Pago',
    badgeClass:
      'border-purple-500/25 bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    value: 'FICHA_VENCIDA',
    label: 'Ficha Vencida',
    badgeClass:
      'border-orange-500/25 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  {
    value: 'FICHA_CANCELADA',
    label: 'Ficha Cancelada',
    badgeClass: 'border-destructive/25 bg-destructive/10 text-destructive',
  },
]

const ESTATUS_FICHA_MAP = new Map<EstatusFichaNuevoIngreso, EstatusFichaMeta>(
  ESTATUS_FICHA_OPTIONS.map((item) => [item.value, item])
)

export function getEstatusFichaMeta(
  estatus: EstatusFichaNuevoIngreso
): EstatusFichaMeta {
  return ESTATUS_FICHA_MAP.get(estatus) ?? ESTATUS_FICHA_OPTIONS[0]
}

export const SEXO_OPTIONS: { value: '1' | '2'; label: string }[] = [
  { value: '1', label: '1 - Masculino' },
  { value: '2', label: '2 - Femenino' },
]

export function buildInitialFichasMock(): FichaNuevoIngresoRecord[] {
  return [
    {
      id: 'ficha-1',
      curp: 'LAGL071102HSLLRNA8',
      aPaterno: 'LLANOS',
      aMaterno: 'GARCIA',
      nombre: 'LEONARDO GAEL',
      sexo: 1,
      unidadAcademicaId: 6,
      claveEscuela: '4800',
      nombreEscuela: 'Facultad de Informática Mazatlán',
      nivel: 'LICENCIATURA',
      programaId: 603,
      claveCarrera: '5',
      nombreCarrera: 'Licenciatura en Informática (Virtual)',
      fechaNacimiento: '2007-11-02',
      celular: '6691234806',
      correo: 'leo03sd@gmail.com',
      estatusFicha: 'SIN_PAGO',
      periodoId: 1,
      fechaRegistro: '2026-11-18',
    },
    {
      id: 'ficha-2',
      curp: 'MARM080515MSLLRNA2',
      aPaterno: 'MARTINEZ',
      aMaterno: 'RODRIGUEZ',
      nombre: 'MARIA FERNANDA',
      sexo: 2,
      unidadAcademicaId: 1,
      claveEscuela: '8240',
      nombreEscuela: 'Preparatoria Mazatlán',
      nivel: 'BACHILLERATO',
      programaId: 101,
      claveCarrera: '1',
      nombreCarrera: 'Bachillerato General Escolarizado',
      fechaNacimiento: '2008-05-15',
      celular: '6699876543',
      correo: 'maria.martinez@uas.edu.mx',
      estatusFicha: 'SIN_PROCESO',
      periodoId: 1,
      fechaRegistro: '2026-11-18',
    },
    {
      id: 'ficha-3',
      curp: 'HEGJ060921HSLLRNA5',
      aPaterno: 'HERNANDEZ',
      aMaterno: 'GOMEZ',
      nombre: 'JOSE ANTONIO',
      sexo: 1,
      unidadAcademicaId: 7,
      claveEscuela: '4520',
      nombreEscuela: 'Facultad de Derecho Mazatlán',
      nivel: 'LICENCIATURA',
      programaId: 701,
      claveCarrera: '1',
      nombreCarrera: 'Licenciatura en Derecho',
      fechaNacimiento: '2006-09-21',
      celular: '6692345678',
      correo: 'jose.hernandez@uas.edu.mx',
      estatusFicha: 'FICHA_VENCIDA',
      periodoId: 1,
      fechaRegistro: '2026-11-17',
    },
    {
      id: 'ficha-4',
      curp: 'SAAL090112MSLLRNA1',
      aPaterno: 'SALAZAR',
      aMaterno: 'ARMENTA',
      nombre: 'LUISA SOFIA',
      sexo: 2,
      unidadAcademicaId: 2,
      claveEscuela: '8210',
      nombreEscuela: 'Preparatoria Concordia',
      nivel: 'BACHILLERATO',
      programaId: 201,
      claveCarrera: '1',
      nombreCarrera: 'Bachillerato General',
      fechaNacimiento: '2009-01-12',
      celular: '6941122334',
      correo: 'luisa.salazar@uas.edu.mx',
      estatusFicha: 'FICHA_CANCELADA',
      periodoId: 1,
      fechaRegistro: '2026-11-16',
    },
  ]
}
