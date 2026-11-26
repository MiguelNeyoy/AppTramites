# Guia de Pruebas y Simulacion Postgres/Supabase por Issue

En proyectos sin backend tradicional donde la logica critica y la seguridad viven en PostgreSQL + Supabase, la validacion de un issue requiere probar tanto el codigo TypeScript como el contrato real con la base de datos.

---

## 1. Niveles de Verificacion

1. **Estatico (siempre):** `build` (`tsc -b && vite build`) y `lint` definidos en `package.json`.
2. **Unitario (`node --test` o runner del repo):**
   - Ideal para funciones puras: agregaciones, calculos por lote, mapeo de errores Postgres (`23514`, `23505`, `23503`, `42501`), formateadores y exportacion `.xlsx` con ExcelJS.
   - Node 24 ejecuta `node --test archivo.test.mjs` sin dependencias extra.
3. **Simulacion E2E del caso de uso (script con `@supabase/supabase-js`):**
   - Replica exactamente la secuencia de llamadas PostgREST/Auth/RPC del issue contra la instancia Supabase configurada en `.env`.
   - Demuestra que el happy path funciona **y** que Postgres rechaza datos invalidos o accesos de otros roles/niveles.
   - Siempre limpia en `finally` los registros creados por la simulacion.

---

## 2. Verificacion SQL Transaccional (`BEGIN; ... ROLLBACK;`)

Cuando el issue introduzca o modifique politicas RLS, constraints `CHECK`, triggers o funciones RPC, incluye un bloque SQL idempotente ejecutable en **Supabase Studio** o `psql` que deje la base intacta al hacer `ROLLBACK`:

```sql
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

-- 1. Verificar funcion de rol sin recursion (si existe en el proyecto)
SELECT public.current_user_role();

-- 2. Caso positivo del issue (INSERT / SELECT / UPDATE / RPC)
-- ...

-- 3. Caso negativo del issue (debe fallar por CHECK o RLS)
-- ...

ROLLBACK;
```

---

## 3. Codigos de Error PostgreSQL / PostgREST a Validar

| Codigo | Significado | Caso tipico en pruebas negativas |
| :--- | :--- | :--- |
| `23514` | `check_violation` | Regla matematica o rango `CHECK` violado |
| `23505` | `unique_violation` | Registro duplicado para la clave natural |
| `23503` | `foreign_key_violation` | Referencia inexistente o borrado bloqueado por `ON DELETE RESTRICT` |
| `42501` | `insufficient_privilege` | Operacion bloqueada por politica RLS (`USING` / `WITH CHECK`) |
| `22P02` | `invalid_text_representation` | Valor invalido para un `ENUM` de Postgres |
| `PGRST116` | PostgREST single row | `.single()` esperaba 1 fila y recibio 0 o mas de 1 |
