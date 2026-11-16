import * as React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  Inbox,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ChecklistActasView } from '@/features/actas'
import { TramiteRegistroModal } from '@/features/tramites'
import { DashboardCharts } from './DashboardCharts'
import { DashboardSidebar, type DashboardNavId } from './DashboardSidebar'
import {
  CHECKLIST_ACTAS_SUMMARY,
  MONTHLY_METRICS_BY_NIVEL,
  PERIODOS_DISPONIBLES,
  SEGUIMIENTOS_RECIENTES,
  type NivelFilter,
  type SeguimientoSummaryRow,
} from './dashboardMockData'

interface DashboardPageProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onLogout: () => void
}

export function DashboardPage({
  theme,
  onToggleTheme,
  onLogout,
}: DashboardPageProps) {
  const [activeNav, setActiveNav] = React.useState<DashboardNavId>('dashboard')
  const [nivel, setNivel] = React.useState<NivelFilter>('TODOS')
  const [periodoId, setPeriodoId] = React.useState<string>(PERIODOS_DISPONIBLES[0].id)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [tramiteFilter, setTramiteFilter] = React.useState('TODOS')
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [registroModalOpen, setRegistroModalOpen] = React.useState(false)
  const [seguimientosRows, setSeguimientosRows] = React.useState<
    SeguimientoSummaryRow[]
  >(() => SEGUIMIENTOS_RECIENTES)

  // Métricas globales agregadas según división seleccionada
  const monthlyPoints = MONTHLY_METRICS_BY_NIVEL[nivel]
  const totalEnviadas = monthlyPoints.reduce((acc, p) => acc + p.enviadas, 0)
  const totalResueltas = monthlyPoints.reduce((acc, p) => acc + p.resueltas, 0)
  const totalPendientes = monthlyPoints.reduce((acc, p) => acc + p.pendientes, 0)
  const totalConError = monthlyPoints.reduce((acc, p) => acc + p.conError, 0)

  const tasaResueltas =
    totalEnviadas > 0 ? Math.round((totalResueltas / totalEnviadas) * 1000) / 10 : 0
  const tasaPendientes =
    totalEnviadas > 0 ? Math.round((totalPendientes / totalEnviadas) * 1000) / 10 : 0
  const tasaError =
    totalEnviadas > 0 ? Math.round((totalConError / totalEnviadas) * 1000) / 10 : 0

  const filteredRows = seguimientosRows.filter((row) => {
    const matchesNivel = nivel === 'TODOS' || row.nivel === nivel
    const matchesTramite =
      tramiteFilter === 'TODOS' || row.tipoTramite === tramiteFilter
    const q = searchQuery.trim().toLowerCase()
    const matchesQuery =
      !q ||
      row.claveUa.toLowerCase().includes(q) ||
      row.unidadAcademica.toLowerCase().includes(q) ||
      row.programa.toLowerCase().includes(q)
    return matchesNivel && matchesTramite && matchesQuery
  })

  const uniqueTramites = Array.from(
    new Set(seguimientosRows.map((row) => row.tipoTramite))
  )

  const handleSelectNav = (id: DashboardNavId) => {
    setActiveNav(id)
    if (id === 'tramites') {
      setRegistroModalOpen(true)
      return
    }
    if (id !== 'dashboard' && id !== 'actas') {
      toast.info('Vista en diseño para próximos issues; mostrando resumen global.')
    }
  }

  const handleRegisterCutPreview = () => {
    setRegistroModalOpen(true)
  }

  const handleAddRows = (newRows: SeguimientoSummaryRow[]) => {
    setSeguimientosRows((prev) => [...newRows, ...prev])
  }

  const handleExportPreview = () => {
    toast.success('Vista previa lista; exportación .xlsx con ExcelJS en módulo de reportes.')
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-150">
      <DashboardSidebar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        nivel={nivel}
        onNivelChange={setNivel}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar de trabajo (PWA responsive, sin botones nativos de escritorio) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
              className="h-8 w-8 lg:hidden text-muted-foreground"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {activeNav === 'actas' ? 'Checklist de Actas' : 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de periodo escolar */}
            <div className="hidden md:block w-60">
              <Select value={periodoId} onValueChange={setPeriodoId}>
                <SelectTrigger className="h-8 bg-background text-xs font-mono">
                  <SelectValue placeholder="Periodo escolar" />
                </SelectTrigger>
                <SelectContent>
                  {PERIODOS_DISPONIBLES.map((periodo) => (
                    <SelectItem
                      key={periodo.id}
                      value={periodo.id}
                      className="text-xs font-mono"
                    >
                      {periodo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onToggleTheme}
              aria-label="Cambiar tema"
              className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all duration-150"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-uas-gold" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Único CTA primario dorado por vista principal */}
            <Button
              type="button"
              size="sm"
              onClick={handleRegisterCutPreview}
              className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs shadow-sm transition-all duration-150"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Registrar Corte</span>
              <span className="sm:hidden">Corte</span>
            </Button>
          </div>
        </header>

        {/* Área principal de métricas, gráficas y desglose */}
        <main className="flex-1 overflow-y-auto space-y-5 p-4 sm:p-6">
          {activeNav === 'actas' ? (
            <ChecklistActasView nivel={nivel} />
          ) : (
            <>
              {/* Fila 1: 4 Tarjetas KPI */}
          <section
            aria-label="Indicadores globales"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Card className="border-border bg-card shadow-sm dark:shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Total Enviadas
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <Inbox className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono tabular-nums text-2xl font-bold">
                    {totalEnviadas.toLocaleString('es-MX')}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/20 bg-emerald-500/10 font-mono tabular-nums text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    +12.5%
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Acumulado en cortes del periodo
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm dark:shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Resueltas
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono tabular-nums text-2xl font-bold">
                    {totalResueltas.toLocaleString('es-MX')}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/20 bg-emerald-500/10 font-mono tabular-nums text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    {tasaResueltas}%
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Efectividad global de atención
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm dark:shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Pendientes
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono tabular-nums text-2xl font-bold">
                    {totalPendientes.toLocaleString('es-MX')}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-amber-500/20 bg-amber-500/10 font-mono tabular-nums text-[10px] font-bold text-amber-600 dark:text-amber-400"
                  >
                    {tasaPendientes}%
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  En proceso en ventanilla URS
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm dark:shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Con Error
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono tabular-nums text-2xl font-bold text-destructive">
                    {totalConError.toLocaleString('es-MX')}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-destructive/20 bg-destructive/10 font-mono tabular-nums text-[10px] font-bold text-destructive"
                  >
                    {tasaError}%
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Solicitudes con observaciones
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Fila 2: Gráficas globales */}
          <DashboardCharts nivel={nivel} />

          {/* Fila 3: Desglose por Unidad Académica + Estado de Actas */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Tabla densa de seguimientos recientes */}
            <Card className="lg:col-span-8 border-border bg-card shadow-sm dark:shadow-none">
              <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    Cortes Recientes por Unidad Académica
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Conteo numérico por lote sin captura individual
                  </CardDescription>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportPreview}
                  className="h-8 gap-1.5 self-start border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold text-xs transition-all duration-150 sm:self-auto"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Exportar .xlsx</span>
                </Button>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Barra de filtros */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por clave UA, escuela o carrera..."
                      className="h-8 bg-background pl-8 text-xs"
                    />
                  </div>

                  <div className="w-full sm:w-52">
                    <Select value={tramiteFilter} onValueChange={setTramiteFilter}>
                      <SelectTrigger className="h-8 bg-background text-xs">
                        <SelectValue placeholder="Todos los trámites" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS" className="text-xs">
                          Todos los trámites
                        </SelectItem>
                        {uniqueTramites.map((nombre) => (
                          <SelectItem key={nombre} value={nombre} className="text-xs">
                            {nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tabla densa */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-secondary/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                          Clave UA
                        </TableHead>
                        <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                          Unidad y Programa
                        </TableHead>
                        <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                          Trámite
                        </TableHead>
                        <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-widest">
                          Env.
                        </TableHead>
                        <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-widest">
                          Res.
                        </TableHead>
                        <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-widest">
                          Pend.
                        </TableHead>
                        <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-widest">
                          Error
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-8 text-center text-xs text-muted-foreground"
                          >
                            No hay registros que coincidan con el filtro aplicado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRows.map((row) => (
                          <TableRow
                            key={row.id}
                            className="h-10 hover:bg-secondary/30 transition-colors duration-150"
                          >
                            <TableCell className="py-2">
                              <Badge
                                variant="secondary"
                                className="font-mono tabular-nums text-[10px] font-bold"
                              >
                                {row.claveUa}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="leading-tight">
                                <p className="text-xs font-semibold text-foreground">
                                  {row.unidadAcademica}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {row.programa}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground">
                              {row.tipoTramite}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono tabular-nums text-xs font-semibold">
                              {row.enviadas}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono tabular-nums text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {row.resueltas}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono tabular-nums text-xs text-amber-600 dark:text-amber-400">
                              {row.pendientes}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2 py-0.5 font-mono tabular-nums text-[11px] font-semibold',
                                  row.conError > 0
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-secondary text-muted-foreground'
                                )}
                              >
                                {row.conError}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Resumen de Checklist de Actas */}
            <Card className="lg:col-span-4 border-border bg-card shadow-sm dark:shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  <span>Avance Checklist de Actas</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Estado semestral sobre 68 programas educativos
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {CHECKLIST_ACTAS_SUMMARY.map((acta) => {
                  const genPct = Math.round((acta.generadas / acta.totalProgramas) * 100)
                  const pendPct = Math.round((acta.pendientes / acta.totalProgramas) * 100)
                  const naPct = Math.max(100 - genPct - pendPct, 0)

                  return (
                    <div
                      key={acta.tipo}
                      className="space-y-2 rounded-lg border border-border/80 bg-secondary/25 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {acta.etiqueta}
                        </span>
                        <span className="font-mono tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {genPct}%
                        </span>
                      </div>

                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          style={{ width: `${genPct}%` }}
                          className="bg-emerald-500 transition-all duration-150"
                        />
                        <div
                          style={{ width: `${pendPct}%` }}
                          className="bg-amber-500 transition-all duration-150"
                        />
                        <div
                          style={{ width: `${naPct}%` }}
                          className="bg-muted-foreground/30 transition-all duration-150"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono tabular-nums text-[10px] text-muted-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Generadas: {acta.generadas}
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                          Pendientes: {acta.pendientes}
                        </span>
                        <span>N/A: {acta.noAplica}</span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </section>
            </>
          )}
        </main>
      </div>

      {/* Modal de Registro de Trámites (Issue #4) */}
      <TramiteRegistroModal
        open={registroModalOpen}
        onOpenChange={setRegistroModalOpen}
        nivel={nivel}
        onRegisterRows={handleAddRows}
      />
    </div>
  )
}

export default DashboardPage
