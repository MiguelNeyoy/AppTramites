-- Migracion: Checklist de Actas por periodos, etapas progresivas, responsable y RLS completo
-- 1) Extender enum public.tipo_acta con PROMOCION_GRADO y CIERRE_CICLO (fuera de bloque DO $$)
-- 2) Agregar columna responsable_id y cambiar FK programa_id a ON DELETE RESTRICT
-- 3) Validar en trigger que Periodo 1 solo admita ORDINARIA, EXTRAORDINARIA y REGULARIZACION
-- 4) Agregar politicas RLS INSERT y DELETE (ADMIN) en public.checklists_actas
-- 5) Crear RPC public.list_responsables_actas() para catalogo de responsables

ALTER TYPE public.tipo_acta ADD VALUE IF NOT EXISTS 'PROMOCION_GRADO';
ALTER TYPE public.tipo_acta ADD VALUE IF NOT EXISTS 'CIERRE_CICLO';

ALTER TABLE public.checklists_actas
  ADD COLUMN IF NOT EXISTS responsable_id uuid NULL
  REFERENCES public.perfiles(id) ON DELETE SET NULL;

ALTER TABLE public.checklists_actas
  DROP CONSTRAINT IF EXISTS checklists_actas_programa_id_fkey;

ALTER TABLE public.checklists_actas
  ADD CONSTRAINT checklists_actas_programa_id_fkey
  FOREIGN KEY (programa_id)
  REFERENCES public.programas_educativos(id)
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.before_write_checklists_actas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_numero_periodo integer;
  v_uid uuid;
BEGIN
  SELECT pe.numero_periodo
  INTO v_numero_periodo
  FROM public.periodos_escolares pe
  WHERE pe.id = NEW.periodo_id;

  IF v_numero_periodo = 1
     AND NEW.tipo_acta::text IN ('PROMOCION_GRADO', 'CIERRE_CICLO') THEN
    RAISE EXCEPTION 'El Periodo 1 solo admite actas Ordinaria, Extraordinaria y Regularizacion.'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;

  v_uid := (SELECT auth.uid());
  IF v_uid IS NOT NULL THEN
    NEW.actualizado_por := v_uid;
    IF NEW.estado = 'GENERADA'::public.estado_acta AND NEW.responsable_id IS NULL THEN
      IF TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'GENERADA'::public.estado_acta THEN
        NEW.responsable_id := v_uid;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checklists_actas_before_write ON public.checklists_actas;
CREATE TRIGGER trg_checklists_actas_before_write
  BEFORE INSERT OR UPDATE ON public.checklists_actas
  FOR EACH ROW
  EXECUTE FUNCTION public.before_write_checklists_actas();

DROP POLICY IF EXISTS checklists_insert_policy ON public.checklists_actas;
CREATE POLICY checklists_insert_policy
  ON public.checklists_actas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario)
    OR (
      (SELECT public.current_user_role()) IN ('LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario)
      AND EXISTS (
        SELECT 1
        FROM public.programas_educativos pe
        JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
        WHERE pe.id = checklists_actas.programa_id
          AND ua.nivel::text = (SELECT public.current_user_role())::text
      )
    )
    OR (
      (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
      AND EXISTS (
        SELECT 1
        FROM public.programas_educativos pe
        WHERE pe.id = checklists_actas.programa_id
          AND pe.unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
      )
    )
  );

DROP POLICY IF EXISTS checklists_delete_policy ON public.checklists_actas;
CREATE POLICY checklists_delete_policy
  ON public.checklists_actas
  FOR DELETE
  TO authenticated
  USING ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario);

CREATE OR REPLACE FUNCTION public.list_responsables_actas()
RETURNS TABLE (
  id uuid,
  nombre text,
  rol public.rol_usuario
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.nombre, p.rol
  FROM public.perfiles p
  WHERE p.activo = true
    AND p.rol <> 'NUEVO_INGRESO'::public.rol_usuario
  ORDER BY p.nombre ASC;
$$;

REVOKE ALL ON FUNCTION public.list_responsables_actas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_responsables_actas() TO authenticated;

NOTIFY pgrst, 'reload schema';
