-- Issue #11: Migracion DB, RLS y tipos para requerimientos 2026-11-18
-- 1) Rol acotado por Unidad Academica (ej. Diana - Informatica clave 4800)
-- 2) Tabla tramites_alumnos (registro por alumno + folio consecutivo + fecha + estado)
-- 3) Tabla fichas_nuevo_ingreso (10 campos oficiales Excel + estatus_ficha)
-- 4) Politicas RLS sin recursion y proteccion historica ON DELETE RESTRICT

-- IMPORTANTE: En PostgreSQL, ALTER TYPE ... ADD VALUE debe ejecutarse fuera de
-- bloques transaccionales antes de referenciar el nuevo valor en constraints/RLS.
ALTER TYPE public.rol_usuario ADD VALUE IF NOT EXISTS 'UNIDAD_ACADEMICA';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'estado_tramite_alumno'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.estado_tramite_alumno AS ENUM (
      'PENDIENTE',
      'RESUELTO',
      'CON_ERROR'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'estatus_ficha_nuevo_ingreso'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.estatus_ficha_nuevo_ingreso AS ENUM (
      'SIN_PROCESO',
      'SIN_PAGO',
      'FICHA_VENCIDA',
      'FICHA_CANCELADA'
    );
  END IF;
END
$$;

-- ============================================================================
-- Funciones helper (SECURITY DEFINER con search_path vacio para evitar recursion)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.rol_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT rol
  FROM public.perfiles
  WHERE id = (SELECT auth.uid());
$$;

-- ============================================================================
-- Extension de public.perfiles para alcance por Unidad Academica
-- ============================================================================

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS unidad_academica_id bigint NULL
  REFERENCES public.unidades_academicas(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_perfiles_unidad_academica_por_rol'
      AND conrelid = 'public.perfiles'::regclass
  ) THEN
    ALTER TABLE public.perfiles
      ADD CONSTRAINT ck_perfiles_unidad_academica_por_rol
      CHECK (
        (rol = 'UNIDAD_ACADEMICA'::public.rol_usuario AND unidad_academica_id IS NOT NULL)
        OR (rol <> 'UNIDAD_ACADEMICA'::public.rol_usuario AND unidad_academica_id IS NULL)
      );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.current_user_unidad_academica_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT unidad_academica_id
  FROM public.perfiles
  WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rol public.rol_usuario;
  v_unidad_id bigint;
BEGIN
  v_rol := COALESCE(
    (NEW.raw_user_meta_data->>'rol')::public.rol_usuario,
    'LICENCIATURA'::public.rol_usuario
  );
  v_unidad_id := NULLIF(NEW.raw_user_meta_data->>'unidad_academica_id', '')::bigint;

  INSERT INTO public.perfiles (id, nombre, email, rol, unidad_academica_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario Nuevo'),
    NEW.email,
    v_rol,
    CASE
      WHEN v_rol = 'UNIDAD_ACADEMICA'::public.rol_usuario THEN v_unidad_id
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS perfiles_select_policy ON public.perfiles;
CREATE POLICY perfiles_select_policy
  ON public.perfiles
  FOR SELECT
  TO authenticated
  USING (
    (id = (SELECT auth.uid()))
    OR ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario)
  );

DROP POLICY IF EXISTS perfiles_insert_policy ON public.perfiles;
CREATE POLICY perfiles_insert_policy
  ON public.perfiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario);

DROP POLICY IF EXISTS perfiles_update_policy ON public.perfiles;
CREATE POLICY perfiles_update_policy
  ON public.perfiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario)
  WITH CHECK ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario);

DROP POLICY IF EXISTS perfiles_delete_policy ON public.perfiles;
CREATE POLICY perfiles_delete_policy
  ON public.perfiles
  FOR DELETE
  TO authenticated
  USING ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario);

-- ============================================================================
-- Restriccion compuesta en programas_educativos para validar escuela + carrera
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_programas_unidad_id'
      AND conrelid = 'public.programas_educativos'::regclass
  ) THEN
    ALTER TABLE public.programas_educativos
      ADD CONSTRAINT uq_programas_unidad_id UNIQUE (unidad_academica_id, id);
  END IF;
END
$$;

-- ============================================================================
-- Nueva tabla: public.tramites_alumnos (captura por alumno + folio consecutivo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tramites_alumnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  numero_cuenta text NOT NULL,
  nombre_alumno text NOT NULL,
  programa_id bigint NOT NULL REFERENCES public.programas_educativos(id) ON DELETE RESTRICT,
  tipo_tramite_id bigint NOT NULL REFERENCES public.tipos_tramite(id) ON DELETE RESTRICT,
  periodo_id bigint NOT NULL REFERENCES public.periodos_escolares(id) ON DELETE RESTRICT,
  usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  fecha_registro date NOT NULL DEFAULT CURRENT_DATE,
  estado public.estado_tramite_alumno NOT NULL DEFAULT 'PENDIENTE'::public.estado_tramite_alumno,
  observaciones text NULL,
  archivo_pdf_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tramites_alumnos_folio UNIQUE (folio),
  CONSTRAINT ck_tramites_alumnos_numero_cuenta CHECK (
    btrim(numero_cuenta) <> '' AND char_length(btrim(numero_cuenta)) <= 30
  ),
  CONSTRAINT ck_tramites_alumnos_nombre_alumno CHECK (btrim(nombre_alumno) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tramites_alumnos_periodo_fecha
  ON public.tramites_alumnos (periodo_id, fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_tramites_alumnos_programa
  ON public.tramites_alumnos (programa_id);
CREATE INDEX IF NOT EXISTS idx_tramites_alumnos_tipo_tramite
  ON public.tramites_alumnos (tipo_tramite_id);
CREATE INDEX IF NOT EXISTS idx_tramites_alumnos_estado
  ON public.tramites_alumnos (estado);
CREATE INDEX IF NOT EXISTS idx_tramites_alumnos_numero_cuenta
  ON public.tramites_alumnos (numero_cuenta);

DROP TRIGGER IF EXISTS trg_tramites_alumnos_updated_at ON public.tramites_alumnos;
CREATE TRIGGER trg_tramites_alumnos_updated_at
  BEFORE UPDATE ON public.tramites_alumnos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tramites_alumnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tramites_alumnos_select_policy ON public.tramites_alumnos;
CREATE POLICY tramites_alumnos_select_policy
  ON public.tramites_alumnos
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario)
    OR (
      (SELECT public.current_user_role()) IN ('LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario)
      AND EXISTS (
        SELECT 1
        FROM public.programas_educativos pe
        JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
        WHERE pe.id = tramites_alumnos.programa_id
          AND ua.nivel::text = (SELECT public.current_user_role())::text
      )
    )
    OR (
      (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
      AND EXISTS (
        SELECT 1
        FROM public.programas_educativos pe
        WHERE pe.id = tramites_alumnos.programa_id
          AND pe.unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
      )
    )
  );

DROP POLICY IF EXISTS tramites_alumnos_insert_policy ON public.tramites_alumnos;
CREATE POLICY tramites_alumnos_insert_policy
  ON public.tramites_alumnos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (usuario_id = (SELECT auth.uid()))
    AND (
      ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario)
      OR (
        (SELECT public.current_user_role()) IN ('LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario)
        AND EXISTS (
          SELECT 1
          FROM public.programas_educativos pe
          JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
          WHERE pe.id = tramites_alumnos.programa_id
            AND ua.nivel::text = (SELECT public.current_user_role())::text
        )
      )
      OR (
        (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
        AND EXISTS (
          SELECT 1
          FROM public.programas_educativos pe
          WHERE pe.id = tramites_alumnos.programa_id
            AND pe.unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
        )
      )
    )
  );

DROP POLICY IF EXISTS tramites_alumnos_update_policy ON public.tramites_alumnos;
CREATE POLICY tramites_alumnos_update_policy
  ON public.tramites_alumnos
  FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario)
    OR (
      (SELECT public.current_user_role()) IN ('LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario)
      AND EXISTS (
        SELECT 1
        FROM public.programas_educativos pe
        JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
        WHERE pe.id = tramites_alumnos.programa_id
          AND ua.nivel::text = (SELECT public.current_user_role())::text
      )
    )
    OR (
      (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
      AND EXISTS (
        SELECT 1
        FROM public.programas_educativos pe
        WHERE pe.id = tramites_alumnos.programa_id
          AND pe.unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
      )
    )
  )
  WITH CHECK (
    ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario)
    OR (
      (SELECT public.current_user_role()) IN ('LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario)
      AND EXISTS (
        SELECT 1
        FROM public.programas_educativos pe
        JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
        WHERE pe.id = tramites_alumnos.programa_id
          AND ua.nivel::text = (SELECT public.current_user_role())::text
      )
    )
    OR (
      (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
      AND EXISTS (
        SELECT 1
        FROM public.programas_educativos pe
        WHERE pe.id = tramites_alumnos.programa_id
          AND pe.unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
      )
    )
  );

DROP POLICY IF EXISTS tramites_alumnos_delete_policy ON public.tramites_alumnos;
CREATE POLICY tramites_alumnos_delete_policy
  ON public.tramites_alumnos
  FOR DELETE
  TO authenticated
  USING ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario);

-- ============================================================================
-- Nueva tabla: public.fichas_nuevo_ingreso (10 campos oficiales Excel)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fichas_nuevo_ingreso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curp varchar(18) NOT NULL,
  a_paterno text NOT NULL,
  a_materno text NOT NULL DEFAULT '',
  nombre text NOT NULL,
  sexo smallint NOT NULL,
  unidad_academica_id bigint NOT NULL REFERENCES public.unidades_academicas(id) ON DELETE RESTRICT,
  programa_id bigint NOT NULL REFERENCES public.programas_educativos(id) ON DELETE RESTRICT,
  fecha_nacimiento date NOT NULL,
  celular varchar(15) NOT NULL,
  correo text NOT NULL,
  estatus_ficha public.estatus_ficha_nuevo_ingreso NOT NULL DEFAULT 'SIN_PROCESO'::public.estatus_ficha_nuevo_ingreso,
  periodo_id bigint NOT NULL REFERENCES public.periodos_escolares(id) ON DELETE RESTRICT,
  usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  fecha_registro date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_fichas_unidad_programa FOREIGN KEY (unidad_academica_id, programa_id)
    REFERENCES public.programas_educativos(unidad_academica_id, id) ON DELETE RESTRICT,
  CONSTRAINT uq_fichas_curp_periodo UNIQUE (curp, periodo_id),
  CONSTRAINT ck_fichas_curp CHECK (curp ~ '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z]{2}$'),
  CONSTRAINT ck_fichas_a_paterno CHECK (btrim(a_paterno) <> ''),
  CONSTRAINT ck_fichas_nombre CHECK (btrim(nombre) <> ''),
  CONSTRAINT ck_fichas_sexo CHECK (sexo IN (1, 2)),
  CONSTRAINT ck_fichas_celular CHECK (celular ~ '^[0-9]{10}$'),
  CONSTRAINT ck_fichas_correo CHECK (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE INDEX IF NOT EXISTS idx_fichas_nuevo_ingreso_periodo_fecha
  ON public.fichas_nuevo_ingreso (periodo_id, fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_fichas_nuevo_ingreso_unidad
  ON public.fichas_nuevo_ingreso (unidad_academica_id);
CREATE INDEX IF NOT EXISTS idx_fichas_nuevo_ingreso_estatus
  ON public.fichas_nuevo_ingreso (estatus_ficha);

DROP TRIGGER IF EXISTS trg_fichas_nuevo_ingreso_updated_at ON public.fichas_nuevo_ingreso;
CREATE TRIGGER trg_fichas_nuevo_ingreso_updated_at
  BEFORE UPDATE ON public.fichas_nuevo_ingreso
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.fichas_nuevo_ingreso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fichas_nuevo_ingreso_select_policy ON public.fichas_nuevo_ingreso;
CREATE POLICY fichas_nuevo_ingreso_select_policy
  ON public.fichas_nuevo_ingreso
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.current_user_role()) IN ('ADMIN'::public.rol_usuario, 'NUEVO_INGRESO'::public.rol_usuario))
    OR (
      (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
      AND unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
    )
  );

DROP POLICY IF EXISTS fichas_nuevo_ingreso_insert_policy ON public.fichas_nuevo_ingreso;
CREATE POLICY fichas_nuevo_ingreso_insert_policy
  ON public.fichas_nuevo_ingreso
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (usuario_id = (SELECT auth.uid()))
    AND (
      ((SELECT public.current_user_role()) IN ('ADMIN'::public.rol_usuario, 'NUEVO_INGRESO'::public.rol_usuario))
      OR (
        (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
        AND unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
      )
    )
  );

DROP POLICY IF EXISTS fichas_nuevo_ingreso_update_policy ON public.fichas_nuevo_ingreso;
CREATE POLICY fichas_nuevo_ingreso_update_policy
  ON public.fichas_nuevo_ingreso
  FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.current_user_role()) IN ('ADMIN'::public.rol_usuario, 'NUEVO_INGRESO'::public.rol_usuario))
    OR (
      (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
      AND unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
    )
  )
  WITH CHECK (
    ((SELECT public.current_user_role()) IN ('ADMIN'::public.rol_usuario, 'NUEVO_INGRESO'::public.rol_usuario))
    OR (
      (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
      AND unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
    )
  );

DROP POLICY IF EXISTS fichas_nuevo_ingreso_delete_policy ON public.fichas_nuevo_ingreso;
CREATE POLICY fichas_nuevo_ingreso_delete_policy
  ON public.fichas_nuevo_ingreso
  FOR DELETE
  TO authenticated
  USING ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.tramites_alumnos, public.fichas_nuevo_ingreso
  TO authenticated, service_role;

-- ============================================================================
-- Actualizacion de RLS en catalogos y tablas existentes para UNIDAD_ACADEMICA
-- ============================================================================

DROP POLICY IF EXISTS catalogos_select_unidades ON public.unidades_academicas;
CREATE POLICY catalogos_select_unidades
  ON public.unidades_academicas
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.current_user_role()) <> 'UNIDAD_ACADEMICA'::public.rol_usuario)
    OR (id = (SELECT public.current_user_unidad_academica_id()))
  );

DROP POLICY IF EXISTS catalogos_select_programas ON public.programas_educativos;
CREATE POLICY catalogos_select_programas
  ON public.programas_educativos
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.current_user_role()) <> 'UNIDAD_ACADEMICA'::public.rol_usuario)
    OR (unidad_academica_id = (SELECT public.current_user_unidad_academica_id()))
  );

DROP POLICY IF EXISTS checklists_select_policy ON public.checklists_actas;
CREATE POLICY checklists_select_policy
  ON public.checklists_actas
  FOR SELECT
  TO authenticated
  USING (
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

DROP POLICY IF EXISTS checklists_update_policy ON public.checklists_actas;
CREATE POLICY checklists_update_policy
  ON public.checklists_actas
  FOR UPDATE
  TO authenticated
  USING (
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
  )
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

DROP POLICY IF EXISTS seguimientos_select_policy ON public.seguimientos_tramite;
CREATE POLICY seguimientos_select_policy
  ON public.seguimientos_tramite
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario)
    OR (
      (SELECT public.current_user_role()) = 'NUEVO_INGRESO'::public.rol_usuario
      AND EXISTS (
        SELECT 1
        FROM public.tipos_tramite tt
        WHERE tt.id = seguimientos_tramite.tipo_tramite_id
          AND tt.modulo = 'NUEVO_INGRESO'::public.modulo_tramite
      )
    )
    OR (
      (SELECT public.current_user_role()) IN ('LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario)
      AND EXISTS (
        SELECT 1
        FROM public.programas_educativos pe
        JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
        WHERE pe.id = seguimientos_tramite.programa_id
          AND ua.nivel::text = (SELECT public.current_user_role())::text
      )
    )
    OR (
      (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
      AND EXISTS (
        SELECT 1
        FROM public.programas_educativos pe
        WHERE pe.id = seguimientos_tramite.programa_id
          AND pe.unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
      )
    )
  );

DROP POLICY IF EXISTS seguimientos_insert_policy ON public.seguimientos_tramite;
CREATE POLICY seguimientos_insert_policy
  ON public.seguimientos_tramite
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (usuario_id = (SELECT auth.uid()))
    AND (
      ((SELECT public.current_user_role()) = 'ADMIN'::public.rol_usuario)
      OR (
        (SELECT public.current_user_role()) = 'NUEVO_INGRESO'::public.rol_usuario
        AND EXISTS (
          SELECT 1
          FROM public.tipos_tramite tt
          WHERE tt.id = seguimientos_tramite.tipo_tramite_id
            AND tt.modulo = 'NUEVO_INGRESO'::public.modulo_tramite
        )
      )
      OR (
        (SELECT public.current_user_role()) IN ('LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario)
        AND EXISTS (
          SELECT 1
          FROM public.programas_educativos pe
          JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
          WHERE pe.id = seguimientos_tramite.programa_id
            AND ua.nivel::text = (SELECT public.current_user_role())::text
        )
      )
      OR (
        (SELECT public.current_user_role()) = 'UNIDAD_ACADEMICA'::public.rol_usuario
        AND EXISTS (
          SELECT 1
          FROM public.programas_educativos pe
          WHERE pe.id = seguimientos_tramite.programa_id
            AND pe.unidad_academica_id = (SELECT public.current_user_unidad_academica_id())
        )
      )
    )
  );
