-- Verificacion transaccional para Issue #6 (ejecutable en Supabase Studio / psql).
-- Reemplaza <UUID-USUARIO-DE-PRUEBA> por el id de un usuario existente en public.perfiles.

BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '<UUID-USUARIO-DE-PRUEBA>',
    'role', 'authenticated'
  )::text,
  true
);

-- 1. Verificar helper SECURITY DEFINER sin recursion sobre public.perfiles
SELECT public.current_user_role();

-- 2. Caso positivo: leer el perfil propio dado de alta y activo
SELECT id, email, nombre, rol, activo
FROM public.perfiles
WHERE id = auth.uid();

-- 3. Caso negativo RLS: intentar modificar el rol propio desde sesion autenticada no administrativa
-- Debe fallar con 42501 (insufficient_privilege) o afectar 0 filas segun la politica activa.
UPDATE public.perfiles
SET rol = 'ADMIN'
WHERE id = auth.uid();

ROLLBACK;
