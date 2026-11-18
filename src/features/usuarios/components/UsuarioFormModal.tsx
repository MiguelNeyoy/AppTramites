import * as React from 'react'
import { AlertTriangle, Eye, EyeOff, Mail, Save, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
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
  activeAdminsCount: number
  currentUserId?: string
  onSaveCreate: (payload: CreateUsuarioPayload) => void
  onSaveUpdate: (payload: UpdateUsuarioPayload) => void
}

export function UsuarioFormModal({
  open,
  onOpenChange,
  initialData,
  activeAdminsCount,
  currentUserId,
  onSaveCreate,
  onSaveUpdate,
}: UsuarioFormModalProps) {
  const isEditing = Boolean(initialData)
  const [nombre, setNombre] = React.useState(initialData?.nombre ?? '')
  const [email, setEmail] = React.useState(initialData?.email ?? '')
  const [rol, setRol] = React.useState<RolUsuario>(
    initialData?.rol ?? 'LICENCIATURA'
  )
  const [activo, setActivo] = React.useState<boolean>(
    initialData?.activo ?? true
  )
  const [passwordTemporal, setPasswordTemporal] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const isLastActiveAdmin = Boolean(
    initialData &&
      initialData.rol === 'ADMIN' &&
      initialData.activo &&
      activeAdminsCount <= 1
  )
  const isSelf = Boolean(initialData && currentUserId === initialData.id)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!nombre.trim()) {
      toast.error('Ingresa el nombre completo del usuario.')
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Ingresa un correo electrónico válido.')
      return
    }

    if (isLastActiveAdmin && (rol !== 'ADMIN' || !activo)) {
      toast.error('Debe permanecer al menos un administrador activo en el sistema.')
      return
    }

    if (initialData) {
      onSaveUpdate({
        id: initialData.id,
        nombre: nombre.trim(),
        email: trimmedEmail,
        rol,
        activo,
      })
    } else {
      onSaveCreate({
        nombre: nombre.trim(),
        email: trimmedEmail,
        rol,
        activo,
        passwordTemporal: passwordTemporal.trim() || undefined,
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:rounded-xl">
        <form onSubmit={handleSubmit}>
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
            {/* Campo 1: Nombre */}
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
                className="h-9 bg-background text-xs"
              />
            </div>

            {/* Campo 2: Correo */}
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
                  className="h-9 bg-background pl-8 font-mono text-xs"
                />
              </div>
            </div>

            {/* Campo 3: División / Rol (ENUM rol_usuario en PostgreSQL) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="usr-rol"
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                División y Rol de Acceso *
              </Label>
              <Select
                value={rol}
                onValueChange={(value) => setRol(value as RolUsuario)}
                disabled={isSelf}
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

            {/* Campo 4 (Alta): Contraseña inicial opcional lista para Supabase Auth */}
            {!isEditing && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-password"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Contraseña Inicial (Para alta en Auth)
                </Label>
                <div className="relative">
                  <Input
                    id="usr-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres (opcional en UI)"
                    value={passwordTemporal}
                    onChange={(e) => setPasswordTemporal(e.target.value)}
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

            {/* Campo 5: Estado Activo */}
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
                disabled={isSelf}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 gap-1.5 bg-primary font-bold text-xs text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" />
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
  onOpenChange: (open: boolean) => void
  onConfirm: (usuario: UsuarioPerfilRow) => void
}

export function ConfirmarEliminarUsuarioModal({
  usuario,
  onOpenChange,
  onConfirm,
}: ConfirmarEliminarUsuarioModalProps) {
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
            Nota: si el usuario ya capturó trámites o actas en el historial, en base de datos conviene desactivarlo con el interruptor Activo para conservar trazabilidad.
          </p>
        </div>

        <DialogFooter className="border-t border-border bg-secondary/20 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              if (usuario) {
                onConfirm(usuario)
              }
              onOpenChange(false)
            }}
            className="h-8 gap-1.5 font-semibold text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Eliminar</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
