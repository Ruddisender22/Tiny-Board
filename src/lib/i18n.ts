export type Lang = "en" | "es";
export type Theme = "light" | "mixed" | "dark";

export const translations = {
  en: {
    title: "Ruddis' Tiny Board",
    subtitle: "Hover anywhere to create a task. Drag to reorder. Right-click to complete.",
    tags: "Tags:",
    clear: "Clear",
    all: "All",
    active: "Active",
    completed: "Completed",
    createTask: "Create task",
    whatNeedsDone: "What needs to be done?",
    color: "Color",
    tag: "tag",
    helpTitle: "Controls & Features",
    helpSaved: "All tasks are saved automatically in your browser.",
    help: [
      { key: "Hover", desc: "over the board to reveal the create-task button (always visible on mobile)." },
      { key: "Double-click / Tap", desc: "a task name to rename it inline." },
      { key: "Right-click / Double-tap", desc: "a task to toggle complete / not complete." },
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
    changelogEntries: [
      {
        version: "1.0.5",
        changes: [
          "Global Enter shortcut to create tasks",
          "Fixed sticky create-task frame disappearing bug",
          "Fixed mobile keyboard Enter submission bug",
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
    subtitle: "Pasa el ratón para crear una tarea. Arrastra para reordenar. Clic derecho para completar.",
    tags: "Etiquetas:",
    clear: "Limpiar",
    all: "Todas",
    active: "Activas",
    completed: "Completadas",
    createTask: "Crear tarea",
    whatNeedsDone: "¿Qué hay que hacer?",
    color: "Color",
    tag: "etiqueta",
    helpTitle: "Controles y Funciones",
    helpSaved: "Todas las tareas se guardan automáticamente en tu navegador.",
    help: [
      { key: "Pasar el ratón", desc: "sobre el tablero para ver el botón de crear tarea (siempre visible en móvil)." },
      { key: "Doble clic / Toque", desc: "en el nombre de una tarea para editarlo." },
      { key: "Clic derecho / Doble toque", desc: "en una tarea para marcar/desmarcar como completada." },
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
    changelogEntries: [
      {
        version: "1.0.5",
        changes: [
          "Atajo global (Enter) para crear tareas",
          "Arreglado bug visual del botón flotante de crear tarea",
          "Arreglado envío con teclado en móviles",
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
    return localStorage.getItem(FULLCOLOR_KEY) === "true";
  } catch {
    return false;
  }
};
export const saveFullColor = (v: boolean) => localStorage.setItem(FULLCOLOR_KEY, String(v));
