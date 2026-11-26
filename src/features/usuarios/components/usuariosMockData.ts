import type {
  CreateUsuarioInput,
  RolUsuario,
  UpdateUsuarioInput,
  UsuarioPerfilRow,
} from '@/services/usuarios'

export type { RolUsuario, UsuarioPerfilRow }
export type CreateUsuarioPayload = CreateUsuarioInput
export type UpdateUsuarioPayload = UpdateUsuarioInput

export interface RolDivisionMeta {
  rol: RolUsuario
  etiqueta: string
  division: string
  badgeClass: string
}

export const ROL_DIVISION_OPTIONS: RolDivisionMeta[] = [
  {
    rol: 'ADMIN',
    etiqueta: 'Administrador',
    division: 'Ambas divisiones (Global)',
    badgeClass:
      'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    rol: 'LICENCIATURA',
    etiqueta: 'Licenciatura',
    division: 'Facultades y Carreras',
    badgeClass:
      'border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    rol: 'BACHILLERATO',
    etiqueta: 'Bachillerato',
    division: 'Preparatorias y Extensiones',
    badgeClass:
      'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    rol: 'NUEVO_INGRESO',
    etiqueta: 'Nuevo Ingreso',
    division: 'Ambos niveles (Fichas)',
    badgeClass:
      'border-purple-500/25 bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    rol: 'UNIDAD_ACADEMICA',
    etiqueta: 'Unidad Académica',
    division: 'Acotado a una Escuela / Facultad',
    badgeClass:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
]

export function getRolDivisionMeta(rol: RolUsuario): RolDivisionMeta {
  return (
    ROL_DIVISION_OPTIONS.find((item) => item.rol === rol) ??
    ROL_DIVISION_OPTIONS[0]
  )
}

export function buildInitialUsuariosMock(): UsuarioPerfilRow[] {
  const now = '2026-11-17T12:00:00Z'
  return [
    {
      id: '00000000-0000-0000-0000-000000000001',
      nombre: 'Administrador URS',
      email: 'admin.escolares@uas.edu.mx',
      rol: 'ADMIN',
      unidad_academica_id: null,
      activo: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      nombre: 'Iris Encargada Licenciatura',
      email: 'iris.licenciatura@uas.edu.mx',
      rol: 'LICENCIATURA',
      unidad_academica_id: null,
      activo: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      nombre: 'Juan Carlos Encargado Prepas',
      email: 'juancarlos.prepas@uas.edu.mx',
      rol: 'BACHILLERATO',
      unidad_academica_id: null,
      activo: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      nombre: 'Ismael Nuevo Ingreso',
      email: 'ismael.admision@uas.edu.mx',
      rol: 'NUEVO_INGRESO',
      unidad_academica_id: null,
      activo: true,
      created_at: now,
      updated_at: now,
    },
  ]
}
