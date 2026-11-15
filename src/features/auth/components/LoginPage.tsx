import * as React from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Moon, Sun } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginPageProps {
  theme?: 'light' | 'dark'
  onToggleTheme?: () => void
  onBypassLogin?: () => void
}

const FEATURES = [
  '9 Trámites Oficiales y Nuevo Ingreso',
  'Licenciatura, Bachillerato y Admisión',
  'Checklist de Actas y Cortes Quincenales',
] as const

export function LoginPage({
  theme = 'light',
  onToggleTheme,
  onBypassLogin,
}: LoginPageProps) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [rememberSession, setRememberSession] = React.useState(false)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Interfaz visual únicamente (Issue #2); la lógica de autenticación se integra en Issue #1.
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-10 pl-9 bg-background/60 border-border text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary/60 transition-all duration-150"
                  />
                </div>
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
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-10 pl-9 pr-10 bg-background/60 border-border text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary/60 transition-all duration-150"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
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
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-session"
                    checked={rememberSession}
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
                  className="h-auto p-0 text-xs font-medium text-primary hover:text-primary/80"
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-sm transition-all duration-150"
              >
                Ingresar
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
    </div>
  )
}

export default LoginPage
