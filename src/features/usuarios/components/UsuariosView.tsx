import * as React from 'react'
import {
  Lock,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  ConfirmarEliminarUsuarioModal,
  UsuarioFormModal,
} from './UsuarioFormModal'
import {
  ROL_DIVISION_OPTIONS,
  buildInitialUsuariosMock,
  getRolDivisionMeta,
  type CreateUsuarioPayload,
  type RolUsuario,
  type UpdateUsuarioPayload,
  type UsuarioPerfilRow,
} from './usuariosMockData'

interface UsuariosViewProps {
  /**
   * Indica si el usuario autenticado tiene rol ADMIN.
   * Mientras no se conecte BD real (perfil null en bypass), permite vista previa de diseño.
   */
  isAdmin: boolean
  currentUserId?: string
  /**
   * Callbacks opcionales preparados para conectar directamente con src/services/usuarios al implementar BD.
   */
  usuariosExternos?: UsuarioPerfilRow[]
  onCreateUsuario?: (payload: CreateUsuarioPayload) => void
  onUpdateUsuario?: (payload: UpdateUsuarioPayload) => void
  onToggleActivo?: (usuario: UsuarioPerfilRow, nextActivo: boolean) => void
  onDeleteUsuario?: (usuario: UsuarioPerfilRow) => void
}

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'US'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function UsuariosView({
  isAdmin,
  currentUserId,
  usuariosExternos,
  onCreateUsuario,
  onUpdateUsuario,
  onToggleActivo,
  onDeleteUsuario,
}: UsuariosViewProps) {
  const [localUsuarios, setLocalUsuarios] = React.useState<UsuarioPerfilRow[]>(
    () => buildInitialUsuariosMock()
  )
  const [searchQuery, setSearchQuery] = React.useState('')
  const [rolFilter, setRolFilter] = React.useState<'TODOS' | RolUsuario>('TODOS')
  const [estadoFilter, setEstadoFilter] = React.useState<
    'TODOS' | 'ACTIVOS' | 'INACTIVOS'
  >('TODOS')

  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingUsuario, setEditingUsuario] =
    React.useState<UsuarioPerfilRow | null>(null)
  const [deletingUsuario, setDeletingUsuario] =
    React.useState<UsuarioPerfilRow | null>(null)

  const usuarios = usuariosExternos ?? localUsuarios

  const activeAdminsCount = usuarios.filter(
    (u) => u.rol === 'ADMIN' && u.activo
  ).length
  const totalActivos = usuarios.filter((u) => u.activo).length

  const filteredUsuarios = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return usuarios.filter((u) => {
      const meta = getRolDivisionMeta(u.rol)
      const matchesRol = rolFilter === 'TODOS' || u.rol === rolFilter
      const matchesEstado =
        estadoFilter === 'TODOS' ||
        (estadoFilter === 'ACTIVOS' ? u.activo : !u.activo)
      const matchesQuery =
        !q ||
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        meta.etiqueta.toLowerCase().includes(q) ||
        meta.division.toLowerCase().includes(q)
      return matchesRol && matchesEstado && matchesQuery
    })
  }, [estadoFilter, rolFilter, searchQuery, usuarios])

  // Protección visual estricta de rol ADMIN (en BD también debe existir RLS)
  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-lg border-border bg-card shadow-sm dark:shadow-none">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle className="text-base font-bold">
            Acceso Restringido a Administradores
          </CardTitle>
          <CardDescription className="text-xs">
            Únicamente el rol ADMIN puede visualizar, crear o editar usuarios del sistema.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const handleCreate = (payload: CreateUsuarioPayload) => {
    if (onCreateUsuario) {
      onCreateUsuario(payload)
      return
    }
    const now = new Date().toISOString()
    const newRow: UsuarioPerfilRow = {
      id: `local-${Date.now()}`,
      nombre: payload.nombre,
      email: payload.email,
      rol: payload.rol,
      activo: payload.activo,
      created_at: now,
      updated_at: now,
    }
    setLocalUsuarios((prev) => [newRow, ...prev])
    toast.success(`Usuario "${payload.nombre}" agregado (vista previa local).`)
  }

  const handleUpdate = (payload: UpdateUsuarioPayload) => {
    if (onUpdateUsuario) {
      onUpdateUsuario(payload)
      return
    }
    const now = new Date().toISOString()
    setLocalUsuarios((prev) =>
      prev.map((u) =>
        u.id === payload.id
          ? {
              ...u,
              nombre: payload.nombre,
              email: payload.email,
              rol: payload.rol,
              activo: payload.activo,
              updated_at: now,
            }
          : u
      )
    )
    toast.success(`Usuario "${payload.nombre}" actualizado.`)
  }

  const handleToggleEstado = (usuario: UsuarioPerfilRow) => {
    const nextActivo = !usuario.activo
    if (
      usuario.rol === 'ADMIN' &&
      usuario.activo &&
      activeAdminsCount <= 1
    ) {
      toast.error('Debe existir al menos un administrador activo.')
      return
    }
    if (currentUserId === usuario.id) {
      toast.error('No puedes desactivar tu propio usuario en sesión.')
      return
    }

    if (onToggleActivo) {
      onToggleActivo(usuario, nextActivo)
      return
    }
    setLocalUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuario.id ? { ...u, activo: nextActivo } : u
      )
    )
    toast.info(
      `"${usuario.nombre}" marcado como ${nextActivo ? 'activo' : 'inactivo'}.`
    )
  }

  const handleConfirmDelete = (usuario: UsuarioPerfilRow) => {
    if (currentUserId === usuario.id) {
      toast.error('No puedes eliminar tu propio perfil.')
      return
    }
    if (usuario.rol === 'ADMIN' && usuario.activo && activeAdminsCount <= 1) {
      toast.error('Debe permanecer al menos un administrador activo.')
      return
    }

    if (onDeleteUsuario) {
      onDeleteUsuario(usuario)
      return
    }
    setLocalUsuarios((prev) => prev.filter((u) => u.id !== usuario.id))
    toast.success(`Usuario "${usuario.nombre}" eliminado del padrón local.`)
  }

  return (
    <div className="space-y-5">
      {/* Encabezado + CTA único primario dorado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Administración de Usuarios
            </h2>
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
            >
              <ShieldCheck className="h-3 w-3" />
              Solo ADMIN
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Control de cuentas institucionales, división asignada y estado activo en public.perfiles.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingUsuario(null)
            setModalOpen(true)
          }}
          className="h-9 gap-1.5 self-start bg-primary font-bold text-xs text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Agregar Usuario</span>
        </Button>
      </div>

      {/* Barra de búsqueda, filtros y conteo */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5 shadow-sm dark:shadow-none lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o división..."
              className="h-8 bg-background pl-8 text-xs"
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={rolFilter}
              onValueChange={(v) => setRolFilter(v as 'TODOS' | RolUsuario)}
            >
              <SelectTrigger className="h-8 bg-background text-xs">
                <SelectValue placeholder="División / Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS" className="text-xs">
                  Todas las divisiones
                </SelectItem>
                {ROL_DIVISION_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.rol}
                    value={opt.rol}
                    className="text-xs"
                  >
                    {opt.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-36">
            <Select
              value={estadoFilter}
              onValueChange={(v) =>
                setEstadoFilter(v as 'TODOS' | 'ACTIVOS' | 'INACTIVOS')
              }
            >
              <SelectTrigger className="h-8 bg-background text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS" className="text-xs">
                  Todos
                </SelectItem>
                <SelectItem value="ACTIVOS" className="text-xs">
                  Activos
                </SelectItem>
                <SelectItem value="INACTIVOS" className="text-xs">
                  Inactivos
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono tabular-nums text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>
              Activos:{' '}
              <strong className="text-foreground">
                {totalActivos}/{usuarios.length}
              </strong>
            </span>
          </span>
        </div>
      </div>

      {/* Tabla principal de usuarios */}
      <Card className="border-border bg-card shadow-sm dark:shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold">
                Padrón de Usuarios del Sistema
              </CardTitle>
              <CardDescription className="text-xs">
                Visualiza a qué división pertenece cada cuenta, su correo institucional y estado operativo
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono tabular-nums text-[10px]">
              {filteredUsuarios.length} usuarios
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Usuario
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Correo Electrónico
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    División / Rol
                  </TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                    Estado
                  </TableHead>
                  <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-widest">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-xs text-muted-foreground"
                    >
                      No se encontraron usuarios con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((usuario) => {
                    const meta = getRolDivisionMeta(usuario.rol)
                    const isSelf = currentUserId === usuario.id

                    return (
                      <TableRow
                        key={usuario.id}
                        className={cn(
                          'h-12 hover:bg-secondary/30 transition-colors duration-150',
                          !usuario.activo && 'opacity-65'
                        )}
                      >
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[11px] font-bold text-foreground">
                              {getInitials(usuario.nombre)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {usuario.nombre}
                              </p>
                              {isSelf && (
                                <span className="text-[10px] font-medium text-primary">
                                  Sesión actual
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-2 font-mono text-xs text-muted-foreground">
                          {usuario.email}
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="flex flex-col items-start gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-bold',
                                meta.badgeClass
                              )}
                            >
                              {meta.etiqueta}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {meta.division}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={usuario.activo}
                              onCheckedChange={() => handleToggleEstado(usuario)}
                              disabled={isSelf}
                              aria-label={`Estado activo de ${usuario.nombre}`}
                            />
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-semibold',
                                usuario.activo
                                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'border-border bg-muted text-muted-foreground'
                              )}
                            >
                              {usuario.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell className="py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingUsuario(usuario)
                                setModalOpen(true)
                              }}
                              aria-label={`Editar a ${usuario.nombre}`}
                              className="h-7 w-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isSelf}
                              onClick={() => setDeletingUsuario(usuario)}
                              aria-label={`Eliminar a ${usuario.nombre}`}
                              className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal para Agregar o Editar Usuario */}
      <UsuarioFormModal
        key={`usr-modal-${editingUsuario?.id ?? 'new'}-${String(modalOpen)}`}
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialData={editingUsuario}
        activeAdminsCount={activeAdminsCount}
        currentUserId={currentUserId}
        onSaveCreate={handleCreate}
        onSaveUpdate={handleUpdate}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmarEliminarUsuarioModal
        usuario={deletingUsuario}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingUsuario(null)
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default UsuariosView
