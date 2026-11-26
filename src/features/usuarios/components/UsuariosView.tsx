import * as React from 'react'
import {
  Loader2,
  Lock,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'

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
import { useUsuarios } from '../hooks/useUsuarios'
import {
  ConfirmarEliminarUsuarioModal,
  UsuarioFormModal,
} from './UsuarioFormModal'
import {
  ROL_DIVISION_OPTIONS,
  getRolDivisionMeta,
  type CreateUsuarioPayload,
  type RolUsuario,
  type UpdateUsuarioPayload,
  type UsuarioPerfilRow,
} from './usuariosMockData'

interface UsuariosViewProps {
  /**
   * Indica si el usuario autenticado tiene rol ADMIN.
   * Mientras no se conecte sesion real (perfil null en bypass), permite vista previa de diseño.
   */
  isAdmin: boolean
  currentUserId?: string
  /**
   * Overrides opcionales para pruebas aisladas de UI.
   */
  usuariosExternos?: UsuarioPerfilRow[]
  onCreateUsuario?: (payload: CreateUsuarioPayload) => Promise<boolean | void> | boolean | void
  onUpdateUsuario?: (payload: UpdateUsuarioPayload) => Promise<boolean | void> | boolean | void
  onToggleActivo?: (usuario: UsuarioPerfilRow, nextActivo: boolean) => Promise<boolean | void> | boolean | void
  onDeleteUsuario?: (usuario: UsuarioPerfilRow) => Promise<boolean | void> | boolean | void
  refreshSignal?: number
  onLoadingChange?: (loading: boolean) => void
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
  refreshSignal,
  onLoadingChange,
}: UsuariosViewProps) {
  const {
    usuarios: serviceUsuarios,
    unidades,
    isLoading,
    isMutating,
    isOfflinePreview,
    reloadUsuarios,
    handleCreateUsuario,
    handleUpdateUsuario,
    handleToggleActivo,
    handleDeleteUsuario,
  } = useUsuarios({
    enabled: isAdmin && !usuariosExternos,
    currentUserId,
  })

  const reloadRef = React.useRef(reloadUsuarios)
  const prevRefreshSignalRef = React.useRef(refreshSignal)
  React.useEffect(() => {
    reloadRef.current = reloadUsuarios
  }, [reloadUsuarios])

  React.useEffect(() => {
    if (
      isAdmin &&
      !usuariosExternos &&
      refreshSignal !== undefined &&
      refreshSignal !== prevRefreshSignalRef.current
    ) {
      prevRefreshSignalRef.current = refreshSignal
      void reloadRef.current()
    }
  }, [isAdmin, usuariosExternos, refreshSignal])

  React.useEffect(() => {
    onLoadingChange?.(isLoading && isAdmin && !usuariosExternos)
  }, [isLoading, isAdmin, usuariosExternos, onLoadingChange])

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

  const usuarios = usuariosExternos ?? serviceUsuarios

  const unidadesById = React.useMemo(
    () => new Map(unidades.map((ua) => [ua.id, ua])),
    [unidades]
  )

  const activeAdminsCount = usuarios.filter(
    (u) => u.rol === 'ADMIN' && u.activo
  ).length
  const totalActivos = usuarios.filter((u) => u.activo).length

  const filteredUsuarios = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return usuarios.filter((u) => {
      const meta = getRolDivisionMeta(u.rol)
      const unit = u.unidad_academica_id
        ? unidadesById.get(u.unidad_academica_id)
        : undefined
      const matchesRol = rolFilter === 'TODOS' || u.rol === rolFilter
      const matchesEstado =
        estadoFilter === 'TODOS' ||
        (estadoFilter === 'ACTIVOS' ? u.activo : !u.activo)
      const matchesQuery =
        !q ||
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        meta.etiqueta.toLowerCase().includes(q) ||
        meta.division.toLowerCase().includes(q) ||
        (unit?.claveUa.toLowerCase().includes(q) ?? false) ||
        (unit?.nombre.toLowerCase().includes(q) ?? false)
      return matchesRol && matchesEstado && matchesQuery
    })
  }, [estadoFilter, rolFilter, searchQuery, unidadesById, usuarios])

  // Proteccion visual estricta de rol ADMIN (en BD vive la autorizacion real via RLS y RPC)
  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-lg border-border bg-card shadow-sm dark:shadow-none">
        <CardHeader className="space-y-2 text-center">
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

  const submitCreate = onCreateUsuario ?? handleCreateUsuario
  const submitUpdate = onUpdateUsuario ?? handleUpdateUsuario
  const submitToggle = onToggleActivo ?? handleToggleActivo
  const submitDelete = onDeleteUsuario ?? handleDeleteUsuario

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5 shadow-sm dark:shadow-none lg:mr-24 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo, división o clave UA..."
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

        <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>
              Activos:{' '}
              <strong className="text-foreground">
                {totalActivos}/{usuarios.length}
              </strong>
            </span>
          </span>

          {isOfflinePreview && (
            <Badge
              variant="outline"
              className="text-[10px] font-medium text-muted-foreground"
            >
              Vista previa local
            </Badge>
          )}

          <Button
            type="button"
            size="sm"
            disabled={isMutating}
            onClick={() => {
              setEditingUsuario(null)
              setModalOpen(true)
            }}
            className="h-9 gap-1.5 bg-primary font-bold text-xs text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            <span>Agregar Usuario</span>
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm dark:shadow-none">
        <CardContent className="pt-4">
          <div className="overflow-hidden rounded-lg border border-border">
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
                {isLoading && !usuariosExternos ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-xs text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Cargando padrón de usuarios...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : filteredUsuarios.length === 0 ? (
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
                    const assignedUnit = usuario.unidad_academica_id
                      ? unidadesById.get(usuario.unidad_academica_id)
                      : undefined
                    const divisionLabel = assignedUnit
                      ? `${assignedUnit.claveUa} - ${assignedUnit.nombre}`
                      : meta.division

                    return (
                      <TableRow
                        key={usuario.id}
                        className={cn(
                          'h-12 transition-colors duration-150 hover:bg-secondary/30',
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
                              {divisionLabel}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={usuario.activo}
                              onCheckedChange={(checked) =>
                                void submitToggle(usuario, checked)
                              }
                              disabled={isSelf || isMutating}
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
                              disabled={isMutating}
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
                              disabled={isSelf || isMutating}
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

      <UsuarioFormModal
        key={`usr-modal-${editingUsuario?.id ?? 'new'}-${String(modalOpen)}`}
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialData={editingUsuario}
        unidades={unidades}
        activeAdminsCount={activeAdminsCount}
        currentUserId={currentUserId}
        isSubmitting={isMutating}
        onSaveCreate={submitCreate}
        onSaveUpdate={submitUpdate}
      />

      <ConfirmarEliminarUsuarioModal
        usuario={deletingUsuario}
        isSubmitting={isMutating}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingUsuario(null)
        }}
        onConfirm={submitDelete}
      />
    </div>
  )
}

export default UsuariosView
