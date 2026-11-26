-- Migracion: Folio manual en texto (opcional) y unico por (periodo_id, tipo_tramite_id)
-- Permite que el usuario capture/edite el folio que manejan en ventanilla,
-- normalizando espacios/mayusculas y bloqueando duplicados dentro del mismo tramite y periodo.

ALTER TABLE public.tramites_alumnos
  DROP CONSTRAINT IF EXISTS uq_tramites_alumnos_folio;

ALTER TABLE public.tramites_alumnos
  ALTER COLUMN folio DROP IDENTITY IF EXISTS;

ALTER TABLE public.tramites_alumnos
  ALTER COLUMN folio TYPE text USING folio::text,
  ALTER COLUMN folio DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_tramites_alumnos_folio_formato'
      AND conrelid = 'public.tramites_alumnos'::regclass
  ) THEN
    ALTER TABLE public.tramites_alumnos
      ADD CONSTRAINT ck_tramites_alumnos_folio_formato
      CHECK (
        folio IS NULL
        OR (
          btrim(folio) <> ''
          AND char_length(btrim(folio)) <= 40
          AND btrim(folio) !~ '\s'
        )
      );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.normalize_tramites_alumnos_folio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.folio := NULLIF(upper(btrim(COALESCE(NEW.folio, ''))), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tramites_alumnos_normalize_folio ON public.tramites_alumnos;
CREATE TRIGGER trg_tramites_alumnos_normalize_folio
  BEFORE INSERT OR UPDATE ON public.tramites_alumnos
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_tramites_alumnos_folio();

CREATE UNIQUE INDEX IF NOT EXISTS uq_tramites_alumnos_periodo_tipo_folio
  ON public.tramites_alumnos (periodo_id, tipo_tramite_id, upper(btrim(folio)))
  WHERE folio IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tramites_alumnos_folio
  ON public.tramites_alumnos (folio)
  WHERE folio IS NOT NULL;
