import * as React from 'react'
import {
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  FileEdit,
  Filter,
  Plus,
  Search,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { NivelFilter } from '@/features/dashboard/components/dashboardMockData'
import { EditarTramitesProgramaModal } from './EditarTramitesProgramaModal'
import {
  TIPOS_ACTA_TABS,
  UNIDADES_ACADEMICAS_CATALOGO,
  buildInitialProgramasChecklist,
  type ProgramaChecklistItem,
  type TipoActaKey,
  type TramiteConteoPrograma,
} from './actasMockData'

interface ChecklistActasViewProps {
  nivel: NivelFilter
}

interface EditingTargetState {
  unidadClave: string
  unidadNombre: string
  programaId: number
}

export function ChecklistActasView({ nivel }: ChecklistActasViewProps) {
  const [tipoActa, setTipoActa] = React.useState<TipoActaKey>('ORDINARIA')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [soloPendientes, setSoloPendientes] = React.useState(false)
  const [programasState, setProgramasState] = React.useState<ProgramaChecklistItem[]>(
    () => buildInitialProgramasChecklist()
  )
  const [expandedUnidades, setExpandedUnidades] = React.useState<Record<number, boolean>>(
    () => ({ 6: true })
  )
  const [editingTarget, setEditingTarget] = React.useState<EditingTargetState | null>(
    null
  )

  const toggleExpandUnidad = (unidadId: number) => {
    setExpandedUnidades((prev) => ({
      ...prev,
      [unidadId]: !prev[unidadId],
    }))
  }

  const handleToggleProgramaActa = (programaId: number, checked: boolean) => {
    setProgramasState((prev) =>
      prev.map((item) =>
        item.programaId === programaId
          ? {
              ...item,
              actasResueltas: {
                ...item.actasResueltas,
                [tipoActa]: checked,
              },
            }
          : item
      )
    )
  }

  const handleToggleAllUnidad = (
    unidadId: number,
    unidadNombre: string,
    targetChecked: boolean
  ) => {
    setProgramasState((prev) =>
      prev.map((item) =>
        item.unidadAcademicaId === unidadId
          ? {
              ...item,
              actasResueltas: {
                ...item.actasResueltas,
                [tipoActa]: targetChecked,
              },
            }
          : item
      )
    )
    toast.success(
      targetChecked
        ? `Todas las carreras de ${unidadNombre} marcadas como resueltas (movida a columna de completadas).`
        : `Carreras de ${unidadNombre} devueltas a pendientes.`
    )
  }

  const handleSaveConteoModal = (
    programaId: number,
    conteo: TramiteConteoPrograma
  ) => {
    setProgramasState((prev) =>
      prev.map((item) =>
        item.programaId === programaId
          ? {
              ...item,
              tramitesPorTipo: {
                ...item.tramitesPorTipo,
                [conteo.tipoTramiteId]: conteo,
              },
            }
          : item
      )
    )
  }

  const unidadesAgrupadas = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return UNIDADES_ACADEMICAS_CATALOGO.filter(
      (ua) => nivel === 'TODOS' || ua.nivel === nivel
    )
      .map((ua) => {
        const programas = programasState.filter(
          (p) => p.unidadAcademicaId === ua.id
        )
        const resueltosCount = programas.filter(
          (p) => p.actasResueltas[tipoActa]
        ).length
        const totalCount = programas.length
        const todoResuelto = totalCount > 0 && resueltosCount === totalCount

        const matchesSearch =
          !q ||
          ua.claveUa.toLowerCase().includes(q) ||
          ua.nombre.toLowerCase().includes(q) ||
          programas.some(
            (p) =>
              p.nombrePrograma.toLowerCase().includes(q) ||
              p.clavePrograma.toLowerCase().includes(q)
          )

        return {
          unidad: ua,
          programas,
          resueltosCount,
          totalCount,
          todoResuelto,
          matchesSearch,
        }
      })
      .filter((group) => group.matchesSearch && group.totalCount > 0)
  }, [nivel, programasState, searchQuery, tipoActa])

  const listaPendientes = unidadesAgrupadas.filter((g) => !g.todoResuelto)
  const listaResueltas = unidadesAgrupadas.filter((g) => g.todoResuelto)

  const totalProgramasVisibles = unidadesAgrupadas.reduce(
    (acc, g) => acc + g.totalCount,
    0
  )
  const totalResueltosVisibles = unidadesAgrupadas.reduce(
    (acc, g) => acc + g.resueltosCount,
    0
  )
  const avancePorcentaje =
    totalProgramasVisibles > 0
      ? Math.round((totalResueltosVisibles / totalProgramasVisibles) * 100)
      : 0

  const activeEditingPrograma = editingTarget
    ? programasState.find((p) => p.programaId === editingTarget.programaId) ?? null
    : null

  const renderUnidadItem = (
    group: (typeof unidadesAgrupadas)[number],
    isResolvedList: boolean
  ) => {
    const isExpanded = Boolean(expandedUnidades[group.unidad.id])
    const programasParaMostrar =
      soloPendientes && !isResolvedList
        ? group.programas.filter((p) => !p.actasResueltas[tipoActa])
        : group.programas

    return (
      <div
        key={group.unidad.id}
        className={cn(
          'rounded-xl border transition-all duration-150 overflow-hidden',
          isResolvedList
            ? 'border-border/60 bg-muted/40 text-muted-foreground opacity-80'
            : 'border-border bg-card text-foreground shadow-sm dark:shadow-none'
        )}
      >
        {/* Cabecera de la Facultad / Unidad Académica (Toggle list) */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-3">
          <button
            type="button"
            onClick={() => toggleExpandUnidad(group.unidad.id)}
            aria-expanded={isExpanded}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus:outline-none"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}

            <Badge
              variant={isResolvedList ? 'outline' : 'secondary'}
              className="font-mono tabular-nums text-[10px] font-bold shrink-0"
            >
              {group.unidad.claveUa}
            </Badge>

            <span
              className={cn(
                'truncate text-xs font-bold sm:text-sm',
                isResolvedList && 'line-through decoration-muted-foreground/50'
              )}
            >
              {group.unidad.nombre}
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
              {group.resueltosCount}/{group.totalCount}
            </span>

            <Button
              type="button"
              variant={isResolvedList ? 'ghost' : 'outline'}
              size="sm"
              onClick={() =>
                handleToggleAllUnidad(
                  group.unidad.id,
                  group.unidad.nombre,
                  !isResolvedList
                )
              }
              className="h-7 gap-1 px-2.5 text-[11px] font-semibold"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>{isResolvedList ? 'Reabrir' : 'Todo'}</span>
            </Button>
          </div>
        </div>

        {/* Lista de Programas Educativos "escondidos" (Toggle list) */}
        {isExpanded && (
          <div
            className={cn(
              'divide-y divide-border/60 border-t border-border/70 px-3.5 py-1.5',
              isResolvedList ? 'bg-muted/30' : 'bg-secondary/20'
            )}
          >
            {programasParaMostrar.map((prog) => {
              const isChecked = prog.actasResueltas[tipoActa]
              const conteosList = Object.values(prog.tramitesPorTipo)
              const totalEnviadasProg = conteosList.reduce(
                (s, c) => s + c.enviadas,
                0
              )
              const totalResueltasProg = conteosList.reduce(
                (s, c) => s + c.resueltas,
                0
              )

              return (
                <div
                  key={prog.programaId}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Checkbox
                      id={`chk-acta-${prog.programaId}`}
                      checked={isChecked}
                      onCheckedChange={(val) =>
                        handleToggleProgramaActa(prog.programaId, Boolean(val))
                      }
                    />
                    <label
                      htmlFor={`chk-acta-${prog.programaId}`}
                      className={cn(
                        'cursor-pointer select-none truncate text-xs font-medium',
                        isChecked
                          ? 'line-through text-muted-foreground'
                          : 'text-foreground'
                      )}
                    >
                      <span className="mr-1.5 font-mono tabular-nums font-semibold text-muted-foreground">
                        {prog.clavePrograma} -
                      </span>
                      {prog.nombrePrograma}
                    </label>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {totalEnviadasProg > 0 && (
                      <Badge
                        variant="outline"
                        className="font-mono tabular-nums text-[10px] text-muted-foreground"
                      >
                        Env: {totalEnviadasProg} &middot; Res: {totalResueltasProg}
                      </Badge>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditingTarget({
                          unidadClave: group.unidad.claveUa,
                          unidadNombre: group.unidad.nombre,
                          programaId: prog.programaId,
                        })
                      }
                      className="h-7 gap-1 px-2 text-[11px]"
                    >
                      {totalEnviadasProg > 0 ? (
                        <>
                          <FileEdit className="h-3 w-3 text-primary" />
                          <span>Editar trámites</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 text-primary" />
                          <span>Trámite</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Encabezado y controles superiores */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Checklist Semestral de Actas
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Despliega cada unidad académica para marcar actas por programa educativo o editar sus trámites en modal.
          </p>
        </div>

        <Tabs
          value={tipoActa}
          onValueChange={(value) => setTipoActa(value as TipoActaKey)}
        >
          <TabsList className="h-9 bg-secondary/70 p-1">
            {TIPOS_ACTA_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-7 px-3 text-xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Barra de búsqueda, filtro rápido "Solo pendientes" y avance */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm dark:shadow-none lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por clave UA, facultad, preparatoria o carrera..."
              className="h-8 bg-background pl-8 text-xs"
            />
          </div>

          {/* Filtro rápido: Ocultar completadas / Ver solo pendientes */}
          <div className="flex items-center gap-2 self-start rounded-lg border border-border bg-secondary/40 px-3 py-1.5 sm:self-auto">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <Label
              htmlFor="switch-solo-pendientes"
              className="cursor-pointer text-xs font-medium text-foreground select-none"
            >
              Ocultar completadas / Ver solo pendientes
            </Label>
            <Switch
              id="switch-solo-pendientes"
              checked={soloPendientes}
              onCheckedChange={setSoloPendientes}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-xs">
          <Badge
            variant="outline"
            className="border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          >
            Pendientes: {listaPendientes.length} escuelas
          </Badge>
          <Badge
            variant="outline"
            className="border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            Resueltas: {listaResueltas.length} escuelas
          </Badge>
          <span className="text-muted-foreground">
            Avance:{' '}
            <strong className="text-foreground">
              {totalResueltosVisibles}/{totalProgramasVisibles} ({avancePorcentaje}%)
            </strong>
          </span>
        </div>
      </div>

      {/* Dos listas: Pendientes vs. Resueltas (o solo Pendientes cuando el filtro rápido está activo) */}
      <div
        className={cn(
          'grid grid-cols-1 gap-5',
          !soloPendientes && 'lg:grid-cols-2'
        )}
      >
        {/* Lista 1: Actas Pendientes */}
        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardHeader className="border-b border-border/70 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Actas Pendientes (Faltantes)</span>
              </CardTitle>
              <Badge
                variant="outline"
                className="border-amber-500/25 bg-amber-500/10 font-mono tabular-nums text-[10px] font-bold text-amber-600 dark:text-amber-400"
              >
                {listaPendientes.length} unidades
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {soloPendientes
                ? 'Mostrando únicamente las escuelas y carreras que faltan por entregar actas'
                : 'Al llegar al 100% de sus carreras, la escuela pasa automáticamente a la columna gris de resueltas'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pt-4">
            {listaPendientes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
                Todas las unidades filtradas tienen sus actas resueltas al 100%.
              </div>
            ) : (
              listaPendientes.map((group) => renderUnidadItem(group, false))
            )}
          </CardContent>
        </Card>

        {/* Lista 2: Actas Resueltas (Tono grisáceo indicando sin pendientes) */}
        {!soloPendientes && (
          <Card className="border-border/60 bg-muted/25 shadow-none">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Actas Resueltas (100%)</span>
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="font-mono tabular-nums text-[10px] text-muted-foreground"
                >
                  {listaResueltas.length} completadas
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground/80">
                Unidades académicas sin actas pendientes en esta categoría
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              {listaResueltas.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 py-10 text-center text-xs text-muted-foreground">
                  Aún no hay unidades académicas completadas en este filtro.
                </div>
              ) : (
                listaResueltas.map((group) => renderUnidadItem(group, true))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal para editar el número de trámites del programa seleccionado */}
      <EditarTramitesProgramaModal
        key={
          editingTarget
            ? `${editingTarget.programaId}-${String(Boolean(editingTarget))}`
            : 'closed'
        }
        open={Boolean(editingTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingTarget(null)
        }}
        unidadClave={editingTarget?.unidadClave ?? ''}
        unidadNombre={editingTarget?.unidadNombre ?? ''}
        programa={activeEditingPrograma}
        onSaveConteo={handleSaveConteoModal}
      />
    </div>
  )
}

export default ChecklistActasView
