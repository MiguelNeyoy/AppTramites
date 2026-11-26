# Plantilla de Plan por Issue — ContexIA + PostgreSQL

Usa esta estructura para presentar el plan del Issue `#<NUMERO>`. Sin emojis.

---

## 1. Resumen del Issue (`#<NUMERO>`)
- **Titulo:** `<titulo del issue>`
- **Labels / Milestone:** `<labels>`
- **Objetivo y Alcance:** Que resuelve y que queda fuera de alcance.
- **Modulo(s) afectados:** `<ej. src/features/tramites/>`

## 2. Reglas de Negocio y Trampas Aplicables (`ContexIA/MEMORY.md`)

| Rol | Permiso / Comportamiento esperado | Regla PostgreSQL / RLS |
| :--- | :--- | :--- |
| `...` | ... | ... |

Verificacion contra anti-patrones de `ContexIA/MEMORY.md`:
- [ ] Respeta el modelo de datos y nivel de granularidad del proyecto.
- [ ] Respeta excepciones transversales de roles (si aplica).
- [ ] Integridad critica y seguridad delegadas a PostgreSQL (`CHECK`, `RLS`, `RESTRICT`).

## 3. Diseno en PostgreSQL / Supabase
- **Estado del esquema:** `Cubierto por esquema actual` o `Requiere cambios SQL`.
- **Tablas, Enums y RPCs reales involucrados:** `<listar nombres exactos>`
- **Cambios SQL propuestos (si aplica):**
  - DDL / `CHECK` / `UNIQUE` / `ON DELETE RESTRICT`
  - Politicas RLS por operacion (sin recursion en `perfiles`, usando funcion `SECURITY DEFINER` del proyecto si existe)
  - RPCs atomicas (si aplica)
  - Regeneracion de `src/types/database.types.ts`

## 4. Diseno Frontend
- **Servicios de datos (`src/services/`):** funciones tipadas por tabla/recurso reutilizadas entre features, joins PostgREST y manejo centralizado de codigos Postgres (`23514`, `23505`, `23503`, `42501`).
- **Hooks (`src/features/<feature>/hooks/`):** estado, filtros y mutaciones de la vista.
- **Componentes (`src/features/<feature>/components/`):** pantallas/modales alineados con `ContexIA/DESIGN.md`.

## 5. Plan de Pruebas y Simulacion del Caso de Uso
1. **Estatico:** `<comandos build / tsc / lint segun package.json>`
2. **Tests de codigo (`node --test` / runner):** funciones puras o utilidades a probar.
3. **Simulacion E2E del caso de uso (script contra Supabase/Postgres o `BEGIN; ... ROLLBACK;`):**
   - **Caso positivo (Happy Path):** pasos derivados de los criterios de aceptacion del issue.
   - **Caso negativo de integridad (`CHECK` / `UNIQUE` / `RESTRICT`):** que payload invalido debe rechazar Postgres.
   - **Caso negativo de seguridad (`RLS`):** que rol/nivel cruzado debe quedar bloqueado.
   - **Limpieza:** eliminacion o rollback de registros de prueba.

## 6. Pasos de Implementacion y Criterios de Terminado
1. ...
2. ...
3. ...
