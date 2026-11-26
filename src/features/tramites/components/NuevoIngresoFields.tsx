import { FileSpreadsheet, Mail, Phone } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ESTATUS_FICHA_OPTIONS,
  SEXO_OPTIONS,
  type EstatusFichaNuevoIngreso,
} from '@/features/fichas/components/fichasMockData'

export interface NuevoIngresoDraft {
  curp: string
  aPaterno: string
  aMaterno: string
  nombre: string
  sexo: '1' | '2'
  fechaNacimiento: string
  celular: string
  correo: string
  estatusFicha: EstatusFichaNuevoIngreso
}

interface NuevoIngresoFieldsProps {
  draft: NuevoIngresoDraft
  claveEscuela?: string
  claveCarrera?: string
  onChange: (patch: Partial<NuevoIngresoDraft>) => void
}

export function NuevoIngresoFields({
  draft,
  claveEscuela,
  claveCarrera,
  onChange,
}: NuevoIngresoFieldsProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-uas-gold" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            2. Datos del Aspirante (Nuevo Ingreso)
          </h3>
        </div>
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/25 bg-emerald-500/10 font-mono tabular-nums text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
        >
          <FileSpreadsheet className="h-3 w-3" />
          ESCUELA {claveEscuela || '----'} · CARRERA {claveCarrera || '-'}
        </Badge>
      </div>

      {/* Fila 1: CURP, Sexo y Fecha de Nacimiento */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="space-y-1.5 sm:col-span-5">
          <Label
            htmlFor="ni-curp"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            CURP (18 Caracteres) *
          </Label>
          <Input
            id="ni-curp"
            maxLength={18}
            placeholder="LAGL071102HSLLRNA8"
            value={draft.curp}
            onChange={(e) =>
              onChange({ curp: e.target.value.toUpperCase().replace(/\s+/g, '') })
            }
            className="h-9 bg-background font-mono text-xs uppercase tracking-wider"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <Label
            htmlFor="ni-sexo"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Sexo *
          </Label>
          <Select
            value={draft.sexo}
            onValueChange={(value) => onChange({ sexo: value as '1' | '2' })}
          >
            <SelectTrigger id="ni-sexo" className="h-9 bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEXO_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="font-mono text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-4">
          <Label
            htmlFor="ni-fecha-nac"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Fecha Nac. (AAAA/MM/DD) *
          </Label>
          <Input
            id="ni-fecha-nac"
            type="date"
            value={draft.fechaNacimiento}
            onChange={(e) => onChange({ fechaNacimiento: e.target.value })}
            className="h-9 bg-background font-mono tabular-nums text-xs"
          />
        </div>
      </div>

      {/* Fila 2: A_Paterno, A_Materno, NOMBRE */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="ni-a-paterno"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            A_Paterno *
          </Label>
          <Input
            id="ni-a-paterno"
            placeholder="LLANOS"
            value={draft.aPaterno}
            onChange={(e) => onChange({ aPaterno: e.target.value.toUpperCase() })}
            className="h-9 bg-background text-xs uppercase"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="ni-a-materno"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            A_Materno
          </Label>
          <Input
            id="ni-a-materno"
            placeholder="GARCIA"
            value={draft.aMaterno}
            onChange={(e) => onChange({ aMaterno: e.target.value.toUpperCase() })}
            className="h-9 bg-background text-xs uppercase"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="ni-nombre"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            NOMBRE *
          </Label>
          <Input
            id="ni-nombre"
            placeholder="LEONARDO GAEL"
            value={draft.nombre}
            onChange={(e) => onChange({ nombre: e.target.value.toUpperCase() })}
            className="h-9 bg-background text-xs uppercase"
          />
        </div>
      </div>

      {/* Fila 3: CELULAR, CORREO y ESTATUS DE FICHA */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="space-y-1.5 sm:col-span-4">
          <Label
            htmlFor="ni-celular"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Celular (10 Dígitos) *
          </Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ni-celular"
              maxLength={10}
              inputMode="numeric"
              placeholder="6691234806"
              value={draft.celular}
              onChange={(e) =>
                onChange({ celular: e.target.value.replace(/\D+/g, '') })
              }
              className="h-9 bg-background pl-8 font-mono tabular-nums text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-5">
          <Label
            htmlFor="ni-correo"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Correo Electrónico *
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ni-correo"
              type="email"
              placeholder="aspirante@correo.com"
              value={draft.correo}
              onChange={(e) => onChange({ correo: e.target.value.trim() })}
              className="h-9 bg-background pl-8 font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <Label
            htmlFor="ni-estatus"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Estatus Ficha *
          </Label>
          <Select
            value={draft.estatusFicha}
            onValueChange={(value) =>
              onChange({ estatusFicha: value as EstatusFichaNuevoIngreso })
            }
          >
            <SelectTrigger id="ni-estatus" className="h-9 bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTATUS_FICHA_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground">
        Campos compatibles 1:1 con el formato oficial{' '}
        <span className="font-mono font-semibold text-foreground">
          CLAVE UA - NUEVO INGRESO 2026.xlsx
        </span>
        : CURP, A_Paterno, A_Materno, NOMBRE, SEXO (1/2), ESCUELA (4 dígitos), CARRERA (1-2 dígitos), FECHA NAC (AAAA/MM/DD), CELULAR y CORREO.
      </p>
    </section>
  )
}
