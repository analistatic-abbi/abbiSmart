---
name: Modern Enterprise Core
colors:
  surface: '#f9f9fd'
  surface-dim: '#dadade'
  surface-bright: '#f9f9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f7'
  surface-container: '#eeedf1'
  surface-container-high: '#e8e8ec'
  surface-container-highest: '#e2e2e6'
  on-surface: '#1a1c1f'
  on-surface-variant: '#43474f'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f4'
  outline: '#73777f'
  outline-variant: '#c3c6d0'
  surface-tint: '#3b608c'
  primary: '#002546'
  on-primary: '#ffffff'
  primary-container: '#0e3b65'
  on-primary-container: '#81a6d6'
  inverse-primary: '#a4c9fb'
  secondary: '#466082'
  on-secondary: '#ffffff'
  secondary-container: '#bcd6fe'
  on-secondary-container: '#435d7f'
  tertiary: '#4a0f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6f1c01'
  on-tertiary-container: '#f9825e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#a4c9fb'
  on-primary-fixed: '#001c37'
  on-primary-fixed-variant: '#204873'
  secondary-fixed: '#d3e4ff'
  secondary-fixed-dim: '#aec8ef'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#2e4869'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb59f'
  on-tertiary-fixed: '#3a0a00'
  on-tertiary-fixed-variant: '#81290c'
  background: '#f9f9fd'
  on-background: '#1a1c1f'
  surface-variant: '#e2e2e6'
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  h1-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Estilo y Personalidad de Marca

Este sistema de diseño proyecta una identidad **Corporativa, Fiable y Eficiente**. Está diseñado específicamente para entornos empresariales de alta densidad de datos, donde la claridad operativa es la máxima prioridad. Inspirado en la robustez de frameworks como PrimeNG, el sistema equilibra una estructura técnica con una estética moderna y limpia.

La experiencia del usuario debe sentirse:
- **Profesional:** Utilizando una paleta de azules profundos que transmiten autoridad y estabilidad.
- **Estructurada:** Con una rejilla clara y componentes consistentes que reducen la carga cognitiva.
- **Funcional:** Priorizando la legibilidad y la facilidad de navegación en procesos administrativos complejos.

El estilo visual se define como **Corporativo Moderno**, utilizando capas tonales sutiles, bordes suaves y una tipografía altamente legible para garantizar que el usuario se mantenga enfocado en la tarea sin distracciones visuales innecesarias.

## Colores

La paleta cromática está jerarquizada para guiar la atención del usuario hacia las acciones y la información crítica.

- **Primario (#0E3B65):** El ancla visual del sistema. Se utiliza en botones de acción principal, encabezados de sección y elementos de marca para establecer confianza.
- **Títulos y Énfasis (#233E5E):** Un azul profundo con matices grises reservado para la jerarquía tipográfica superior, asegurando un contraste óptimo contra fondos claros.
- **Acento Terracota (#BE5535):** Utilizado estratégicamente en paneles laterales o destacados específicos para romper la monotonía cromática sin comprometer la seriedad del sistema.
- **Acciones y Enlaces (#2E8EC2):** Un Cyan vibrante que indica interactividad. Se emplea en estados de foco, enlaces de texto y badges que representan estados activos o "online".
- **Superficies y Fondos:** Se utiliza un gris neutro muy claro para el lienzo de la aplicación, permitiendo que las tarjetas y contenedores blancos resalten mediante una elevación sutil.

## Tipografía

Se ha seleccionado **Inter** como la tipografía única del sistema debido a su excepcional legibilidad en pantallas de alta densidad y su carácter técnico pero amable.

- **Jerarquía:** Los títulos (H1-H3) utilizan el color de énfasis `#233E5E`. El cuerpo de texto utiliza un gris oscuro para reducir la fatiga visual.
- **Labels y Datos:** Para etiquetas de formularios y metadatos en tablas, se prefiere el peso semi-bold (500) en tamaños reducidos (12px) para maximizar el espacio sin perder claridad.
- **Adaptabilidad:** En dispositivos móviles, los encabezados de gran tamaño se reducen proporcionalmente para mantener la integridad del layout.

## Diseño y Espaciado

El sistema utiliza una **rejilla fluida de 12 columnas** para el contenido principal, con márgenes laterales fijos en resoluciones de escritorio.

- **Ritmo Vertical:** Se basa en una unidad de 4px. Los componentes estándar (inputs, botones) tienen una altura de 40px (10 unidades) para un look "compacto-profesional".
- **Contenedores:** Las tarjetas y paneles utilizan un padding de `lg` (24px) para separar el contenido del borde, mientras que las tablas utilizan un padding más denso de `sm` (8px) en las celdas para mostrar más información.
- **Estructura:** 
  - **Sidebar:** Ancho fijo de 260px en escritorio, colapsable a 64px.
  - **Header:** Altura fija de 64px, siempre persistente en la parte superior.
  - **Main Content:** Área flexible que ocupa el resto del viewport con fondo `#F8F9FA`.

## Elevación y Profundidad

Para mantener una estética limpia y corporativa, este sistema utiliza una profundidad mínima basada en capas tonales y sombras ambientales muy suaves.

- **Nivel 0 (Fondo):** `#F8F9FA`. Se utiliza para el fondo de la aplicación.
- **Nivel 1 (Superficie):** `#FFFFFF`. Tarjetas y paneles principales. Utilizan un borde fino de 1px en `#D1D5DB` y no llevan sombra para un look plano y moderno.
- **Nivel 2 (Interacción):** Modales y menús desplegables. Estos elementos utilizan una sombra ambiental difuminada: `0px 4px 12px rgba(0, 0, 0, 0.08)` para indicar superposición física.
- **Separadores:** Líneas finas de 1px en `#D1D5DB` para dividir secciones dentro de un mismo contenedor.

## Formas

El lenguaje de formas es geométrico y preciso. Se ha definido un radio de curvatura uniforme de **6px** para todos los componentes interactivos y contenedores.

- **Botones e Inputs:** 6px (Soft). Esta curvatura suaviza la rigidez corporativa sin restarle profesionalidad.
- **Tarjetas y Modales:** 6px. Mantiene la coherencia visual en elementos de mayor escala.
- **Badges y Roles:** Los badges de estado (como el rol de usuario) pueden utilizar una curvatura de 12px (semi-pill) para diferenciarse claramente de los botones de acción.

## Componentes

### Header Superior
Elemento crítico de identidad y control.
- **Izquierda:** Logo de la marca (basado en la referencia visual proporcionada) con altura máxima de 32px.
- **Derecha:** Grupo de utilidades:
  - Badge de Rol: Texto en `#233E5E` sobre fondo gris claro (Ej: Administrador, Operador).
  - Selector de País: Bandera circular pequeña junto al nombre de la sesión.
  - Notificaciones: Ícono de campana con punto de aviso en naranja terracota `#BE5535`.
  - Usuario: Avatar circular con nombre y botón de "Cerrar Sesión" en estilo link.

### Navegación Lateral (Sidebar)
- **Fondo:** Blanco o Azul muy oscuro (dependiendo de la preferencia de marca, se recomienda blanco para limpieza).
- **Ítems:** Iconografía lineal seguida de texto en Inter 14px.
- **Estado Activo:** Indicador vertical de 3px en Cyan `#2E8EC2` y texto en color primario.

### Tablas de Datos
- **Cabecera:** Fondo gris muy tenue o blanco con texto en Bold.
- **Funciones:** Barra de búsqueda integrada en el header de la tabla, filtros desplegables por columna y paginación en la parte inferior derecha.
- **Estilo:** Bordes horizontales únicamente para un look más limpio.

### Botones y Controles
- **Primario:** Fondo `#0E3B65`, texto blanco, radio 6px.
- **Secundario/Acción:** Fondo blanco, borde `#D1D5DB`, texto `#0E3B65`.
- **Inputs:** Borde `#D1D5DB`, foco con anillo de 2px en Cyan `#2E8EC2`.

### Roles de Usuario (Badges)
- **Administrador:** Azul Marino.
- **Supervisor:** Azul Medio.
- **Operador / Validador:** Gris Azulado.
- **Visitante:** Gris Claro.