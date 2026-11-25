-- Script / Migracion: Convertir a mayusculas el nombre de todas las preparatorias
-- y sus programas educativos (nivel BACHILLERATO).
-- Nota: Se usa translate() antes de upper() para garantizar mayusculas en acentos y ñ
-- independientemente de la configuracion LC_CTYPE del servidor PostgreSQL.

BEGIN;

UPDATE public.unidades_academicas
SET nombre = upper(
  translate(btrim(nombre), 'áéíóúüñ', 'ÁÉÍÓÚÜÑ')
)
WHERE nivel = 'BACHILLERATO'::public.nivel_educativo
  AND nombre IS DISTINCT FROM upper(
    translate(btrim(nombre), 'áéíóúüñ', 'ÁÉÍÓÚÜÑ')
  );

UPDATE public.programas_educativos pe
SET nombre = upper(
  translate(btrim(pe.nombre), 'áéíóúüñ', 'ÁÉÍÓÚÜÑ')
)
FROM public.unidades_academicas ua
WHERE pe.unidad_academica_id = ua.id
  AND ua.nivel = 'BACHILLERATO'::public.nivel_educativo
  AND pe.nombre IS DISTINCT FROM upper(
    translate(btrim(pe.nombre), 'áéíóúüñ', 'ÁÉÍÓÚÜÑ')
  );

-- Verificacion rapida del resultado
SELECT ua.clave_ua, ua.nombre AS unidad, pe.clave_programa, pe.nombre AS programa
FROM public.programas_educativos pe
JOIN public.unidades_academicas ua ON ua.id = pe.unidad_academica_id
WHERE ua.nivel = 'BACHILLERATO'::public.nivel_educativo
ORDER BY ua.clave_ua ASC, pe.clave_programa ASC;

COMMIT;
