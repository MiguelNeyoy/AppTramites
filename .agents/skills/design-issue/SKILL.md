---
name: design-issue
description: >-
  Disena, maqueta o audita la interfaz UI/UX de un Issue o feature de GitHub
  consultado con gh CLI, acoplandose dinamicamente a ContexIA/DESIGN.md,
  ContexIA/STITCH_DESIGN.md, ContexIA/MEMORY.md y los tokens/componentes del
  repositorio actual. Usala cuando el usuario invoque /design-issue o pida
  disenar vistas, modales, tablas o revisar consistencia visual de un issue.
---

# Diseno UI/UX por Issue de GitHub (`/design-issue`)

Disena o valida la interfaz de un **Issue de GitHub** respetando el sistema de diseno documentado en **ContexIA/**, la configuracion real de estilos del proyecto y las reglas de dominio de `ContexIA/MEMORY.md`.

Regla de formato: **nada de emojis** en la interfaz ni en etiquetas; usa iconos de la libreria configurada en el proyecto (ej. `lucide-react`).

---

## Paso 1: Consultar el Issue y el Sistema de Diseno (`ContexIA/`)

1. Detecta `ORG/REPO` desde `git remote -v` y consulta el issue con `gh` (siempre con `-R ORG/REPO`, **sin pipes ni redirecciones**):
   ```bash
   gh issue view <NUMERO> -R <ORG>/<REPO> --json number,title,body,labels,comments
   ```
   Si no se dio numero, lista los issues abiertos con `gh issue list -R <ORG>/<REPO> --state open --limit 30 --json number,title,labels`.
2. Lee la fuente de verdad visual y de dominio del repositorio:
   - `ContexIA/DESIGN.md`: principios, paleta, distribucion 60/30/10, tipografia, densidad de tablas, jerarquia de botones, animaciones, modo oscuro y feedback.
   - `ContexIA/STITCH_DESIGN.md` (si existe): tokens estructurados y guias de marca.
   - `ContexIA/MEMORY.md`: **obligatorio leerlo tambien en diseno y actulizarlo con los cambios, solo escribe lo necesario para dar contexto** para detectar trampas de dominio y evitar copiar campos o APIs de capturas de referencia de otros proyectos (ej. en TrámitesUAS `DESIGN.md` ilustra el estilo visual con un sistema hermano, pero `MEMORY.md` prohibe campos individuales de alumno/CURP y exige captura numerica por lote y arquitectura PWA sin Tauri).
3. Inspecciona los tokens y componentes reales del codigo:
   - Variables CSS y tema: `src/index.css`, `tailwind.config.*`, `components.json` y hook de tema (ej. `src/app/useTheme.ts`).
   - Primitivos instalados: `src/components/ui/` (para reutilizar `Button`, `Card`, `Dialog`, `Table`, `Tabs`, `Badge`, `Select`, `Input`, `Checkbox`, `Switch`, `Sonner`, etc. sin reinventar componentes).
4. **Context7 (si esta habilitado):**
   - Si el MCP `context7` (`resolve-library-id` y `query-docs`) esta disponible, consulta APIs vigentes, funciones nuevas y buenas practicas de React 19, Tailwind CSS, Radix UI, `shadcn/ui` y `lucide-react` segun las versiones de `package.json`.

---

## Paso 2: Definir la Propuesta Visual del Issue

Antes de escribir o ajustar componentes, alinea estos 5 puntos con [design-checklist.md](./references/design-checklist.md) y aplica buenas practicas de **Clean Code en React** (no reinventar componentes ya existentes en `src/components/ui/`, extraer subcomponentes y hooks para mantener vistas pequenas, usar **early returns** en lugar de `if` anidados o ternarios profundos en JSX, calcular estado derivado en render sin `useEffect` innecesarios y evitar `any`):

1. **Tokens semanticos (Prohibido hex hardcodeado):**
   - Usa exclusivamente clases conectadas a las variables del tema (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-secondary`, `border-border`, `bg-primary`, `text-destructive` y tokens de marca definidos en Tailwind como `bg-uas-blue` / `text-uas-gold` si existen en el proyecto).
2. **Paridad Modo Claro y Modo Oscuro:**
   - Verifica contraste de superficies, bordes y badges en `:root` y `.dark`.
3. **Jerarquia de acciones y densidad operativa:**
   - Maximo **un boton CTA primario** por vista principal (ej. dorado institucional).
   - Acciones especiales (ej. exportacion `.xlsx` oficial) con su color semantico dedicado (ej. esmeralda).
   - Tablas densas y escaneables; codigos, claves, periodos, fechas y conteos numericos con `font-mono tabular-nums`.
4. **Adaptacion por Rol y Entorno:**
   - Refleja en la navegacion y filtros las reglas reales de cada rol segun `ContexIA/MEMORY.md` (ej. ocultar conmutador de nivel si el rol esta restringido a un nivel; mostrar ambos niveles juntos cuando el rol sea transversal como `NUEVO_INGRESO`).
   - Asegura comportamiento fluido en navegador y modo standalone **PWA** (sin atributos nativos de escritorio tipo Tauri).
5. **Feedback no bloqueante:**
   - Toasts via `sonner` y confirmaciones destructivas en `Dialog`; nunca `alert()`/`confirm()` del navegador.

---

## Paso 3: Prototipado con Stitch o Implementacion Directa o Creacion de Imagenes u Mockups

- **Si el usuario pide explorar/generar primero un mockup:** utiliza las herramientas de Stitch disponibles partiendo de `ContexIA/STITCH_DESIGN.md` y luego traduce el resultado a los componentes reales de `src/components/ui/` y variables de `src/index.css`.
- **Si el usuario pide disenar e implementar la vista en codigo:** crea o actualiza los componentes en `src/features/<feature>/components/` respetando la tipografia, tokens y convenciones estrictas de TypeScript/ESLint del proyecto.

---

## Paso 4: Verificacion Visual y Tecnica

1. Revisa el listado completo de [design-checklist.md](./references/design-checklist.md).
2. Ejecuta `build` y `lint` del proyecto (`pnpm build`, `pnpm lint` o equivalente en `package.json`).
3. Resume la propuesta o cambios realizados vinculados al issue `#<NUMERO>`.
