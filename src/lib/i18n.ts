export type Lang = "en" | "es";
export type Theme = "light" | "mixed" | "dark";

export const translations = {
  en: {
    title: "Ruddis' Tiny Board",
    subtitle: "Private local board. Your tasks stay in this browser. No account or backend.",
    tags: "Tags:",
    clear: "Clear",
    all: "All",
    active: "Active",
    completed: "Completed",
    view: "View",
    categories: "Categories",
    addCategory: "Add category",
    categoryNamePrompt: "Category name",
    categoryDialogTitle: "Create a category",
    categoryNamePlaceholder: "e.g. In progress",
    cancel: "Cancel",
    create: "Create",
    add: "Add task",
    chooseCategory: "Choose a category for this task",
    createTask: "Create task",
    whatNeedsDone: "What needs to be done?",
    color: "Color",
    recentColors: "Recent colors",
    customColor: "Custom color",
    changeColor: "Change color",
    tag: "tag",
    helpTitle: "Controls & Features",
    helpSaved: "Private by design: tasks stay in this browser and are not sent by the app.",
    help: [
      { key: "Hover", desc: "over the board to reveal the create-task button (always visible on mobile)." },
      { key: "Double-click / Tap", desc: "a task name to rename it inline." },
      { key: "Right-click / ✓ button", desc: "toggle task complete (✓ button on mobile)." },
      { key: "Drag / Hold", desc: "the ⠿ handle to reorder tasks." },
      { key: "Color dot", desc: "click the dot to change the task color." },
      { key: "Tags", desc: "click \"+ tag\" to add tags, then use the filter bar." },
      { key: "Status bar", desc: "switch between All / Active / Completed views." },
      { key: "✕ button", desc: "delete a task (appears on hover)." },
    ],
    madeBy: "Made by",
    changelog: "Changelog",
    // Settings
    settingsTitle: "Settings",
    language: "Language",
    fullColor: "Full-Color",
    fullColorDesc: "Fill the entire task card with the chosen color.",
    theme: "Theme",
    themeLight: "Light",
    themeMixed: "Mixed",
    themeDark: "Dark",
    deleteAll: "Delete all",
    deleteAllConfirm: "Delete all tasks? This cannot be undone.",
    changelogEntries: [
      {
        version: "1.26.0",
        changes: [
          "Hold a dragged column over another for 2 seconds to swap their positions (each keeps its size)",
        ],
      },
      {
        version: "1.25.0",
        changes: [
          "Tasks can now be dropped into empty columns from any other column",
          "Category selection when creating a task is visible and clickable again",
          "Columns move smoothly, glide into place on release and stay where you drop them",
          "The canvas grows as needed; growing columns push those below them instead of covering them",
          "Top bar now has side margins and larger All / Active / Completed buttons",
        ],
      },
      {
        version: "1.24.0",
        changes: [
          "Empty columns now accept dragged tasks as drop targets",
          "Fixed category selection visibility during new task creation",
          "Expanded the freeform canvas to preserve columns placed lower down",
        ],
      },
      {
        version: "1.23.0",
        changes: [
          "Removed the top gap and centered board constraint",
          "Improved smooth column dragging by hiding task content during movement",
          "Fixed column target detection and swapping on the freeform canvas",
        ],
      },
      {
        version: "1.22.0",
        changes: [
          "Collapsed empty columns to a compact header-only layout",
          "Moved pending task creation to the top while keeping category targets visible below",
        ],
      },
      {
        version: "1.21.0",
        changes: [
          "Smoothed freeform column dragging with live transform movement",
          "Added reliable column swapping when dropping one column over another",
          "Removed artificial canvas edge margins and fixed drag cleanup feedback",
        ],
      },
      {
        version: "1.20.0",
        changes: [
          "Removed the internal column scrollbar so the window handles vertical scrolling",
        ],
      },
      {
        version: "1.19.0",
        changes: [
          "Redesigned the board as a fixed-toolbar canvas with grid-snapped free column movement",
          "Added a radial creation menu fixed to the bottom-right corner",
          "Preserved column content and shape throughout dragging",
        ],
      },
      {
        version: "1.18.0",
        changes: [
          "Redesigned the category-selection overlay to prevent task/message overlap",
          "Improved Add category proportions",
          "Replaced the bottom haze with subtle windblown monochrome sand particles",
        ],
      },
      {
        version: "1.17.0",
        changes: [
          "Improved Mixed theme column contrast",
          "Added a subtle animated monochrome aurora at the bottom of the board",
          "Placed Add category beside the compact Create task action",
          "Fixed column wheel scrolling for long task lists",
        ],
      },
      {
        version: "1.16.0",
        changes: [
          "Fixed task spacing and animated cards below the live insertion preview",
          "Preserved rounded glass styling on the column drag overlay",
        ],
      },
      {
        version: "1.15.0",
        changes: [
          "Added a live insertion preview when dragging tasks between cards",
        ],
      },
      {
        version: "1.14.0",
        changes: [
          "Redesigned Add category and compacted the Create task action area",
          "Centered the floating task preview and category selection message",
        ],
      },
      {
        version: "1.13.0",
        changes: [
          "Column drag overlay keeps destination columns visible during swaps",
          "Card previews resize smoothly from pointer-based column detection",
          "Moved the Made by credit below the board and added horizontal category color bars",
        ],
      },
      {
        version: "1.12.0",
        changes: [
          "Single-category boards now use a clean flat layout without a column frame",
        ],
      },
      {
        version: "1.11.0",
        changes: [
          "Create-task button now appears only near its interaction area",
          "New tasks use a floating preview and require choosing a category",
          "Removed create-task buttons from inside columns",
          "Resizable columns, adaptive drag previews, larger task drag handles, and Full-Color by default",
          "Improved column and page scrollbars with no white track",
        ],
      },
      {
        version: "1.8.0",
        changes: [
          "Added \"Delete all\" button to clear the board instantly",
          "Replaced double-tap with a dedicated mark complete button on mobile",
          "Fixed mobile footer credits overlapping with buttons",
          "Fixed create task tab hover state logic",
        ],
      },
      {
        version: "1.7.0",
        changes: [
          "Improved create-task button: translucent in-flow, solid when floating",
          "Fixed mobile double-tap to complete with proper timer",
          "Fixed use-before-declare crash for isStuck detection",
          "Polished touch controls: drag handle always visible at low opacity",
        ],
      },
      {
        version: "1.0.4",
        changes: [
          "Mobile adaptation with touch support",
          "Double-tap to complete tasks",
          "Single-tap to edit tasks",
          "Hold drag handle to move",
        ],
      },
      {
        version: "1.0.3",
        changes: [
          "Fixed contrast of bottom-left icons and footer in Mixed theme",
        ],
      },
      {
        version: "1.0.2",
        changes: [
          "Fixed Full-Color text contrast in Mixed theme",
        ],
      },
      {
        version: "1.0.1",
        changes: [
          "Fixed text contrast on task cards in Mixed theme",
        ],
      },
      {
        version: "1.0.0",
        changes: [
          "First stable release",
          "Settings panel: theme, full-color, language",
          "Three themes: Light, Mixed, Dark",
          "Full-Color mode for task cards",
          "Improved mixed theme with lighter cards",
        ],
      },
      {
        version: "0.4 beta",
        changes: [
          "Help modal redesign with card layout",
          "Language toggle (English / Spanish)",
          "Changelog inside help modal",
        ],
      },
      {
        version: "0.3 beta",
        changes: [
          "Help button with controls explanation",
          "Sticky create-task frame when scrolling",
          "Status filter: All / Active / Completed",
          "Slide-right animation in filtered views",
        ],
      },
      {
        version: "0.2 beta",
        changes: [
          "Renamed to Ruddis' Tiny Board",
          "Tag filtering system",
          "Completed tasks sink to bottom",
          "Major cleanup and branding overhaul",
        ],
      },
      {
        version: "0.1 beta",
        changes: [
          "Inline task renaming (double-click)",
          "Right-click to toggle completion",
          "Initial version tracking",
        ],
      },
    ],
  },
  es: {
    title: "Ruddis' Tiny Board",
    subtitle: "Tablero local y privado. Tus tareas permanecen en este navegador. Sin cuenta ni servidor.",
    tags: "Etiquetas:",
    clear: "Limpiar",
    all: "Todas",
    active: "Activas",
    completed: "Completadas",
    view: "Vista",
    categories: "Categorías",
    addCategory: "Añadir categoría",
    categoryNamePrompt: "Nombre de la categoría",
    categoryDialogTitle: "Crear una categoría",
    categoryNamePlaceholder: "p. ej. En progreso",
    cancel: "Cancelar",
    create: "Crear",
    add: "Añadir tarea",
    chooseCategory: "Elige una categoría para esta tarea",
    createTask: "Crear tarea",
    whatNeedsDone: "¿Qué hay que hacer?",
    color: "Color",
    recentColors: "Colores recientes",
    customColor: "Color personalizado",
    changeColor: "Cambiar color",
    tag: "etiqueta",
    helpTitle: "Controles y Funciones",
    helpSaved: "Privacidad por diseño: tus tareas permanecen en este navegador y la app no las envía.",
    help: [
      { key: "Pasar el ratón", desc: "sobre el tablero para ver el botón de crear tarea (siempre visible en móvil)." },
      { key: "Doble clic / Toque", desc: "en el nombre de una tarea para editarlo." },
      { key: "Clic derecho / botón ✓", desc: "marcar/desmarcar como completada (botón ✓ en móvil)." },
      { key: "Arrastrar / Mantener", desc: "el icono ⠿ para reordenar las tareas." },
      { key: "Punto de color", desc: "clic en el punto para cambiar el color." },
      { key: "Etiquetas", desc: "clic en \"+ etiqueta\" para añadir, luego usa el filtro." },
      { key: "Barra de estado", desc: "cambia entre Todas / Activas / Completadas." },
      { key: "Botón ✕", desc: "eliminar una tarea (aparece al pasar el ratón)." },
    ],
    madeBy: "Hecho por",
    changelog: "Historial de cambios",
    // Settings
    settingsTitle: "Ajustes",
    language: "Idioma",
    fullColor: "Color completo",
    fullColorDesc: "Rellena toda la tarjeta de tarea con el color elegido.",
    theme: "Tema",
    themeLight: "Claro",
    themeMixed: "Mixto",
    themeDark: "Oscuro",
    deleteAll: "Eliminar todo",
    deleteAllConfirm: "¿Eliminar todas las tareas? Esto no se puede deshacer.",
    changelogEntries: [
      {
        version: "1.26.0",
        changes: [
          "Mantén una columna arrastrada 2 segundos sobre otra para intercambiar sus posiciones (cada una conserva su tamaño)",
        ],
      },
      {
        version: "1.25.0",
        changes: [
          "Ahora se pueden soltar tareas en columnas vacías desde cualquier otra columna",
          "La selección de categoría al crear una tarea vuelve a verse y se puede pulsar",
          "Las columnas se mueven con suavidad, se deslizan a su sitio al soltarlas y se quedan donde las sueltas",
          "La pizarra crece según haga falta; las columnas que crecen empujan a las de debajo en vez de taparlas",
          "La barra superior tiene márgenes laterales y botones Todas / Activas / Completadas más grandes",
        ],
      },
      {
        version: "1.24.0",
        changes: [
          "Las columnas vacías ahora aceptan tareas arrastradas",
          "Corregida la visibilidad de categorías al crear una tarea",
          "La pizarra se expande para conservar columnas colocadas más abajo",
        ],
      },
      {
        version: "1.23.0",
        changes: [
          "Eliminado el hueco superior y la limitación centrada de la pizarra",
          "Mejorado el drag suave ocultando las tarjetas durante el movimiento",
          "Corregida la detección y sustitución de columnas en la pizarra libre",
        ],
      },
      {
        version: "1.22.0",
        changes: [
          "Las columnas vacías ahora se reducen a una cabecera compacta",
          "La creación pendiente aparece arriba y mantiene visibles las categorías debajo",
        ],
      },
      {
        version: "1.21.0",
        changes: [
          "Suavizado el movimiento libre de columnas con transform en tiempo real",
          "Añadida la sustitución fiable al soltar una columna sobre otra",
          "Eliminados los márgenes artificiales del canvas y mejorada la limpieza del drag",
        ],
      },
      {
        version: "1.20.0",
        changes: [
          "Eliminada la barra interna de columnas para usar el scroll de la ventana",
        ],
      },
      {
        version: "1.19.0",
        changes: [
          "Rediseñada la pizarra con franja fija y movimiento libre de columnas ajustado a cuadrícula",
          "Añadido menú radial fijo para crear tareas y categorías",
          "Las columnas conservan contenido y forma durante todo el arrastre",
        ],
      },
      {
        version: "1.18.0",
        changes: [
          "Rediseñado el overlay de selección para evitar solapamientos entre tarjeta y mensaje",
          "Mejoradas las proporciones de Añadir categoría",
          "Sustituida la niebla inferior por partículas monocromas de arena movidas por el viento",
        ],
      },
      {
        version: "1.17.0",
        changes: [
          "Mejorado el contraste de columnas en el tema Mixto",
          "Añadida una aurora monocromática animada y sutil al pie del tablero",
          "Añadido Añadir categoría junto a la acción compacta Crear tarea",
          "Corregido el scroll con rueda en columnas con muchas tareas",
        ],
      },
      {
        version: "1.16.0",
        changes: [
          "Corregido el espaciado de tarjetas y animado el desplazamiento bajo la preview",
          "Mantenida la estética glass redondeada al arrastrar columnas",
        ],
      },
      {
        version: "1.15.0",
        changes: [
          "Añadida una preview de inserción en tiempo real al mover tareas entre tarjetas",
        ],
      },
      {
        version: "1.14.0",
        changes: [
          "Rediseñado Añadir categoría y compactada la zona de Crear tarea",
          "Centrada la preview flotante y el mensaje de selección de categoría",
        ],
      },
      {
        version: "1.13.0",
        changes: [
          "El overlay de arrastre mantiene visibles las columnas de destino durante los intercambios",
          "Las previews de tarjetas cambian de tamaño suavemente detectando la columna bajo el puntero",
          "El crédito Made by pasa debajo del tablero y las categorías usan barras horizontales de color",
        ],
      },
      {
        version: "1.12.0",
        changes: [
          "Los tableros con una sola categoría ahora usan un diseño plano sin marco de columna",
        ],
      },
      {
        version: "1.11.0",
        changes: [
          "El botón de crear tarea aparece solo cerca de su zona de interacción",
          "Las nuevas tareas muestran una preview flotante y exigen elegir categoría",
          "Eliminados los botones de crear tarea dentro de las columnas",
          "Columnas redimensionables, preview adaptable, handles grandes y Color completo por defecto",
          "Mejorados los scrollbars de columnas y página sin pista blanca",
        ],
      },
      {
        version: "1.8.0",
        changes: [
          "Añadido botón \"Eliminar todo\" para limpiar el tablero al instante",
          "Reemplazado el doble toque por un botón de completar en móvil",
          "Corregido el solapamiento de los créditos en dispositivos móviles",
          "Corregido el estado hover de la pestaña de crear tareas",
        ],
      },
      {
        version: "1.7.0",
        changes: [
          "Botón de crear tarea mejorado: traslúcido en la lista, sólido al flotar",
          "Doble toque en móvil corregido con detección por temporizador",
          "Controles táctiles pulidos: asa de arrastre siempre visible",
        ],
      },
      {
        version: "1.0.4",
        changes: [
          "Adaptación completa para móviles y pantallas táctiles",
          "Doble toque para completar tareas",
          "Un solo toque para editar tareas",
          "Mantener presionado el icono para mover",
        ],
      },
      {
        version: "1.0.3",
        changes: [
          "Corregido el contraste de los iconos inferiores en el tema mixto",
        ],
      },
      {
        version: "1.0.2",
        changes: [
          "Corregido el contraste de texto del modo Color completo (tema mixto)",
        ],
      },
      {
        version: "1.0.1",
        changes: [
          "Corregido el contraste de texto en las tareas (tema mixto)",
        ],
      },
      {
        version: "1.0.0",
        changes: [
          "Primera versión estable",
          "Panel de ajustes: tema, color completo, idioma",
          "Tres temas: Claro, Mixto, Oscuro",
          "Modo Color completo para tarjetas",
          "Tema mixto mejorado con tarjetas más claras",
        ],
      },
      {
        version: "0.4 beta",
        changes: [
          "Rediseño del modal de ayuda con tarjetas",
          "Selector de idioma (Inglés / Español)",
          "Historial de cambios en el modal de ayuda",
        ],
      },
      {
        version: "0.3 beta",
        changes: [
          "Botón de ayuda con explicación de controles",
          "Creación de tareas fija al hacer scroll",
          "Filtro de estado: Todas / Activas / Completadas",
          "Animación de deslizamiento en vistas filtradas",
        ],
      },
      {
        version: "0.2 beta",
        changes: [
          "Renombrado a Ruddis' Tiny Board",
          "Sistema de filtrado por etiquetas",
          "Las tareas completadas bajan al final",
          "Limpieza y cambio de marca completo",
        ],
      },
      {
        version: "0.1 beta",
        changes: [
          "Renombrar tareas en línea (doble clic)",
          "Clic derecho para completar/descompletar",
          "Seguimiento de versión inicial",
        ],
      },
    ],
  },
} as const;

/* ─── Persistence helpers ──────────────────────────────────────────── */

const LANG_KEY = "whiteboard:lang";
const THEME_KEY = "whiteboard:theme";
const FULLCOLOR_KEY = "whiteboard:fullcolor";

export const loadLang = (): Lang => {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "es") return stored;
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith("es")) return "es";
    return "en";
  } catch {
    return "en";
  }
};
export const saveLang = (lang: Lang) => localStorage.setItem(LANG_KEY, lang);

export const loadTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "mixed" || stored === "dark") return stored;
    return "light";
  } catch {
    return "light";
  }
};
export const saveTheme = (theme: Theme) => localStorage.setItem(THEME_KEY, theme);

export const loadFullColor = (): boolean => {
  try {
    const stored = localStorage.getItem(FULLCOLOR_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return false;
  }
};
export const saveFullColor = (v: boolean) => localStorage.setItem(FULLCOLOR_KEY, String(v));
