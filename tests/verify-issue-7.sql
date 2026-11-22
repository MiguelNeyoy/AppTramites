-- Verificacion transaccional para Issue #7 + #14 (tramites_alumnos y formulario por alumno).
-- Ejecutable en Supabase Studio / psql; revierte todo al final con ROLLBACK.

BEGIN;

DO $$
DECLARE
  v_ua_info bigint;
  v_admin_id uuid := '44444444-4444-4444-8444-444444444401';
  v_diana_id uuid := '44444444-4444-4444-8444-444444444402';
  v_ni_id uuid := '44444444-4444-4444-8444-444444444403';
BEGIN
  SELECT id INTO v_ua_info FROM public.unidades_academicas WHERE clave_ua = '4800' LIMIT 1;

  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES
    (v_admin_id, 'sim7.admin@uas.edu.mx', jsonb_build_object('nombre', 'Admin 7', 'rol', 'ADMIN'), 'authenticated', 'authenticated'),
    (v_diana_id, 'sim7.diana@uas.edu.mx', jsonb_build_object('nombre', 'Diana 7', 'rol', 'UNIDAD_ACADEMICA', 'unidad_academica_id', v_ua_info), 'authenticated', 'authenticated'),
    (v_ni_id, 'sim7.ismael@uas.edu.mx', jsonb_build_object('nombre', 'Ismael 7', 'rol', 'NUEVO_INGRESO'), 'authenticated', 'authenticated');
END
$$;

-- 1. Sesion de Diana (UNIDAD_ACADEMICA clave 4800): alta, edicion de estado y folio consecutivo
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-8444-444444444402', 'role', 'authenticated')::text,
  true
);

DO $$
DECLARE
  v_ua_info bigint;
  v_prog_info bigint;
  v_tramite_id bigint;
  v_periodo_id bigint;
  v_id uuid;
  v_folio text;
  v_estado public.estado_tramite_alumno;
BEGIN
  SELECT public.current_user_unidad_academica_id() INTO v_ua_info;
  SELECT id INTO v_prog_info FROM public.programas_educativos WHERE unidad_academica_id = v_ua_info LIMIT 1;
  SELECT id INTO v_tramite_id FROM public.tipos_tramite WHERE modulo = 'TRAMITES_GENERALES' LIMIT 1;
  SELECT id INTO v_periodo_id FROM public.periodos_escolares ORDER BY activo DESC, id ASC LIMIT 1;

  INSERT INTO public.tramites_alumnos (folio, numero_cuenta, nombre_alumno, programa_id, tipo_tramite_id, periodo_id, fecha_registro, estado)
  VALUES ('sim7-001', '20267001', 'ALUMNO PRUEBA SIETE', v_prog_info, v_tramite_id, v_periodo_id, '2026-11-19', 'PENDIENTE')
  RETURNING id, folio INTO v_id, v_folio;

  UPDATE public.tramites_alumnos
  SET estado = 'RESUELTO'
  WHERE id = v_id
  RETURNING estado INTO v_estado;

  IF v_folio <> 'SIM7-001' OR v_estado <> 'RESUELTO' THEN
    RAISE EXCEPTION 'Fallo alta o actualizacion en tramites_alumnos';
  END IF;
  RAISE NOTICE '[OK] Diana registro y actualizo tramite folio % a RESUELTO', v_folio;

  -- Caso negativo UNIQUE: folio duplicado en mismo tramite y periodo (23505)
  BEGIN
    INSERT INTO public.tramites_alumnos (folio, numero_cuenta, nombre_alumno, programa_id, tipo_tramite_id, periodo_id)
    VALUES ('SIM7-001', '20267004', 'ALUMNO FOLIO DUPLICADO', v_prog_info, v_tramite_id, v_periodo_id);
    RAISE EXCEPTION 'Debio fallar uq_tramites_alumnos_periodo_tipo_folio (23505)';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '[OK] Rechazo 23505 verificado para folio duplicado en mismo tramite/periodo';
  END;

  -- Caso negativo CHECK: nombre_alumno en blanco (23514)
  BEGIN
    INSERT INTO public.tramites_alumnos (numero_cuenta, nombre_alumno, programa_id, tipo_tramite_id, periodo_id)
    VALUES ('20267002', '   ', v_prog_info, v_tramite_id, v_periodo_id);
    RAISE EXCEPTION 'Debio fallar ck_tramites_alumnos_nombre_alumno (23514)';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '[OK] Rechazo 23514 verificado para nombre_alumno en blanco';
  END;

  -- Caso negativo RLS: no ADMIN no puede eliminar tramites_alumnos
  DELETE FROM public.tramites_alumnos WHERE id = v_id;
  IF FOUND THEN
    RAISE EXCEPTION 'RLS debio impedir DELETE para usuario no ADMIN';
  END IF;
  RAISE NOTICE '[OK] Bloqueo RLS DELETE verificado para usuario no ADMIN';
END
$$;

-- 2. Sesion de Ismael (NUEVO_INGRESO): bloqueado en tramites_alumnos (42501)
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-8444-444444444403', 'role', 'authenticated')::text,
  true
);

DO $$
DECLARE
  v_prog_id bigint := 1;
  v_tramite_id bigint := 1;
  v_periodo_id bigint := 1;
BEGIN
  BEGIN
    INSERT INTO public.tramites_alumnos (numero_cuenta, nombre_alumno, programa_id, tipo_tramite_id, periodo_id)
    VALUES ('20267003', 'BLOQUEO NI', v_prog_id, v_tramite_id, v_periodo_id);
    RAISE EXCEPTION 'RLS debio bloquear tramites_alumnos para NUEVO_INGRESO';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '[OK] Bloqueo RLS 42501 verificado para NUEVO_INGRESO en tramites_alumnos';
  END;
END
$$;

ROLLBACK;
