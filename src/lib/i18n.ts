export type Lang = "en" | "es";

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
      { key: "Hover", desc: "over the board to reveal the create-task button." },
      { key: "Double-click", desc: "a task name to rename it inline." },
      { key: "Right-click", desc: "a task to toggle complete / not complete." },
      { key: "Drag", desc: "the ⠿ handle to reorder tasks." },
      { key: "Color dot", desc: "click the dot to change the task color." },
      { key: "Tags", desc: "click \"+ tag\" to add tags, then use the filter bar." },
      { key: "Status bar", desc: "switch between All / Active / Completed views." },
      { key: "✕ button", desc: "delete a task (appears on hover)." },
    ],
    madeBy: "Made by",
    changelog: "Changelog",
    changelogEntries: [
      {
        version: "2.0.1",
        changes: [
          "Help modal redesign with card layout",
          "Language toggle (English / Spanish)",
          "Added changelog inside help modal",
        ],
      },
      {
        version: "2.0.0",
        changes: [
          "Help button with controls explanation",
          "Sticky create-task frame when scrolling",
          "Status filter: All / Active / Completed",
          "Slide-right animation in filtered views",
        ],
      },
      {
        version: "1.2.0",
        changes: [
          "Renamed to Ruddis' Tiny Board",
          "Tag filtering system",
          "Completed tasks sink to bottom",
          "Removed all Lovable references",
          "Major cleanup: removed 40+ unused components",
        ],
      },
      {
        version: "1.1.0",
        changes: [
          "Inline task renaming (double-click)",
          "Right-click to toggle completion",
          "Version label in bottom-right corner",
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
      { key: "Pasar el ratón", desc: "sobre el tablero para ver el botón de crear tarea." },
      { key: "Doble clic", desc: "en el nombre de una tarea para editarlo." },
      { key: "Clic derecho", desc: "en una tarea para marcar/desmarcar como completada." },
      { key: "Arrastrar", desc: "el icono ⠿ para reordenar las tareas." },
      { key: "Punto de color", desc: "clic en el punto para cambiar el color." },
      { key: "Etiquetas", desc: "clic en \"+ etiqueta\" para añadir, luego usa el filtro." },
      { key: "Barra de estado", desc: "cambia entre Todas / Activas / Completadas." },
      { key: "Botón ✕", desc: "eliminar una tarea (aparece al pasar el ratón)." },
    ],
    madeBy: "Hecho por",
    changelog: "Historial de cambios",
    changelogEntries: [
      {
        version: "2.0.1",
        changes: [
          "Rediseño del modal de ayuda con tarjetas",
          "Selector de idioma (Inglés / Español)",
          "Historial de cambios en el modal de ayuda",
        ],
      },
      {
        version: "2.0.0",
        changes: [
          "Botón de ayuda con explicación de controles",
          "Creación de tareas fija al hacer scroll",
          "Filtro de estado: Todas / Activas / Completadas",
          "Animación de deslizamiento en vistas filtradas",
        ],
      },
      {
        version: "1.2.0",
        changes: [
          "Renombrado a Ruddis' Tiny Board",
          "Sistema de filtrado por etiquetas",
          "Las tareas completadas bajan al final",
          "Eliminadas todas las referencias a Lovable",
          "Limpieza: eliminados 40+ componentes sin usar",
        ],
      },
      {
        version: "1.1.0",
        changes: [
          "Renombrar tareas en línea (doble clic)",
          "Clic derecho para completar/descompletar",
          "Etiqueta de versión en la esquina inferior derecha",
        ],
      },
    ],
  },
} as const;

const LANG_KEY = "whiteboard:lang";

export const loadLang = (): Lang => {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "es") return stored;
    // Auto-detect from browser
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith("es")) return "es";
    return "en";
  } catch {
    return "en";
  }
};

export const saveLang = (lang: Lang) => {
  localStorage.setItem(LANG_KEY, lang);
};
