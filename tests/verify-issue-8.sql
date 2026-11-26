-- Verificacion transaccional para Issue #8 (ejecutable en Supabase Studio / psql).
-- Reemplaza <UUID-ADMIN-DE-PRUEBA> por el id de un usuario ADMIN en public.perfiles.

BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '<UUID-ADMIN-DE-PRUEBA>',
    'role', 'authenticated'
  )::text,
  true
);

-- 1. Verificar rol sin recursion
SELECT public.current_user_role();

-- 2. Lectura de los 4 catalogos
SELECT count(*) AS total_unidades FROM public.unidades_academicas;
SELECT count(*) AS total_programas FROM public.programas_educativos;
SELECT count(*) AS total_tipos_tramite FROM public.tipos_tramite;
SELECT count(*) AS total_periodos FROM public.periodos_escolares;

-- 3. Caso positivo: alta y edicion de unidad academica + periodo escolar
WITH nueva_ua AS (
  INSERT INTO public.unidades_academicas (clave_ua, nombre, nivel, activa)
  VALUES ('9999', 'Unidad Transaccional Prueba', 'BACHILLERATO', true)
  RETURNING id
)
INSERT INTO public.programas_educativos (unidad_academica_id, clave_programa, nombre, activo)
SELECT id, '1', 'Bachillerato Prueba', true
FROM nueva_ua;

INSERT INTO public.periodos_escolares (nombre, numero_periodo, fecha_inicio, fecha_fin, activo)
VALUES ('2099-2100', 1, '2099-08-01', '2099-12-20', false);

-- 4. Caso negativo: debe fallar por CHECK (fecha_fin < fecha_inicio)
-- Descomenta para probar el rechazo 23514 en Studio:
-- INSERT INTO public.periodos_escolares (nombre, numero_periodo, fecha_inicio, fecha_fin, activo)
-- VALUES ('2099-INVALIDO', 1, '2099-12-01', '2099-08-01', false);

ROLLBACK;
