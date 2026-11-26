import * as React from 'react'
import {
  AlertTriangle,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { UnidadAcademicaCatalogo } from '@/services/catalogos'
import {
  checkAdminIntegrityGuard,
  validateCreateUsuarioInput,
  validateUpdateUsuarioInput,
} from '@/services/usuarios'
import {
  ROL_DIVISION_OPTIONS,
  type CreateUsuarioPayload,
  type RolUsuario,
  type UpdateUsuarioPayload,
  type UsuarioPerfilRow,
} from './usuariosMockData'

interface UsuarioFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: UsuarioPerfilRow | null
  unidades: UnidadAcademicaCatalogo[]
  activeAdminsCount: number
  currentUserId?: string
  isSubmitting?: boolean
  onSaveCreate: (payload: CreateUsuarioPayload) => Promise<boolean | void> | boolean | void
  onSaveUpdate: (payload: UpdateUsuarioPayload) => Promise<boolean | void> | boolean | void
}

export function UsuarioFormModal({
  open,
  onOpenChange,
  initialData,
  unidades,
  activeAdminsCount,
  currentUserId,
  isSubmitting = false,
  onSaveCreate,
  onSaveUpdate,
}: UsuarioFormModalProps) {
  const isEditing = Boolean(initialData)
  const [nombre, setNombre] = React.useState(initialData?.nombre ?? '')
  const [email, setEmail] = React.useState(initialData?.email ?? '')
  const [rol, setRol] = React.useState<RolUsuario>(
    initialData?.rol ?? 'LICENCIATURA'
  )
  const [unidadAcademicaId, setUnidadAcademicaId] = React.useState<string>(
    initialData?.unidad_academica_id
      ? String(initialData.unidad_academica_id)
      : ''
  )
  const [activo, setActivo] = React.useState<boolean>(
    initialData?.activo ?? true
  )
  const [passwordTemporal, setPasswordTemporal] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const isSelf = Boolean(initialData && currentUserId === initialData.id)

  const handleRolChange = (nextRol: RolUsuario) => {
    setRol(nextRol)
    if (nextRol !== 'UNIDAD_ACADEMICA') {
      setUnidadAcademicaId('')
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedUnitId =
      rol === 'UNIDAD_ACADEMICA' && unidadAcademicaId
        ? Number(unidadAcademicaId)
        : null

    if (initialData) {
      const guardError = checkAdminIntegrityGuard({
        targetUser: initialData,
        nextRol: rol,
        nextActivo: activo,
        activeAdminsCount,
        currentUserId,
      })
      if (guardError) {
        toast.error(guardError)
        return
      }

      const payload: UpdateUsuarioPayload = {
        id: initialData.id,
        nombre,
        email,
        rol,
        unidad_academica_id: parsedUnitId,
        activo,
      }
      const validation = validateUpdateUsuarioInput(payload)
      if (!validation.valid) {
        toast.error(validation.error)
        return
      }

      const result = await onSaveUpdate(payload)
      if (result !== false) {
        onOpenChange(false)
      }
      return
    }

    const payload: CreateUsuarioPayload = {
      nombre,
      email,
      rol,
      unidad_academica_id: parsedUnitId,
      activo,
      passwordTemporal,
    }
    const validation = validateCreateUsuarioInput(payload)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    const result = await onSaveCreate(payload)
    if (result !== false) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                {isEditing ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight">
                  {isEditing ? 'Editar Usuario' : 'Agregar Usuario'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Personaliza nombre, correo, división asignada y estado en tabla
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="usr-nombre"
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Nombre del Usuario *
              </Label>
              <Input
                id="usr-nombre"
                placeholder="Ej. Iris Encargada Licenciatura"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={isSubmitting}
                className="h-9 bg-background text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="usr-email"
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Correo Electrónico *
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="usr-email"
                  type="email"
                  placeholder="usuario@uas.edu.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="h-9 bg-background pl-8 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="usr-rol"
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                División y Rol de Acceso *
              </Label>
              <Select
                value={rol}
                onValueChange={(value) => handleRolChange(value as RolUsuario)}
                disabled={isSelf || isSubmitting}
              >
                <SelectTrigger id="usr-rol" className="h-9 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROL_DIVISION_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.rol}
                      value={opt.rol}
                      className="text-xs"
                    >
                      <span className="font-semibold">{opt.etiqueta}</span>
                      <span className="ml-1.5 text-muted-foreground">
                        &mdash; {opt.division}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSelf && (
                <p className="text-[10px] text-muted-foreground">
                  Por seguridad no puedes cambiar tu propio rol en sesión.
                </p>
              )}
            </div>

            {rol === 'UNIDAD_ACADEMICA' && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-unidad"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Unidad Académica Asignada *
                </Label>
                <Select
                  value={unidadAcademicaId}
                  onValueChange={setUnidadAcademicaId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="usr-unidad"
                    className="h-9 bg-background text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <SelectValue placeholder="Selecciona escuela o facultad (ej. 4800)" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((ua) => (
                      <SelectItem
                        key={ua.id}
                        value={String(ua.id)}
                        className="text-xs"
                      >
                        <span className="font-mono font-semibold">
                          {ua.claveUa}
                        </span>
                        <span className="ml-1.5 text-muted-foreground">
                          &mdash; {ua.nombre}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isEditing && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-password"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Contraseña Inicial *
                </Label>
                <div className="relative">
                  <Input
                    id="usr-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={passwordTemporal}
                    onChange={(e) => setPasswordTemporal(e.target.value)}
                    disabled={isSubmitting}
                    className="h-9 bg-background pr-9 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
              <div>
                <Label
                  htmlFor="usr-activo"
                  className="cursor-pointer text-xs font-semibold"
                >
                  Usuario activo
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Si está inactivo, Supabase bloquea el acceso al sistema
                </p>
              </div>
              <Switch
                id="usr-activo"
                checked={activo}
                onCheckedChange={setActivo}
                disabled={isSelf || isSubmitting}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 gap-1.5 bg-primary font-bold text-xs text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{isEditing ? 'Guardar cambios' : 'Crear usuario'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ConfirmarEliminarUsuarioModalProps {
  usuario: UsuarioPerfilRow | null
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (usuario: UsuarioPerfilRow) => Promise<boolean | void> | boolean | void
}

export function ConfirmarEliminarUsuarioModal({
  usuario,
  isSubmitting = false,
  onOpenChange,
  onConfirm,
}: ConfirmarEliminarUsuarioModalProps) {
  const handleConfirm = async () => {
    if (!usuario) {
      return
    }
    const result = await onConfirm(usuario)
    if (result !== false) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={Boolean(usuario)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <DialogHeader className="border-b border-border px-5 py-4 pr-10 text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Eliminar Usuario
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Control administrativo de cuentas
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4 text-xs">
          <p className="text-foreground">
            ¿Confirmas eliminar a{' '}
            <strong className="font-semibold">{usuario?.nombre}</strong> (
            <span className="font-mono">{usuario?.email}</span>)?
          </p>
          <p className="rounded-lg border border-border bg-secondary/40 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
            Nota: si el usuario ya capturó trámites o actas en el historial, PostgreSQL protege su trazabilidad y deberás desactivarlo con el interruptor Activo.
          </p>
        </div>

        <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isSubmitting}
            onClick={() => void handleConfirm()}
            className="h-8 gap-1.5 font-semibold text-xs"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Eliminar</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
