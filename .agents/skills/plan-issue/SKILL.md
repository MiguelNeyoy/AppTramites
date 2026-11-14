---
name: plan-issue
description: >-
  Planifica la implementacion tecnica de un Issue o feature de GitHub consultado
  con gh CLI, acoplandose dinamicamente al directorio ContexIA/ y al esquema
  PostgreSQL/Supabase del proyecto actual (arquitectura sin backend tradicional).
  Usala cuando el usuario invoque /plan-issue o pida planificar un issue o feature.
---

# Planificacion por Issue de GitHub (`/plan-issue`)

Planifica una feature o tarea directamente desde un **Issue de GitHub** usando `gh`, acoplando el diseno tecnico a la documentacion de **ContexIA/** y al esquema **PostgreSQL / Supabase** del repositorio activo.

Regla de formato: **nada de emojis** en el plan ni en documentos generados.

---

## Paso 1: Obtener el Issue desde GitHub (`gh`)

1. Detecta el repositorio `ORG/REPO` desde `git remote -v` (soporta SSH `git@github.com:ORG/REPO.git` y HTTPS).
2. Reglas de `gh` en el entorno: pasa siempre `-R ORG/REPO` y **nunca uses pipes (`|`) ni redirecciones (`>`)** con comandos `gh`.
3. Segun lo que indico el usuario:
   - **Si dio un numero o URL de issue:** lee el detalle completo:
     ```bash
     gh issue view <NUMERO> -R <ORG>/<REPO> --json number,title,body,labels,state,comments,milestone
     ```
   - **Si no dio numero (o menciono un GitHub Project):** lista los issues abiertos y pregunta cual planificar (si hay varios):
     ```bash
     gh issue list -R <ORG>/<REPO> --state open --limit 30 --json number,title,labels,state
     ```
     Si indico un numero de Project v2:
     ```bash
     gh project item-list <PROJECT_NUM> --owner <ORG> --format json
     ```

---

## Paso 2: Cargar Contexto del Proyecto (`ContexIA/` + Arquitectura)

Lee solo los archivos necesarios para anclar el plan en la realidad del repositorio actual:

1. **Memoria y reglas de negocio (`ContexIA/`):**
   - `ContexIA/MEMORY.md`: estado actual, decisiones arquitectonicas, roles y **trampas criticas / anti-patrones** del proyecto.
   - Otros archivos en `ContexIA/` relevantes para el issue (por ejemplo `ContexIA/DESIGN.md`, `ContexIA/STITCH_DESIGN.md` o ADRs enlazados si el issue tiene componente visual).
   - Si el repositorio no tiene `ContexIA/`, busca `AGENTS.md`, `GEMINI.md` o `README.md`.
2. **Base de datos como backend:**
   - Inspecciona los tipos generados (ej. `src/types/database.types.ts`), cliente Supabase (`src/lib/supabase.ts`) y/o migraciones SQL (`supabase/migrations/`).
   - Identifica tablas, enums, llaves foraneas, funciones RPC y politicas RLS existentes antes de asumir columnas.
3. **Estructura de codigo y UI:**
   - Revisa `package.json`, `tsconfig*.json`, la capa de acceso a datos (`src/services/`, `src/lib/` o convencion del repo) y la carpeta de UI del modulo afectado (ej. `src/features/<feature>/{components,hooks}/` y `src/components/ui/`).

---

## Paso 3: Disenar la Solucion en Dos Capas (Postgres-First)

Cuando `ContexIA/MEMORY.md` o el stack indiquen que **no hay backend tradicional** y toda la logica critica vive en PostgreSQL:

1. **Matriz de Roles y Reglas de Negocio del Issue:**
   - Mapea cada rol del sistema contra los requisitos del issue.
   - Verifica explicitamente las trampas de `ContexIA/MEMORY.md` (ej. captura numerica por lote vs datos por alumno, roles transversales sin filtro de nivel, `ON DELETE RESTRICT` para proteger historial, prohibicion de recursividad en RLS usando funciones `SECURITY DEFINER` como `current_user_role()`).
2. **Capa PostgreSQL / Supabase:**
   - Indica si el esquema actual ya soporta el issue o requiere DDL/migracion.
   - Si requiere cambios SQL: especifica tablas/columnas, `CHECK` constraints matematicos, `UNIQUE`, `ON DELETE RESTRICT`, politicas RLS por operacion (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), funciones RPC (`SECURITY INVOKER` por defecto; `SECURITY DEFINER` con `SET search_path = public` solo si es indispensable) y regeneracion de `database.types.ts`.
3. **Capa Frontend (Servicios centralizados + UI por feature):**
   - **Servicios de datos (`src/services/` por tabla/dominio de Postgres):** consultas tipadas reutilizables (ej. `auth.service.ts`, `catalogos.service.ts`, `seguimientos.service.ts`, `actas.service.ts`), joins PostgREST y mapeo centralizado de errores Postgres (`23514`, `23505`, `23503`, `42501`). Evita duplicar carpetas `api/` dentro de cada feature.
   - **UI y estado (`src/features/<feature>/{hooks,components}/`):** hooks especificos de pantalla y componentes visuales alineados con `ContexIA/DESIGN.md` (o delega el detalle visual a `/design-issue`).

---

## Paso 4: Plan de Pruebas y Simulacion del Caso de Uso (Obligatorio)

Cada criterio de aceptacion del issue debe quedar cubierto por verificacion concreta:

1. **Verificacion estatica:** build, typecheck (`tsc -b`) y lint del proyecto.
2. **Tests unitarios de logica pura (`node --test` o runner del repo):** para calculos, validadores previos, agregaciones o generadores (ej. ExcelJS).
3. **Script simulado del caso de uso contra Postgres/Supabase:**
   - Define el flujo paso a paso usando `@supabase/supabase-js` y `.env`: autenticacion del rol del issue, ejecucion del happy path, pruebas negativas que confirmen rechazo por `CHECK`/`UNIQUE`/`RLS`/`RESTRICT`, y limpieza final de registros sintéticos.
   - Si el issue cambia SQL/RLS, incluye tambien verificacion transaccional SQL (`BEGIN; ... ROLLBACK;`).

---

## Paso 5: Entrega

Redacta el plan siguiendo [issue-plan-template.md](./references/issue-plan-template.md). Al final, pregunta si desea proceder con `/code-issue <NUMERO>` (o publicar el plan como comentario en el issue con `gh issue comment`).
