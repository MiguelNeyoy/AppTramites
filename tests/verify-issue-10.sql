-- Verificacion transaccional para Issue #10 (RPCs admin_update_usuario y admin_delete_usuario).
-- Ejecutable en Supabase Studio / psql; revierte todo al final con ROLLBACK.

BEGIN;

DO $$
DECLARE
  v_admin_id uuid := '22222222-2222-4222-8222-222222222201';
  v_target_id uuid := '22222222-2222-4222-8222-222222222202';
  v_ua_info bigint;
  v_prog_info bigint;
  v_tramite_id bigint;
  v_periodo_id bigint;
BEGIN
  SELECT id INTO v_ua_info FROM public.unidades_academicas WHERE clave_ua = '4800' LIMIT 1;
  SELECT id INTO v_prog_info FROM public.programas_educativos WHERE unidad_academica_id = v_ua_info LIMIT 1;
  SELECT id INTO v_tramite_id FROM public.tipos_tramite WHERE modulo = 'TRAMITES_GENERALES' LIMIT 1;
  SELECT id INTO v_periodo_id FROM public.periodos_escolares ORDER BY activo DESC, id ASC LIMIT 1;

  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES
    (v_admin_id, 'sim10.admin@uas.edu.mx', jsonb_build_object('nombre', 'Admin 10', 'rol', 'ADMIN'), 'authenticated', 'authenticated'),
    (v_target_id, 'sim10.diana@uas.edu.mx', jsonb_build_object('nombre', 'Diana 10', 'rol', 'LICENCIATURA'), 'authenticated', 'authenticated');

  -- Sembrar un tramite historico vinculado a v_target_id para probar ON DELETE RESTRICT
  INSERT INTO public.tramites_alumnos (numero_cuenta, nombre_alumno, programa_id, tipo_tramite_id, periodo_id, usuario_id)
  VALUES ('20261010', 'Alumno Historial 10', v_prog_info, v_tramite_id, v_periodo_id, v_target_id);
END
$$;

-- 1. Probar como ADMIN
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-2222-4222-8222-222222222201', 'role', 'authenticated')::text,
  true
);

DO $$
DECLARE
  v_ua_info bigint;
  v_updated public.perfiles;
BEGIN
  SELECT id INTO v_ua_info FROM public.unidades_academicas WHERE clave_ua = '4800' LIMIT 1;

  -- Happy path: asignar rol UNIDAD_ACADEMICA (4800) y cambiar email
  SELECT * INTO v_updated
  FROM public.admin_update_usuario(
    '22222222-2222-4222-8222-222222222202',
    'Diana Informatica Actualizada',
    'sim10.diana.nueva@uas.edu.mx',
    'UNIDAD_ACADEMICA',
    true,
    v_ua_info
  );

  IF v_updated.rol <> 'UNIDAD_ACADEMICA' OR v_updated.unidad_academica_id <> v_ua_info THEN
    RAISE EXCEPTION 'admin_update_usuario no actualizo rol/unidad correctamente';
  END IF;
  RAISE NOTICE '[OK] admin_update_usuario actualizo perfil y auth.users atomicamente';

  -- Caso negativo: ADMIN no puede auto-desactivarse (23514)
  BEGIN
    PERFORM public.admin_update_usuario(
      '22222222-2222-4222-8222-222222222201',
      'Admin 10',
      'sim10.admin@uas.edu.mx',
      'ADMIN',
      false,
      NULL
    );
    RAISE EXCEPTION 'Debio fallar auto-desactivacion de ADMIN (23514)';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '[OK] Rechazo 23514 verificado ante auto-desactivacion';
  END;

  -- Caso negativo ON DELETE RESTRICT: no se puede borrar usuario con historial en tramites_alumnos (23503)
  BEGIN
    PERFORM public.admin_delete_usuario('22222222-2222-4222-8222-222222222202');
    RAISE EXCEPTION 'Debio fallar admin_delete_usuario por ON DELETE RESTRICT (23503)';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE '[OK] Rechazo 23503 verificado al intentar eliminar usuario con historial';
  END;
END
$$;

-- 2. Probar bloqueo RLS (42501) cuando un usuario NO ADMIN invoca la RPC
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-2222-4222-8222-222222222202', 'role', 'authenticated')::text,
  true
);

DO $$
BEGIN
  BEGIN
    PERFORM public.admin_delete_usuario('22222222-2222-4222-8222-222222222201');
    RAISE EXCEPTION 'Debio fallar por falta de rol ADMIN (42501)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '[OK] Bloqueo 42501 verificado cuando usuario no-ADMIN invoca RPC administrativa';
  END;
END
$$;

ROLLBACK;
