---
tipo: memoria_ai
proyecto: "SistemaSeguimientoDeTramites"
actualizado: 2026-11-11
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
* **Esqueleto del proyecto:** Capa de datos centralizada por recurso/tabla (`src/services/`), features ligeras para UI y hooks (`src/features/{auth,actas,tramites,fichas,dashboard,catalogos}/{components,hooks}`), cliente tipado (`src/lib/supabase.ts`), `useTheme` claro/oscuro (`src/app/useTheme.ts`), alias `@/` y base PWA (`vite-plugin-pwa` en `vite.config.ts`).
* **Sistema de diseño e UI base:** Tokens HSL en `src/index.css` y `tailwind.config.js`, Shadcn UI (`components.json`, `src/lib/utils.ts`) con 13 componentes instalados en `src/components/ui/` (Radix, Lucide, Sonner, next-themes). `tsc -b`, `lint` y `build` pasando en limpio.

**Dónde nos quedamos (Pendiente inmediato):**
1. **Siguiente módulo:** Implementar `src/features/auth` (contexto/hook `useAuth`, carga de rol desde `perfiles` y pantalla de login institucional).
2. **Módulos funcionales:** Tablero de 8 trámites generales, módulo transversal de Fichas de Nuevo Ingreso, checklist semestral de Actas, métricas/catálogos y exportación `.xlsx` con ExcelJS.
3. **Pendientes menores de setup:** Agregar iconos PWA (`pwa-192x192.png`, `pwa-512x512.png` referenciados en `vite.config.ts`) y cambiar `require("tailwindcss-animate")` a `import` ESM en `tailwind.config.js` (línea 104) si genera aviso en editor/Node.

---

## Enlaces Clave del Proyecto (Fuente de Verdad)
* [[TremitesUAS|TremitesUAS.md]]: Especificación maestra, matriz de los 4 roles, los 9 trámites y modelo relacional (ERD).
* [[ADR/FrontWeb|ADR: FrontWeb]]: Decisión arquitectónica de cliente PWA instalable con React 19 + Supabase.
* [[ContexIA/DESIGN|DESIGN.md]]: Sistema de diseño UAS (Azul #1a2742, Dorado #f59e0b), tokens de Tailwind y reglas de UI de alta densidad.
* [[ContexIA/STITCH_DESIGN|STITCH_DESIGN.md]]: Tokens exportados y referencias visuales.
* **Código fuente:** `D:\Proyectos\AppTramites\` (tipos en `src/types/database.types.ts`)

---

## Trampas Críticas a Evitar (Anti-patrones del Proyecto)

* **Trampa 1: Intentar capturar alumno por alumno.**
  * *Error:* Pedir CURP, matrícula o nombres de estudiantes.
  * *Regla:* La captura es 100% numérica por lote (`enviadas`, `resueltas`, `pendientes`, `con_error`).
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
