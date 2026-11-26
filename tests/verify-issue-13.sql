-- Verificacion transaccional para Issue #13 (Modulo de Nuevo Ingreso + RLS CRUD).
-- Ejecutable en Supabase Studio / psql; revierte todo al final con ROLLBACK.

BEGIN;

DO $$
DECLARE
  v_ni_id uuid := '33333333-3333-4333-8333-333333333301';
  v_lic_id uuid := '33333333-3333-4333-8333-333333333302';
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES
    (v_ni_id, 'sim13.ismael@uas.edu.mx', jsonb_build_object('nombre', 'Ismael 13', 'rol', 'NUEVO_INGRESO'), 'authenticated', 'authenticated'),
    (v_lic_id, 'sim13.iris@uas.edu.mx', jsonb_build_object('nombre', 'Iris 13', 'rol', 'LICENCIATURA'), 'authenticated', 'authenticated');
END
$$;

-- 1. Sesion de Ismael (NUEVO_INGRESO): transversal Bachillerato + Licenciatura y CRUD completo
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-3333-4333-8333-333333333301', 'role', 'authenticated')::text,
  true
);

DO $$
DECLARE
  v_ua_lic bigint;
  v_prog_lic bigint;
  v_ua_prepa bigint;
  v_prog_prepa bigint;
  v_periodo_id bigint;
  v_ficha_id uuid;
BEGIN
  SELECT pe.id, pe.unidad_academica_id INTO v_prog_lic, v_ua_lic
  FROM public.programas_educativos pe
  JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
  WHERE ua.nivel = 'LICENCIATURA'
  LIMIT 1;

  SELECT pe.id, pe.unidad_academica_id INTO v_prog_prepa, v_ua_prepa
  FROM public.programas_educativos pe
  JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
  WHERE ua.nivel = 'BACHILLERATO'
  LIMIT 1;

  SELECT id INTO v_periodo_id FROM public.periodos_escolares ORDER BY activo DESC, id ASC LIMIT 1;

  INSERT INTO public.fichas_nuevo_ingreso (
    curp, a_paterno, a_materno, nombre, sexo, unidad_academica_id, programa_id,
    fecha_nacimiento, celular, correo, estatus_ficha, periodo_id
  )
  VALUES (
    'SIML071102HSLLRNA8', 'LLANOS', 'GARCIA', 'LEONARDO', 1,
    v_ua_lic, v_prog_lic, '2007-11-02', '6691234806', 'sim13.lic@uas.edu.mx', 'SIN_PROCESO', v_periodo_id
  )
  RETURNING id INTO v_ficha_id;

  -- Actualizar estatus a SIN_PAGO
  UPDATE public.fichas_nuevo_ingreso
  SET estatus_ficha = 'SIN_PAGO'
  WHERE id = v_ficha_id;

  -- Insertar tambien en Bachillerato (transversalidad)
  INSERT INTO public.fichas_nuevo_ingreso (
    curp, a_paterno, a_materno, nombre, sexo, unidad_academica_id, programa_id,
    fecha_nacimiento, celular, correo, estatus_ficha, periodo_id
  )
  VALUES (
    'SIMB080515MSLLRNA2', 'MARTINEZ', 'LOPEZ', 'SOFIA', 2,
    v_ua_prepa, v_prog_prepa, '2008-05-15', '6699876543', 'sim13.prepa@uas.edu.mx', 'FICHA_VENCIDA', v_periodo_id
  );
  RAISE NOTICE '[OK] NUEVO_INGRESO ejecuto alta y edicion transversal en ambos niveles';

  -- Caso negativo FK compuesta (23503): escuela de Licenciatura con programa de Bachillerato
  BEGIN
    INSERT INTO public.fichas_nuevo_ingreso (
      curp, a_paterno, a_materno, nombre, sexo, unidad_academica_id, programa_id,
      fecha_nacimiento, celular, correo, estatus_ficha, periodo_id
    )
    VALUES (
      'SIMX080515MSLLRNA2', 'ERROR', 'CRUCE', 'PRUEBA', 2,
      v_ua_lic, v_prog_prepa, '2008-05-15', '6699876543', 'err@uas.edu.mx', 'SIN_PROCESO', v_periodo_id
    );
    RAISE EXCEPTION 'Debio fallar fk_fichas_unidad_programa (23503)';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE '[OK] Rechazo 23503 verificado para programa ajeno a la escuela';
  END;

  -- NUEVO_INGRESO puede eliminar ficha erronea
  DELETE FROM public.fichas_nuevo_ingreso WHERE id = v_ficha_id;
  RAISE NOTICE '[OK] NUEVO_INGRESO elimino ficha de prueba via RLS DELETE';
END
$$;

-- 2. Sesion de Iris (LICENCIATURA): bloqueada por RLS en fichas_nuevo_ingreso (42501)
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-3333-4333-8333-333333333302', 'role', 'authenticated')::text,
  true
);

DO $$
DECLARE
  v_ua_lic bigint;
  v_prog_lic bigint;
  v_periodo_id bigint;
BEGIN
  SELECT pe.id, pe.unidad_academica_id INTO v_prog_lic, v_ua_lic
  FROM public.programas_educativos pe
  JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
  WHERE ua.nivel = 'LICENCIATURA'
  LIMIT 1;
  SELECT id INTO v_periodo_id FROM public.periodos_escolares ORDER BY activo DESC, id ASC LIMIT 1;

  BEGIN
    INSERT INTO public.fichas_nuevo_ingreso (
      curp, a_paterno, a_materno, nombre, sexo, unidad_academica_id, programa_id,
      fecha_nacimiento, celular, correo, estatus_ficha, periodo_id
    )
    VALUES (
      'SIMI080515MSLLRNA2', 'INTENTO', 'LIC', 'BLOQUEADO', 2,
      v_ua_lic, v_prog_lic, '2008-05-15', '6699876543', 'lic.block@uas.edu.mx', 'SIN_PROCESO', v_periodo_id
    );
    RAISE EXCEPTION 'RLS debio bloquear insercion en fichas_nuevo_ingreso para LICENCIATURA';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '[OK] Bloqueo RLS 42501 verificado para rol LICENCIATURA en fichas_nuevo_ingreso';
  END;
END
$$;

ROLLBACK;
