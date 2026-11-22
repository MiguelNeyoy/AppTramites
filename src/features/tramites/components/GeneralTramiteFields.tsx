import { FileText, Upload } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Enums } from '@/types/database.types'

export type EstadoTramiteAlumno = Enums<'estado_tramite_alumno'>

export interface GeneralTramiteDraft {
  folio: string
  numeroCuenta: string
  nombreAlumno: string
  fechaRegistro: string
  estado: EstadoTramiteAlumno
  observaciones: string
  archivoPdfNombre: string
}

interface GeneralTramiteFieldsProps {
  draft: GeneralTramiteDraft
  permitePdf: boolean
  onChange: (patch: Partial<GeneralTramiteDraft>) => void
}

const ESTADO_TRAMITE_OPTIONS: { value: EstadoTramiteAlumno; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'RESUELTO', label: 'Resuelto' },
  { value: 'CON_ERROR', label: 'Con Error' },
]

export function GeneralTramiteFields({
  draft,
  permitePdf,
  onChange,
}: GeneralTramiteFieldsProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-uas-gold" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            2. Datos del Alumno y Seguimiento
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="space-y-1.5 sm:col-span-4">
          <Label
            htmlFor="tramite-no-cuenta"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            No. de Cuenta *
          </Label>
          <Input
            id="tramite-no-cuenta"
            placeholder="20261234"
            value={draft.numeroCuenta}
            onChange={(e) => onChange({ numeroCuenta: e.target.value })}
            className="h-9 bg-background font-mono tabular-nums text-xs"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-8">
          <Label
            htmlFor="tramite-nombre-alumno"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Nombre Completo del Alumno *
          </Label>
          <Input
            id="tramite-nombre-alumno"
            placeholder="APELLIDO PATERNO MATERNO NOMBRE(S)"
            value={draft.nombreAlumno}
            onChange={(e) => onChange({ nombreAlumno: e.target.value })}
            className="h-9 bg-background text-xs uppercase"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="tramite-folio"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Folio (Opcional / Único)
          </Label>
          <Input
            id="tramite-folio"
            placeholder="Ej. 0045 o URS-01"
            maxLength={40}
            value={draft.folio}
            onChange={(e) => onChange({ folio: e.target.value })}
            className="h-9 bg-background font-mono tabular-nums text-xs uppercase"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="tramite-fecha-registro"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Fecha de Registro *
          </Label>
          <Input
            id="tramite-fecha-registro"
            type="date"
            value={draft.fechaRegistro}
            onChange={(e) => onChange({ fechaRegistro: e.target.value })}
            className="h-9 bg-background font-mono tabular-nums text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="tramite-estado"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Estado del Trámite *
          </Label>
          <Select
            value={draft.estado}
            onValueChange={(value) =>
              onChange({ estado: value as EstadoTramiteAlumno })
            }
          >
            <SelectTrigger
              id="tramite-estado"
              className="h-9 bg-background text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADO_TRAMITE_OPTIONS.map((opt) => (
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

      {permitePdf && (
        <div className="space-y-1.5">
          <Label
            htmlFor="tramite-pdf"
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Documento Soporte (PDF opcional)
          </Label>
          <label
            htmlFor="tramite-pdf"
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-secondary/25 px-3 py-2 text-xs transition-colors duration-150 hover:bg-secondary/45"
          >
            <span className="inline-flex items-center gap-2 truncate text-muted-foreground">
              {draft.archivoPdfNombre ? (
                <>
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate font-mono text-foreground">
                    {draft.archivoPdfNombre}
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 shrink-0" />
                  <span>Adjuntar comprobante o solicitud en PDF</span>
                </>
              )}
            </span>
            <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
              Examinar
            </span>
            <input
              id="tramite-pdf"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                onChange({ archivoPdfNombre: file ? file.name : '' })
              }}
            />
          </label>
        </div>
      )}

      <div className="space-y-1.5">
        <Label
          htmlFor="tramite-observaciones"
          className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Observaciones de Ventanilla
        </Label>
        <Textarea
          id="tramite-observaciones"
          rows={2}
          placeholder="Notas de cotejo, documentos faltantes o seguimiento..."
          value={draft.observaciones}
          onChange={(e) => onChange({ observaciones: e.target.value })}
          className="resize-none bg-background text-xs"
        />
      </div>
    </section>
  )
}
