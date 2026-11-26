---
tipo: memoria_ai
proyecto: "SistemaSeguimientoDeTramites"
actualizado: 2026-11-24
tags:
  - context-ai
  - memory
  - uas
---

# MEMORY: Contexto de Desarrollo Activo (TrámitesUAS)

> **Regla de Oro para la IA:** Lee esta nota para conocer el estado actual, las decisiones tomadas y las trampas a evitar. Para detalles extensos, navega a los enlaces en lugar de duplicar información.
> **Regla dos:** Nada de emojis.

---

## Estado Actual y Siguiente Paso

**Avances completados:**
* **Base de datos y tipos:** Esquema, seeds y políticas RLS desplegados en Supabase Self-Hosted (`192.168.1.75`, Studio en `:54323`); `.env` configurado y tipos generados en `src/types/database.types.ts`.
* **Esqueleto del proyecto:** Capa de datos centralizada y organizada por dominio en `src/services/{login,tramites,actas,fichas,catalogos,documentos,ocr,shared}/` (cada carpeta agrupa su servicio, validaciones y barrel `index.ts`; `shared/` centraliza utilidades comunes como `supabaseErrors.ts`), features ligeras para UI y hooks (`src/features/{auth,actas,tramites,fichas,dashboard,catalogos}/{components,hooks}`), cliente tipado (`src/lib/supabase.ts`), `useTheme` claro/oscuro (`src/app/useTheme.ts`), alias `@/` y base PWA (`vite-plugin-pwa` en `vite.config.ts`).
* **Sistema de diseño e UI base:** Tokens HSL en `src/index.css` y `tailwind.config.js`, Shadcn UI (`components.json`, `src/lib/utils.ts`) con 13 componentes instalados en `src/components/ui/` (Radix, Lucide, Sonner, next-themes). `tsc -b`, `lint` y `build` pasando en limpio.
* **UI del Login (Issue #2):** Vista split-screen minimalista con escudo oficial UAS (`src/assets/uas-escudo.png`) implementada en `src/features/auth/components/LoginPage.tsx` usando `Card`, `Input`, `Label`, `Checkbox` y `Button` de `shadcn/ui`, sin lógica de autenticación aún (incluye botón temporal para saltar al tablero).
* **UI del Dashboard Principal (Issue #3):** Shell responsivo (sidebar + topbar PWA), 4 KPIs globales, gráficas mensuales/por nivel y distribución por trámite con tokens `--chart-1..5`, tabla densa de cortes por unidad académica y resumen de checklist de actas en `src/features/dashboard/` (conectado vía bypass temporal en `src/app/App.tsx`).
* **UI del Formulario de Registro de Trámites (Issue #4):** Modal `Dialog` sin actas en `src/features/tramites/components/TramiteRegistroModal.tsx` (cascada Unidad Académica -> Programa Educativo, selección de trámite, conteos `enviadas`/`resueltas`/`pendientes`/`conError`, soporte individual y por lote con precarga de 8 trámites y PDF opcional).
* **UI del Checklist de Actas (Issue #5):** Vista en `src/features/actas/components/ChecklistActasView.tsx` con dos listas (Unidades Pendientes y Unidades Resueltas en tono grisáceo), programas educativos en toggle list desplegable, acción `Todo`/`Reabrir` por unidad y modal `EditarTramitesProgramaModal.tsx` para editar el número de trámites por carrera.
* **UI de Catálogos (Issue #9):** Vista maestro-detalle y pestañas en `src/features/catalogos/components/CatalogosView.tsx` para visualizar, crear, editar, activar/inactivar y eliminar (vía modal de confirmación) Unidades Académicas, Preparatorias, Programas Educativos y Tipos de Trámite.
* **Módulo y Lógica de Usuarios (Issue #10):** Implementado `src/services/usuarios/` (`usuarios.service.ts`, `usuariosValidation.ts`, `index.ts`), hook `src/features/usuarios/hooks/useUsuarios.ts` y RPCs administrativas `public.admin_update_usuario` / `public.admin_delete_usuario` en `supabase/migrations/202611190002_issue_10_usuarios_rpcs.sql`. Conectado en `UsuariosView.tsx` y `UsuarioFormModal.tsx` con soporte completo de alta sin pisar la sesión del `ADMIN` (cliente efímero no persistente), edición atómica en `perfiles` + `auth.users`, asignación de `unidad_academica_id` para rol `UNIDAD_ACADEMICA` (ej. clave `4800`), interruptor de estado activo y borrado protegido por `ON DELETE RESTRICT`.
* **Servicio de Login y Validación (Issue #6):** Estructurado por carpetas en `src/services/login/` (`login.service.ts`, `loginValidation.ts`, `index.ts`) y `src/services/shared/` (`supabaseErrors.ts`, `index.ts`), junto al hook `src/features/auth/hooks/useAuth.ts`, con autenticación Supabase (`signInWithPassword`), verificación de perfil activo en `public.perfiles`, recuperación de contraseña (`resetPasswordForEmail` / `updateUser`), validación estricta de correo/contraseña y bloqueo de patrones SQL injection en frontend, integrado en `LoginPage.tsx`, `App.tsx`, `DashboardPage.tsx` y `DashboardSidebar.tsx`.
* **Servicio y Módulo de Catálogos (Issue #8):** Implementado `src/services/catalogos/` (`catalogos.service.ts`, `catalogosValidation.ts`, `index.ts`) con lectura global (`fetchAllCatalogos`) y CRUD completo (agregar, editar, activar/desactivar, eliminar) para `unidades_academicas`, `programas_educativos`, `tipos_tramite` y `periodos_escolares`. Integrado en `src/features/catalogos/hooks/useCatalogos.ts`, `CatalogosView.tsx` (incluyendo pestaña de Periodos Escolares) y `CatalogosModals.tsx` (`PeriodoFormModal`).
* **Migración DB, RLS y Tipos (Issue #11):** Migración versionada en `supabase/migrations/202611190001_issue_11_alumnos_fichas_rls.sql` y aplicada en Supabase (`192.168.1.75`): nuevas tablas `public.tramites_alumnos` (por alumno con `folio` identity consecutivo, `fecha_registro` y `estado`) y `public.fichas_nuevo_ingreso` (10 campos oficiales Excel + `estatus_ficha`), nuevo valor `'UNIDAD_ACADEMICA'` en `rol_usuario`, columna `perfiles.unidad_academica_id` con `CHECK` de coherencia, helper `public.current_user_unidad_academica_id()` (`SECURITY DEFINER`) y políticas RLS por unidad/nivel sin recursión; `src/types/database.types.ts` regenerado y compatibilidad en `login.service.ts`, `usuariosMockData.ts` y `UsuariosView.tsx`.
* **Módulo de Nuevo Ingreso + ExcelJS (Issue #13):** Implementada la capa `src/services/fichas/` (`fichas.service.ts` con join explícito `programas_educativos!fichas_nuevo_ingreso_programa_id_fkey!inner`, `fichasValidation.ts` y `fichasExcel.ts` con `exceljs` generando hoja `NUEVO INGRESO` idéntica a `CLAVE UA - NUEVO INGRESO 2026.xlsx`), política `fichas_nuevo_ingreso_delete_policy` para `ADMIN` y `NUEVO_INGRESO` (`supabase/migrations/202611190003_issue_13_fichas_delete_rls.sql`), hook `src/features/fichas/hooks/useFichas.ts`, vista transversal `FichasNuevoIngresoView.tsx` y formulario adaptativo `TramiteRegistroModal.tsx` (`GeneralTramiteFields.tsx` / `NuevoIngresoFields.tsx`) conectado a catálogos reales y `DashboardPage.tsx`.
* **Trámites por Alumno y Reemplazo del Dashboard (Issues #7 y #14):** Implementada la capa `src/services/tramites/` (`tramites.service.ts`, `tramitesValidation.ts`, `index.ts`) sobre `public.tramites_alumnos` y el hook `src/features/tramites/hooks/useTramites.ts` conectado a `TramiteRegistroModal.tsx` (alta/edición por alumno con `folio` manual en texto, opcional y único por `(periodo_id, tipo_tramite_id)` tras `supabase/migrations/202611210001_folio_manual_unico_tramites.sql`, y guardado transversal si se selecciona Nuevo Ingreso). Reemplazado el Dashboard analítico (`DashboardCharts.tsx` y `dashboardMockData.ts` eliminados) por la vista operativa principal `TramitesAlumnosView.tsx` en `DashboardPage.tsx` / `DashboardSidebar.tsx` (`Trámites y Alumnos`).
* **UI del Checklist de Actas en Tabla (Issues #12 y #17):** Rediseñado `ChecklistActasView.tsx` y `actasMockData.ts` (eliminado `EditarTramitesProgramaModal.tsx`) como matriz tipo hoja de cálculo (`Checklist.jpeg`), ampliada para las **3 actas oficiales** (`ORDINARIA`, `EXTRAORDINARIA`, `REGULARIZACION`) más las columnas **Promoción de Grado** (`PROMOCION_GRADO`) y **Cierre de Ciclo** (`CIERRE_CICLO`), con celdas semánticas verde/rojo/N-A, limpieza automática al completar todas las columnas aplicables, reemplazo del bloque `Control` (`Avance`/`Todo`) por columnas seleccionables **Responsable** y **Fecha** (mostrando `Periodo 1` / `Periodo 2`), filtro por fecha/periodo en barra y botón `Reincorporar Actas` (`RefreshCw`) con modal de confirmación para restaurar los programas completados con sus casillas vacías (`PENDIENTE`, sin responsable ni fecha).
* **Lectura Client-Side de Documentos PDF/Excel (Issue #15):** Implementada la capa `src/services/documentos/` (`documentParsers.ts`, `documentReader.ts` con carga dinámica de `pdfjs-dist` + worker local Vite y `exceljs`, barrel `index.ts`) compatible con GitHub Pages sin servidor Python/Docker. Soporta prellenado automático para Exámenes Especiales, Complementarias (PDF/XLSX), Convalidación (XLSX y oficio PDF multipágina con normalización de homoglyphs y fechas OCR), Migración de Calificaciones multi-hoja (6 alumnos) y Fichas de Nuevo Ingreso (`CLAVE UA - NUEVO INGRESO 2026.xlsx`), con advertencia `requiresOcr` para PDFs sin texto seleccionable (Issue #16). Integrado en `TramiteRegistroModal.tsx` con selector multi-registro para revisión y confirmación humana antes de persistir en Supabase; cubierto en `tests/documentos.test.ts` y `tests/simulate-issue-15.mjs`.
* **OCR Client-Side en Navegador con Tesseract.js (Issue #16):** Implementada la capa `src/services/ocr/` (`ocrValidation.ts`, `ocr.service.ts` con carga dinámica bajo demanda de `tesseract.js` idioma `spa` y renderizado temporal de páginas PDF en canvas con corte temprano, barrel `index.ts`) ejecutada íntegramente en el navegador del usuario sin servidor Python externo. Integrada en `TramiteRegistroModal.tsx` para aceptar imágenes (`.png`, `.jpg`, `.jpeg`, `.webp`) y actuar como fallback automático cuando un PDF arroja `requiresOcr: true`, mostrando barra de progreso, porcentaje de confianza y fallback manual no bloqueante si falla la descarga de idioma; cubierto en `tests/ocr.test.ts` y `tests/simulate-issue-16.mjs`.

* **Checklist de Actas por Periodos, Etapas y Persistencia Real (Actualización 2026-11-24):** Aplicada la migración `supabase/migrations/202611240001_checklist_actas_periodos_etapas.sql` en Supabase local (`192.168.1.75`): extendido `public.tipo_acta` con `'PROMOCION_GRADO'` y `'CIERRE_CICLO'`, añadida columna `responsable_id` y FK `ON DELETE RESTRICT` hacia `programas_educativos`, trigger `before_write_checklists_actas` que bloquea `PROMOCION_GRADO`/`CIERRE_CICLO` en Periodo 1 (`23514`), políticas RLS `INSERT`/`DELETE` y RPC `public.list_responsables_actas()`. Implementados `src/services/actas/` (`actas.service.ts`, `actasValidation.ts`, `index.ts`), hook `src/features/actas/hooks/useChecklistActas.ts`, modal `SeguimientoActasModal.tsx` al pulsar las tarjetas KPI y actualización de `ChecklistActasView.tsx` (Periodo 1 = 3 actas vs Periodo 2 = 5 actas en blanco, selector de etapa activa con salto automático al 100%, columna `Fecha` global en solo lectura, conservación automática de rastro visual al 100% y eliminación de `Reincorporar Actas`); cubierto en `tests/actas.test.ts` y `tests/simulate-checklist-actas.mjs`.
* **Ciclos Escolares Ascendentes Automáticos, Preparatorias en Mayúsculas y Deploy LXC (Actualización 2026-11-24):** Aplicadas las migraciones `202611240002_preparatorias_mayusculas.sql` (23 preparatorias y 29 programas educativos de Bachillerato normalizados a mayúsculas) y `202611240003_ciclos_escolares_automaticos.sql` (columna `ciclo_escolar` con `UNIQUE (ciclo_escolar, numero_periodo)`, RPC `ensure_ciclos_escolares()` arrancando en `2026-2027` que cada agosto genera automáticamente Periodo 1 Ago-Ene y Periodo 2 Feb-Jul en orden ascendente, y RPC `generar_siguiente_ciclo_escolar()` para `ADMIN`). Agregados selectores separados `Ciclo Escolar` + `Periodo` en `ChecklistActasView.tsx`, botón `Generar siguiente ciclo (P1 y P2)` en `CatalogosView.tsx` y script de despliegue en 1 comando `scripts/deploy-lxc.sh` (`pnpm deploy:lxc`).

**Dónde nos quedamos (Pendiente inmediato):**
1. **Dar de alta cuentas operativas restantes:** crear la cuenta de Diana desde Administración de Usuarios con `rol = 'UNIDAD_ACADEMICA'` y la unidad de Informática (`4800`), y verificar la migración `202611210001_folio_manual_unico_tramites.sql` en el servidor local.
2. **Completar Issue #1 (Protección de rutas por rol):** Los servicios base de autenticación y `useAuth` ya están conectados para Issue #6; falta restringir vistas/módulos según `rol_usuario` (`ADMIN`, `LICENCIATURA`, `BACHILLERATO`, `NUEVO_INGRESO`, más el alcance por `unidad_academica_id`) y retirar el botón temporal de bypass en producción.
3. **Pendientes menores de setup:** cambiar `require("tailwindcss-animate")` a `import` ESM en `tailwind.config.js` (línea 104) si genera aviso en editor/Node, y migrar a Supabase Cloud + CI/CD solo cuando el cliente congele los requerimientos.

---

## Cambio de Requerimientos (Actualización 2026-11-18)

> **ADVERTENCIA SOBRE ARCHIVOS DE REFERENCIA:** Los audios, la imagen y el Excel de estos requerimientos (`AudioDeFormulario.ogg`, `DataDeTramites.ogg`, `DataRequerimientos.ogg`, `DataDeFichaDeNuevoIngreso.ogg`, `DataFormatoYReporte.ogg`, `DataNuevoIngresoYtodo.ogg`, `FeatureUsuariosSoloInformatica.ogg`, `RequerimientoChecklist.ogg`, `Checklist.jpeg` y `CLAVE UA - NUEVO INGRESO 2026.xlsx`) **están en la nube / recurso compartido SMB (`smb://192.168.1.73/personal/AppTramites/InfoDeRequerimientos`) y NO están dentro de ninguna carpeta local del repositorio.** *(Nota: `DataDeTramites.ogg` y `DataRequerimientos.ogg` son el mismo audio.)*

1. **Trámites Generales (8 trámites -> formulario por alumno + folio consecutivo):**
   * Reemplaza la captura puramente numérica por lote. Ahora se registra cada solicitud en formato formulario tipo Excel: `numero_cuenta`, `nombre_alumno`, `carrera`/`programa_id`, `fecha_registro`, estado (`PENDIENTE`/`RESUELTO`) y **número de folio consecutivo** autogenerado al enviar.
   * Aplica a todo nivel **Licenciatura** (Iris) y **Bachillerato** (Juan Carlos), conservando métricas mensuales (ej. agosto, septiembre) y desglose general en el Dashboard.
2. **Fichas de Nuevo Ingreso (transversal -> formulario por aspirante + exportación `.xlsx`):**
   * Operado exclusivamente por `NUEVO_INGRESO` (Ismael) cubriendo Bachillerato y Licenciatura desglosados por escuela/unidad académica.
   * Campos exactos según `CLAVE UA - NUEVO INGRESO 2026.xlsx` (respetar encabezados sin modificarlos): `CURP`, `A_Paterno`, `A_Materno`, `NOMBRE`, `SEXO` (`1` = Masculino, `2` = Femenino), `ESCUELA` (clave UA de 4 dígitos), `CARRERA` (clave de 1 a 2 dígitos), `FECHA NAC` (`AAAA/MM/DD`), `CELULAR`, `CORREO`.
   * Exportación a Excel con ese formato exacto (casos sin proceso / sin pago / ficha vencida / ficha cancelada).
3. **Checklist de Actas (3 actas en tabla con checkboxes):**
   * Se mantiene exclusivamente para las **3 actas oficiales** (`ORDINARIA`, `EXTRAORDINARIA`, `REGULARIZACION`).
   * La imagen `Checklist.jpeg` es referencia de diseño para **visualizarlo en forma de tabla con checkboxes** (por clave de escuela/programa y las 3 actas en columnas, limpiando o filtrando pendientes conforme se marcan), en lugar de solo tarjetas/listas desplegables.
4. **Nuevo usuario acotado por Unidad Académica:**
   * Se requiere dar de alta un rol/alcance por escuela específica (ejemplo: usuario para Informática clave `4800`) con acceso a todos los trámites pero filtrado exclusivamente a su `unidad_academica_id` vía políticas RLS en PostgreSQL.

---

## Enlaces Clave del Proyecto (Fuente de Verdad)
* [[TremitesUAS|TremitesUAS.md]]: Especificación maestra, matriz de los 4 roles, los 9 trámites y modelo relacional (ERD).
* [[ADR/FrontWeb|ADR: FrontWeb]]: Decisión arquitectónica de cliente PWA instalable con React 19 + Supabase.
* [[ContexIA/DESIGN|DESIGN.md]]: Sistema de diseño UAS (Azul #1a2742, Dorado #f59e0b), tokens de Tailwind y reglas de UI de alta densidad.
* [[ContexIA/STITCH_DESIGN|STITCH_DESIGN.md]]: Tokens exportados y referencias visuales.
* **Código fuente:** `D:\Proyectos\AppTramites\` (tipos en `src/types/database.types.ts`)
* **Conversación origen (contexto completo del principio):** ID `e9945859-bbfb-4a81-ac63-90f245d9857e` (audios originales de Servicios Escolares, Excel de 9 hojas, definición de los 4 roles, captura numérica por lote y separación aparte del checklist de actas).

---

## Trampas Críticas a Evitar (Anti-patrones del Proyecto)

* **Trampa 1: Mantener la regla obsoleta de captura solo numérica por lote.**
  * *Error:* Rechazar `numero_cuenta`, `nombre_alumno`, `CURP` o campos por alumno basándose en la especificación inicial previa al 2026-11-18.
  * *Regla:* Desde la actualización del 2026-11-18, Trámites captura por alumno con folio consecutivo automático y Fichas captura los 10 campos nominales del Excel oficial; las métricas del Dashboard se derivan/agregan desde esos registros.
* **Trampa 2: Filtrar por nivel escolar a Ismael (Nuevo Ingreso).**
  * *Error:* Ocultarle las prepas o las facultades al rol `NUEVO_INGRESO`.
  * *Regla:* Ismael es transversal: ve Bachillerato y Licenciatura juntas, pero únicamente para el módulo de Fichas.
* **Trampa 3: Confiar la seguridad y cálculos al frontend.**
  * *Error:* Validar sumas solo con TypeScript en React.
  * *Regla:* La integridad matemática vive en el `CHECK` de Postgres y el aislamiento de datos en las políticas RLS.
* **Trampa 4: Recursión infinita en políticas RLS.**
  * *Error:* Hacer `SELECT rol FROM perfiles` dentro de una política sobre `perfiles`.
  * *Regla:* Usar siempre la función `public.current_user_role()` creada con `SECURITY DEFINER`.
* **Trampa 5: Usar `CASCADE` en tablas de historial.**
  * *Error:* Si se descontinúa una carrera o periodo, borrar sus seguimientos.
  * *Regla:* `programas_educativos` tiene `ON DELETE RESTRICT` hacia `seguimientos_tramite` para proteger el historial oficial.
* **Trampa 6: Salirse de la paleta institucional UAS.**
  * *Error:* Usar componentes genéricos morados/verdes o fuentes no aprobadas.
  * *Regla:* Respetar estrictamente los tokens de [[ContexIA/DESIGN|DESIGN.md]]: Azul Marino UAS, Dorado oficial y fuentes Inter/JetBrains Mono.
* **Trampa 7: Intentar empaquetar binarios nativos complejos (.exe/Rust).**
  * *Error:* Usar Tauri o Electron.
  * *Regla:* El sistema se distribuye como PWA instalable desde el navegador institucional (Edge/Chrome).

---

## Decisiones Arquitectónicas Innegociables

| Aspecto | Decisión | Motivo |
| :--- | :--- | :--- |
| **Backend** | Supabase (PostgREST + Auth + RLS) | Cero código de backend boilerplate; todo el negocio se blinda en PostgreSQL. |
| **Distribución / Cliente** | PWA (Progressive Web App con vite-plugin-pwa) | Se instala en 1 clic desde Edge/Chrome en la barra de tareas de Windows, sin necesidad de compilar .exe ni gestionar instaladores pesados; actualizaciones instantáneas en red local. |
| **Frontend** | React 19 + TypeScript + Vite | Velocidad, tipado estricto y ecosistema óptimo para formularios y tablas densas. |
| **Estilos** | Tailwind CSS + Shadcn UI | Tablas densas de oficina, diseño responsivo y alternancia fluida Modo Claro / Modo Oscuro. |
| **Exportación** | ExcelJS | Generación client-side de archivos `.xlsx` idénticos a los formatos oficiales de la oficina. |
