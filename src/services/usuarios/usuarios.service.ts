import { createClient } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { fetchUnidadesAcademicas, type UnidadAcademicaCatalogo } from '../catalogos'
import { AppServiceError, mapSupabaseError } from '../shared/supabaseErrors'
import {
  validateCreateUsuarioInput,
  validateUpdateUsuarioInput,
  type CreateUsuarioInput,
  type UpdateUsuarioInput,
  type UsuarioPerfilRow,
} from './usuariosValidation'

const PERFIL_SELECT =
  'id, email, nombre, rol, unidad_academica_id, activo, created_at, updated_at' as const

function createEphemeralSignUpClient() {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseUrl =
    rawUrl === 'auto' && typeof window !== 'undefined'
      ? window.location.origin
      : rawUrl
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new AppServiceError(
      'NETWORK_ERROR',
      'Faltan variables de configuración de Supabase para dar de alta al usuario.'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'apptramites-admin-signup',
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  })
}

/**
 * Obtiene el padron completo de perfiles ordenados por fecha de alta y nombre.
 * Protegido por RLS en PostgreSQL: solo ADMIN recibe todos los registros.
 */
export async function fetchUsuarios(): Promise<UsuarioPerfilRow[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select(PERFIL_SELECT)
    .order('created_at', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) {
    throw mapSupabaseError(error)
  }

  return data ?? []
}

/**
 * Reutiliza el catalogo centralizado de unidades academicas activas para asignar
 * alcance por escuela a cuentas con rol UNIDAD_ACADEMICA.
 */
export async function fetchUnidadesParaUsuarios(): Promise<
  UnidadAcademicaCatalogo[]
> {
  return fetchUnidadesAcademicas({ onlyActive: true })
}

/**
 * Da de alta una cuenta en Supabase Auth sin sobrescribir la sesion del administrador
 * y verifica el registro generado en public.perfiles por el trigger handle_new_user.
 */
export async function createUsuario(
  input: CreateUsuarioInput
): Promise<UsuarioPerfilRow> {
  const validation = validateCreateUsuarioInput(input)
  if (!validation.valid) {
    throw new AppServiceError('VALIDATION_ERROR', validation.error, {
      field: validation.field,
    })
  }

  const { nombre, email, rol, unidadAcademicaId, activo, password } =
    validation.data
  const signUpClient = createEphemeralSignUpClient()

  const { data: signUpData, error: signUpError } =
    await signUpClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          rol,
          unidad_academica_id: unidadAcademicaId,
        },
      },
    })

  if (signUpError) {
    throw mapSupabaseError(signUpError)
  }

  const createdUser = signUpData.user
  if (!createdUser || (createdUser.identities && createdUser.identities.length === 0)) {
    throw new AppServiceError(
      'UNIQUE_VIOLATION',
      'Ya existe una cuenta registrada con ese correo electrónico.',
      { field: 'email' }
    )
  }

  if (!activo) {
    const { data: updated, error: updateError } = await supabase.rpc(
      'admin_update_usuario',
      {
        p_user_id: createdUser.id,
        p_nombre: nombre,
        p_email: email,
        p_rol: rol,
        p_activo: false,
        p_unidad_academica_id: unidadAcademicaId ?? undefined,
      }
    )

    if (updateError) {
      throw mapSupabaseError(updateError)
    }

    return updated
  }

  const { data: perfil, error: fetchError } = await supabase
    .from('perfiles')
    .select(PERFIL_SELECT)
    .eq('id', createdUser.id)
    .single()

  if (fetchError || !perfil) {
    throw mapSupabaseError(fetchError)
  }

  return perfil
}

/**
 * Actualiza perfil, rol, unidad academica, correo y estado activo de manera atomica.
 */
export async function updateUsuario(
  input: UpdateUsuarioInput
): Promise<UsuarioPerfilRow> {
  const validation = validateUpdateUsuarioInput(input)
  if (!validation.valid) {
    throw new AppServiceError('VALIDATION_ERROR', validation.error, {
      field: validation.field,
    })
  }

  const { id, nombre, email, rol, unidadAcademicaId, activo } = validation.data

  const { data, error } = await supabase.rpc('admin_update_usuario', {
    p_user_id: id,
    p_nombre: nombre,
    p_email: email,
    p_rol: rol,
    p_activo: activo,
    p_unidad_academica_id: unidadAcademicaId ?? undefined,
  })

  if (error) {
    throw mapSupabaseError(error)
  }

  return data
}

/**
 * Alterna el estado activo/inactivo de un usuario mediante la RPC administrativa.
 */
export async function toggleUsuarioActivo(
  usuario: UsuarioPerfilRow,
  nextActivo: boolean
): Promise<UsuarioPerfilRow> {
  return updateUsuario({
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    unidad_academica_id: usuario.unidad_academica_id,
    activo: nextActivo,
  })
}

/**
 * Elimina un usuario via RPC administrativa; si tiene historial protegido por
 * ON DELETE RESTRICT, informa al administrador que debe desactivarlo en su lugar.
 */
export async function deleteUsuario(userId: string): Promise<void> {
  if (!userId || userId.trim().length === 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Identificador de usuario inválido.'
    )
  }

  const { error } = await supabase.rpc('admin_delete_usuario', {
    p_user_id: userId,
  })

  if (!error) {
    return
  }

  const mapped = mapSupabaseError(error)
  if (mapped.code === 'FOREIGN_KEY_VIOLATION') {
    throw new AppServiceError(
      'FOREIGN_KEY_VIOLATION',
      'Este usuario tiene trámites o registros históricos vinculados. Desactívalo con el interruptor Activo en lugar de eliminarlo.',
      { rawCode: mapped.rawCode }
    )
  }

  throw mapped
}
