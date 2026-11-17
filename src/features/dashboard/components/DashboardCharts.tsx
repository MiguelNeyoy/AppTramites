import * as React from 'react'
import { BarChart2, Layers } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  MONTHLY_METRICS_BY_NIVEL,
  QUINCENAL_METRICS_BY_NIVEL,
  TRAMITE_DISTRIBUTION,
  type NivelFilter,
} from './dashboardMockData'

interface DashboardChartsProps {
  nivel: NivelFilter
}

export function DashboardCharts({ nivel }: DashboardChartsProps) {
  const [chartMode, setChartMode] = React.useState<'mensual' | 'quincenal' | 'nivel'>('mensual')
  const [hoveredMes, setHoveredMes] = React.useState<string | null>(null)

  const monthlyData = MONTHLY_METRICS_BY_NIVEL[nivel]
  const quincenalData = QUINCENAL_METRICS_BY_NIVEL[nivel]

  const maxMensual = Math.max(
    ...monthlyData.map((point) => Math.max(point.enviadas, point.resueltas)),
    100
  )
  const yAxisMax = Math.ceil(maxMensual / 100) * 100

  const maxQuincenal = Math.max(
    ...quincenalData.map((point) =>
      Math.max(point.q1Enviadas, point.q2Enviadas)
    ),
    50
  )
  const yAxisQuincenalMax = Math.ceil(maxQuincenal / 50) * 50

  const highlightedPoint =
    monthlyData.find((point) => point.mes === hoveredMes) ??
    monthlyData[monthlyData.length - 1]

  const highlightedQuincenal =
    quincenalData.find((point) => point.mes === hoveredMes) ??
    quincenalData[quincenalData.length - 1]

  const totalTramitesDistribucion = TRAMITE_DISTRIBUTION.reduce(
    (sum, item) => sum + item.total,
    0
  )

  const levelTotals = (['BACHILLERATO', 'LICENCIATURA'] as const).map((lvl) => {
    const rows = MONTHLY_METRICS_BY_NIVEL[lvl]
    const enviadas = rows.reduce((acc, r) => acc + r.enviadas, 0)
    const resueltas = rows.reduce((acc, r) => acc + r.resueltas, 0)
    const pendientes = rows.reduce((acc, r) => acc + r.pendientes, 0)
    const conError = rows.reduce((acc, r) => acc + r.conError, 0)
    return {
      nivel: lvl === 'BACHILLERATO' ? 'Bachillerato' : 'Licenciatura',
      enviadas,
      resueltas,
      pendientes,
      conError,
      tasa: enviadas > 0 ? Math.round((resueltas / enviadas) * 1000) / 10 : 0,
    }
  })

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Gráfica 1: Evolución Mensual, Cierre Quincenal o Comparativa por Nivel */}
      <Card className="lg:col-span-7 border-border bg-card shadow-sm dark:shadow-none">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <BarChart2 className="h-4 w-4 text-primary" />
              <span>Volumen de Trámites en el Periodo</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {chartMode === 'quincenal'
                ? 'Cierre Quincenal: Q1 (días 1-15) vs. Q2 (días 16-fin de mes)'
                : 'Comparativa de solicitudes enviadas frente a resueltas'}
            </CardDescription>
          </div>

          <Tabs
            value={chartMode}
            onValueChange={(value) =>
              setChartMode(value as 'mensual' | 'quincenal' | 'nivel')
            }
          >
            <TabsList className="h-8 bg-secondary/70 p-0.5">
              <TabsTrigger value="mensual" className="h-7 px-2.5 text-xs">
                Mensual
              </TabsTrigger>
              <TabsTrigger value="quincenal" className="h-7 px-2.5 text-xs">
                Quincenal (Q1/Q2)
              </TabsTrigger>
              <TabsTrigger value="nivel" className="h-7 px-2.5 text-xs">
                Por Nivel
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {chartMode === 'mensual' && (
            <div className="space-y-4">
              {/* Banda resumen interactiva al pasar el cursor */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-secondary/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    Mes: {highlightedPoint.mes}
                  </span>
                  <Badge variant="outline" className="font-mono tabular-nums text-[10px]">
                    {Math.round(
                      (highlightedPoint.resueltas / Math.max(highlightedPoint.enviadas, 1)) * 1000
                    ) / 10}
                    % resolución
                  </Badge>
                </div>

                <div className="flex items-center gap-4 font-mono tabular-nums text-[11px]">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span className="h-2 w-2 rounded-sm bg-chart-1" />
                    Env: {highlightedPoint.enviadas}
                  </span>
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span className="h-2 w-2 rounded-sm bg-chart-3" />
                    Res: {highlightedPoint.resueltas}
                  </span>
                  <span className="text-muted-foreground">
                    Pend: {highlightedPoint.pendientes}
                  </span>
                </div>
              </div>

              {/* Gráfica de barras con escala Y y líneas guía */}
              <div className="relative flex h-56 items-end gap-2 pt-4">
                <div className="flex h-full flex-col justify-between pb-6 pr-2 text-right font-mono tabular-nums text-[10px] text-muted-foreground">
                  <span>{yAxisMax}</span>
                  <span>{Math.round(yAxisMax * 0.75)}</span>
                  <span>{Math.round(yAxisMax * 0.5)}</span>
                  <span>{Math.round(yAxisMax * 0.25)}</span>
                  <span>0</span>
                </div>

                <div className="relative flex-1 h-full pb-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between"
                  >
                    {[0, 1, 2, 3, 4].map((tick) => (
                      <div
                        key={tick}
                        className="w-full border-t border-dashed border-border/70"
                      />
                    ))}
                  </div>

                  <div className="relative z-10 grid h-full grid-cols-5 items-end gap-3 px-2 sm:px-4">
                    {monthlyData.map((point) => {
                      const envPct = Math.max((point.enviadas / yAxisMax) * 100, 4)
                      const resPct = Math.max((point.resueltas / yAxisMax) * 100, 4)
                      const isActive = hoveredMes === point.mes
                      return (
                        <div
                          key={point.mes}
                          onMouseEnter={() => setHoveredMes(point.mes)}
                          onMouseLeave={() => setHoveredMes(null)}
                          className={cn(
                            'group flex h-full flex-col items-center justify-end rounded-md px-1 transition-colors duration-150',
                            isActive && 'bg-secondary/50'
                          )}
                        >
                          <div className="flex h-full w-full items-end justify-center gap-1.5 pt-2">
                            <div
                              style={{ height: `${envPct}%` }}
                              className="w-4 sm:w-5 rounded-t bg-chart-1 transition-all duration-150 group-hover:opacity-90"
                              title={`Enviadas (${point.mes}): ${point.enviadas}`}
                            />
                            <div
                              style={{ height: `${resPct}%` }}
                              className="w-4 sm:w-5 rounded-t bg-chart-3 transition-all duration-150 group-hover:opacity-90"
                              title={`Resueltas (${point.mes}): ${point.resueltas}`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-5 gap-3 px-2 pt-2 text-center sm:px-4">
                    {monthlyData.map((point) => (
                      <span
                        key={point.mes}
                        className={cn(
                          'font-mono text-[11px]',
                          hoveredMes === point.mes
                            ? 'font-bold text-primary'
                            : 'text-muted-foreground'
                        )}
                      >
                        {point.mes}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {chartMode === 'quincenal' && (
            <div className="space-y-4">
              {/* Banda resumen de Cierre Quincenal (Q1 y Q2) */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-secondary/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    Cierre {highlightedQuincenal.mes}
                  </span>
                  <Badge variant="outline" className="font-mono tabular-nums text-[10px]">
                    Total: {highlightedQuincenal.q1Enviadas + highlightedQuincenal.q2Enviadas} env.
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums text-[11px]">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span className="h-2 w-2 rounded-sm bg-chart-1" />
                    Q1 (1-15): {highlightedQuincenal.q1Enviadas} env / {highlightedQuincenal.q1Resueltas} res
                  </span>
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span className="h-2 w-2 rounded-sm bg-chart-4" />
                    Q2 (16-Fin): {highlightedQuincenal.q2Enviadas} env / {highlightedQuincenal.q2Resueltas} res
                  </span>
                </div>
              </div>

              {/* Gráfica de barras Q1 vs Q2 por mes */}
              <div className="relative flex h-56 items-end gap-2 pt-4">
                <div className="flex h-full flex-col justify-between pb-6 pr-2 text-right font-mono tabular-nums text-[10px] text-muted-foreground">
                  <span>{yAxisQuincenalMax}</span>
                  <span>{Math.round(yAxisQuincenalMax * 0.75)}</span>
                  <span>{Math.round(yAxisQuincenalMax * 0.5)}</span>
                  <span>{Math.round(yAxisQuincenalMax * 0.25)}</span>
                  <span>0</span>
                </div>

                <div className="relative flex-1 h-full pb-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between"
                  >
                    {[0, 1, 2, 3, 4].map((tick) => (
                      <div
                        key={tick}
                        className="w-full border-t border-dashed border-border/70"
                      />
                    ))}
                  </div>

                  <div className="relative z-10 grid h-full grid-cols-5 items-end gap-3 px-2 sm:px-4">
                    {quincenalData.map((point) => {
                      const q1Pct = Math.max(
                        (point.q1Enviadas / yAxisQuincenalMax) * 100,
                        4
                      )
                      const q2Pct = Math.max(
                        (point.q2Enviadas / yAxisQuincenalMax) * 100,
                        4
                      )
                      const isActive = hoveredMes === point.mes
                      return (
                        <div
                          key={point.mes}
                          onMouseEnter={() => setHoveredMes(point.mes)}
                          onMouseLeave={() => setHoveredMes(null)}
                          className={cn(
                            'group flex h-full flex-col items-center justify-end rounded-md px-1 transition-colors duration-150',
                            isActive && 'bg-secondary/50'
                          )}
                        >
                          <div className="flex h-full w-full items-end justify-center gap-1.5 pt-2">
                            <div
                              style={{ height: `${q1Pct}%` }}
                              className="w-4 sm:w-5 rounded-t bg-chart-1 transition-all duration-150 group-hover:opacity-90"
                              title={`${point.mes} Q1: ${point.q1Enviadas} enviadas (${point.q1Resueltas} resueltas)`}
                            />
                            <div
                              style={{ height: `${q2Pct}%` }}
                              className="w-4 sm:w-5 rounded-t bg-chart-4 transition-all duration-150 group-hover:opacity-90"
                              title={`${point.mes} Q2: ${point.q2Enviadas} enviadas (${point.q2Resueltas} resueltas)`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-5 gap-3 px-2 pt-2 text-center sm:px-4">
                    {quincenalData.map((point) => (
                      <span
                        key={point.mes}
                        className={cn(
                          'font-mono text-[11px]',
                          hoveredMes === point.mes
                            ? 'font-bold text-primary'
                            : 'text-muted-foreground'
                        )}
                      >
                        {point.mes} (Q1/Q2)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {chartMode === 'nivel' && (
            /* Vista comparativa por nivel educativo */
            <div className="space-y-4 pt-2">
              {levelTotals.map((item) => {
                const resWidth = Math.round((item.resueltas / Math.max(item.enviadas, 1)) * 100)
                const pendWidth = Math.round((item.pendientes / Math.max(item.enviadas, 1)) * 100)
                const errWidth = Math.max(100 - resWidth - pendWidth, 0)
                return (
                  <div
                    key={item.nivel}
                    className="space-y-2 rounded-lg border border-border bg-secondary/25 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{item.nivel}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Efectividad de resolución en el periodo
                        </p>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <span className="text-lg font-bold text-foreground">
                          {item.enviadas.toLocaleString('es-MX')}
                        </span>
                        <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.tasa}%
                        </span>
                      </div>
                    </div>

                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        style={{ width: `${resWidth}%` }}
                        className="bg-chart-3 transition-all duration-150"
                        title={`Resueltas: ${item.resueltas}`}
                      />
                      <div
                        style={{ width: `${pendWidth}%` }}
                        className="bg-chart-4 transition-all duration-150"
                        title={`Pendientes: ${item.pendientes}`}
                      />
                      <div
                        style={{ width: `${errWidth}%` }}
                        className="bg-destructive transition-all duration-150"
                        title={`Con error: ${item.conError}`}
                      />
                    </div>

                    <div className="flex flex-wrap gap-4 font-mono tabular-nums text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-chart-3" />
                        Resueltas: {item.resueltas}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-chart-4" />
                        Pendientes: {item.pendientes}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-destructive" />
                        Con error: {item.conError}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfica 2: Distribución por Tipo de Trámite */}
      <Card className="lg:col-span-5 border-border bg-card shadow-sm dark:shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Layers className="h-4 w-4 text-primary" />
              <span>Distribución por Trámite</span>
            </CardTitle>
            <Badge variant="secondary" className="font-mono tabular-nums text-[10px]">
              9 tipos oficiales
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Participación global sobre {totalTramitesDistribucion.toLocaleString('es-MX')}{' '}
            solicitudes registradas
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barra proporcional apilada */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
            {TRAMITE_DISTRIBUTION.map((item) => {
              const pct = (item.total / totalTramitesDistribucion) * 100
              return (
                <div
                  key={item.id}
                  style={{ width: `${pct}%` }}
                  className={cn(item.chartTokenClass, 'transition-all duration-150')}
                  title={`${item.nombre}: ${item.total}`}
                />
              )
            })}
          </div>

          {/* Lista detallada con barras de progreso */}
          <div className="space-y-3">
            {TRAMITE_DISTRIBUTION.map((item) => {
              const pct = Math.round((item.total / totalTramitesDistribucion) * 1000) / 10
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', item.chartTokenClass)}
                      />
                      <span className="truncate font-medium text-foreground">
                        {item.nombre}
                      </span>
                    </div>
                    <div className="shrink-0 font-mono tabular-nums text-[11px]">
                      <span className="font-semibold text-foreground">{item.total}</span>
                      <span className="ml-1.5 text-muted-foreground">({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      style={{ width: `${pct}%` }}
                      className={cn(item.chartTokenClass, 'h-full rounded-full transition-all duration-150')}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
