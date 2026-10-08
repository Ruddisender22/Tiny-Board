import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { version } from "../../../package.json";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  CollisionDetection,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  DragOverlay,
  TouchSensor,
} from "@dnd-kit/core";
import { Github, X, HelpCircle, Settings, Sun, Moon, Cloud, Trash2, FolderPlus, MessageSquare, Plus, Magnet } from "lucide-react";
import { TaskCard, Task } from "./TaskCard";
import { BoardColumn, Category, COLUMN_TRANSITION, COLUMN_DRAGGING_TRANSITION } from "./BoardColumn";
import { CreateTaskFrame, CreateTaskFrameHandle } from "./CreateTaskFrame";
import { TaskColor, DEFAULT_HUE } from "@/lib/taskColors";
import {
  translations,
  Lang,
  Theme,
  loadLang, saveLang,
  loadTheme, saveTheme,
  loadFullColor, saveFullColor,
} from "@/lib/i18n";
import { useIsTouchDevice } from "@/lib/utils";

const STORAGE_KEY = "whiteboard:tasks:v2";
const CATEGORIES_STORAGE_KEY = "whiteboard:categories:v1";
const COLUMN_WIDTHS_STORAGE_KEY = "whiteboard:column-widths:v1";
const GITHUB_USER = "Ruddisender22";
const DEFAULT_COLUMN_WIDTH = 360;
const MIN_COLUMN_WIDTH = 280;
const MAX_COLUMN_WIDTH = 640;
const CANVAS_GRID = 24;
const COLUMN_GAP = 24;
const SWAP_HOLD_MS = 2000;
const ESTIMATED_COLUMN_HEIGHT = 160;
const CATEGORY_DROP_PREFIX = "category-drop:";

type Point = { x: number; y: number };
type ColumnSize = { w: number; h: number };

const getEventPoint = (event: Event | null | undefined): Point | null => {
  if (!event) return null;
  if ("touches" in event && (event as TouchEvent).touches?.length) {
    const touch = (event as TouchEvent).touches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  if ("clientX" in event) {
    const pointer = event as MouseEvent;
    return { x: pointer.clientX, y: pointer.clientY };
  }
  return null;
};

const rectContains = (rect: DOMRect, point: Point) =>
  point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;

/** Which column (and which card inside it) a pointer is over; the card is the one the dragged task is inserted before. */
const resolveDropTarget = (point: Point, excludeTaskId: string): { categoryId: string; taskId: string | null } | null => {
  const columns = Array.from(document.querySelectorAll<HTMLElement>("[data-category-id]"));
  // A little slack below/beside a column makes dropping at its end easy.
  const column =
    columns.find((element) => rectContains(element.getBoundingClientRect(), point)) ??
    columns.find((element) => {
      const rect = element.getBoundingClientRect();
      return point.x >= rect.left - 12 && point.x <= rect.right + 12 && point.y >= rect.top && point.y <= rect.bottom + 56;
    });
  if (!column?.dataset.categoryId) return null;
  const cards = Array.from(column.querySelectorAll<HTMLElement>("[data-task-id]"))
    .filter((element) => element.dataset.taskId !== excludeTaskId);
  const target = cards.find((element) => element.getBoundingClientRect().bottom > point.y);
  return { categoryId: column.dataset.categoryId, taskId: target?.dataset.taskId ?? null };
};

const DEFAULT_CATEGORY: Category = {
  id: "category-default",
  name: "General",
  color: DEFAULT_HUE,
  x: 24,
  y: 24,
};

type StatusFilter = "all" | "active" | "completed";

const legacyHueMap: Record<string, number> = {
  blue: 217, green: 142, red: 4, yellow: 45,
};

const loadTasks = (): Task[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((t) => t && typeof t.id === "string")
          .map((t) => ({
            id: t.id,
            name: String(t.name ?? ""),
            color: typeof t.color === "number" ? t.color : DEFAULT_HUE,
            completed: !!t.completed,
            tags: Array.isArray(t.tags) ? t.tags.filter((x: unknown) => typeof x === "string") : [],
            categoryId: typeof t.categoryId === "string" ? t.categoryId : DEFAULT_CATEGORY.id,
          }));
      }
    }
    const v1 = localStorage.getItem("whiteboard:tasks:v1");
    if (v1) {
      const parsed = JSON.parse(v1);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((t) => t && typeof t.id === "string")
          .map((t) => ({
            id: t.id,
            name: String(t.name ?? ""),
            color: legacyHueMap[t.color] ?? DEFAULT_HUE,
            completed: !!t.completed,
            tags: [],
            categoryId: DEFAULT_CATEGORY.id,
          }));
      }
    }
    return [];
  } catch {
    return [];
  }
};

const loadCategories = (): Category[] => {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const categories = parsed
          .filter((category) => category && typeof category.id === "string")
          .map((category, index) => ({
            id: category.id,
            name: String(category.name ?? "Untitled"),
            color: typeof category.color === "number" ? category.color : DEFAULT_HUE,
            x: typeof category.x === "number" ? category.x : 24 + (index % 3) * 384,
            y: typeof category.y === "number" ? category.y : 24 + Math.floor(index / 3) * 48,
          }));
        if (categories.length > 0) return categories;
      }
    }
  } catch {
    // Fall through to the default category when stored data is invalid.
  }
  return [DEFAULT_CATEGORY];
};

const loadColumnWidths = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return Object.fromEntries(
          Object.entries(parsed)
            .filter(([, width]) => typeof width === "number")
            .map(([id, width]) => [id, Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width as number))])
        );
      }
    }
  } catch {
    // Fall back to the default width when stored dimensions are invalid.
  }
  return {};
};

const sortWithCompletedLast = (tasks: Task[]): Task[] => {
  const active = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);
  return [...active, ...done];
};

/* ─── Help modal ────────────────────────────────────────────────────── */

const HelpModal = ({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: Lang }) => {
  const t = translations[lang];
  const [tab, setTab] = useState<"help" | "changelog">("help");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl border-2 border-border/60 bg-card p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setTab("help")}
                  className={`text-sm font-semibold px-3 py-1 rounded-full transition-all ${tab === "help" ? "bg-primary text-primary-foreground" : "text-card-foreground/60 hover:text-card-foreground"}`}
                >{t.helpTitle}</button>
                <button type="button" onClick={() => setTab("changelog")}
                  className={`text-sm font-semibold px-3 py-1 rounded-full transition-all ${tab === "changelog" ? "bg-primary text-primary-foreground" : "text-card-foreground/60 hover:text-card-foreground"}`}
                >{t.changelog}</button>
              </div>
              <button type="button" onClick={onClose}
                className="h-7 w-7 grid place-items-center rounded-full text-card-foreground/50 hover:text-card-foreground hover:bg-card-foreground/10 transition-colors"
                aria-label="Close"
              ><X className="h-4 w-4" /></button>
            </div>

            {tab === "help" ? (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {t.help.map(({ key, desc }) => (
                    <div key={key} className="flex gap-3 items-start rounded-xl border border-border/50 bg-card-foreground/5 px-4 py-3">
                      <span className="text-sm font-semibold text-card-foreground shrink-0 min-w-[90px]">{key}</span>
                      <span className="text-sm text-card-foreground/70">{desc}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-card-foreground/50 text-center">{t.helpSaved}</p>
              </>
            ) : (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {t.changelogEntries.map((entry) => (
                  <div key={entry.version}>
                    <h3 className="text-sm font-semibold text-card-foreground mb-1.5">v{entry.version}</h3>
                    <ul className="space-y-1">
                      {entry.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-card-foreground/70 rounded-lg border border-border/40 bg-card-foreground/5 px-3 py-2">
                          <span className="text-primary mt-0.5 shrink-0">•</span>{change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Settings panel ────────────────────────────────────────────────── */

const SettingsPanel = ({
  open, onClose, lang, onLangChange, theme, onThemeChange, fullColor, onFullColorChange,
}: {
  open: boolean; onClose: () => void;
  lang: Lang; onLangChange: (l: Lang) => void;
  theme: Theme; onThemeChange: (t: Theme) => void;
  fullColor: boolean; onFullColorChange: (v: boolean) => void;
}) => {
  const t = translations[lang];

  const themeOptions: { key: Theme; label: string; Icon: typeof Sun }[] = [
    { key: "light", label: t.themeLight, Icon: Sun },
    { key: "mixed", label: t.themeMixed, Icon: Cloud },
    { key: "dark", label: t.themeDark, Icon: Moon },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 w-full max-w-sm rounded-2xl border-2 border-border/60 bg-card p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-card-foreground">{t.settingsTitle}</h2>
              <button type="button" onClick={onClose}
                className="h-7 w-7 grid place-items-center rounded-full text-card-foreground/50 hover:text-card-foreground hover:bg-card-foreground/10 transition-colors"
                aria-label="Close"
              ><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-5">
              {/* Language */}
              <div className="rounded-xl border border-border/50 bg-card-foreground/5 px-4 py-3">
                <label className="text-sm font-semibold text-card-foreground block mb-2">{t.language}</label>
                <div className="flex gap-2">
                  {(["en", "es"] as Lang[]).map((l) => (
                    <button key={l} type="button" onClick={() => onLangChange(l)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        lang === l ? "bg-primary text-primary-foreground shadow-sm" : "bg-card-foreground/5 text-card-foreground/60 hover:text-card-foreground hover:bg-card-foreground/10"
                      }`}
                    >{l === "en" ? "English" : "Español"}</button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="rounded-xl border border-border/50 bg-card-foreground/5 px-4 py-3">
                <label className="text-sm font-semibold text-card-foreground block mb-2">{t.theme}</label>
                <div className="flex gap-2">
                  {themeOptions.map(({ key, label, Icon }) => (
                    <button key={key} type="button" onClick={() => onThemeChange(key)}
                      className={`flex-1 flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-all ${
                        theme === key ? "bg-primary text-primary-foreground shadow-sm" : "bg-card-foreground/5 text-card-foreground/60 hover:text-card-foreground hover:bg-card-foreground/10"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full-Color toggle */}
              <div className="rounded-xl border border-border/50 bg-card-foreground/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-card-foreground block">{t.fullColor}</label>
                    <p className="text-xs text-card-foreground/60 mt-0.5">{t.fullColorDesc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={fullColor}
                    onClick={() => onFullColorChange(!fullColor)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                      fullColor ? "bg-primary" : "bg-card-foreground/20"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform ${
                        fullColor ? "translate-x-[22px]" : "translate-x-[2px]"
                      } mt-[2px]`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Main whiteboard ───────────────────────────────────────────────── */

export const Whiteboard = () => {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [categories, setCategories] = useState<Category[]>(() => loadCategories());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => loadColumnWidths());
  const [creating, setCreating] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [createNearPointer, setCreateNearPointer] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [settlingColumnId, setSettlingColumnId] = useState<string | null>(null);
  const [swapHoverId, setSwapHoverId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [liveExtent, setLiveExtent] = useState<number | null>(null);
  const [columnSizes, setColumnSizes] = useState<Record<string, ColumnSize>>({});
  const [pendingTask, setPendingTask] = useState<{ name: string; color: TaskColor; tags: string[] } | null>(null);
  const [dragPreviewCategoryId, setDragPreviewCategoryId] = useState<string | null>(null);
  const [dragPreviewTaskId, setDragPreviewTaskId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryNameDraft, setCategoryNameDraft] = useState("");
  const [lang, setLang] = useState<Lang>(() => loadLang());
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [fullColor, setFullColor] = useState(() => loadFullColor());
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<CreateTaskFrameHandle>(null);
  const categoryNameInputRef = useRef<HTMLInputElement>(null);
  const columnElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const liveExtentRef = useRef(0);
  const pointerRef = useRef<Point | null>(null);
  const createAnchorRef = useRef<HTMLDivElement>(null);
  const isTouch = useIsTouchDevice();

  const t = translations[lang];

  // Latest values for the imperative column-drag code (kept in refs so its handlers stay stable).
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const columnSizesRef = useRef(columnSizes);
  columnSizesRef.current = columnSizes;
  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  // Keep track of the canvas width (a lone column is centred in it).
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const update = () => setCanvasWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleLangChange = (l: Lang) => { setLang(l); saveLang(l); };
  const handleThemeChange = (th: Theme) => { setTheme(th); saveTheme(th); };
  const handleFullColorChange = (v: boolean) => { setFullColor(v); saveFullColor(v); };

  useEffect(() => {
    if (categoryDialogOpen) {
      requestAnimationFrame(() => categoryNameInputRef.current?.focus());
    }
  }, [categoryDialogOpen]);



  // Global Enter shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const tag = document.activeElement?.tagName.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && tag !== "button" && !creating && !helpOpen && !settingsOpen) {
          e.preventDefault();
          setCreating(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [creating, helpOpen, settingsOpen]);

  useEffect(() => {
    if (!pendingTask) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setPendingTask(null); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [pendingTask]);

  // Track the real pointer while a task is dragged (dnd-kit's own coordinates ignore window scrolling).
  useEffect(() => {
    if (!activeId) return;
    const trackPointer = (e: PointerEvent) => { pointerRef.current = { x: e.clientX, y: e.clientY }; };
    const trackTouch = (e: TouchEvent) => {
      const point = getEventPoint(e);
      if (point) pointerRef.current = point;
    };
    window.addEventListener("pointermove", trackPointer);
    window.addEventListener("touchmove", trackTouch, { passive: true });
    return () => {
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("touchmove", trackTouch);
    };
  }, [activeId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => t.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    let list = sortWithCompletedLast(tasks);
    if (statusFilter === "active") list = list.filter((t) => !t.completed);
    else if (statusFilter === "completed") list = list.filter((t) => t.completed);
    if (filterTag) list = list.filter((t) => t.tags.includes(filterTag));
    return list;
  }, [tasks, filterTag, statusFilter]);

  const addTaskToCategory = useCallback((categoryId: string, name: string, color: TaskColor, tags: string[]) => {
    setTasks((prev) => [
      {
        id: crypto.randomUUID(),
        name,
        color,
        completed: false,
        tags,
        categoryId,
      },
      ...prev,
    ]);
  }, []);

  const addTask = useCallback((name: string, color: TaskColor, tags: string[]) => {
    if (categories.length === 1) {
      addTaskToCategory(categories[0].id, name, color, tags);
      return;
    }
    setPendingTask({ name, color, tags });
    setCreating(false);
    setCreateNearPointer(false);
  }, [addTaskToCategory, categories]);

  const selectCategoryForPendingTask = useCallback((categoryId: string) => {
    if (!pendingTask) return;
    addTaskToCategory(categoryId, pendingTask.name, pendingTask.color, pendingTask.tags);
    setPendingTask(null);
  }, [addTaskToCategory, pendingTask]);

  /* ── Column geometry ──────────────────────────────────────────────── */

  const registerColumnElement = useCallback((id: string, element: HTMLDivElement | null) => {
    columnElementsRef.current[id] = element;
  }, []);

  const handleColumnMeasure = useCallback((id: string, w: number, h: number) => {
    setColumnSizes((prev) => (prev[id] && prev[id].w === w && prev[id].h === h ? prev : { ...prev, [id]: { w, h } }));
  }, []);

  const getColumnSize = useCallback((category: Category): ColumnSize => {
    return columnSizesRef.current[category.id] ?? {
      w: columnWidthsRef.current[category.id] ?? DEFAULT_COLUMN_WIDTH,
      h: ESTIMATED_COLUMN_HEIGHT,
    };
  }, []);

  /** Nearest position to (desiredX, desiredY) where a w×h column overlaps no other column. The canvas has no bottom limit. */
  const findFreePosition = useCallback((id: string, w: number, h: number, desiredX: number, desiredY: number): Point => {
    const canvasWidth = canvasRef.current?.clientWidth ?? window.innerWidth;
    const maxX = Math.max(0, canvasWidth - w);
    const clampX = (value: number) => Math.round(Math.min(maxX, Math.max(0, value)));
    const clampY = (value: number) => Math.round(Math.max(0, value));
    const others = categoriesRef.current
      .filter((item) => item.id !== id)
      .map((item) => {
        const size = getColumnSize(item);
        return { l: item.x, t: item.y, r: item.x + size.w, b: item.y + size.h };
      });
    const isFree = (x: number, y: number) =>
      others.every((o) => !(x < o.r + COLUMN_GAP && x + w > o.l - COLUMN_GAP && y < o.b + COLUMN_GAP && y + h > o.t - COLUMN_GAP));

    const startX = clampX(desiredX);
    const startY = clampY(desiredY);
    if (isFree(startX, startY)) return { x: startX, y: startY };

    const xs = [startX, ...others.flatMap((o) => [o.r + COLUMN_GAP, o.l - w - COLUMN_GAP])].map(clampX);
    const ys = [startY, ...others.flatMap((o) => [o.b + COLUMN_GAP, o.t - h - COLUMN_GAP])].map(clampY);
    let best: Point | null = null;
    let bestDistance = Infinity;
    for (const x of xs) {
      for (const y of ys) {
        if (!isFree(x, y)) continue;
        const distance = (x - startX) ** 2 + (y - startY) ** 2;
        if (distance < bestDistance) { best = { x, y }; bestDistance = distance; }
      }
    }
    // Always reachable: directly below the lowest column.
    return best ?? { x: startX, y: clampY(Math.max(...others.map((o) => o.b)) + COLUMN_GAP) };
  }, [getColumnSize]);

  /** Pull every column towards the top-left so they sit next to each other, keeping their relative arrangement. */
  const attractColumns = useCallback(() => {
    const items = categoriesRef.current;
    if (items.length < 2) return;
    type Box = { id: string; x: number; y: number; w: number; h: number };
    const boxes: Box[] = items.map((item) => ({ id: item.id, x: item.x, y: item.y, ...getColumnSize(item) }));
    const pack = (axis: "x" | "y") => {
      const across = axis === "x" ? "y" : "x";
      const along = axis === "x" ? "w" : "h";
      const acrossLength = axis === "x" ? "h" : "w";
      const placed: Box[] = [];
      for (const box of [...boxes].sort((a, b) => a[axis] - b[axis] || a[across] - b[across])) {
        let position = CANVAS_GRID;
        for (const other of placed) {
          const sharesLane = box[across] < other[across] + other[acrossLength] && box[across] + box[acrossLength] > other[across];
          if (sharesLane) position = Math.max(position, other[axis] + other[along] + COLUMN_GAP);
        }
        box[axis] = position;
        placed.push(box);
      }
    };
    pack("x"); pack("y"); pack("x"); pack("y");
    setCategories((prev) => prev.map((item) => {
      const box = boxes.find((candidate) => candidate.id === item.id);
      return box ? { ...item, x: Math.round(box.x), y: Math.round(box.y) } : item;
    }));
  }, [getColumnSize]);

  const addCategory = useCallback(() => {
    setCategoryNameDraft("");
    setCategoryDialogOpen(true);
  }, []);

  const createCategory = useCallback(() => {
    const trimmed = categoryNameDraft.trim();
    if (!trimmed) return;
    const rightmost = categories.reduce<Point>(
      (best, item) => {
        const right = item.x + getColumnSize(item).w;
        return right > best.x ? { x: right, y: item.y } : best;
      },
      { x: 0, y: CANVAS_GRID },
    );
    const spot = findFreePosition(
      "",
      DEFAULT_COLUMN_WIDTH,
      ESTIMATED_COLUMN_HEIGHT,
      categories.length ? rightmost.x + COLUMN_GAP : CANVAS_GRID,
      rightmost.y,
    );
    const category: Category = {
      id: crypto.randomUUID(),
      name: trimmed,
      color: DEFAULT_HUE,
      x: spot.x,
      y: spot.y,
    };
    setCategories((prev) => [...prev, category]);
    setCategoryNameDraft("");
    setCategoryDialogOpen(false);
  }, [categoryNameDraft, categories, getColumnSize, findFreePosition]);

  const renameCategory = useCallback((id: string, name: string) => {
    setCategories((prev) => prev.map((category) => category.id === id ? { ...category, name } : category));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    if (categories.length <= 1) return;
    const fallback = categories.find((category) => category.id !== id);
    if (!fallback) return;
    setCategories((prev) => prev.filter((category) => category.id !== id));
    setTasks((prev) => prev.map((task) => task.categoryId === id ? { ...task, categoryId: fallback.id } : task));
  }, [categories]);

  const changeCategoryColor = useCallback((id: string, color: TaskColor) => {
    setCategories((prev) => prev.map((category) => category.id === id ? { ...category, color } : category));
  }, []);

  const changeColumnWidth = useCallback((id: string, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [id]: Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width))),
    }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addTag = useCallback((id: string, tag: string) => {
    setTasks((prev) => prev.map((t) =>
      t.id === id && !t.tags.includes(tag) ? { ...t, tags: [...t.tags, tag] } : t
    ));
  }, []);

  const removeTag = useCallback((id: string, tag: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, tags: t.tags.filter((x) => x !== tag) } : t)));
  }, []);

  const changeColor = useCallback((id: string, color: TaskColor) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
  }, []);

  const renameTask = useCallback((id: string, name: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const deleteAllTasks = useCallback(() => {
    setTasks([]);
    setConfirmDeleteAll(false);
  }, []);

  // When a column grows (more tasks, filters, resizing) push the columns it now overlaps downwards instead of covering them.
  useEffect(() => {
    if (draggingColumnId || settlingColumnId) return;
    if (!categories.every((item) => columnSizes[item.id])) return;
    const sorted = [...categories].sort((a, b) => a.y - b.y || a.x - b.x);
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const nextY: Record<string, number> = {};
    for (const item of sorted) {
      const { w, h } = columnSizes[item.id];
      let y = item.y;
      let moved = true;
      while (moved) {
        moved = false;
        for (const other of placed) {
          if (item.x < other.x + other.w && item.x + w > other.x && y < other.y + other.h && y + h > other.y) {
            y = other.y + other.h + COLUMN_GAP;
            moved = true;
          }
        }
      }
      placed.push({ x: item.x, y, w, h });
      if (y !== item.y) nextY[item.id] = y;
    }
    if (Object.keys(nextY).length > 0) {
      setCategories((items) => items.map((item) => (nextY[item.id] !== undefined ? { ...item, y: nextY[item.id] } : item)));
    }
  }, [categories, columnSizes, draggingColumnId, settlingColumnId]);

  /* ── Free column dragging (pointer based, moves the DOM node directly for smoothness) ── */

  const columnDrag = useMemo(() => {
    type DragState = {
      id: string;
      element: HTMLDivElement;
      pointerId: number;
      touch: boolean;
      started: boolean;
      clientX: number;
      clientY: number;
      startPageX: number;
      startPageY: number;
      startX: number;
      startY: number;
      curX: number;
      curY: number;
      w: number;
      h: number;
      timer: number;
      /** Slot the dragged column will settle into (its origin, or the slot of the last column it swapped with). */
      homeX: number;
      homeY: number;
      /** Area of the column it last swapped with; releasing inside it drops the column into `home`. */
      swapRect: { x: number; y: number; w: number; h: number } | null;
      hoverId: string | null;
      hoverTimer: number;
      cooldownId: string | null;
    };
    let state: DragState | null = null;
    let moveFrame = 0;
    let scrollFrame = 0;

    const place = (x: number, y: number) => `translate3d(${x}px, ${y}px, 0)`;
    const snap = (value: number) => Math.round(value / CANVAS_GRID) * CANVAS_GRID;

    const clearSwapHover = () => {
      if (!state) return;
      window.clearTimeout(state.hoverTimer);
      state.hoverId = null;
      setSwapHoverId(null);
    };

    /** Swap the dragged column's slot with the hovered column; both keep their own size. */
    const commitSwap = (current: DragState, otherId: string) => {
      if (state !== current || !current.started) return;
      const other = categoriesRef.current.find((item) => item.id === otherId);
      if (!other) return;
      const size = getColumnSize(other);
      const home = { x: current.homeX, y: current.homeY };
      setCategories((items) => items.map((item) => (item.id === otherId ? { ...item, x: home.x, y: home.y } : item)));
      current.swapRect = { x: other.x, y: other.y, w: size.w, h: size.h };
      current.homeX = other.x;
      current.homeY = other.y;
      current.cooldownId = otherId;
      clearSwapHover();
    };

    /** Holding the pointer over another column for SWAP_HOLD_MS swaps their positions. */
    const updateSwapHover = () => {
      if (!state) return;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const px = state.clientX - canvasRect.left;
      const py = state.clientY - canvasRect.top;
      const hit = categoriesRef.current.find((item) => {
        if (item.id === state!.id) return false;
        const size = getColumnSize(item);
        return px >= item.x && px <= item.x + size.w && py >= item.y && py <= item.y + size.h;
      });
      let hitId = hit?.id ?? null;
      // Right after a swap the pointer may still be over the moved column; ignore it until the pointer leaves.
      if (hitId === state.cooldownId) hitId = null;
      else state.cooldownId = null;
      if (hitId === state.hoverId) return;
      window.clearTimeout(state.hoverTimer);
      state.hoverId = hitId;
      setSwapHoverId(hitId);
      if (hitId) {
        const current = state;
        state.hoverTimer = window.setTimeout(() => commitSwap(current, hitId!), SWAP_HOLD_MS);
      }
    };

    const applyPosition = () => {
      if (!state || !state.started) return;
      const canvasWidth = canvasRef.current?.clientWidth ?? window.innerWidth;
      const pageX = state.clientX + window.scrollX;
      const pageY = state.clientY + window.scrollY;
      state.curX = Math.min(Math.max(0, canvasWidth - state.w), Math.max(0, state.startX + pageX - state.startPageX));
      state.curY = Math.max(0, state.startY + pageY - state.startPageY);
      state.element.style.transform = place(state.curX, state.curY);
      updateSwapHover();
      // The canvas keeps expanding below the column while it is being dragged downwards.
      const extent = Math.ceil((state.curY + state.h + 240) / 100) * 100;
      if (extent > liveExtentRef.current) {
        liveExtentRef.current = extent;
        setLiveExtent(extent);
      }
    };

    const autoScroll = () => {
      if (!state || !state.started) return;
      const stripBottom = document.querySelector<HTMLElement>(".app-top-strip")?.getBoundingClientRect().bottom ?? 0;
      const bottomEdge = window.innerHeight - 90;
      const topEdge = stripBottom + 48;
      let delta = 0;
      if (state.clientY > bottomEdge) delta = Math.min(26, (state.clientY - bottomEdge) / 3 + 4);
      else if (state.clientY < topEdge && window.scrollY > 0) delta = -Math.min(26, (topEdge - state.clientY) / 3 + 4);
      if (delta !== 0) {
        window.scrollBy(0, delta);
        applyPosition();
      }
      scrollFrame = requestAnimationFrame(autoScroll);
    };

    const removeListeners = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      window.removeEventListener("touchmove", blockTouchScroll);
      if (state) {
        window.clearTimeout(state.timer);
        window.clearTimeout(state.hoverTimer);
      }
      cancelAnimationFrame(moveFrame);
    };

    const begin = () => {
      if (!state || state.started) return;
      state.started = true;
      state.element.style.transition = COLUMN_DRAGGING_TRANSITION;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      window.getSelection()?.removeAllRanges();
      setDraggingColumnId(state.id);
      scrollFrame = requestAnimationFrame(autoScroll);
    };

    const blockTouchScroll = (event: TouchEvent) => {
      if (state?.started && event.cancelable) event.preventDefault();
    };

    function handleMove(event: PointerEvent) {
      if (!state || event.pointerId !== state.pointerId) return;
      state.clientX = event.clientX;
      state.clientY = event.clientY;
      if (!state.started) {
        const distance = Math.hypot(
          event.clientX + window.scrollX - state.startPageX,
          event.clientY + window.scrollY - state.startPageY,
        );
        if (state.touch) {
          // Touch needs a long press first; moving before that means the user is scrolling.
          if (distance > 8) { removeListeners(); state = null; }
          return;
        }
        if (distance < 4) return;
        begin();
      }
      cancelAnimationFrame(moveFrame);
      moveFrame = requestAnimationFrame(applyPosition);
    }

    const finish = (cancelled: boolean) => {
      const current = state;
      if (!current) return;
      removeListeners();
      state = null;
      if (!current.started) return;
      cancelAnimationFrame(scrollFrame);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      let target: Point = { x: current.homeX, y: current.homeY };
      if (!cancelled) {
        state = current;
        applyPosition();
        state = null;
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        const rect = current.swapRect;
        const releasedInSwapSlot = Boolean(canvasRect && rect) &&
          current.clientX - canvasRect!.left >= rect!.x && current.clientX - canvasRect!.left <= rect!.x + rect!.w &&
          current.clientY - canvasRect!.top >= rect!.y && current.clientY - canvasRect!.top <= rect!.y + rect!.h;
        target = releasedInSwapSlot
          ? { x: current.homeX, y: current.homeY }
          : findFreePosition(current.id, current.w, current.h, snap(current.curX), snap(current.curY));
      }
      setSwapHoverId(null);
      // Glide from wherever the column was released to its final spot (set directly so React and the DOM agree).
      current.element.style.transition = COLUMN_TRANSITION;
      current.element.style.transform = place(target.x, target.y);
      setCategories((items) => items.map((item) => (item.id === current.id ? { ...item, x: target.x, y: target.y } : item)));
      setDraggingColumnId(null);
      setSettlingColumnId(current.id);
      liveExtentRef.current = 0;
      setLiveExtent(null);
      window.setTimeout(() => setSettlingColumnId((id) => (id === current.id ? null : id)), 360);

      // The release must not count as a click on whatever is under the pointer (rename on touch, category selection…).
      const swallowClick = (event: MouseEvent) => { event.stopPropagation(); event.preventDefault(); };
      window.addEventListener("click", swallowClick, true);
      window.setTimeout(() => window.removeEventListener("click", swallowClick, true), 80);
    };

    function handleUp(event: PointerEvent) {
      if (state && event.pointerId === state.pointerId) finish(false);
    }
    function handleCancel(event: PointerEvent) {
      if (state && event.pointerId === state.pointerId) finish(true);
    }

    const start = (id: string, event: React.PointerEvent<HTMLElement>) => {
      if (state) return;
      if (categoriesRef.current.length < 2) return; // a lone column stays centred
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const category = categoriesRef.current.find((item) => item.id === id);
      const element = columnElementsRef.current[id];
      if (!category || !element) return;
      const touch = event.pointerType !== "mouse";
      state = {
        id,
        element,
        pointerId: event.pointerId,
        touch,
        started: false,
        clientX: event.clientX,
        clientY: event.clientY,
        startPageX: event.clientX + window.scrollX,
        startPageY: event.clientY + window.scrollY,
        startX: category.x,
        startY: category.y,
        curX: category.x,
        curY: category.y,
        w: element.offsetWidth,
        h: element.offsetHeight,
        timer: 0,
        homeX: category.x,
        homeY: category.y,
        swapRect: null,
        hoverId: null,
        hoverTimer: 0,
        cooldownId: null,
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleCancel);
      if (touch) {
        window.addEventListener("touchmove", blockTouchScroll, { passive: false });
        state.timer = window.setTimeout(begin, 250);
      }
    };

    return { start };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findFreePosition, getColumnSize]);

  /* ── Task drag & drop ─────────────────────────────────────────────── */

  // Pointer based: the column under the pointer, and the card the pointer is above (insert before it) or the column end.
  const collisionDetection = useCallback<CollisionDetection>(({ droppableContainers, pointerCoordinates, active }) => {
    const point = pointerRef.current ?? pointerCoordinates;
    if (!point) return [];
    const target = resolveDropTarget(point, String(active.id));
    if (!target) return [];
    const wantedId = target.taskId ?? `${CATEGORY_DROP_PREFIX}${target.categoryId}`;
    const container = droppableContainers.find((item) => String(item.id) === wantedId);
    return container ? [{ id: container.id, data: { droppableContainer: container, value: 0 } }] : [];
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragPreviewCategoryId(null);
    setDragPreviewTaskId(null);
    if (!over || active.id === over.id) return;

    const overId = String(over.id);
    const overCategoryId = overId.startsWith(CATEGORY_DROP_PREFIX) ? overId.slice(CATEGORY_DROP_PREFIX.length) : null;
    setTasks((items) => {
      const movingTask = items.find((task) => task.id === active.id);
      if (!movingTask) return items;
      const targetTask = overCategoryId ? undefined : items.find((task) => task.id === overId);
      const targetCategoryId = overCategoryId ?? targetTask?.categoryId;
      if (!targetCategoryId) return items;

      const remaining = items.filter((task) => task.id !== active.id);
      const targetIndex = targetTask
        ? remaining.findIndex((task) => task.id === targetTask.id)
        : remaining.reduce((lastIndex, task, index) => task.categoryId === targetCategoryId ? index : lastIndex, -1) + 1;
      remaining.splice(Math.max(0, targetIndex), 0, { ...movingTask, categoryId: targetCategoryId });
      return remaining;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    const activeTask = tasks.find((task) => task.id === event.active.id);
    setDragPreviewCategoryId(null);
    setDragPreviewTaskId(null);
    pointerRef.current = getEventPoint(event.activatorEvent);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const point = pointerRef.current ?? (() => {
      const origin = getEventPoint(event.activatorEvent);
      return origin ? { x: origin.x + event.delta.x, y: origin.y + event.delta.y } : null;
    })();
    if (!point) return;
    const target = resolveDropTarget(point, String(event.active.id));
    setDragPreviewCategoryId(target?.categoryId ?? null);
    setDragPreviewTaskId(target?.taskId ?? null);
  };

  const handleBoardMouseMove = (event: React.MouseEvent) => {
    if (creating || pendingTask || isTouch) return;
    const anchor = createAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const proximity = 96;
    setCreateNearPointer(
      event.clientX >= rect.left - proximity &&
      event.clientX <= rect.right + proximity &&
      event.clientY >= rect.top - proximity &&
      event.clientY <= rect.bottom + proximity
    );
  };

  const handleBoardClick = (e: React.MouseEvent) => {
    if (!creating) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-create-frame]")) return;
    if (target.closest("[data-radix-popper-content-wrapper]")) return;
    frameRef.current?.submit();
  };

  const activeTaskCategoryId = activeId ? tasks.find((task) => task.id === activeId)?.categoryId ?? null : null;

  const statusLabels: { key: StatusFilter; label: string }[] = [
    { key: "all", label: t.all },
    { key: "active", label: t.active },
    { key: "completed", label: t.completed },
  ];

  const showCreateFrame = creating || isTouch;

  return (
    <>
    <div
      onMouseLeave={() => setCreateNearPointer(false)}
      onMouseMove={handleBoardMouseMove}
      className="relative min-h-screen w-full bg-background bg-dot-pattern"
    >
    <div className="aurora-footer" aria-hidden="true" />
    <main
      ref={boardRef}
      onClick={handleBoardClick}
      className="relative z-10 min-h-screen w-full px-0 pb-32"
    >
      <div className="w-full">
        <div className="app-top-strip" style={pendingTask ? { zIndex: 55 } : undefined}>
        <header className="mb-4 flex flex-col gap-3 border-b border-border/50 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <div className="flex shrink-0 items-center gap-3 self-start md:self-auto">
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 sm:inline">{t.view}</span>
            <div className="flex items-center gap-1.5 rounded-2xl border border-border/70 bg-muted/70 p-1.5 shadow-sm backdrop-blur">
              {statusLabels.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setStatusFilter(key)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all sm:px-6 sm:py-3 sm:text-base ${
                    statusFilter === key ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>
        </header>

        {/* Tag filter bar */}
        {allTags.length > 0 && (
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground/60 mr-1">{t.tags}</span>
            {allTags.map((tag) => (
              <button key={tag} type="button"
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  filterTag === tag ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tag}
                {filterTag === tag && <X className="h-3 w-3" />}
              </button>
            ))}
            {filterTag && (
              <button type="button" onClick={() => setFilterTag(null)}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground underline ml-1 transition-colors"
              >{t.clear}</button>
            )}
          </div>
        )}

        {pendingTask ? (
          <div className="mb-3 flex flex-col items-center gap-2">
            <p className="pending-task-message rounded-full border border-primary/25 bg-card/90 px-4 py-2 text-center text-xs font-semibold text-card-foreground shadow-lg backdrop-blur-xl">{t.chooseCategory}</p>
            <div className="pointer-events-none w-[min(420px,100%)]">
              <TaskCard
                task={{ id: "pending-create", name: pendingTask.name, color: pendingTask.color, completed: false, tags: pendingTask.tags, categoryId: "" }}
                onToggle={() => {}}
                onDelete={() => {}}
                onRename={() => {}}
                onAddTag={() => {}}
                onRemoveTag={() => {}}
                onChangeColor={() => {}}
                overlay
                fullColor={fullColor}
                lang={lang}
              />
            </div>
          </div>
        ) : (
          <div className="mb-3 flex items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">{t.categories}</span>
              <span className="text-xs text-muted-foreground/50">{categories.length}</span>
            </div>
            {categories.length > 1 && (
              <button
                type="button"
                onClick={attractColumns}
                title={t.attractHint}
                className="ml-2 inline-flex items-center gap-2 rounded-xl border border-border/70 bg-muted/70 px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm backdrop-blur transition-all hover:bg-card hover:text-foreground"
              >
                <Magnet className="h-4 w-4" />
                {t.attract}
              </button>
            )}
          </div>
        )}
        </div>

        <DndContext sensors={sensors} collisionDetection={collisionDetection}
          onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}
          onDragCancel={() => { setActiveId(null); setDragPreviewCategoryId(null); setDragPreviewTaskId(null); }}
        >
          {pendingTask && (
            <motion.div
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => setPendingTask(null)}
            />
          )}
          <div ref={createAnchorRef} className={`create-task-anchor ${creating ? "is-active" : ""}`}>
            <div className="min-w-0 flex-1">
              {showCreateFrame && (
                <CreateTaskFrame ref={frameRef} visible={showCreateFrame} active={creating}
                  onActivate={() => setCreating(true)} onSubmit={addTask} onCancel={() => setCreating(false)}
                  lang={lang} isStuck={false}
                />
              )}
            </div>
          </div>
            <div
              ref={canvasRef}
              className="whiteboard-canvas relative w-full pb-32"
              style={{
                minHeight: Math.max(
                  window.innerHeight - 220,
                  ...categories.map((category) => category.y + getColumnSize(category).h + 120),
                  liveExtent ?? 0,
                ),
                zIndex: pendingTask ? 50 : undefined,
              }}
              onClick={() => { if (pendingTask) setPendingTask(null); }}
            >
              {categories.map((category) => (
                <BoardColumn
                  key={category.id}
                  dataCategoryId={category.id}
                  category={category}
                  x={categories.length === 1 && canvasWidth > 0
                    ? Math.max(0, Math.round((canvasWidth - Math.min(760, canvasWidth - 48)) / 2))
                    : category.x}
                  y={category.y}
                  dropTarget={swapHoverId === category.id || (Boolean(activeId) && dragPreviewCategoryId === category.id && activeTaskCategoryId !== category.id)}
                  dragging={draggingColumnId === category.id}
                  raised={draggingColumnId === category.id || settlingColumnId === category.id}
                  onHeaderPointerDown={columnDrag.start}
                  registerElement={registerColumnElement}
                  onMeasure={handleColumnMeasure}
                  isSingleColumn={categories.length === 1}
                  width={columnWidths[category.id] ?? DEFAULT_COLUMN_WIDTH}
                  minWidth={MIN_COLUMN_WIDTH}
                  maxWidth={MAX_COLUMN_WIDTH}
                  onResize={changeColumnWidth}
                  tasks={displayedTasks.filter((task) => task.categoryId === category.id)}
                  onRenameCategory={renameCategory}
                  onDeleteCategory={deleteCategory}
                  onChangeCategoryColor={changeCategoryColor}
                  selectionMode={Boolean(pendingTask)}
                  onSelectCategory={selectCategoryForPendingTask}
                  previewTaskId={dragPreviewCategoryId === category.id ? dragPreviewTaskId : null}
                  previewEnd={Boolean(activeId) && dragPreviewCategoryId === category.id && dragPreviewTaskId === null}
                  onToggleTask={toggleTask}
                  onDeleteTask={deleteTask}
                  onRenameTask={renameTask}
                  onAddTag={addTag}
                  onRemoveTag={removeTag}
                  onChangeTaskColor={changeColor}
                  fullColor={fullColor}
                  lang={lang}
                />
              ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeId ? (() => {
              const t = tasks.find((x) => x.id === activeId);
              if (!t) return null;
              const previewWidth = columnWidths[dragPreviewCategoryId ?? t.categoryId] ?? DEFAULT_COLUMN_WIDTH;
              return (
                <div className="drag-card-preview" style={{ width: previewWidth, maxWidth: "calc(100vw - 2rem)" }}>
                  <TaskCard task={t} onToggle={() => {}} onDelete={() => {}} onRename={() => {}}
                    onAddTag={() => {}} onRemoveTag={() => {}} onChangeColor={() => {}} overlay fullColor={fullColor} lang={lang} />
                </div>
              );
            })() : null}
          </DragOverlay>
        </DndContext>
      </div>
    </main>

    </div>

    <div className={`radial-actions ${fabOpen ? "is-open" : ""}`}>
      <button
        type="button"
        aria-label="Open creation actions"
        aria-expanded={fabOpen}
        onClick={() => setFabOpen((open) => !open)}
        className="radial-fab"
      >
        <Plus className="h-7 w-7 transition-transform duration-300" />
      </button>
      <button
        type="button"
        aria-label={t.createTask}
        onClick={() => { setCreating(true); setFabOpen(false); }}
        className="radial-option radial-option-task"
      >
        <MessageSquare className="h-5 w-5" />
        <span>{t.createTask}</span>
      </button>
      <button
        type="button"
        aria-label={t.addCategory}
        onClick={() => { addCategory(); setFabOpen(false); }}
        className="radial-option radial-option-category"
      >
        <FolderPlus className="h-5 w-5" />
        <span>{t.addCategory}</span>
      </button>
    </div>

    {/* Bottom-left buttons: Help + Settings + Delete All */}
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      <button type="button" aria-label="Help" onClick={() => setHelpOpen(true)}
        className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-card/80 backdrop-blur border border-border text-card-foreground/70 hover:text-card-foreground hover:bg-card transition-colors"
      ><HelpCircle className="h-4 w-4" /></button>
      <button type="button" aria-label="Settings" onClick={() => setSettingsOpen(true)}
        className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-card/80 backdrop-blur border border-border text-card-foreground/70 hover:text-card-foreground hover:bg-card transition-colors"
      ><Settings className="h-4 w-4" /></button>
      <AnimatePresence>
        {tasks.length > 0 && (
          <motion.button
            type="button"
            aria-label={t.deleteAll}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={() => setConfirmDeleteAll(true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-card/80 backdrop-blur border border-border text-card-foreground/70 hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>

    <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} lang={lang} />
    <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}
      lang={lang} onLangChange={handleLangChange}
      theme={theme} onThemeChange={handleThemeChange}
      fullColor={fullColor} onFullColorChange={handleFullColorChange}
    />

    <AnimatePresence>
      {categoryDialogOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setCategoryDialogOpen(false)}
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              createCategory();
            }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-white/20 bg-card/90 p-5 shadow-2xl backdrop-blur-xl"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{t.categories}</p>
                <h2 className="mt-1 text-lg font-semibold text-card-foreground">{t.categoryDialogTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setCategoryDialogOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-card-foreground/50 transition-colors hover:bg-card-foreground/10 hover:text-card-foreground"
                aria-label={t.cancel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="sr-only" htmlFor="category-name">{t.categoryNamePrompt}</label>
            <input
              ref={categoryNameInputRef}
              id="category-name"
              value={categoryNameDraft}
              onChange={(event) => setCategoryNameDraft(event.target.value)}
              placeholder={t.categoryNamePlaceholder}
              maxLength={40}
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryDialogOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-card-foreground/65 transition-colors hover:bg-card-foreground/10 hover:text-card-foreground"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!categoryNameDraft.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.create}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Confirm delete all dialog */}
    <AnimatePresence>
      {confirmDeleteAll && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setConfirmDeleteAll(false)}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <motion.div
            className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4"
            initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </span>
              <p className="text-sm text-card-foreground font-medium">{t.deleteAllConfirm}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(false)}
                className="px-4 py-2 text-sm rounded-xl border border-border text-card-foreground/70 hover:text-card-foreground hover:bg-muted transition-colors"
              >
                {t.clear}
              </button>
              <button
                type="button"
                onClick={deleteAllTasks}
                className="px-4 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium"
              >
                {t.deleteAll}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <footer className="mx-auto mt-8 flex w-full justify-center pb-8 text-xs">
      <a href={`https://github.com/${GITHUB_USER}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-card/80 px-3 py-1.5 backdrop-blur border border-border text-card-foreground/70 hover:text-card-foreground hover:bg-card transition-colors"
        onClick={(e) => e.stopPropagation()}
        title={`${t.madeBy} @${GITHUB_USER}`}
      >
        <Github className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span className="hidden sm:inline">{t.madeBy} @{GITHUB_USER}</span>
      </a>
    </footer>

    <span className="fixed bottom-4 right-4 z-50 text-[10px] text-foreground/40 select-none">
      v{version}
    </span>
    </>
  );
};
