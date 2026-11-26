-- Issue #13: Permitir a NUEVO_INGRESO (ademas de ADMIN) eliminar fichas erroneas
-- Mantiene bloqueados a LICENCIATURA, BACHILLERATO y UNIDAD_ACADEMICA.

DROP POLICY IF EXISTS fichas_nuevo_ingreso_delete_policy ON public.fichas_nuevo_ingreso;
CREATE POLICY fichas_nuevo_ingreso_delete_policy
  ON public.fichas_nuevo_ingreso
  FOR DELETE
  TO authenticated
  USING (
    (SELECT public.current_user_role()) IN ('ADMIN'::public.rol_usuario, 'NUEVO_INGRESO'::public.rol_usuario)
  );
