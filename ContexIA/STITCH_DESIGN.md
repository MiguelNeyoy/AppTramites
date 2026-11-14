---
name: Sistema UAS Trámites y Certificados
colors:
  surface: '#ffffff'
  surface-dim: '#f4f6fa'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f6fa'
  surface-container: '#e8edf7'
  surface-container-high: '#dfe5f2'
  surface-container-highest: '#d0daec'
  on-surface: '#1a2742'
  on-surface-variant: '#64748b'
  inverse-surface: '#111827'
  inverse-on-surface: '#e5e7eb'
  outline: 'rgba(0, 0, 0, 0.08)'
  outline-variant: 'rgba(0, 0, 0, 0.04)'
  surface-tint: '#f59e0b'
  primary: '#f59e0b'
  on-primary: '#ffffff'
  primary-container: '#fbbf24'
  on-primary-container: '#1a2742'
  secondary: '#1a2742'
  on-secondary: '#ffffff'
  secondary-container: '#243044'
  on-secondary-container: '#e8edf7'
  tertiary: '#059669'
  on-tertiary: '#ffffff'
  tertiary-container: '#d1fae5'
  on-tertiary-container: '#065f46'
  error: '#ef4444'
  on-error: '#ffffff'
  error-container: '#fee2e2'
  on-error-container: '#991b1b'
  background: '#f4f6fa'
  on-background: '#1a2742'
  surface-variant: '#e8edf7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.375rem
  md: 0.5rem
  lg: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1.25rem
  card-padding: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
---

## Brand & Style
Design system para la Universidad Autónoma de Sinaloa (UAS) enfocado en ventanillas y control administrativo de Servicios Escolares. Interfaz de alta densidad de datos, estética moderna inspirada en Shadcn UI y Tailwind CSS, tonos sobrios azul marino águila (#1a2742) y acentos ámbar dorado (#f59e0b).

## Colors
- Fondo General Claro: #f4f6fa para evitar destello visual blanco puro.
- Superficie de Tarjetas: Blanco #ffffff con sutil borde grisáceo.
- Texto Primario Institucional: Azul marino #1a2742.
- Acento Primario (Dorado UAS): #f59e0b / #fbbf24 reservado para llamadas a la acción cardinales.
- Acciones Especiales (Oficial URS): Verde esmeralda #059669.
- Píldoras de Estado:
  - Pendiente: Fondo ámbar 10% con texto ámbar (#f59e0b).
  - Resuelto / Generado: Fondo esmeralda 10% con texto verde (#10b981).
  - En Trámite: Fondo púrpura 10% con texto morado (#a855f7).
  - Con Error: Fondo rojo 10% con texto rojo (#ef4444).

## Typography
- Interfaz y Etiquetas: Inter, tipografía limpia, moderna y legible.
- Códigos, Claves y Números: JetBrains Mono aplicado estrictamente a Claves de Escuela (8210, 4800), números de cuenta, folios de recibo y CURP.

## Layout & Spacing
- Sidebar Fijo: 220px con selector de división (Bachillerato / Licenciatura), enlaces de navegación y tarjeta de usuario.
- Área de Trabajo: Tarjeta blanca contenedora elevada con bordes redondeados (rounded-xl), cronología o selector de periodo, tarjetas de conteo rápido (KPIs), barra de filtros y tabla densa con filas alternas suaves.

## Elevation & Depth
- Nivel 0 (Lienzo Base): #f4f6fa.
- Nivel 1 (Tarjetas Principales): #ffffff con borde sutil 1px rgba(0,0,0,0.08) y sombra shadow-sm.
- Nivel 2 (Modales Flotantes): Fondo blanco con backdrop blur y sombra shadow-xl.

## Shapes
- Botones e Inputs: 6px (0.375rem).
- Tarjetas y Contenedores: 12px (0.75rem).
- Píldoras de Estado: 9999px (full rounded).

## Components
- Botón Primario: Fondo dorado #f59e0b, texto blanco o azul oscuro, negrita.
- Botón Secundario: Outline con borde suave y texto azul marino.
- Tabla: Filas de 40px de altura con efecto hover suave y badges de estado compactos.
