-- Migracion: Ciclos escolares ascendentes y generacion automatica de Periodo 1 y Periodo 2 cada agosto
-- Arranca desde el ciclo base 2026-2027 en adelante.

ALTER TABLE public.periodos_escolares
  ADD COLUMN IF NOT EXISTS ciclo_escolar text;

-- Backfill de ciclo_escolar en filas existentes (formato YYYY-YYYY)
UPDATE public.periodos_escolares
SET ciclo_escolar = CASE
  WHEN nombre ~ '[0-9]{4}\s*-\s*[0-9]{4}' THEN
    regexp_replace((regexp_match(nombre, '([0-9]{4}\s*-\s*[0-9]{4})'))[1], '\s+', '', 'g')
  WHEN numero_periodo = 1 THEN
    format('%s-%s', EXTRACT(YEAR FROM fecha_inicio)::int, EXTRACT(YEAR FROM fecha_inicio)::int + 1)
  ELSE
    format('%s-%s', EXTRACT(YEAR FROM fecha_inicio)::int - 1, EXTRACT(YEAR FROM fecha_inicio)::int)
END
WHERE ciclo_escolar IS NULL;

ALTER TABLE public.periodos_escolares
  ALTER COLUMN ciclo_escolar SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_periodos_ciclo_escolar_formato'
      AND conrelid = 'public.periodos_escolares'::regclass
  ) THEN
    ALTER TABLE public.periodos_escolares
      ADD CONSTRAINT ck_periodos_ciclo_escolar_formato
      CHECK (
        ciclo_escolar ~ '^[0-9]{4}-[0-9]{4}$'
        AND split_part(ciclo_escolar, '-', 2)::int = split_part(ciclo_escolar, '-', 1)::int + 1
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_periodos_ciclo_numero'
      AND conrelid = 'public.periodos_escolares'::regclass
  ) THEN
    ALTER TABLE public.periodos_escolares
      ADD CONSTRAINT uq_periodos_ciclo_numero
      UNIQUE (ciclo_escolar, numero_periodo);
  END IF;
END
$$;

-- Trigger para autoderivar ciclo_escolar si una insercion/edicion manual no lo envia
CREATE OR REPLACE FUNCTION public.before_write_periodos_escolares()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_match text[];
BEGIN
  IF NEW.ciclo_escolar IS NULL OR btrim(NEW.ciclo_escolar) = '' THEN
    v_match := regexp_match(COALESCE(NEW.nombre, ''), '([0-9]{4})\s*-\s*([0-9]{4})');
    IF v_match IS NOT NULL THEN
      NEW.ciclo_escolar := format('%s-%s', v_match[1], v_match[2]);
    ELSIF NEW.numero_periodo = 1 THEN
      NEW.ciclo_escolar := format(
        '%s-%s',
        EXTRACT(YEAR FROM NEW.fecha_inicio)::int,
        EXTRACT(YEAR FROM NEW.fecha_inicio)::int + 1
      );
    ELSE
      NEW.ciclo_escolar := format(
        '%s-%s',
        EXTRACT(YEAR FROM NEW.fecha_inicio)::int - 1,
        EXTRACT(YEAR FROM NEW.fecha_inicio)::int
      );
    END IF;
  ELSE
    NEW.ciclo_escolar := regexp_replace(btrim(NEW.ciclo_escolar), '\s+', '', 'g');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_periodos_escolares_before_write ON public.periodos_escolares;
CREATE TRIGGER trg_periodos_escolares_before_write
  BEFORE INSERT OR UPDATE ON public.periodos_escolares
  FOR EACH ROW
  EXECUTE FUNCTION public.before_write_periodos_escolares();

-- RPC automatico e idempotente: a partir de 2026-2027, cada agosto genera el ciclo
-- correspondiente con sus dos periodos (Periodo 1 Ago-Ene y Periodo 2 Feb-Jul).
CREATE OR REPLACE FUNCTION public.ensure_ciclos_escolares(
  p_fecha_referencia date DEFAULT CURRENT_DATE
)
RETURNS SETOF public.periodos_escolares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base_year constant integer := 2026;
  v_ref_date date := COALESCE(p_fecha_referencia, CURRENT_DATE);
  v_ref_month integer := EXTRACT(MONTH FROM v_ref_date)::int;
  v_ref_year integer := EXTRACT(YEAR FROM v_ref_date)::int;
  v_current_ciclo_year integer;
  v_target_year integer;
  v_year integer;
  v_ciclo text;
  v_current_ciclo text;
  v_current_numero smallint;
  v_inserted_any boolean := false;
  v_row_count integer := 0;
BEGIN
  IF v_ref_month >= 8 THEN
    v_current_ciclo_year := v_ref_year;
    v_current_numero := 1;
  ELSIF v_ref_month = 1 THEN
    v_current_ciclo_year := v_ref_year - 1;
    v_current_numero := 1;
  ELSE
    v_current_ciclo_year := v_ref_year - 1;
    v_current_numero := 2;
  END IF;

  v_target_year := GREATEST(v_base_year, v_current_ciclo_year);
  v_current_ciclo := format('%s-%s', v_target_year, v_target_year + 1);

  FOR v_year IN v_base_year..v_target_year LOOP
    v_ciclo := format('%s-%s', v_year, v_year + 1);

    INSERT INTO public.periodos_escolares (
      nombre,
      ciclo_escolar,
      numero_periodo,
      fecha_inicio,
      fecha_fin,
      activo
    )
    VALUES (
      format('%s Periodo 1 (Ago-Ene)', v_ciclo),
      v_ciclo,
      1,
      make_date(v_year, 8, 1),
      make_date(v_year + 1, 1, 31),
      false
    )
    ON CONFLICT (ciclo_escolar, numero_periodo) DO NOTHING;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      v_inserted_any := true;
    END IF;

    INSERT INTO public.periodos_escolares (
      nombre,
      ciclo_escolar,
      numero_periodo,
      fecha_inicio,
      fecha_fin,
      activo
    )
    VALUES (
      format('%s Periodo 2 (Feb-Jul)', v_ciclo),
      v_ciclo,
      2,
      make_date(v_year + 1, 2, 1),
      make_date(v_year + 1, 7, 31),
      false
    )
    ON CONFLICT (ciclo_escolar, numero_periodo) DO NOTHING;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      v_inserted_any := true;
    END IF;
  END LOOP;

  -- Si se generaron ciclos nuevos o no hay ningun periodo activo, marca activo el periodo en curso
  IF v_inserted_any OR NOT EXISTS (SELECT 1 FROM public.periodos_escolares WHERE activo = true) THEN
    UPDATE public.periodos_escolares
    SET activo = (ciclo_escolar = v_current_ciclo AND numero_periodo = v_current_numero)
    WHERE activo IS DISTINCT FROM (ciclo_escolar = v_current_ciclo AND numero_periodo = v_current_numero);
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.periodos_escolares
  ORDER BY ciclo_escolar ASC, numero_periodo ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_ciclos_escolares(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_ciclos_escolares(date) TO authenticated;

-- RPC administrativo para adelantar el siguiente ciclo completo (Periodo 1 y Periodo 2)
CREATE OR REPLACE FUNCTION public.generar_siguiente_ciclo_escolar()
RETURNS SETOF public.periodos_escolares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_next_year integer;
  v_ciclo text;
BEGIN
  IF (SELECT public.current_user_role()) <> 'ADMIN'::public.rol_usuario THEN
    RAISE EXCEPTION 'Solo el rol ADMIN puede generar un nuevo ciclo escolar.'
      USING ERRCODE = '42501';
  END IF;

  SELECT GREATEST(
    2026,
    COALESCE(MAX(split_part(ciclo_escolar, '-', 1)::int) + 1, 2026)
  )
  INTO v_next_year
  FROM public.periodos_escolares;

  v_ciclo := format('%s-%s', v_next_year, v_next_year + 1);

  INSERT INTO public.periodos_escolares (
    nombre,
    ciclo_escolar,
    numero_periodo,
    fecha_inicio,
    fecha_fin,
    activo
  )
  VALUES
    (
      format('%s Periodo 1 (Ago-Ene)', v_ciclo),
      v_ciclo,
      1,
      make_date(v_next_year, 8, 1),
      make_date(v_next_year + 1, 1, 31),
      false
    ),
    (
      format('%s Periodo 2 (Feb-Jul)', v_ciclo),
      v_ciclo,
      2,
      make_date(v_next_year + 1, 2, 1),
      make_date(v_next_year + 1, 7, 31),
      false
    )
  ON CONFLICT (ciclo_escolar, numero_periodo) DO NOTHING;

  RETURN QUERY
  SELECT *
  FROM public.periodos_escolares
  WHERE ciclo_escolar = v_ciclo
  ORDER BY numero_periodo ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.generar_siguiente_ciclo_escolar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generar_siguiente_ciclo_escolar() TO authenticated;

NOTIFY pgrst, 'reload schema';
