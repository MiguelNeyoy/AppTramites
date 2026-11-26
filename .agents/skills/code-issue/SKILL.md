---
name: code-issue
description: >-
  Implementa un Issue o feature de GitHub consultado con gh CLI, siguiendo
  ContexIA/ y una arquitectura orientada a PostgreSQL/Supabase (PostgREST, RLS,
  CHECK, RPC) sin backend tradicional, incluyendo pruebas unitarias y script
  simulado del caso de uso. Usala cuando el usuario invoque /code-issue o pida
  programar y probar un issue.
---

# Implementacion y Pruebas por Issue (`/code-issue`)

Implementa un **Issue de GitHub** de punta a punta acoplandote dinamicamente a **ContexIA/** y al esquema **PostgreSQL / Supabase** del proyecto, verificando cada caso de uso con tests reales y simulacion contra base de datos.

Regla de formato: **nada de emojis** en codigo, comentarios, logs ni documentacion.

---

## Paso 1: Consultar el Issue y Contexto del Proyecto

1. Detecta `ORG/REPO` desde `git remote -v` y consulta el issue con `gh` (siempre con `-R ORG/REPO`, **sin pipes ni redirecciones**):
   ```bash
   gh issue view <NUMERO> -R <ORG>/<REPO> --json number,title,body,labels,state,comments
   ```
   Si no se dio numero, lista los abiertos con `gh issue list -R <ORG>/<REPO> --state open --limit 30 --json number,title,labels` y pide confirmacion antes de codificar.
2. Lee **ContexIA/**:
   - `ContexIA/MEMORY.md` (estado, decisiones y trampas criticas a evitar tambien actualiza el memory con lo necesario).
   - `ContexIA/DESIGN.md` si el issue toca interfaz.
   - Si no existe `ContexIA/`, revisa `AGENTS.md`, `GEMINI.md` o `README.md`.
3. Inspecciona los archivos tecnicos reales del repo:
   - `package.json`, `tsconfig*.json` y `eslint.config.*`.
   - Tipos de BD (`src/types/database.types.ts`), cliente (`src/lib/supabase.ts`) y migraciones SQL si existen.
   - Capa de servicios centralizada (`src/services/` o `src/lib/`) y carpeta UI del modulo afectado (ej. `src/features/<feature>/{components,hooks}/`).

---

## Paso 2: Implementar Capa PostgreSQL + Frontend

Respeta siempre la configuracion estricta de TypeScript y lint del repo (en proyectos Vite/React modernos: `import type` si `verbatimModuleSyntax: true`, cero `enum` TS si `erasableSyntaxOnly: true`, cero variables sin usar, y utilidades fuera de archivos `.tsx` si aplica `react-refresh/only-export-components`).

### Documentacion Vigente (Context7) y Clean Code
- **Context7 (si esta habilitado):** antes de implementar con librerias clave del `package.json` (React 19, `@supabase/supabase-js`, Tailwind CSS, Radix/shadcn, ExcelJS, etc.), consulta el MCP `context7` (`resolve-library-id` y `query-docs`) para aprovechar funciones nuevas, APIs vigentes y buenas practicas oficiales de la version instalada.
- **No reinventar la rueda:** reutiliza los primitivos de `src/components/ui/`, helpers de `src/lib/` y `src/services/shared/`, funciones nativas de PostgreSQL y librerias ya instaladas antes de escribir utilidades manuales o duplicar logica.
- **Clean Code y control de flujo plano:** escribe funciones pequenas y de responsabilidad unica; usa **early returns / guard clauses** para **no anidar `if`**, y reemplaza cadenas largas de `if/else` o bloques repetidos por mapas, tablas de configuracion o helpers parametrizados.
- **Buenas practicas de React y TypeScript:** separa logica/estado en hooks (`src/features/<feature>/hooks/`) y presentacion en componentes puros; evita `useEffect` para estado derivado (calculalo en render), evita `any`, no mutes estado y usa `keys` estables en listas.

### A. PostgreSQL como Backend
- **Sin duplicar autoridad en frontend:** validaciones matematicas (`CHECK`), unicidad (`UNIQUE`), integridad historica (`ON DELETE RESTRICT`) y aislamiento de roles (`RLS`) viven en Postgres; el frontend brinda UX preventiva y traduce errores.
- **Si el issue requiere DDL / RLS / RPC:**
  - En politicas RLS usa la funcion helper `SECURITY DEFINER` del proyecto (ej. `public.current_user_role()`) para evitar recursion infinita sobre `perfiles`.
  - Nunca uses `ON DELETE CASCADE` sobre tablas historicas; usa `RESTRICT` y bajas logicas (`activo = false`).
  - Regenera `src/types/database.types.ts` tras aplicar los cambios en Supabase.
- **Capa de servicios centralizada (`src/services/*.ts` por tabla/dominio):**
  - Centraliza las llamadas `supabase.from(...)` y `supabase.rpc(...)` por recurso de Postgres (ej. `auth.service.ts`, `catalogos.service.ts`, `seguimientos.service.ts`, `actas.service.ts`) para reutilizarlas entre multiples pantallas sin duplicar carpetas `api/` por feature.
  - Usa selects explicitos y joins `!inner` cuando filtres por relaciones.
  - Respeta las excepciones de rol documentadas en `ContexIA/MEMORY.md` (ej. no filtrar por nivel escolar cuando el rol sea transversal).
  - Mapea codigos Postgres/PostgREST (`23514`, `23505`, `23503`, `42501`, `PGRST116`) en un helper compartido (ej. `src/services/supabaseErrors.ts`) a mensajes claros para el usuario.

---

## Paso 3: Verificacion Obligatoria (Tests + Simulacion del Caso de Uso)

Consulta [postgres-testing-guide.md](./references/postgres-testing-guide.md) para patrones detallados. Ejecuta los 3 niveles aplicables al issue:

1. **Verificacion estatica:**
   - Ejecuta los scripts reales de `package.json` (ej. `pnpm build` / `tsc -b && vite build` y `pnpm lint`).
2. **Tests de codigo puro (`node --test` o runner del proyecto):**
   - Prueba funciones puras (calculos, filtros, validadores, generacion `.xlsx` con ExcelJS, mapeadores de error Postgres).
3. **Script simulado del caso de uso contra Postgres/Supabase:**
   - Toma como base [simulate-issue-template.mjs](./resources/simulate-issue-template.mjs) y adaptalo a los criterios de aceptacion del issue `#<NUMERO>`.
   - Cubre:
     1. Autenticacion del rol objetivo y verificacion de perfil activo.
     2. **Happy path** completo del caso de uso usando los mismos payloads/queries que `src/services/`.
     3. **Pruebas negativas de Postgres:** intento de violar `CHECK`/`UNIQUE`/`RESTRICT` y acceso cruzado prohibido por `RLS` (verificando codigos `23514`, `23505`, `23503`, `42501` o 0 filas).
     4. **Limpieza en `finally`** para no dejar datos sinteticos en la base.
   - Ejecuta con `node --env-file=.env <ruta-del-script.mjs>`.
   - Si el entorno actual no tiene `.env` o acceso de red a Supabase, **no simules exitos falsos**: reporta exactamente que corrio en local (`build`/`lint`/`node --test`), entrega el script listo para ejecutar con `.env` y acompanalo de un bloque SQL transaccional (`BEGIN; ... ROLLBACK;`) ejecutable en Supabase Studio.

---

## Paso 4: Cierre del Issue

1. Actualiza `ContexIA/MEMORY.md` (sin emojis) si el issue completa un hito o modulo clave.
2. Si todos los criterios de aceptacion y verificaciones aplicables pasaron (sin bloqueos pendientes):
   - Si el cuerpo del issue tiene checklists de criterios (`- [ ]`), opcionalmente actualizalos a `- [x]` con `gh issue edit <NUMERO> -R <ORG>/<REPO> --body "..."`.
   - Cierra el issue marcandolo como finalizado con su resumen de verificacion (sin emojis, siempre con `-R <ORG>/<REPO>` y sin pipes ni redirecciones):
     ```bash
     gh issue close <NUMERO> -R <ORG>/<REPO> --reason completed --comment "<resumen de cambios, pruebas ejecutadas y criterios cumplidos>"
     ```
   - Si el repositorio esta vinculado a un GitHub Project v2, consulta `gh project list --owner <ORG> --format json`, `gh project field-list <PROJECT_NUM> --owner <ORG> --format json` y `gh project item-list <PROJECT_NUM> --owner <ORG> --format json`; si el issue aparece en el tablero, cambia su campo `Status` a `Done` con:
     ```bash
     gh project item-edit --project-id <PROJECT_ID> --id <ITEM_ID> --field-id <STATUS_FIELD_ID> --single-select-option-id <DONE_OPTION_ID>
     ```
   - Si alguna prueba critica (por ejemplo la simulacion contra BD) no pudo ejecutarse en el entorno actual, reporta el estado pendiente y pide confirmacion antes de cerrar el issue.
3. Reporta al usuario los archivos tocados, el resultado real de cada comando ejecutado, el estado final del issue/proyecto en GitHub y la cobertura contra los criterios del issue.
