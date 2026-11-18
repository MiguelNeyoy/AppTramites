import * as React from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  Sun,
} from 'lucide-react'
import { toast } from 'sonner'

import uasEscudo from '@/assets/uas-escudo.png'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { cn } from '@/lib/utils'
import {
  loginWithEmail,
  normalizeEmail,
  requestPasswordReset,
  updatePassword,
  validateLoginInput,
  validateNewPassword,
  validatePasswordResetInput,
  type AuthSessionResult,
} from '@/services/login'
import { mapSupabaseError } from '@/services/shared'

interface LoginPageProps {
  theme?: 'light' | 'dark'
  onToggleTheme?: () => void
  onBypassLogin?: () => void
  onLoginSuccess?: (session: AuthSessionResult) => void
  isPasswordRecovery?: boolean
  onClearPasswordRecovery?: () => void
}

const REMEMBERED_EMAIL_KEY = 'tramitesuas_remembered_email'

const FEATURES = [
  '9 Trámites Oficiales y Nuevo Ingreso',
  'Licenciatura, Bachillerato y Admisión',
  'Checklist de Actas y Cortes Quincenales',
] as const

export function LoginPage({
  theme = 'light',
  onToggleTheme,
  onBypassLogin,
  onLoginSuccess,
  isPasswordRecovery = false,
  onClearPasswordRecovery,
}: LoginPageProps) {
  const [email, setEmail] = React.useState(() => {
    if (typeof window === 'undefined') {
      return ''
    }
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ''
  })
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [rememberSession, setRememberSession] = React.useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return Boolean(window.localStorage.getItem(REMEMBERED_EMAIL_KEY))
  })

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [emailError, setEmailError] = React.useState<string | null>(null)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  // Modal de recuperacion de contrasena
  const [resetModalOpen, setResetModalOpen] = React.useState(false)
  const [resetEmail, setResetEmail] = React.useState('')
  const [resetEmailError, setResetEmailError] = React.useState<string | null>(null)
  const [isSendingReset, setIsSendingReset] = React.useState(false)
  const [resetSentTo, setResetSentTo] = React.useState<string | null>(null)

  // Modal para definir nueva contrasena cuando regresa desde enlace de recuperacion
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [recoveryPasswordError, setRecoveryPasswordError] = React.useState<
    string | null
  >(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const validation = validateLoginInput(email, password)
    setEmailError(validation.errors.email ?? null)
    setPasswordError(validation.errors.password ?? null)

    if (!validation.valid) {
      return
    }

    setIsSubmitting(true)
    try {
      const sessionResult = await loginWithEmail({
        email: validation.email,
        password,
      })

      if (typeof window !== 'undefined') {
        if (rememberSession) {
          window.localStorage.setItem(REMEMBERED_EMAIL_KEY, validation.email)
        } else {
          window.localStorage.removeItem(REMEMBERED_EMAIL_KEY)
        }
      }

      setPassword('')
      toast.success(`Bienvenido, ${sessionResult.perfil.nombre}`)
      onLoginSuccess?.(sessionResult)
    } catch (error) {
      const mapped = mapSupabaseError(error)
      if (mapped.field === 'email') {
        setEmailError(mapped.message)
      } else if (mapped.field === 'password') {
        setPasswordError(mapped.message)
      } else {
        setFormError(mapped.message)
      }
      toast.error(mapped.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenResetModal = () => {
    setResetEmail(normalizeEmail(email))
    setResetEmailError(null)
    setResetSentTo(null)
    setResetModalOpen(true)
  }

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validatePasswordResetInput(resetEmail)
    if (!validation.valid) {
      setResetEmailError(validation.error ?? 'Ingresa un correo electrónico válido.')
      return
    }

    setResetEmailError(null)
    setIsSendingReset(true)
    try {
      const result = await requestPasswordReset(validation.email)
      setResetSentTo(result.email)
      toast.success(
        'Si el correo está dado de alta, recibirás instrucciones para restablecer tu contraseña.'
      )
    } catch (error) {
      const mapped = mapSupabaseError(error)
      setResetEmailError(mapped.message)
      toast.error(mapped.message)
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleUpdatePasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    const validation = validateNewPassword(newPassword, confirmPassword)
    if (!validation.valid) {
      setRecoveryPasswordError(validation.error ?? 'Contraseña inválida.')
      return
    }

    setRecoveryPasswordError(null)
    setIsUpdatingPassword(true)
    try {
      await updatePassword(newPassword, confirmPassword)
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
      onClearPasswordRecovery?.()
    } catch (error) {
      const mapped = mapSupabaseError(error)
      setRecoveryPasswordError(mapped.message)
      toast.error(mapped.message)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground flex flex-col lg:flex-row">
      {/* Fondo split-screen con onda curva para escritorio */}
      <svg
        className="hidden lg:block absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 860 540"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="uas-panel-shade" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="black" stopOpacity="0" />
            <stop offset="1" stopColor="black" stopOpacity="0.32" />
          </linearGradient>
          <clipPath id="uas-wave-clip">
            <path d="M0 0 H396 C420 88 420 188 378 250 C336 312 346 430 376 540 H0 Z" />
          </clipPath>
        </defs>

        <path
          d="M0 0 H396 C420 88 420 188 378 250 C336 312 346 430 376 540 H0 Z"
          className="fill-uas-blue"
        />
        <path
          d="M0 0 H396 C420 88 420 188 378 250 C336 312 346 430 376 540 H0 Z"
          fill="url(#uas-panel-shade)"
        />

        <g clipPath="url(#uas-wave-clip)">
          <circle cx="-26" cy="-38" r="170" fill="none" stroke="white" strokeOpacity="0.055" />
          <circle cx="-28" cy="-38" r="250" fill="none" stroke="white" strokeOpacity="0.04" />
          <circle cx="318" cy="436" r="86" fill="none" stroke="white" strokeOpacity="0.065" />
          <circle cx="318" cy="436" r="142" fill="none" stroke="white" strokeOpacity="0.04" />
          <circle
            cx="260"
            cy="230"
            r="130"
            className="fill-uas-gold"
            fillOpacity="0.07"
            filter="blur(54px)"
          />
        </g>
      </svg>

      {/* Cabecera compacta solo en móvil/tablet */}
      <header className="lg:hidden relative z-10 bg-uas-blue text-white px-6 py-5 flex items-center justify-between border-b border-border/20">
        <div className="flex items-center gap-3">
          <img
            src={uasEscudo}
            alt="Escudo Universidad Autónoma de Sinaloa"
            className="h-10 w-10 object-contain"
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Universidad Autónoma de Sinaloa
            </p>
            <h1 className="text-base font-bold tracking-tight text-white">
              TrámitesUAS
            </h1>
          </div>
        </div>

        {onToggleTheme && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            aria-label="Cambiar tema"
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-150"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-uas-gold" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        )}
      </header>

      {/* Panel izquierdo institucional (Desktop) */}
      <aside className="hidden lg:flex relative z-10 w-[42%] flex-shrink-0 flex-col justify-between px-10 py-10 text-white">
        <div className="pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 whitespace-nowrap">
            Universidad Autónoma de Sinaloa
          </p>
        </div>

        <div className="flex flex-col items-start justify-center max-w-xs">
          <img
            src={uasEscudo}
            alt="Escudo Universidad Autónoma de Sinaloa"
            className="w-24 h-24 object-contain mb-6 drop-shadow-2xl"
          />
          <h1 className="text-2xl font-bold text-white tracking-tight leading-tight mb-2">
            TrámitesUAS
          </h1>
          <p className="text-sm text-white/55 leading-relaxed">
            Control de trámites escolares y actas &middot; Unidad Regional Sur.
          </p>

          <ul className="mt-8 space-y-2.5">
            {FEATURES.map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-uas-gold flex-shrink-0" />
                <span className="text-xs text-white/50">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-mono tabular-nums text-white/30">
            v0.1.0 &middot; 2026
          </p>
        </div>
      </aside>

      {/* Panel derecho: Login minimalista con componentes shadcn/ui */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-8 lg:ml-auto lg:w-[58%]">
        {/* Botón de tema flotante superior derecho en escritorio */}
        {onToggleTheme && (
          <div className="hidden lg:block absolute top-5 right-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              aria-label="Cambiar tema"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-uas-gold" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        <Card className="w-full max-w-sm border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="space-y-1.5 pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Acceso al sistema
            </p>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Iniciar sesión
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Ingresa tus credenciales institucionales para continuar.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  htmlFor="login-email"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="usuario@uas.edu.mx"
                    value={email}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(emailError)}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      if (emailError) {
                        setEmailError(null)
                      }
                      if (formError) {
                        setFormError(null)
                      }
                    }}
                    className={cn(
                      'h-10 pl-9 bg-background/60 border-border text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary/60 transition-all duration-150',
                      emailError &&
                        'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/20'
                    )}
                  />
                </div>
                {emailError && (
                  <p className="text-[11px] text-destructive" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="login-password"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(passwordError)}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (passwordError) {
                        setPasswordError(null)
                      }
                      if (formError) {
                        setFormError(null)
                      }
                    }}
                    className={cn(
                      'h-10 pl-9 pr-10 bg-background/60 border-border text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary/60 transition-all duration-150',
                      passwordError &&
                        'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/20'
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isSubmitting}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordError && (
                  <p className="text-[11px] text-destructive" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-session"
                    checked={rememberSession}
                    disabled={isSubmitting}
                    onCheckedChange={(checked) => setRememberSession(Boolean(checked))}
                  />
                  <Label
                    htmlFor="remember-session"
                    className="text-xs font-normal text-muted-foreground cursor-pointer select-none"
                  >
                    Recordar sesión
                  </Label>
                </div>

                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleOpenResetModal}
                  className="h-auto p-0 text-xs font-medium text-primary hover:text-primary/80"
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-sm transition-all duration-150 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>Ingresar</span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-1 pb-5">
            {onBypassLogin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBypassLogin}
                disabled={isSubmitting}
                className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground border-dashed border-border transition-all duration-150"
              >
                <span>Entrar sin login (temporal)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground text-center">
              Acceso restringido al personal autorizado
            </p>
          </CardFooter>
        </Card>
      </main>

      {/* Modal de recuperacion de contraseña */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Recuperar contraseña
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ingresa tu correo institucional dado de alta para enviarte un enlace de restablecimiento.
            </DialogDescription>
          </DialogHeader>

          {resetSentTo ? (
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Solicitud enviada</p>
                  <p className="text-muted-foreground">
                    Si <span className="font-mono text-foreground">{resetSentTo}</span> está registrado y activo, recibirás un correo con los pasos para definir una nueva contraseña.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs"
                >
                  Entendido
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="reset-email"
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Correo electrónico institucional
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="usuario@uas.edu.mx"
                    value={resetEmail}
                    disabled={isSendingReset}
                    aria-invalid={Boolean(resetEmailError)}
                    onChange={(event) => {
                      setResetEmail(event.target.value)
                      if (resetEmailError) {
                        setResetEmailError(null)
                      }
                    }}
                    className={cn(
                      'h-10 pl-9 bg-background/60 border-border text-sm',
                      resetEmailError && 'border-destructive/60'
                    )}
                  />
                </div>
                {resetEmailError && (
                  <p className="text-[11px] text-destructive" role="alert">
                    {resetEmailError}
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetModalOpen(false)}
                  disabled={isSendingReset}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSendingReset}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs gap-2"
                >
                  {isSendingReset ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>Enviar enlace</span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de definicion de nueva contraseña tras enlace de recuperacion */}
      <Dialog
        open={isPasswordRecovery}
        onOpenChange={(open) => {
          if (!open) {
            onClearPasswordRecovery?.()
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Definir nueva contraseña
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ingresa tu nueva contraseña institucional (mínimo 8 caracteres).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePasswordSubmit} noValidate className="space-y-4">
            {recoveryPasswordError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{recoveryPasswordError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="recovery-new-password"
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Nueva contraseña
              </Label>
              <Input
                id="recovery-new-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={newPassword}
                disabled={isUpdatingPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  if (recoveryPasswordError) {
                    setRecoveryPasswordError(null)
                  }
                }}
                className="h-10 bg-background/60 border-border text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="recovery-confirm-password"
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Confirmar contraseña
              </Label>
              <Input
                id="recovery-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                disabled={isUpdatingPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  if (recoveryPasswordError) {
                    setRecoveryPasswordError(null)
                  }
                }}
                className="h-10 bg-background/60 border-border text-sm"
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isUpdatingPassword}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs gap-2"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <span>Guardar contraseña</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LoginPage
