import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'
import type { Enums, Tables } from '@/types/database.types'
import { AppServiceError, mapSupabaseError } from '../shared/supabaseErrors'
import {
  validateLoginInput,
  validateNewPassword,
  validatePasswordResetInput,
} from './loginValidation'

export type PerfilUsuario = Tables<'perfiles'>
export type RolUsuario = Enums<'rol_usuario'>

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthSessionResult {
  user: User
  session: Session
  perfil: PerfilUsuario
}

const PERFIL_SELECT =
  'id, email, nombre, rol, unidad_academica_id, activo, created_at, updated_at' as const

async function signOutQuietly(): Promise<void> {
  try {
    await supabase.auth.signOut()
  } catch {
    // Ignoramos errores secundarios de limpieza de sesion cuando ya existe un error principal.
  }
}

/**
 * Consulta el perfil dado de alta en public.perfiles usando PostgREST parametrizado (.eq),
 * evitando cualquier concatenacion SQL y validando que la cuenta siga activa.
 */
export async function fetchPerfilByUserId(userId: string): Promise<PerfilUsuario> {
  if (!userId || userId.trim().length === 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de usuario inválido.'
    )
  }

  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select(PERFIL_SELECT)
    .eq('id', userId)
    .single()

  if (error || !perfil) {
    await signOutQuietly()
    if (error?.code === 'PGRST116' || !perfil) {
      throw new AppServiceError(
        'PROFILE_NOT_FOUND',
        'Tu cuenta no está dada de alta en el padrón de perfiles. Contacta al administrador.',
        { rawCode: error?.code }
      )
    }
    throw mapSupabaseError(error)
  }

  if (!perfil.activo) {
    await signOutQuietly()
    throw new AppServiceError(
      'INACTIVE_USER',
      'Tu cuenta se encuentra desactivada. Contacta al administrador del sistema.'
    )
  }

  return perfil
}

/**
 * Autentica un correo dado de alta contra Supabase Auth (payload JSON parametrizado)
 * y valida su perfil activo en PostgreSQL.
 */
export async function loginWithEmail(
  credentials: LoginCredentials
): Promise<AuthSessionResult> {
  const validation = validateLoginInput(credentials.email, credentials.password)
  if (!validation.valid) {
    const firstField = validation.errors.email ? 'email' : 'password'
    const firstMessage =
      validation.errors.email ??
      validation.errors.password ??
      'Verifica los campos del formulario.'

    throw new AppServiceError('VALIDATION_ERROR', firstMessage, {
      field: firstField,
    })
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: validation.email,
    password: credentials.password,
  })

  if (error) {
    throw mapSupabaseError(error)
  }

  if (!data.user || !data.session) {
    throw new AppServiceError(
      'INVALID_CREDENTIALS',
      'No se pudo iniciar sesión con las credenciales proporcionadas.'
    )
  }

  const perfil = await fetchPerfilByUserId(data.user.id)

  return {
    user: data.user,
    session: data.session,
    perfil,
  }
}

/**
 * Envía un enlace de recuperación de contraseña al correo institucional validado.
 */
export async function requestPasswordReset(
  rawEmail: string,
  redirectTo?: string
): Promise<{ email: string }> {
  const validation = validatePasswordResetInput(rawEmail)
  if (!validation.valid) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      validation.error ?? 'Ingresa un correo electrónico válido.',
      { field: 'email' }
    )
  }

  const targetRedirect =
    redirectTo ??
    (typeof window !== 'undefined' ? window.location.origin : undefined)

  const { error } = await supabase.auth.resetPasswordForEmail(
    validation.email,
    targetRedirect ? { redirectTo: targetRedirect } : undefined
  )

  if (error) {
    throw mapSupabaseError(error)
  }

  return { email: validation.email }
}

/**
 * Actualiza la contraseña cuando el usuario regresa desde el enlace de recuperación.
 */
export async function updatePassword(
  newPassword: string,
  confirmPassword?: string
): Promise<void> {
  const validation = validateNewPassword(newPassword, confirmPassword)
  if (!validation.valid) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      validation.error ?? 'Contraseña inválida.',
      { field: 'password' }
    )
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw mapSupabaseError(error)
  }
}

/**
 * Obtiene la sesión vigente y verifica que su perfil en public.perfiles siga activo.
 */
export async function getCurrentAuthSession(): Promise<AuthSessionResult | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw mapSupabaseError(error)
  }

  if (!data.session?.user) {
    return null
  }

  const perfil = await fetchPerfilByUserId(data.session.user.id)

  return {
    user: data.session.user,
    session: data.session,
    perfil,
  }
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw mapSupabaseError(error)
  }
}

export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })

  return () => {
    subscription.unsubscribe()
  }
}
