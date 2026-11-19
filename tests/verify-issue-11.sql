-- Verificacion transaccional para Issue #11 (ejecutable en Supabase Studio / psql).
-- Prueba constraints CHECK/UNIQUE/RESTRICT, folio consecutivo y aislamiento RLS para
-- ADMIN, UNIDAD_ACADEMICA (Diana clave 4800), LICENCIATURA y NUEVO_INGRESO.

BEGIN;

-- 1. Verificar rechazo CHECK en public.perfiles (UNIDAD_ACADEMICA sin unidad_academica_id)
DO $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol, unidad_academica_id)
  VALUES (gen_random_uuid(), 'invalido.ua@uas.edu.mx', 'Invalido UA', 'UNIDAD_ACADEMICA', NULL);
  RAISE EXCEPTION 'Debio fallar ck_perfiles_unidad_academica_por_rol (23514)';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE '[OK] Rechazo 23514 verificado: UNIDAD_ACADEMICA sin unidad_academica_id';
END
$$;

-- 2. Crear usuarios sinteticos en auth.users (handle_new_user crea sus perfiles automaticamente)
DO $$
DECLARE
  v_ua_informatica bigint;
  v_ua_derecho bigint;
  v_ua_prepa bigint;
  v_prog_informatica bigint;
  v_prog_derecho bigint;
  v_prog_prepa bigint;
  v_tramite_id bigint;
  v_periodo_id bigint;
  v_admin_id uuid := '11111111-1111-4111-8111-111111111101';
  v_diana_id uuid := '11111111-1111-4111-8111-111111111102';
  v_lic_id uuid := '11111111-1111-4111-8111-111111111103';
  v_ni_id uuid := '11111111-1111-4111-8111-111111111104';
BEGIN
  SELECT id INTO v_ua_informatica FROM public.unidades_academicas WHERE clave_ua = '4800' LIMIT 1;
  SELECT pe.id INTO v_prog_informatica
  FROM public.programas_educativos pe
  WHERE pe.unidad_academica_id = v_ua_informatica
  LIMIT 1;

  SELECT pe.id, pe.unidad_academica_id INTO v_prog_derecho, v_ua_derecho
  FROM public.programas_educativos pe
  JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
  WHERE ua.clave_ua <> '4800' AND ua.nivel = 'LICENCIATURA'
  LIMIT 1;

  SELECT pe.id, pe.unidad_academica_id INTO v_prog_prepa, v_ua_prepa
  FROM public.programas_educativos pe
  JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
  WHERE ua.nivel = 'BACHILLERATO'
  LIMIT 1;

  SELECT id INTO v_tramite_id FROM public.tipos_tramite WHERE modulo = 'TRAMITES_GENERALES' LIMIT 1;
  SELECT id INTO v_periodo_id FROM public.periodos_escolares ORDER BY activo DESC, id ASC LIMIT 1;

  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES
    (v_admin_id, 'sim11.admin@uas.edu.mx', jsonb_build_object('nombre', 'Admin Sim', 'rol', 'ADMIN'), 'authenticated', 'authenticated'),
    (v_diana_id, 'sim11.diana@uas.edu.mx', jsonb_build_object('nombre', 'Diana Sim', 'rol', 'UNIDAD_ACADEMICA', 'unidad_academica_id', v_ua_informatica), 'authenticated', 'authenticated'),
    (v_lic_id, 'sim11.lic@uas.edu.mx', jsonb_build_object('nombre', 'Lic Sim', 'rol', 'LICENCIATURA'), 'authenticated', 'authenticated'),
    (v_ni_id, 'sim11.ni@uas.edu.mx', jsonb_build_object('nombre', 'NI Sim', 'rol', 'NUEVO_INGRESO'), 'authenticated', 'authenticated');

  -- Sembrar un tramite en Derecho (otra facultad) como ADMIN para probar aislamiento de Diana
  INSERT INTO public.tramites_alumnos (numero_cuenta, nombre_alumno, programa_id, tipo_tramite_id, periodo_id, usuario_id)
  VALUES ('20269999', 'Alumno Derecho Prueba', v_prog_derecho, v_tramite_id, v_periodo_id, v_admin_id);

  -- Probar ON DELETE RESTRICT en programas_educativos con historial
  BEGIN
    DELETE FROM public.programas_educativos WHERE id = v_prog_derecho;
    RAISE EXCEPTION 'Debio fallar ON DELETE RESTRICT (23503)';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE '[OK] Rechazo 23503 verificado: ON DELETE RESTRICT protege historial en tramites_alumnos';
  END;
END
$$;

-- 3. Simular sesion autenticada de Diana (rol UNIDAD_ACADEMICA, clave 4800 Informatica)
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-4111-8111-111111111102', 'role', 'authenticated')::text,
  true
);

DO $$
DECLARE
  v_rol public.rol_usuario;
  v_ua_id bigint;
  v_visible_uas int;
  v_visible_tramites_ajenos int;
  v_prog_info bigint;
  v_prog_derecho bigint;
  v_tramite_id bigint;
  v_periodo_id bigint;
  v_folio_1 bigint;
  v_folio_2 bigint;
BEGIN
  SELECT public.current_user_role() INTO v_rol;
  SELECT public.current_user_unidad_academica_id() INTO v_ua_id;
  IF v_rol <> 'UNIDAD_ACADEMICA' OR v_ua_id IS NULL THEN
    RAISE EXCEPTION 'Se esperaba rol UNIDAD_ACADEMICA con unidad_academica_id asignada';
  END IF;

  SELECT count(*) INTO v_visible_uas FROM public.unidades_academicas;
  IF v_visible_uas <> 1 THEN
    RAISE EXCEPTION 'Diana solo debe ver 1 unidad academica (4800), vio %', v_visible_uas;
  END IF;

  SELECT count(*) INTO v_visible_tramites_ajenos
  FROM public.tramites_alumnos ta
  JOIN public.programas_educativos pe ON pe.id = ta.programa_id
  WHERE pe.unidad_academica_id <> v_ua_id;
  IF v_visible_tramites_ajenos <> 0 THEN
    RAISE EXCEPTION 'Diana no debe ver tramites fuera de su unidad, vio %', v_visible_tramites_ajenos;
  END IF;

  SELECT id INTO v_prog_info FROM public.programas_educativos WHERE unidad_academica_id = v_ua_id LIMIT 1;
  SELECT id INTO v_tramite_id FROM public.tipos_tramite WHERE modulo = 'TRAMITES_GENERALES' LIMIT 1;
  SELECT id INTO v_periodo_id FROM public.periodos_escolares ORDER BY activo DESC, id ASC LIMIT 1;

  INSERT INTO public.tramites_alumnos (numero_cuenta, nombre_alumno, programa_id, tipo_tramite_id, periodo_id)
  VALUES ('20260001', 'Alumno Informatica Uno', v_prog_info, v_tramite_id, v_periodo_id)
  RETURNING folio INTO v_folio_1;

  INSERT INTO public.tramites_alumnos (numero_cuenta, nombre_alumno, programa_id, tipo_tramite_id, periodo_id)
  VALUES ('20260002', 'Alumno Informatica Dos', v_prog_info, v_tramite_id, v_periodo_id)
  RETURNING folio INTO v_folio_2;

  IF v_folio_2 <= v_folio_1 THEN
    RAISE EXCEPTION 'El folio debe ser consecutivo creciente: % -> %', v_folio_1, v_folio_2;
  END IF;
  RAISE NOTICE '[OK] Diana (4800) inserto tramites con folios consecutivos % y %', v_folio_1, v_folio_2;

  -- Caso negativo RLS: intentar insertar en programa ajeno (Derecho)
  SELECT id INTO v_prog_derecho FROM public.programas_educativos WHERE unidad_academica_id <> v_ua_id LIMIT 1;
  -- Como el catalogo de programas esta filtrado por RLS para Diana, usamos un id conocido fuera de su UA:
  IF v_prog_derecho IS NULL THEN
    v_prog_derecho := 4;
  END IF;
  BEGIN
    INSERT INTO public.tramites_alumnos (numero_cuenta, nombre_alumno, programa_id, tipo_tramite_id, periodo_id)
    VALUES ('20260003', 'Intento Unidad Ajena', v_prog_derecho, v_tramite_id, v_periodo_id);
    RAISE EXCEPTION 'RLS debio bloquear insercion en unidad ajena (42501)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '[OK] Bloqueo RLS 42501 verificado para Diana fuera de 4800';
  END;

  -- Caso negativo RLS: intentar auto-escalar rol en perfiles
  BEGIN
    UPDATE public.perfiles SET rol = 'ADMIN' WHERE id = auth.uid();
    IF FOUND THEN
      RAISE EXCEPTION 'RLS debio impedir auto-escalamiento en perfiles';
    END IF;
    RAISE NOTICE '[OK] Bloqueo RLS verificado ante auto-escalamiento en perfiles';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '[OK] Bloqueo RLS 42501 verificado ante auto-escalamiento en perfiles';
  END;
END
$$;

-- 4. Simular sesion autenticada de Ismael (NUEVO_INGRESO transversal)
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-4111-8111-111111111104', 'role', 'authenticated')::text,
  true
);

DO $$
DECLARE
  v_ua_lic bigint;
  v_prog_lic bigint;
  v_ua_prepa bigint;
  v_prog_prepa bigint;
  v_periodo_id bigint;
  v_tramite_id bigint;
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
  SELECT id INTO v_tramite_id FROM public.tipos_tramite WHERE modulo = 'TRAMITES_GENERALES' LIMIT 1;

  -- Transversal: puede registrar fichas de Licenciatura y Bachillerato
  INSERT INTO public.fichas_nuevo_ingreso (
    curp, a_paterno, a_materno, nombre, sexo, unidad_academica_id, programa_id,
    fecha_nacimiento, celular, correo, estatus_ficha, periodo_id
  )
  VALUES
    ('LAGL071102HSLLRNA8', 'LLANOS', 'GARCIA', 'LEONARDO GAEL', 1, v_ua_lic, v_prog_lic, '2007-11-02', '6691234806', 'leo03sd@gmail.com', 'SIN_PAGO', v_periodo_id),
    ('MARM080515MSLLRNA2', 'MARTINEZ', 'RODRIGUEZ', 'MARIA', 2, v_ua_prepa, v_prog_prepa, '2008-05-15', '6699876543', 'maria.ni@uas.edu.mx', 'FICHA_VENCIDA', v_periodo_id);
  RAISE NOTICE '[OK] NUEVO_INGRESO registro fichas transversales en Licenciatura y Bachillerato';

  -- Caso negativo UNIQUE (CURP duplicada en mismo periodo)
  BEGIN
    INSERT INTO public.fichas_nuevo_ingreso (
      curp, a_paterno, a_materno, nombre, sexo, unidad_academica_id, programa_id,
      fecha_nacimiento, celular, correo, estatus_ficha, periodo_id
    )
    VALUES ('LAGL071102HSLLRNA8', 'LLANOS', 'GARCIA', 'DUPLICADO', 1, v_ua_lic, v_prog_lic, '2007-11-02', '6691234806', 'dup@gmail.com', 'SIN_PROCESO', v_periodo_id);
    RAISE EXCEPTION 'Debio fallar uq_fichas_curp_periodo (23505)';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '[OK] Rechazo 23505 verificado para CURP duplicada en el mismo periodo';
  END;

  -- Caso negativo CHECK (sexo = 3)
  BEGIN
    INSERT INTO public.fichas_nuevo_ingreso (
      curp, a_paterno, a_materno, nombre, sexo, unidad_academica_id, programa_id,
      fecha_nacimiento, celular, correo, estatus_ficha, periodo_id
    )
    VALUES ('ABCD010101HSLLRNA9', 'PEREZ', 'LOPEZ', 'JUAN', 3, v_ua_lic, v_prog_lic, '2001-01-01', '6691112233', 'juan@uas.edu.mx', 'SIN_PROCESO', v_periodo_id);
    RAISE EXCEPTION 'Debio fallar ck_fichas_sexo (23514)';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '[OK] Rechazo 23514 verificado para sexo fuera de {1,2}';
  END;

  -- Caso negativo RLS: NUEVO_INGRESO no puede insertar tramites_alumnos
  BEGIN
    INSERT INTO public.tramites_alumnos (numero_cuenta, nombre_alumno, programa_id, tipo_tramite_id, periodo_id)
    VALUES ('20268888', 'Intento NI', v_prog_lic, v_tramite_id, v_periodo_id);
    RAISE EXCEPTION 'RLS debio bloquear insercion en tramites_alumnos para NUEVO_INGRESO';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '[OK] Bloqueo RLS 42501 verificado para NUEVO_INGRESO en tramites_alumnos';
  END;
END
$$;

ROLLBACK;
