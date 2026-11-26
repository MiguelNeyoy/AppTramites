-- Issue #10: RPCs administrativas seguras sobre public.perfiles + auth.users
-- Permite a ADMIN actualizar perfil/email/rol/unidad/activo y eliminar cuentas
-- manteniendo integridad referencial ON DELETE RESTRICT y evitando auto-bloqueo.

DROP FUNCTION IF EXISTS public.admin_update_usuario(uuid, text, text, public.rol_usuario, bigint, boolean);

CREATE OR REPLACE FUNCTION public.admin_update_usuario(
  p_user_id uuid,
  p_nombre text,
  p_email text,
  p_rol public.rol_usuario,
  p_activo boolean,
  p_unidad_academica_id bigint DEFAULT NULL
)
RETURNS public.perfiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.admin_delete_usuario(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

REVOKE ALL ON FUNCTION public.admin_update_usuario(uuid, text, text, public.rol_usuario, boolean, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_usuario(uuid, text, text, public.rol_usuario, boolean, bigint) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_delete_usuario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_usuario(uuid) TO authenticated, service_role;
