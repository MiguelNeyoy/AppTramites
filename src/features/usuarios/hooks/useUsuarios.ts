import * as React from 'react'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import { buildInitialUnidades } from '@/features/catalogos/components/catalogosMockData'
import type { UnidadAcademicaCatalogo } from '@/services/catalogos'
import { mapSupabaseError } from '@/services/shared'
import {
  checkAdminIntegrityGuard,
  checkDeleteUsuarioGuard,
  createUsuario,
  deleteUsuario,
  fetchUnidadesParaUsuarios,
  fetchUsuarios,
  toggleUsuarioActivo,
  updateUsuario,
  type CreateUsuarioInput,
  type UpdateUsuarioInput,
  type UsuarioPerfilRow,
} from '@/services/usuarios'
import { buildInitialUsuariosMock } from '../components/usuariosMockData'

interface UsuariosSnapshot {
  usuarios: UsuarioPerfilRow[]
  unidades: UnidadAcademicaCatalogo[]
  isOfflinePreview: boolean
  errorMessage?: string
}

async function resolveUsuariosSnapshot(): Promise<UsuariosSnapshot> {
  const buildLocalPreview = (errorMessage?: string): UsuariosSnapshot => ({
    usuarios: buildInitialUsuariosMock(),
    unidades: buildInitialUnidades().filter((u) => u.activa),
    isOfflinePreview: true,
    errorMessage,
  })

  try {
    const { data: sessionRes } = await supabase.auth.getSession()
    if (!sessionRes.session) {
      return buildLocalPreview()
    }

    const [usuarios, unidades] = await Promise.all([
      fetchUsuarios(),
      fetchUnidadesParaUsuarios(),
    ])

    return {
      usuarios,
      unidades,
      isOfflinePreview: false,
    }
  } catch (error) {
    const mapped = mapSupabaseError(error)
    if (mapped.code === 'NETWORK_ERROR') {
      return buildLocalPreview(mapped.message)
    }
    return {
      usuarios: [],
      unidades: [],
      isOfflinePreview: false,
      errorMessage: mapped.message,
    }
  }
}

interface UseUsuariosOptions {
  enabled: boolean
  currentUserId?: string
}

/**
 * Hook de estado y mutaciones CRUD para el padron administrativo de usuarios.
 */
export function useUsuarios({ enabled, currentUserId }: UseUsuariosOptions) {
  const [usuarios, setUsuarios] = React.useState<UsuarioPerfilRow[]>([])
  const [unidades, setUnidades] = React.useState<UnidadAcademicaCatalogo[]>([])
  const [isLoading, setIsLoading] = React.useState(enabled)
  const [isMutating, setIsMutating] = React.useState(false)
  const [isOfflinePreview, setIsOfflinePreview] = React.useState(false)

  const applyResolvedSnapshot = React.useCallback((resolved: UsuariosSnapshot) => {
    setUsuarios(resolved.usuarios)
    setUnidades(resolved.unidades)
    setIsOfflinePreview(resolved.isOfflinePreview)
    if (resolved.errorMessage) {
      toast.error(resolved.errorMessage)
    }
    setIsLoading(false)
  }, [])

  const loadUsuarios = React.useCallback(async () => {
    if (!enabled) {
      return
    }

    setIsLoading(true)
    const resolved = await resolveUsuariosSnapshot()
    applyResolvedSnapshot(resolved)
  }, [applyResolvedSnapshot, enabled])

  React.useEffect(() => {
    if (!enabled) {
      return
    }

    let active = true
    const bootstrap = async () => {
      const resolved = await resolveUsuariosSnapshot()
      if (!active) {
        return
      }
      applyResolvedSnapshot(resolved)
    }

    void bootstrap()
    return () => {
      active = false
    }
  }, [applyResolvedSnapshot, enabled])

  const activeAdminsCount = usuarios.filter(
    (u) => u.rol === 'ADMIN' && u.activo
  ).length

  const runMutation = React.useCallback(
    async (action: () => Promise<string>): Promise<boolean> => {
      setIsMutating(true)
      try {
        const successMessage = await action()
        toast.success(successMessage)
        return true
      } catch (error) {
        toast.error(mapSupabaseError(error).message)
        return false
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const handleCreateUsuario = React.useCallback(
    async (payload: CreateUsuarioInput): Promise<boolean> => {
      if (isOfflinePreview) {
        const now = new Date().toISOString()
        const newRow: UsuarioPerfilRow = {
          id: `local-${Date.now()}`,
          nombre: payload.nombre.trim(),
          email: payload.email.trim().toLowerCase(),
          rol: payload.rol,
          unidad_academica_id:
            payload.rol === 'UNIDAD_ACADEMICA'
              ? (payload.unidad_academica_id ?? null)
              : null,
          activo: payload.activo,
          created_at: now,
          updated_at: now,
        }
        setUsuarios((prev) => [newRow, ...prev])
        toast.success(`Usuario "${newRow.nombre}" agregado (vista previa local).`)
        return true
      }

      return runMutation(async () => {
        const created = await createUsuario(payload)
        setUsuarios((prev) => [...prev, created])
        return `Usuario "${created.nombre}" creado en el sistema.`
      })
    },
    [isOfflinePreview, runMutation]
  )

  const handleUpdateUsuario = React.useCallback(
    async (payload: UpdateUsuarioInput): Promise<boolean> => {
      const target = usuarios.find((u) => u.id === payload.id)
      if (target) {
        const guardMessage = checkAdminIntegrityGuard({
          targetUser: target,
          nextRol: payload.rol,
          nextActivo: payload.activo,
          activeAdminsCount,
          currentUserId,
        })
        if (guardMessage) {
          toast.error(guardMessage)
          return false
        }
      }

      if (isOfflinePreview) {
        const now = new Date().toISOString()
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === payload.id
              ? {
                  ...u,
                  nombre: payload.nombre.trim(),
                  email: payload.email.trim().toLowerCase(),
                  rol: payload.rol,
                  unidad_academica_id:
                    payload.rol === 'UNIDAD_ACADEMICA'
                      ? (payload.unidad_academica_id ?? null)
                      : null,
                  activo: payload.activo,
                  updated_at: now,
                }
              : u
          )
        )
        toast.success(`Usuario "${payload.nombre}" actualizado (vista previa local).`)
        return true
      }

      return runMutation(async () => {
        const updated = await updateUsuario(payload)
        setUsuarios((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u))
        )
        return `Usuario "${updated.nombre}" actualizado.`
      })
    },
    [activeAdminsCount, currentUserId, isOfflinePreview, runMutation, usuarios]
  )

  const handleToggleActivo = React.useCallback(
    async (usuario: UsuarioPerfilRow, nextActivo: boolean): Promise<boolean> => {
      const guardMessage = checkAdminIntegrityGuard({
        targetUser: usuario,
        nextRol: usuario.rol,
        nextActivo,
        activeAdminsCount,
        currentUserId,
      })
      if (guardMessage) {
        toast.error(guardMessage)
        return false
      }

      if (isOfflinePreview) {
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === usuario.id ? { ...u, activo: nextActivo } : u
          )
        )
        toast.info(
          `"${usuario.nombre}" marcado como ${nextActivo ? 'activo' : 'inactivo'}.`
        )
        return true
      }

      return runMutation(async () => {
        const updated = await toggleUsuarioActivo(usuario, nextActivo)
        setUsuarios((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u))
        )
        return `"${updated.nombre}" marcado como ${updated.activo ? 'activo' : 'inactivo'}.`
      })
    },
    [activeAdminsCount, currentUserId, isOfflinePreview, runMutation]
  )

  const handleDeleteUsuario = React.useCallback(
    async (usuario: UsuarioPerfilRow): Promise<boolean> => {
      const guardMessage = checkDeleteUsuarioGuard({
        targetUser: usuario,
        activeAdminsCount,
        currentUserId,
      })
      if (guardMessage) {
        toast.error(guardMessage)
        return false
      }

      if (isOfflinePreview) {
        setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id))
        toast.success(`Usuario "${usuario.nombre}" eliminado del padrón local.`)
        return true
      }

      return runMutation(async () => {
        await deleteUsuario(usuario.id)
        setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id))
        return `Usuario "${usuario.nombre}" eliminado del padrón.`
      })
    },
    [activeAdminsCount, currentUserId, isOfflinePreview, runMutation]
  )

  return {
    usuarios,
    unidades,
    activeAdminsCount,
    isLoading,
    isMutating,
    isOfflinePreview,
    reloadUsuarios: loadUsuarios,
    handleCreateUsuario,
    handleUpdateUsuario,
    handleToggleActivo,
    handleDeleteUsuario,
  }
}
