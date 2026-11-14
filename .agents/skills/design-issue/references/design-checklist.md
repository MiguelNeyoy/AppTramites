# Checklist de Diseno UI/UX por Issue

Valida cada punto contra `ContexIA/DESIGN.md`, `ContexIA/STITCH_DESIGN.md`, `ContexIA/MEMORY.md` y el tema real del proyecto (`src/index.css` + `tailwind.config.*`):

## 1. Coherencia con el Dominio (`ContexIA/MEMORY.md`)
- [ ] Los campos del formulario y columnas de tabla corresponden exactamente al modelo real del proyecto (sin arrastrar campos ajenos de capturas de referencia).
- [ ] La visibilidad de controles (tabs, selectores de nivel, botones de edicion/borrado) respeta la matriz de roles y reglas transversales.
- [ ] Compatible con navegador y PWA standalone (sin dependencias ni atributos de escritorio nativo).

## 2. Sistema Cromatico y Modo Oscuro
- [ ] Cero colores hexadecimales fijos en JSX cuando exista token semantico (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-secondary`, `border-border`).
- [ ] Pildoras de estado con fondo translúcido (~10%) y alto contraste tanto en modo claro como en `.dark`.
- [ ] Regla 60/30/10 respetada: superficies neutras dominantes, estructura legible y acentos reservados a acciones cardinales y estados.

## 3. Tipografia, Densidad y Componentes
- [ ] Claves institucionales, periodos, fechas, folios y cifras numericas usan `font-mono tabular-nums`.
- [ ] Maximo **un CTA primario** destacado por pantalla principal.
- [ ] Se reutilizan los primitivos existentes en `src/components/ui/` (`Button`, `Dialog`, `Table`, `Select`, `Badge`, `Sonner`, etc.).
- [ ] Cero emojis en etiquetas, titulos, badges o mensajes; iconografia consistente con `lucide-react`.
- [ ] Transiciones rapidas (`duration-150`), anillos de foco accesibles (`focus-visible:ring-2`) y confirmacion modal para acciones destructivas.
