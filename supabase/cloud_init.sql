-- ============================================================================
-- TrámitesUAS — Script de Inicialización Limpia para Supabase Cloud
-- Generado desde el servidor local consolidado (esquema + 7 migraciones + catálogos)
--
-- Incluye:
--   1. Enums, tablas, constraints, índices, funciones/RPCs, triggers y RLS en public
--   2. Migración de folio manual en texto (202611210001_folio_manual_unico_tramites)
--   3. Trigger on_auth_user_created en auth.users -> public.handle_new_user()
--   4. Catálogos base oficiales (unidades_academicas, programas_educativos,
--      tipos_tramite y periodos_escolares 2026-2027), con preparatorias en MAYÚSCULAS
--
-- NO incluye:
--   - Trámites, fichas de nuevo ingreso, checklists de actas, seguimientos ni usuarios
--     (las tablas operativas inician 100% limpias).
--
-- Uso: Copiar y pegar completo en Supabase Cloud -> SQL Editor -> New query -> Run
-- ============================================================================

BEGIN;

SET standard_conforming_strings = on;
SET check_function_bodies = false;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.12

SET standard_conforming_strings = on;
SET check_function_bodies = false;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

--
-- Name: estado_acta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_acta AS ENUM (
    'PENDIENTE',
    'GENERADA',
    'NO_APLICA'
);

--
-- Name: estado_tramite_alumno; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_tramite_alumno AS ENUM (
    'PENDIENTE',
    'RESUELTO',
    'CON_ERROR'
);

--
-- Name: estatus_ficha_nuevo_ingreso; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estatus_ficha_nuevo_ingreso AS ENUM (
    'SIN_PROCESO',
    'SIN_PAGO',
    'FICHA_VENCIDA',
    'FICHA_CANCELADA'
);

--
-- Name: modulo_tramite; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.modulo_tramite AS ENUM (
    'TRAMITES_GENERALES',
    'NUEVO_INGRESO'
);

--
-- Name: nivel_educativo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nivel_educativo AS ENUM (
    'LICENCIATURA',
    'BACHILLERATO'
);

--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_usuario AS ENUM (
    'ADMIN',
    'LICENCIATURA',
    'BACHILLERATO',
    'NUEVO_INGRESO',
    'UNIDAD_ACADEMICA'
);

--
-- Name: tipo_acta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_acta AS ENUM (
    'ORDINARIA',
    'EXTRAORDINARIA',
    'REGULARIZACION',
    'PROMOCION_GRADO',
    'CIERRE_CICLO'
);

--
-- Name: admin_delete_usuario(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_usuario(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_role public.rol_usuario := (SELECT public.current_user_role());
  v_other_active_admins integer;
  v_target_rol public.rol_usuario;
  v_target_activo boolean;
BEGIN
  IF v_caller_role IS DISTINCT FROM 'ADMIN'::public.rol_usuario THEN
    RAISE EXCEPTION 'Solo un administrador puede eliminar usuarios.'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta en sesión.'
      USING ERRCODE = '23514';
  END IF;

  SELECT rol, activo
  INTO v_target_rol, v_target_activo
  FROM public.perfiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el perfil de usuario solicitado.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_target_rol = 'ADMIN'::public.rol_usuario AND v_target_activo THEN
    SELECT count(*)
    INTO v_other_active_admins
    FROM public.perfiles
    WHERE rol = 'ADMIN'::public.rol_usuario
      AND activo = true
      AND id <> p_user_id;

    IF v_other_active_admins = 0 THEN
      RAISE EXCEPTION 'Debe permanecer al menos un administrador activo en el sistema.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  DELETE FROM auth.users
  WHERE id = p_user_id;
END;
$$;

--
-- Name: perfiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfiles (
    id uuid NOT NULL,
    nombre text NOT NULL,
    email text NOT NULL,
    rol public.rol_usuario DEFAULT 'LICENCIATURA'::public.rol_usuario NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    unidad_academica_id bigint,
    CONSTRAINT ck_perfiles_unidad_academica_por_rol CHECK ((((rol = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (unidad_academica_id IS NOT NULL)) OR ((rol <> 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (unidad_academica_id IS NULL))))
);

--
-- Name: admin_update_usuario(uuid, text, text, public.rol_usuario, boolean, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_update_usuario(p_user_id uuid, p_nombre text, p_email text, p_rol public.rol_usuario, p_activo boolean, p_unidad_academica_id bigint DEFAULT NULL::bigint) RETURNS public.perfiles
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_role public.rol_usuario := (SELECT public.current_user_role());
  v_normalized_email text := lower(btrim(COALESCE(p_email, '')));
  v_trimmed_nombre text := btrim(COALESCE(p_nombre, ''));
  v_target_unidad_id bigint;
  v_other_active_admins integer;
  v_updated public.perfiles;
BEGIN
  IF v_caller_role IS DISTINCT FROM 'ADMIN'::public.rol_usuario THEN
    RAISE EXCEPTION 'Solo un administrador puede actualizar usuarios.'
      USING ERRCODE = '42501';
  END IF;

  IF v_trimmed_nombre = '' OR v_normalized_email = '' THEN
    RAISE EXCEPTION 'El nombre y el correo electrónico son obligatorios.'
      USING ERRCODE = '23514';
  END IF;

  IF p_user_id = v_caller_id AND (p_rol <> 'ADMIN'::public.rol_usuario OR NOT p_activo) THEN
    RAISE EXCEPTION 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.'
      USING ERRCODE = '23514';
  END IF;

  IF p_rol <> 'ADMIN'::public.rol_usuario OR NOT p_activo THEN
    SELECT count(*)
    INTO v_other_active_admins
    FROM public.perfiles
    WHERE rol = 'ADMIN'::public.rol_usuario
      AND activo = true
      AND id <> p_user_id;

    IF v_other_active_admins = 0 THEN
      RAISE EXCEPTION 'Debe permanecer al menos un administrador activo en el sistema.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  v_target_unidad_id := CASE
    WHEN p_rol = 'UNIDAD_ACADEMICA'::public.rol_usuario THEN p_unidad_academica_id
    ELSE NULL
  END;

  UPDATE public.perfiles
  SET
    nombre = v_trimmed_nombre,
    email = v_normalized_email,
    rol = p_rol,
    unidad_academica_id = v_target_unidad_id,
    activo = p_activo
  WHERE id = p_user_id
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el perfil de usuario solicitado.'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE auth.users
  SET
    email = v_normalized_email,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'nombre', v_trimmed_nombre,
      'rol', p_rol::text,
      'unidad_academica_id', v_target_unidad_id
    ),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN v_updated;
END;
$$;

--
-- Name: before_write_checklists_actas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.before_write_checklists_actas() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
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

--
-- Name: before_write_periodos_escolares(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.before_write_periodos_escolares() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
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

--
-- Name: current_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_role() RETURNS public.rol_usuario
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT rol
  FROM public.perfiles
  WHERE id = (SELECT auth.uid());
$$;

--
-- Name: current_user_unidad_academica_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_unidad_academica_id() RETURNS bigint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT unidad_academica_id
  FROM public.perfiles
  WHERE id = (SELECT auth.uid());
$$;

--
-- Name: periodos_escolares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.periodos_escolares (
    id integer NOT NULL,
    nombre text NOT NULL,
    numero_periodo smallint NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    activo boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ciclo_escolar text NOT NULL,
    CONSTRAINT ck_fechas_periodo CHECK ((fecha_fin >= fecha_inicio)),
    CONSTRAINT ck_periodos_ciclo_escolar_formato CHECK (((ciclo_escolar ~ '^[0-9]{4}-[0-9]{4}$'::text) AND ((split_part(ciclo_escolar, '-'::text, 2))::integer = ((split_part(ciclo_escolar, '-'::text, 1))::integer + 1)))),
    CONSTRAINT periodos_escolares_numero_periodo_check CHECK ((numero_periodo = ANY (ARRAY[1, 2])))
);

--
-- Name: ensure_ciclos_escolares(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_ciclos_escolares(p_fecha_referencia date DEFAULT CURRENT_DATE) RETURNS SETOF public.periodos_escolares
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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

--
-- Name: generar_siguiente_ciclo_escolar(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_siguiente_ciclo_escolar() RETURNS SETOF public.periodos_escolares
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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

--
-- Name: list_responsables_actas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.list_responsables_actas() RETURNS TABLE(id uuid, nombre text, rol public.rol_usuario)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT p.id, p.nombre, p.rol
  FROM public.perfiles p
  WHERE p.activo = true
    AND p.rol <> 'NUEVO_INGRESO'::public.rol_usuario
  ORDER BY p.nombre ASC;
$$;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

--
-- Name: checklists_actas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklists_actas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    periodo_id integer NOT NULL,
    programa_id integer NOT NULL,
    tipo_acta public.tipo_acta NOT NULL,
    estado public.estado_acta DEFAULT 'PENDIENTE'::public.estado_acta NOT NULL,
    actualizado_por uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    responsable_id uuid
);

--
-- Name: fichas_nuevo_ingreso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fichas_nuevo_ingreso (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    curp character varying(18) NOT NULL,
    a_paterno text NOT NULL,
    a_materno text DEFAULT ''::text NOT NULL,
    nombre text NOT NULL,
    sexo smallint NOT NULL,
    unidad_academica_id bigint NOT NULL,
    programa_id bigint NOT NULL,
    fecha_nacimiento date NOT NULL,
    celular character varying(15) NOT NULL,
    correo text NOT NULL,
    estatus_ficha public.estatus_ficha_nuevo_ingreso DEFAULT 'SIN_PROCESO'::public.estatus_ficha_nuevo_ingreso NOT NULL,
    periodo_id bigint NOT NULL,
    usuario_id uuid DEFAULT auth.uid() NOT NULL,
    fecha_registro date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_fichas_a_paterno CHECK ((btrim(a_paterno) <> ''::text)),
    CONSTRAINT ck_fichas_celular CHECK (((celular)::text ~ '^[0-9]{10}$'::text)),
    CONSTRAINT ck_fichas_correo CHECK ((correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)),
    CONSTRAINT ck_fichas_curp CHECK (((curp)::text ~ '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z]{2}$'::text)),
    CONSTRAINT ck_fichas_nombre CHECK ((btrim(nombre) <> ''::text)),
    CONSTRAINT ck_fichas_sexo CHECK ((sexo = ANY (ARRAY[1, 2])))
);

--
-- Name: periodos_escolares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.periodos_escolares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: periodos_escolares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.periodos_escolares_id_seq OWNED BY public.periodos_escolares.id;

--
-- Name: programas_educativos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programas_educativos (
    id integer NOT NULL,
    unidad_academica_id integer NOT NULL,
    clave_programa text NOT NULL,
    nombre text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: programas_educativos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programas_educativos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: programas_educativos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programas_educativos_id_seq OWNED BY public.programas_educativos.id;

--
-- Name: seguimientos_tramite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seguimientos_tramite (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    periodo_id integer NOT NULL,
    programa_id integer NOT NULL,
    tipo_tramite_id integer NOT NULL,
    usuario_id uuid NOT NULL,
    fecha_corte date NOT NULL,
    cantidad_enviadas integer DEFAULT 0 NOT NULL,
    cantidad_resueltas integer DEFAULT 0 NOT NULL,
    cantidad_pendientes integer DEFAULT 0 NOT NULL,
    cantidad_con_error integer DEFAULT 0 NOT NULL,
    observaciones text,
    archivo_pdf_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_totales_validos CHECK ((((cantidad_resueltas + cantidad_pendientes) + cantidad_con_error) <= cantidad_enviadas)),
    CONSTRAINT seguimientos_tramite_cantidad_con_error_check CHECK ((cantidad_con_error >= 0)),
    CONSTRAINT seguimientos_tramite_cantidad_enviadas_check CHECK ((cantidad_enviadas >= 0)),
    CONSTRAINT seguimientos_tramite_cantidad_pendientes_check CHECK ((cantidad_pendientes >= 0)),
    CONSTRAINT seguimientos_tramite_cantidad_resueltas_check CHECK ((cantidad_resueltas >= 0))
);

--
-- Name: tipos_tramite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_tramite (
    id integer NOT NULL,
    nombre text NOT NULL,
    modulo public.modulo_tramite DEFAULT 'TRAMITES_GENERALES'::public.modulo_tramite NOT NULL,
    permite_pdf boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: tipos_tramite_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_tramite_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: tipos_tramite_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_tramite_id_seq OWNED BY public.tipos_tramite.id;

--
-- Name: tramites_alumnos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tramites_alumnos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    folio bigint NOT NULL,
    numero_cuenta text NOT NULL,
    nombre_alumno text NOT NULL,
    programa_id bigint NOT NULL,
    tipo_tramite_id bigint NOT NULL,
    periodo_id bigint NOT NULL,
    usuario_id uuid DEFAULT auth.uid() NOT NULL,
    fecha_registro date DEFAULT CURRENT_DATE NOT NULL,
    estado public.estado_tramite_alumno DEFAULT 'PENDIENTE'::public.estado_tramite_alumno NOT NULL,
    observaciones text,
    archivo_pdf_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_tramites_alumnos_nombre_alumno CHECK ((btrim(nombre_alumno) <> ''::text)),
    CONSTRAINT ck_tramites_alumnos_numero_cuenta CHECK (((btrim(numero_cuenta) <> ''::text) AND (char_length(btrim(numero_cuenta)) <= 30)))
);

--
-- Name: tramites_alumnos_folio_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tramites_alumnos ALTER COLUMN folio ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tramites_alumnos_folio_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: unidades_academicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades_academicas (
    id integer NOT NULL,
    clave_ua text NOT NULL,
    nombre text NOT NULL,
    nivel public.nivel_educativo NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: unidades_academicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidades_academicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: unidades_academicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidades_academicas_id_seq OWNED BY public.unidades_academicas.id;

--
-- Name: periodos_escolares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_escolares ALTER COLUMN id SET DEFAULT nextval('public.periodos_escolares_id_seq'::regclass);

--
-- Name: programas_educativos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programas_educativos ALTER COLUMN id SET DEFAULT nextval('public.programas_educativos_id_seq'::regclass);

--
-- Name: tipos_tramite id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_tramite ALTER COLUMN id SET DEFAULT nextval('public.tipos_tramite_id_seq'::regclass);

--
-- Name: unidades_academicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_academicas ALTER COLUMN id SET DEFAULT nextval('public.unidades_academicas_id_seq'::regclass);

--
-- Name: checklists_actas checklists_actas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists_actas
    ADD CONSTRAINT checklists_actas_pkey PRIMARY KEY (id);

--
-- Name: fichas_nuevo_ingreso fichas_nuevo_ingreso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_nuevo_ingreso
    ADD CONSTRAINT fichas_nuevo_ingreso_pkey PRIMARY KEY (id);

--
-- Name: perfiles perfiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles
    ADD CONSTRAINT perfiles_email_key UNIQUE (email);

--
-- Name: perfiles perfiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles
    ADD CONSTRAINT perfiles_pkey PRIMARY KEY (id);

--
-- Name: periodos_escolares periodos_escolares_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_escolares
    ADD CONSTRAINT periodos_escolares_nombre_key UNIQUE (nombre);

--
-- Name: periodos_escolares periodos_escolares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_escolares
    ADD CONSTRAINT periodos_escolares_pkey PRIMARY KEY (id);

--
-- Name: programas_educativos programas_educativos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programas_educativos
    ADD CONSTRAINT programas_educativos_pkey PRIMARY KEY (id);

--
-- Name: seguimientos_tramite seguimientos_tramite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimientos_tramite
    ADD CONSTRAINT seguimientos_tramite_pkey PRIMARY KEY (id);

--
-- Name: tipos_tramite tipos_tramite_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_tramite
    ADD CONSTRAINT tipos_tramite_nombre_key UNIQUE (nombre);

--
-- Name: tipos_tramite tipos_tramite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_tramite
    ADD CONSTRAINT tipos_tramite_pkey PRIMARY KEY (id);

--
-- Name: tramites_alumnos tramites_alumnos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tramites_alumnos
    ADD CONSTRAINT tramites_alumnos_pkey PRIMARY KEY (id);

--
-- Name: unidades_academicas unidades_academicas_clave_ua_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_academicas
    ADD CONSTRAINT unidades_academicas_clave_ua_key UNIQUE (clave_ua);

--
-- Name: unidades_academicas unidades_academicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_academicas
    ADD CONSTRAINT unidades_academicas_pkey PRIMARY KEY (id);

--
-- Name: seguimientos_tramite uq_corte_tramite; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimientos_tramite
    ADD CONSTRAINT uq_corte_tramite UNIQUE (periodo_id, programa_id, tipo_tramite_id, fecha_corte);

--
-- Name: programas_educativos uq_escuela_programa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programas_educativos
    ADD CONSTRAINT uq_escuela_programa UNIQUE (unidad_academica_id, clave_programa);

--
-- Name: fichas_nuevo_ingreso uq_fichas_curp_periodo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_nuevo_ingreso
    ADD CONSTRAINT uq_fichas_curp_periodo UNIQUE (curp, periodo_id);

--
-- Name: checklists_actas uq_periodo_carrera_acta; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists_actas
    ADD CONSTRAINT uq_periodo_carrera_acta UNIQUE (periodo_id, programa_id, tipo_acta);

--
-- Name: periodos_escolares uq_periodos_ciclo_numero; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_escolares
    ADD CONSTRAINT uq_periodos_ciclo_numero UNIQUE (ciclo_escolar, numero_periodo);

--
-- Name: programas_educativos uq_programas_unidad_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programas_educativos
    ADD CONSTRAINT uq_programas_unidad_id UNIQUE (unidad_academica_id, id);

--
-- Name: tramites_alumnos uq_tramites_alumnos_folio; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tramites_alumnos
    ADD CONSTRAINT uq_tramites_alumnos_folio UNIQUE (folio);

--
-- Name: idx_checklists_periodo_programa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklists_periodo_programa ON public.checklists_actas USING btree (periodo_id, programa_id);

--
-- Name: idx_fichas_nuevo_ingreso_estatus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fichas_nuevo_ingreso_estatus ON public.fichas_nuevo_ingreso USING btree (estatus_ficha);

--
-- Name: idx_fichas_nuevo_ingreso_periodo_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fichas_nuevo_ingreso_periodo_fecha ON public.fichas_nuevo_ingreso USING btree (periodo_id, fecha_registro DESC);

--
-- Name: idx_fichas_nuevo_ingreso_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fichas_nuevo_ingreso_unidad ON public.fichas_nuevo_ingreso USING btree (unidad_academica_id);

--
-- Name: idx_seguimientos_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seguimientos_fecha ON public.seguimientos_tramite USING btree (fecha_corte);

--
-- Name: idx_seguimientos_periodo_programa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seguimientos_periodo_programa ON public.seguimientos_tramite USING btree (periodo_id, programa_id);

--
-- Name: idx_tramites_alumnos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tramites_alumnos_estado ON public.tramites_alumnos USING btree (estado);

--
-- Name: idx_tramites_alumnos_numero_cuenta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tramites_alumnos_numero_cuenta ON public.tramites_alumnos USING btree (numero_cuenta);

--
-- Name: idx_tramites_alumnos_periodo_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tramites_alumnos_periodo_fecha ON public.tramites_alumnos USING btree (periodo_id, fecha_registro DESC);

--
-- Name: idx_tramites_alumnos_programa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tramites_alumnos_programa ON public.tramites_alumnos USING btree (programa_id);

--
-- Name: idx_tramites_alumnos_tipo_tramite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tramites_alumnos_tipo_tramite ON public.tramites_alumnos USING btree (tipo_tramite_id);

--
-- Name: checklists_actas trg_checklists_actas_before_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_checklists_actas_before_write BEFORE INSERT OR UPDATE ON public.checklists_actas FOR EACH ROW EXECUTE FUNCTION public.before_write_checklists_actas();

--
-- Name: fichas_nuevo_ingreso trg_fichas_nuevo_ingreso_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fichas_nuevo_ingreso_updated_at BEFORE UPDATE ON public.fichas_nuevo_ingreso FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: periodos_escolares trg_periodos_escolares_before_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_periodos_escolares_before_write BEFORE INSERT OR UPDATE ON public.periodos_escolares FOR EACH ROW EXECUTE FUNCTION public.before_write_periodos_escolares();

--
-- Name: tramites_alumnos trg_tramites_alumnos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tramites_alumnos_updated_at BEFORE UPDATE ON public.tramites_alumnos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: checklists_actas checklists_actas_actualizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists_actas
    ADD CONSTRAINT checklists_actas_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.perfiles(id) ON DELETE SET NULL;

--
-- Name: checklists_actas checklists_actas_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists_actas
    ADD CONSTRAINT checklists_actas_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos_escolares(id) ON DELETE RESTRICT;

--
-- Name: checklists_actas checklists_actas_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists_actas
    ADD CONSTRAINT checklists_actas_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_educativos(id) ON DELETE RESTRICT;

--
-- Name: checklists_actas checklists_actas_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists_actas
    ADD CONSTRAINT checklists_actas_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.perfiles(id) ON DELETE SET NULL;

--
-- Name: fichas_nuevo_ingreso fichas_nuevo_ingreso_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_nuevo_ingreso
    ADD CONSTRAINT fichas_nuevo_ingreso_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos_escolares(id) ON DELETE RESTRICT;

--
-- Name: fichas_nuevo_ingreso fichas_nuevo_ingreso_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_nuevo_ingreso
    ADD CONSTRAINT fichas_nuevo_ingreso_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_educativos(id) ON DELETE RESTRICT;

--
-- Name: fichas_nuevo_ingreso fichas_nuevo_ingreso_unidad_academica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_nuevo_ingreso
    ADD CONSTRAINT fichas_nuevo_ingreso_unidad_academica_id_fkey FOREIGN KEY (unidad_academica_id) REFERENCES public.unidades_academicas(id) ON DELETE RESTRICT;

--
-- Name: fichas_nuevo_ingreso fichas_nuevo_ingreso_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_nuevo_ingreso
    ADD CONSTRAINT fichas_nuevo_ingreso_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id) ON DELETE RESTRICT;

--
-- Name: fichas_nuevo_ingreso fk_fichas_unidad_programa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_nuevo_ingreso
    ADD CONSTRAINT fk_fichas_unidad_programa FOREIGN KEY (unidad_academica_id, programa_id) REFERENCES public.programas_educativos(unidad_academica_id, id) ON DELETE RESTRICT;

--
-- Name: perfiles perfiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles
    ADD CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: perfiles perfiles_unidad_academica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles
    ADD CONSTRAINT perfiles_unidad_academica_id_fkey FOREIGN KEY (unidad_academica_id) REFERENCES public.unidades_academicas(id) ON DELETE RESTRICT;

--
-- Name: programas_educativos programas_educativos_unidad_academica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programas_educativos
    ADD CONSTRAINT programas_educativos_unidad_academica_id_fkey FOREIGN KEY (unidad_academica_id) REFERENCES public.unidades_academicas(id) ON DELETE CASCADE;

--
-- Name: seguimientos_tramite seguimientos_tramite_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimientos_tramite
    ADD CONSTRAINT seguimientos_tramite_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos_escolares(id) ON DELETE RESTRICT;

--
-- Name: seguimientos_tramite seguimientos_tramite_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimientos_tramite
    ADD CONSTRAINT seguimientos_tramite_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_educativos(id) ON DELETE RESTRICT;

--
-- Name: seguimientos_tramite seguimientos_tramite_tipo_tramite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimientos_tramite
    ADD CONSTRAINT seguimientos_tramite_tipo_tramite_id_fkey FOREIGN KEY (tipo_tramite_id) REFERENCES public.tipos_tramite(id) ON DELETE RESTRICT;

--
-- Name: seguimientos_tramite seguimientos_tramite_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimientos_tramite
    ADD CONSTRAINT seguimientos_tramite_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id) ON DELETE RESTRICT;

--
-- Name: tramites_alumnos tramites_alumnos_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tramites_alumnos
    ADD CONSTRAINT tramites_alumnos_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos_escolares(id) ON DELETE RESTRICT;

--
-- Name: tramites_alumnos tramites_alumnos_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tramites_alumnos
    ADD CONSTRAINT tramites_alumnos_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_educativos(id) ON DELETE RESTRICT;

--
-- Name: tramites_alumnos tramites_alumnos_tipo_tramite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tramites_alumnos
    ADD CONSTRAINT tramites_alumnos_tipo_tramite_id_fkey FOREIGN KEY (tipo_tramite_id) REFERENCES public.tipos_tramite(id) ON DELETE RESTRICT;

--
-- Name: tramites_alumnos tramites_alumnos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tramites_alumnos
    ADD CONSTRAINT tramites_alumnos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id) ON DELETE RESTRICT;

--
-- Name: periodos_escolares catalogos_admin_periodos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY catalogos_admin_periodos ON public.periodos_escolares TO authenticated USING ((public.current_user_role() = 'ADMIN'::public.rol_usuario));

--
-- Name: programas_educativos catalogos_admin_programas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY catalogos_admin_programas ON public.programas_educativos TO authenticated USING ((public.current_user_role() = 'ADMIN'::public.rol_usuario));

--
-- Name: tipos_tramite catalogos_admin_tramites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY catalogos_admin_tramites ON public.tipos_tramite TO authenticated USING ((public.current_user_role() = 'ADMIN'::public.rol_usuario));

--
-- Name: unidades_academicas catalogos_admin_unidades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY catalogos_admin_unidades ON public.unidades_academicas TO authenticated USING ((public.current_user_role() = 'ADMIN'::public.rol_usuario));

--
-- Name: periodos_escolares catalogos_select_periodos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY catalogos_select_periodos ON public.periodos_escolares FOR SELECT TO authenticated USING (true);

--
-- Name: programas_educativos catalogos_select_programas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY catalogos_select_programas ON public.programas_educativos FOR SELECT TO authenticated USING (((( SELECT public.current_user_role() AS current_user_role) <> 'UNIDAD_ACADEMICA'::public.rol_usuario) OR (unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id))));

--
-- Name: tipos_tramite catalogos_select_tramites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY catalogos_select_tramites ON public.tipos_tramite FOR SELECT TO authenticated USING (true);

--
-- Name: unidades_academicas catalogos_select_unidades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY catalogos_select_unidades ON public.unidades_academicas FOR SELECT TO authenticated USING (((( SELECT public.current_user_role() AS current_user_role) <> 'UNIDAD_ACADEMICA'::public.rol_usuario) OR (id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id))));

--
-- Name: checklists_actas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklists_actas ENABLE ROW LEVEL SECURITY;

--
-- Name: checklists_actas checklists_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklists_delete_policy ON public.checklists_actas FOR DELETE TO authenticated USING ((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario));

--
-- Name: checklists_actas checklists_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklists_insert_policy ON public.checklists_actas FOR INSERT TO authenticated WITH CHECK (((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario) OR ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario])) AND (EXISTS ( SELECT 1
   FROM (public.programas_educativos pe
     JOIN public.unidades_academicas ua ON ((ua.id = pe.unidad_academica_id)))
  WHERE ((pe.id = checklists_actas.programa_id) AND ((ua.nivel)::text = (( SELECT public.current_user_role() AS current_user_role))::text))))) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.programas_educativos pe
  WHERE ((pe.id = checklists_actas.programa_id) AND (pe.unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id))))))));

--
-- Name: checklists_actas checklists_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklists_select_policy ON public.checklists_actas FOR SELECT TO authenticated USING (((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario) OR ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario])) AND (EXISTS ( SELECT 1
   FROM (public.programas_educativos pe
     JOIN public.unidades_academicas ua ON ((ua.id = pe.unidad_academica_id)))
  WHERE ((pe.id = checklists_actas.programa_id) AND ((ua.nivel)::text = (( SELECT public.current_user_role() AS current_user_role))::text))))) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.programas_educativos pe
  WHERE ((pe.id = checklists_actas.programa_id) AND (pe.unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id))))))));

--
-- Name: checklists_actas checklists_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklists_update_policy ON public.checklists_actas FOR UPDATE TO authenticated USING (((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario) OR ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario])) AND (EXISTS ( SELECT 1
   FROM (public.programas_educativos pe
     JOIN public.unidades_academicas ua ON ((ua.id = pe.unidad_academica_id)))
  WHERE ((pe.id = checklists_actas.programa_id) AND ((ua.nivel)::text = (( SELECT public.current_user_role() AS current_user_role))::text))))) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.programas_educativos pe
  WHERE ((pe.id = checklists_actas.programa_id) AND (pe.unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id)))))))) WITH CHECK (((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario) OR ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario])) AND (EXISTS ( SELECT 1
   FROM (public.programas_educativos pe
     JOIN public.unidades_academicas ua ON ((ua.id = pe.unidad_academica_id)))
  WHERE ((pe.id = checklists_actas.programa_id) AND ((ua.nivel)::text = (( SELECT public.current_user_role() AS current_user_role))::text))))) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.programas_educativos pe
  WHERE ((pe.id = checklists_actas.programa_id) AND (pe.unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id))))))));

--
-- Name: fichas_nuevo_ingreso; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fichas_nuevo_ingreso ENABLE ROW LEVEL SECURITY;

--
-- Name: fichas_nuevo_ingreso fichas_nuevo_ingreso_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fichas_nuevo_ingreso_delete_policy ON public.fichas_nuevo_ingreso FOR DELETE TO authenticated USING ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['ADMIN'::public.rol_usuario, 'NUEVO_INGRESO'::public.rol_usuario])));

--
-- Name: fichas_nuevo_ingreso fichas_nuevo_ingreso_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fichas_nuevo_ingreso_insert_policy ON public.fichas_nuevo_ingreso FOR INSERT TO authenticated WITH CHECK (((usuario_id = ( SELECT auth.uid() AS uid)) AND ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['ADMIN'::public.rol_usuario, 'NUEVO_INGRESO'::public.rol_usuario])) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id))))));

--
-- Name: fichas_nuevo_ingreso fichas_nuevo_ingreso_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fichas_nuevo_ingreso_select_policy ON public.fichas_nuevo_ingreso FOR SELECT TO authenticated USING (((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['ADMIN'::public.rol_usuario, 'NUEVO_INGRESO'::public.rol_usuario])) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id)))));

--
-- Name: fichas_nuevo_ingreso fichas_nuevo_ingreso_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fichas_nuevo_ingreso_update_policy ON public.fichas_nuevo_ingreso FOR UPDATE TO authenticated USING (((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['ADMIN'::public.rol_usuario, 'NUEVO_INGRESO'::public.rol_usuario])) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id))))) WITH CHECK (((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['ADMIN'::public.rol_usuario, 'NUEVO_INGRESO'::public.rol_usuario])) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id)))));

--
-- Name: perfiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

--
-- Name: perfiles perfiles_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_delete_policy ON public.perfiles FOR DELETE TO authenticated USING ((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario));

--
-- Name: perfiles perfiles_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_insert_policy ON public.perfiles FOR INSERT TO authenticated WITH CHECK ((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario));

--
-- Name: perfiles perfiles_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_select_policy ON public.perfiles FOR SELECT TO authenticated USING (((id = ( SELECT auth.uid() AS uid)) OR (( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario)));

--
-- Name: perfiles perfiles_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_update_policy ON public.perfiles FOR UPDATE TO authenticated USING ((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario)) WITH CHECK ((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario));

--
-- Name: periodos_escolares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.periodos_escolares ENABLE ROW LEVEL SECURITY;

--
-- Name: programas_educativos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.programas_educativos ENABLE ROW LEVEL SECURITY;

--
-- Name: seguimientos_tramite seguimientos_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seguimientos_insert_policy ON public.seguimientos_tramite FOR INSERT TO authenticated WITH CHECK (((usuario_id = ( SELECT auth.uid() AS uid)) AND ((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario) OR ((( SELECT public.current_user_role() AS current_user_role) = 'NUEVO_INGRESO'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.tipos_tramite tt
  WHERE ((tt.id = seguimientos_tramite.tipo_tramite_id) AND (tt.modulo = 'NUEVO_INGRESO'::public.modulo_tramite))))) OR ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario])) AND (EXISTS ( SELECT 1
   FROM (public.programas_educativos pe
     JOIN public.unidades_academicas ua ON ((ua.id = pe.unidad_academica_id)))
  WHERE ((pe.id = seguimientos_tramite.programa_id) AND ((ua.nivel)::text = (( SELECT public.current_user_role() AS current_user_role))::text))))) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.programas_educativos pe
  WHERE ((pe.id = seguimientos_tramite.programa_id) AND (pe.unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id)))))))));

--
-- Name: seguimientos_tramite seguimientos_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seguimientos_select_policy ON public.seguimientos_tramite FOR SELECT TO authenticated USING (((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario) OR ((( SELECT public.current_user_role() AS current_user_role) = 'NUEVO_INGRESO'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.tipos_tramite tt
  WHERE ((tt.id = seguimientos_tramite.tipo_tramite_id) AND (tt.modulo = 'NUEVO_INGRESO'::public.modulo_tramite))))) OR ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario])) AND (EXISTS ( SELECT 1
   FROM (public.programas_educativos pe
     JOIN public.unidades_academicas ua ON ((ua.id = pe.unidad_academica_id)))
  WHERE ((pe.id = seguimientos_tramite.programa_id) AND ((ua.nivel)::text = (( SELECT public.current_user_role() AS current_user_role))::text))))) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.programas_educativos pe
  WHERE ((pe.id = seguimientos_tramite.programa_id) AND (pe.unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id))))))));

--
-- Name: seguimientos_tramite; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seguimientos_tramite ENABLE ROW LEVEL SECURITY;

--
-- Name: seguimientos_tramite seguimientos_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seguimientos_update_policy ON public.seguimientos_tramite FOR UPDATE TO authenticated USING (((public.current_user_role() = 'ADMIN'::public.rol_usuario) OR (usuario_id = auth.uid()))) WITH CHECK (((public.current_user_role() = 'ADMIN'::public.rol_usuario) OR (usuario_id = auth.uid())));

--
-- Name: tipos_tramite; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tipos_tramite ENABLE ROW LEVEL SECURITY;

--
-- Name: tramites_alumnos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tramites_alumnos ENABLE ROW LEVEL SECURITY;

--
-- Name: tramites_alumnos tramites_alumnos_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tramites_alumnos_delete_policy ON public.tramites_alumnos FOR DELETE TO authenticated USING ((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario));

--
-- Name: tramites_alumnos tramites_alumnos_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tramites_alumnos_insert_policy ON public.tramites_alumnos FOR INSERT TO authenticated WITH CHECK (((usuario_id = ( SELECT auth.uid() AS uid)) AND ((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario) OR ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario])) AND (EXISTS ( SELECT 1
   FROM (public.programas_educativos pe
     JOIN public.unidades_academicas ua ON ((ua.id = pe.unidad_academica_id)))
  WHERE ((pe.id = tramites_alumnos.programa_id) AND ((ua.nivel)::text = (( SELECT public.current_user_role() AS current_user_role))::text))))) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.programas_educativos pe
  WHERE ((pe.id = tramites_alumnos.programa_id) AND (pe.unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id)))))))));

--
-- Name: tramites_alumnos tramites_alumnos_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tramites_alumnos_select_policy ON public.tramites_alumnos FOR SELECT TO authenticated USING (((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario) OR ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario])) AND (EXISTS ( SELECT 1
   FROM (public.programas_educativos pe
     JOIN public.unidades_academicas ua ON ((ua.id = pe.unidad_academica_id)))
  WHERE ((pe.id = tramites_alumnos.programa_id) AND ((ua.nivel)::text = (( SELECT public.current_user_role() AS current_user_role))::text))))) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.programas_educativos pe
  WHERE ((pe.id = tramites_alumnos.programa_id) AND (pe.unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id))))))));

--
-- Name: tramites_alumnos tramites_alumnos_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tramites_alumnos_update_policy ON public.tramites_alumnos FOR UPDATE TO authenticated USING (((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario) OR ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario])) AND (EXISTS ( SELECT 1
   FROM (public.programas_educativos pe
     JOIN public.unidades_academicas ua ON ((ua.id = pe.unidad_academica_id)))
  WHERE ((pe.id = tramites_alumnos.programa_id) AND ((ua.nivel)::text = (( SELECT public.current_user_role() AS current_user_role))::text))))) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.programas_educativos pe
  WHERE ((pe.id = tramites_alumnos.programa_id) AND (pe.unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id)))))))) WITH CHECK (((( SELECT public.current_user_role() AS current_user_role) = 'ADMIN'::public.rol_usuario) OR ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['LICENCIATURA'::public.rol_usuario, 'BACHILLERATO'::public.rol_usuario])) AND (EXISTS ( SELECT 1
   FROM (public.programas_educativos pe
     JOIN public.unidades_academicas ua ON ((ua.id = pe.unidad_academica_id)))
  WHERE ((pe.id = tramites_alumnos.programa_id) AND ((ua.nivel)::text = (( SELECT public.current_user_role() AS current_user_role))::text))))) OR ((( SELECT public.current_user_role() AS current_user_role) = 'UNIDAD_ACADEMICA'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.programas_educativos pe
  WHERE ((pe.id = tramites_alumnos.programa_id) AND (pe.unidad_academica_id = ( SELECT public.current_user_unidad_academica_id() AS current_user_unidad_academica_id))))))));

--
-- Name: unidades_academicas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unidades_academicas ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

--
-- Name: FUNCTION admin_delete_usuario(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_delete_usuario(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_delete_usuario(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_delete_usuario(p_user_id uuid) TO service_role;

--
-- Name: TABLE perfiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.perfiles TO anon;
GRANT ALL ON TABLE public.perfiles TO authenticated;
GRANT ALL ON TABLE public.perfiles TO service_role;

--
-- Name: FUNCTION admin_update_usuario(p_user_id uuid, p_nombre text, p_email text, p_rol public.rol_usuario, p_activo boolean, p_unidad_academica_id bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_update_usuario(p_user_id uuid, p_nombre text, p_email text, p_rol public.rol_usuario, p_activo boolean, p_unidad_academica_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_update_usuario(p_user_id uuid, p_nombre text, p_email text, p_rol public.rol_usuario, p_activo boolean, p_unidad_academica_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.admin_update_usuario(p_user_id uuid, p_nombre text, p_email text, p_rol public.rol_usuario, p_activo boolean, p_unidad_academica_id bigint) TO service_role;

--
-- Name: FUNCTION before_write_checklists_actas(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.before_write_checklists_actas() TO anon;
GRANT ALL ON FUNCTION public.before_write_checklists_actas() TO authenticated;
GRANT ALL ON FUNCTION public.before_write_checklists_actas() TO service_role;

--
-- Name: FUNCTION before_write_periodos_escolares(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.before_write_periodos_escolares() TO anon;
GRANT ALL ON FUNCTION public.before_write_periodos_escolares() TO authenticated;
GRANT ALL ON FUNCTION public.before_write_periodos_escolares() TO service_role;

--
-- Name: FUNCTION current_user_role(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.current_user_role() TO anon;
GRANT ALL ON FUNCTION public.current_user_role() TO authenticated;
GRANT ALL ON FUNCTION public.current_user_role() TO service_role;

--
-- Name: FUNCTION current_user_unidad_academica_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.current_user_unidad_academica_id() TO anon;
GRANT ALL ON FUNCTION public.current_user_unidad_academica_id() TO authenticated;
GRANT ALL ON FUNCTION public.current_user_unidad_academica_id() TO service_role;

--
-- Name: TABLE periodos_escolares; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.periodos_escolares TO anon;
GRANT ALL ON TABLE public.periodos_escolares TO authenticated;
GRANT ALL ON TABLE public.periodos_escolares TO service_role;

--
-- Name: FUNCTION ensure_ciclos_escolares(p_fecha_referencia date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.ensure_ciclos_escolares(p_fecha_referencia date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.ensure_ciclos_escolares(p_fecha_referencia date) TO authenticated;
GRANT ALL ON FUNCTION public.ensure_ciclos_escolares(p_fecha_referencia date) TO service_role;

--
-- Name: FUNCTION generar_siguiente_ciclo_escolar(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.generar_siguiente_ciclo_escolar() FROM PUBLIC;
GRANT ALL ON FUNCTION public.generar_siguiente_ciclo_escolar() TO authenticated;
GRANT ALL ON FUNCTION public.generar_siguiente_ciclo_escolar() TO service_role;

--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

--
-- Name: FUNCTION list_responsables_actas(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.list_responsables_actas() FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_responsables_actas() TO authenticated;
GRANT ALL ON FUNCTION public.list_responsables_actas() TO service_role;

--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

--
-- Name: TABLE checklists_actas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.checklists_actas TO anon;
GRANT ALL ON TABLE public.checklists_actas TO authenticated;
GRANT ALL ON TABLE public.checklists_actas TO service_role;

--
-- Name: TABLE fichas_nuevo_ingreso; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fichas_nuevo_ingreso TO anon;
GRANT ALL ON TABLE public.fichas_nuevo_ingreso TO authenticated;
GRANT ALL ON TABLE public.fichas_nuevo_ingreso TO service_role;

--
-- Name: SEQUENCE periodos_escolares_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.periodos_escolares_id_seq TO anon;
GRANT ALL ON SEQUENCE public.periodos_escolares_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.periodos_escolares_id_seq TO service_role;

--
-- Name: TABLE programas_educativos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.programas_educativos TO anon;
GRANT ALL ON TABLE public.programas_educativos TO authenticated;
GRANT ALL ON TABLE public.programas_educativos TO service_role;

--
-- Name: SEQUENCE programas_educativos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.programas_educativos_id_seq TO anon;
GRANT ALL ON SEQUENCE public.programas_educativos_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.programas_educativos_id_seq TO service_role;

--
-- Name: TABLE seguimientos_tramite; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.seguimientos_tramite TO anon;
GRANT ALL ON TABLE public.seguimientos_tramite TO authenticated;
GRANT ALL ON TABLE public.seguimientos_tramite TO service_role;

--
-- Name: TABLE tipos_tramite; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tipos_tramite TO anon;
GRANT ALL ON TABLE public.tipos_tramite TO authenticated;
GRANT ALL ON TABLE public.tipos_tramite TO service_role;

--
-- Name: SEQUENCE tipos_tramite_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tipos_tramite_id_seq TO anon;
GRANT ALL ON SEQUENCE public.tipos_tramite_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.tipos_tramite_id_seq TO service_role;

--
-- Name: TABLE tramites_alumnos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tramites_alumnos TO anon;
GRANT ALL ON TABLE public.tramites_alumnos TO authenticated;
GRANT ALL ON TABLE public.tramites_alumnos TO service_role;

--
-- Name: SEQUENCE tramites_alumnos_folio_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tramites_alumnos_folio_seq TO anon;
GRANT ALL ON SEQUENCE public.tramites_alumnos_folio_seq TO authenticated;
GRANT ALL ON SEQUENCE public.tramites_alumnos_folio_seq TO service_role;

--
-- Name: TABLE unidades_academicas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.unidades_academicas TO anon;
GRANT ALL ON TABLE public.unidades_academicas TO authenticated;
GRANT ALL ON TABLE public.unidades_academicas TO service_role;

--
-- Name: SEQUENCE unidades_academicas_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.unidades_academicas_id_seq TO anon;
GRANT ALL ON SEQUENCE public.unidades_academicas_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.unidades_academicas_id_seq TO service_role;

--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- PostgreSQL database dump complete
--

-- ============================================================================
-- Migración pendiente de folio manual en texto (tramites_alumnos.folio)
-- ============================================================================

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

REVOKE ALL ON FUNCTION public.normalize_tramites_alumnos_folio() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_tramites_alumnos_folio() TO authenticated, service_role;

-- ============================================================================
-- Trigger en auth.users para crear perfil automático en public.perfiles
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Catálogos base oficiales (sin datos operativos ni usuarios)
-- ============================================================================


--
-- PostgreSQL database dump
--

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.12

SET standard_conforming_strings = on;
SET check_function_bodies = false;

--
-- Data for Name: periodos_escolares; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.periodos_escolares (id, nombre, numero_periodo, fecha_inicio, fecha_fin, activo, created_at, ciclo_escolar) VALUES (1, '2026-2027 Periodo 1 (Ago-Ene)', 1, '2026-08-01', '2027-01-31', true, '2026-11-03 00:44:51.156329+00', '2026-2027');
INSERT INTO public.periodos_escolares (id, nombre, numero_periodo, fecha_inicio, fecha_fin, activo, created_at, ciclo_escolar) VALUES (2, '2026-2027 Periodo 2 (Feb-Jul)', 2, '2027-02-01', '2027-07-31', false, '2026-11-03 00:44:51.156329+00', '2026-2027');

--
-- Data for Name: unidades_academicas; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (4, '4600', 'Facultad de Contaduría y Administración (FCA)', 'LICENCIATURA', true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (9, '2206', 'FAC. DE MEDICINA (EXT. MAZATLAN)', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (10, '4500', 'FAC. DE CIENCIAS SOCIALES MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (11, '4510', 'FAC. DE CIENCIAS ECONÓMICO ADMINISTRATIVAS DE MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (2, '4520', 'FAC. DE DERECHO MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (3, '4530', 'FAC. DE PSICOLOGÍA MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (14, '4540', 'UA DE GASTRONOMÍA Y NUTRICIÓN MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (15, '4550', 'FAC. DE ARQUITECTURA Y DISEÑO INDUSTRIAL', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (16, '4560', 'UA DE EDUCACIÓN FÍSICA Y DEPORTE MAZATLAN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (17, '4570', 'UA DE CIENCIAS DE LA EDUCACIÓN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (18, '4610', 'ESCUELA DE TURISMO MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (19, '4700', 'FAC. DE INGENIERÍA Y TECNOLOGÍA DE MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (21, '4900', 'FAC. DE CIENCIAS DEL MAR', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (22, '4920', 'CENTRO DE ESTUDIOS SUPERIORES DE EL ROSARIO', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (23, '5810', 'FAC. DE TRABAJO SOCIAL MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (24, '5820', 'FAC. DE ENFERMERÍA MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (25, '9054', 'UA DE ARTES EXTENSIÓN MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (26, '9811', 'CENTRO DE ESTUDIOS DE IDIOMAS MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (1, '4800', 'FAC. DE INFORMÁTICA MAZATLÁN', 'LICENCIATURA', true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (27, '8210', 'PREPARATORIA CONCORDIA', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (28, '8212', 'PREPARATORIA CONCORDIA EXTENSIÓN POTRERILLOS', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (29, '8213', 'PREPARATORIA CONCORDIA EXTENSIÓN AGUA CALIENTE', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (30, '8215', 'PREPARATORIA CONCORDIA EXTENSIÓN EL VERDE', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (31, '8220', 'PREPARATORIA EL ROSARIO', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (32, '8221', 'PREPARATORIA EL ROSARIO EXTENSIÓN AGUA VERDE', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (33, '8222', 'PREPARATORIA EL ROSARIO EXTENSIÓN LOS POZOS', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (34, '8230', 'PREPARATORIA ESCUINAPA', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (35, '8231', 'PREPARATORIA ESCUINAPA EXTENSIÓN ISLA DEL BOSQUE', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (36, '8232', 'PREPARATORIA ESCUINAPA EXTENSIÓN TEACAPÁN', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (37, '8240', 'PREPARATORIA MAZATLÁN', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (38, '8242', 'PREPARATORIA MAZATLÁN EXT. LA NORIA', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (39, '8250', 'PREPARATORIA ANTONIO ROSALES', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (40, '8251', 'PREPARATORIA ANTONIO ROSALES EXTENSIÓN MÁRMOL', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (41, '8260', 'PREPARATORIA RUBÉN JARAMILLO', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (42, '8261', 'PREPARATORIA VILLA UNIÓN', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (43, '8262', 'PREPARATORIA RUBÉN JARAMILLO EXTENSIÓN EL QUELITE', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (44, '8270', 'PREPARATORIA SAN IGNACIO', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.unidades_academicas (id, clave_ua, nombre, nivel, activa, created_at) VALUES (45, '8271', 'PREPARATORIA SAN IGNACIO EXTENSIÓN PIAXTLA', 'BACHILLERATO', true, '2026-11-03 00:51:38.415503+00');

--
-- Data for Name: programas_educativos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (10, 9, '1', 'MÉDICO GENERAL', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (11, 10, '4', 'LICENCIATURA EN SOCIOLOGÍA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (12, 10, '3', 'LICENCIATURA EN ECONOMÍA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (13, 10, '2', 'LICENCIATURA EN COMERCIO INTERNACIONAL', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (14, 10, '1', 'LICENCIATURA EN CIENCIAS DE LA COMUNICACIÓN', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (15, 11, '4', 'LICENCIATURA EN MERCADOTECNIA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (16, 11, '3', 'LICENCIATURA EN CONTADURÍA PÚBLICA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (17, 11, '2', 'LICENCIATURA EN ADMINISTRACIÓN DE RECURSOS HUMANOS', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (18, 11, '1', 'LICENCIATURA EN ADMINISTRACIÓN DE EMPRESAS', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (19, 2, '3', 'LICENCIATURA EN DERECHO MODALIDAD SEMIESCOLARIZADA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (5, 2, '2', 'LICENCIATURA EN DERECHO', true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (4, 2, '1', 'LICENCIATURA EN CRIMINALÍSTICA Y CIENCIAS FORENSES', true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (22, 3, '2', 'LICENCIATURA EN PSICOLOGÍA SEMIESCOLARIZADA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (23, 3, '1', 'LICENCIATURA EN PSICOLOGÍA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (24, 14, '2', 'LICENCIATURA EN NUTRICIÓN', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (25, 14, '1', 'LICENCIATURA EN GASTRONOMÍA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (26, 15, '2', 'LICENCIATURA EN DISEÑO INDUSTRIAL', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (27, 15, '1', 'LICENCIATURA EN ARQUITECTURA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (28, 16, '2', 'LICENCIATURA EN EDUCACIÓN FÍSICA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (29, 16, '1', 'LICENCIATURA EN EDUCACIÓN DEPORTIVA (SEMIESCOLARIZADA)', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (30, 17, '4', 'LICENCIATURA EN EDUCACIÓN MEDIA EN EL ÁREA DE ESPAÑOL, MODALIDAD SEMIESCOLARIZADA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (31, 17, '3', 'LICENCIATURA EN EDUCACIÓN MEDIA EN EL AREA DE ESPAÑOL', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (32, 17, '2', 'LICENCIATURA EN CIENCIAS DE LA EDUCACIÓN SEMIESCOLARIZADA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (33, 17, '1', 'LICENCIATURA EN CIENCIAS DE LA EDUCACIÓN', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (34, 18, '1', 'LICENCIATURA EN TURISMO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (35, 19, '3', 'LICENCIATURA EN INGENIERÍA EN PROCESOS INDUSTRIALES', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (36, 19, '2', 'LICENCIATURA EN INGENIERIA EN ENERGÍAS RENOVABLES', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (37, 19, '1', 'LICENCIATURA EN INGENIERÍA CIVIL', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (1, 1, '1', 'LICENCIATURA EN INFORMÁTICA', true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (41, 21, '4', 'LICENCIATURA EN INGENIERÍA BIOTECNOLOGÍA ACUÁTICA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (42, 21, '3', 'LICENCIATURA EN GESTIÓN DE ZONA COSTERA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (43, 21, '2', 'LICENCIATURA EN BIOLOGÍA PESQUERA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (44, 21, '1', 'LICENCIATURA EN BIOLOGÍA ACUÍCOLA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (45, 22, '2', 'LICENCIATURA EN INGENIERÍA AGRONÓMICA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (46, 22, '1', 'LICENCIATURA EN ADMINISTRACIÓN DE EMPRESAS', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (47, 23, '2', 'LICENCIATURA EN TRABAJO SOCIAL SEMIESCOLARIZADA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (48, 23, '1', 'LICENCIATURA EN TRABAJO SOCIAL', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (49, 24, '1', 'LICENCIATURA EN ENFERMERÍA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (50, 25, '1', 'LICENCIATURA EN EDUCACIÓN ARTÍSTICA', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (51, 26, '1', 'LICENCIATURA EN ENSEÑANZA DEL IDIOMA INGLES', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (2, 1, '4', 'LICENCIATURA EN INGENIERÍA EN SISTEMAS DE INFORMACIÓN', true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (3, 1, '5', 'LICENCIATURA EN INGENIERÍA EN SISTEMAS DE INFORMACIÓN (MODALIDAD VIRTUAL)', true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (56, 27, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (57, 28, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (58, 29, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (59, 30, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (60, 31, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (61, 32, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (62, 33, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (63, 34, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (64, 35, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (65, 36, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (66, 37, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (67, 38, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (68, 39, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (69, 40, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (70, 41, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (71, 42, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (72, 43, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (73, 44, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (74, 45, '1', 'BACHILLERATO GENERAL UNIVERSITARIO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (75, 27, '2', 'BACHILLERATO SEMIESCOLARIZADO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (76, 28, '2', 'BACHILLERATO SEMIESCOLARIZADO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (77, 29, '2', 'BACHILLERATO SEMIESCOLARIZADO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (78, 34, '2', 'BACHILLERATO SEMIESCOLARIZADO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (79, 40, '2', 'BACHILLERATO SEMIESCOLARIZADO', true, '2026-11-03 00:51:38.415503+00');
INSERT INTO public.programas_educativos (id, unidad_academica_id, clave_programa, nombre, activo, created_at) VALUES (80, 41, '2', 'BACHILLERATO PRECENCIAL NOCTURNO', true, '2026-11-03 00:51:38.415503+00');

--
-- Data for Name: tipos_tramite; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tipos_tramite (id, nombre, modulo, permite_pdf, activo, created_at) VALUES (1, 'Exámenes especiales', 'TRAMITES_GENERALES', false, true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.tipos_tramite (id, nombre, modulo, permite_pdf, activo, created_at) VALUES (2, 'Certificado', 'TRAMITES_GENERALES', false, true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.tipos_tramite (id, nombre, modulo, permite_pdf, activo, created_at) VALUES (3, 'Convalidación', 'TRAMITES_GENERALES', false, true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.tipos_tramite (id, nombre, modulo, permite_pdf, activo, created_at) VALUES (4, 'Dictámenes especiales', 'TRAMITES_GENERALES', false, true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.tipos_tramite (id, nombre, modulo, permite_pdf, activo, created_at) VALUES (5, 'Complementarias', 'TRAMITES_GENERALES', true, true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.tipos_tramite (id, nombre, modulo, permite_pdf, activo, created_at) VALUES (6, 'Anular Folio', 'TRAMITES_GENERALES', true, true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.tipos_tramite (id, nombre, modulo, permite_pdf, activo, created_at) VALUES (7, 'Corrección de calificación', 'TRAMITES_GENERALES', false, true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.tipos_tramite (id, nombre, modulo, permite_pdf, activo, created_at) VALUES (8, 'Migración de calificaciones', 'TRAMITES_GENERALES', false, true, '2026-11-03 00:44:51.156329+00');
INSERT INTO public.tipos_tramite (id, nombre, modulo, permite_pdf, activo, created_at) VALUES (9, 'Fichas de nuevo ingreso', 'NUEVO_INGRESO', false, true, '2026-11-03 00:44:51.156329+00');

--
-- Name: periodos_escolares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.periodos_escolares_id_seq', 2, true);

--
-- Name: programas_educativos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.programas_educativos_id_seq', 80, true);

--
-- Name: tipos_tramite_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tipos_tramite_id_seq', 9, true);

--
-- Name: unidades_academicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.unidades_academicas_id_seq', 45, true);

--
-- PostgreSQL database dump complete
--

COMMIT;
