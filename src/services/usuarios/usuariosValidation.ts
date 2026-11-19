import type { Enums, Tables } from '@/types/database.types'
import {
  containsSqlInjectionPattern,
  validateEmail,
  validateNewPassword,
} from '../login/loginValidation.ts'

export type UsuarioPerfilRow = Tables<'perfiles'>
export type RolUsuario = Enums<'rol_usuario'>

export interface CreateUsuarioInput {
  nombre: string
  email: string
  rol: RolUsuario
  unidad_academica_id?: number | null
  activo: boolean
  passwordTemporal?: string
}

export interface UpdateUsuarioInput {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  unidad_academica_id?: number | null
  activo: boolean
}

export interface ValidatedUsuarioBase {
  nombre: string
  email: string
  rol: RolUsuario
  unidadAcademicaId: number | null
  activo: boolean
}

export type ValidationOutcome<T> =
  | { valid: true; data: T }
  | { valid: false; error: string; field?: string }

const VALID_ROLES = new Set<RolUsuario>([
  'ADMIN',
  'LICENCIATURA',
  'BACHILLERATO',
  'NUEVO_INGRESO',
  'UNIDAD_ACADEMICA',
])

const MAX_NOMBRE_LENGTH = 120

/**
 * Valida los campos compartidos entre alta y edicion de usuarios en public.perfiles.
 */
function validateBaseUsuarioFields(
  input: Pick<
    CreateUsuarioInput,
    'nombre' | 'email' | 'rol' | 'unidad_academica_id' | 'activo'
  >
): ValidationOutcome<ValidatedUsuarioBase> {
  const trimmedNombre = typeof input.nombre === 'string' ? input.nombre.trim() : ''
  if (!trimmedNombre) {
    return {
      valid: false,
      field: 'nombre',
      error: 'Ingresa el nombre completo del usuario.',
    }
  }

  if (trimmedNombre.length > MAX_NOMBRE_LENGTH) {
    return {
      valid: false,
      field: 'nombre',
      error: 'El nombre excede la longitud máxima permitida.',
    }
  }

  if (containsSqlInjectionPattern(trimmedNombre)) {
    return {
      valid: false,
      field: 'nombre',
      error: 'El nombre contiene caracteres no permitidos.',
    }
  }

  const emailResult = validateEmail(input.email)
  if (!emailResult.valid) {
    return {
      valid: false,
      field: 'email',
      error: emailResult.error ?? 'Ingresa un correo electrónico válido.',
    }
  }

  if (!VALID_ROLES.has(input.rol)) {
    return {
      valid: false,
      field: 'rol',
      error: 'Selecciona una división o rol operativo válido.',
    }
  }

  if (input.rol === 'UNIDAD_ACADEMICA') {
    const unitId = input.unidad_academica_id
    if (typeof unitId !== 'number' || !Number.isInteger(unitId) || unitId <= 0) {
      return {
        valid: false,
        field: 'unidad_academica_id',
        error: 'Selecciona la unidad académica asignada para este usuario.',
      }
    }
    return {
      valid: true,
      data: {
        nombre: trimmedNombre,
        email: emailResult.email,
        rol: input.rol,
        unidadAcademicaId: unitId,
        activo: Boolean(input.activo),
      },
    }
  }

  return {
    valid: true,
    data: {
      nombre: trimmedNombre,
      email: emailResult.email,
      rol: input.rol,
      unidadAcademicaId: null,
      activo: Boolean(input.activo),
    },
  }
}

/**
 * Valida la entrada completa para dar de alta una cuenta en Supabase Auth y public.perfiles.
 */
export function validateCreateUsuarioInput(
  input: CreateUsuarioInput
): ValidationOutcome<ValidatedUsuarioBase & { password: string }> {
  const baseResult = validateBaseUsuarioFields(input)
  if (!baseResult.valid) {
    return baseResult
  }

  const password =
    typeof input.passwordTemporal === 'string' ? input.passwordTemporal : ''
  const passwordResult = validateNewPassword(password)
  if (!passwordResult.valid) {
    return {
      valid: false,
      field: 'passwordTemporal',
      error:
        passwordResult.error ??
        'Ingresa una contraseña inicial de al menos 8 caracteres.',
    }
  }

  return {
    valid: true,
    data: {
      ...baseResult.data,
      password,
    },
  }
}

/**
 * Valida la entrada para actualizar un usuario existente mediante RPC administrativa.
 */
export function validateUpdateUsuarioInput(
  input: UpdateUsuarioInput
): ValidationOutcome<ValidatedUsuarioBase & { id: string }> {
  const id = typeof input.id === 'string' ? input.id.trim() : ''
  if (!id) {
    return {
      valid: false,
      field: 'id',
      error: 'Identificador de usuario inválido.',
    }
  }

  const baseResult = validateBaseUsuarioFields(input)
  if (!baseResult.valid) {
    return baseResult
  }

  return {
    valid: true,
    data: {
      id,
      ...baseResult.data,
    },
  }
}

/**
 * Verifica reglas preventivas de UI/servicio antes de desactivar o degradar un administrador.
 */
export function checkAdminIntegrityGuard(params: {
  targetUser: Pick<UsuarioPerfilRow, 'id' | 'rol' | 'activo'>
  nextRol: RolUsuario
  nextActivo: boolean
  activeAdminsCount: number
  currentUserId?: string
}): string | null {
  const { targetUser, nextRol, nextActivo, activeAdminsCount, currentUserId } =
    params

  if (currentUserId === targetUser.id && !nextActivo) {
    return 'No puedes desactivar tu propio usuario en sesión.'
  }

  if (currentUserId === targetUser.id && nextRol !== 'ADMIN') {
    return 'Por seguridad no puedes cambiar tu propio rol en sesión.'
  }

  const wasActiveAdmin = targetUser.rol === 'ADMIN' && targetUser.activo
  const remainsActiveAdmin = nextRol === 'ADMIN' && nextActivo
  if (wasActiveAdmin && !remainsActiveAdmin && activeAdminsCount <= 1) {
    return 'Debe permanecer al menos un administrador activo en el sistema.'
  }

  return null
}

/**
 * Verifica reglas preventivas antes de eliminar una cuenta de usuario.
 */
export function checkDeleteUsuarioGuard(params: {
  targetUser: Pick<UsuarioPerfilRow, 'id' | 'rol' | 'activo'>
  activeAdminsCount: number
  currentUserId?: string
}): string | null {
  const { targetUser, activeAdminsCount, currentUserId } = params

  if (currentUserId === targetUser.id) {
    return 'No puedes eliminar tu propio perfil.'
  }

  if (targetUser.rol === 'ADMIN' && targetUser.activo && activeAdminsCount <= 1) {
    return 'Debe permanecer al menos un administrador activo en el sistema.'
  }

  return null
}
