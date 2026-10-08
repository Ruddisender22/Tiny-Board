import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { version } from "../../../package.json";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragMoveEvent,
  DragStartEvent,
  DragOverlay,
  TouchSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Github, X, HelpCircle, Settings, Sun, Moon, Cloud, Trash2, FolderPlus, MessageSquare, Plus } from "lucide-react";
import { TaskCard, Task } from "./TaskCard";
import { BoardColumn, Category } from "./BoardColumn";
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
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState<{ name: string; color: TaskColor; tags: string[] } | null>(null);
  const [swappedCategoryId, setSwappedCategoryId] = useState<string | null>(null);
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
  const frameRef = useRef<CreateTaskFrameHandle>(null);
  const categoryNameInputRef = useRef<HTMLInputElement>(null);
  const createAnchorRef = useRef<HTMLDivElement>(null);
  const isTouch = useIsTouchDevice();

  const t = translations[lang];

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

  const addCategory = useCallback(() => {
    setCategoryNameDraft("");
    setCategoryDialogOpen(true);
  }, []);

  const createCategory = useCallback(() => {
    const trimmed = categoryNameDraft.trim();
    if (!trimmed) return;
    const category: Category = {
      id: crypto.randomUUID(),
      name: trimmed,
      color: DEFAULT_HUE,
      x: 24 + (categories.length % 3) * 384,
      y: 24 + Math.floor(categories.length / 3) * 48,
    };
    setCategories((prev) => [...prev, category]);
    setCategoryNameDraft("");
    setCategoryDialogOpen(false);
  }, [categoryNameDraft]);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDropTargetCategoryId(null);
    setDragPreviewCategoryId(null);
    setDragPreviewTaskId(null);
    if (!over || active.id === over.id) return;

    if (categories.some((category) => category.id === active.id)) {
      const activeCategory = categories.find((category) => category.id === active.id);
      if (!activeCategory) return;
      const nextX = Math.max(CANVAS_GRID, Math.round((activeCategory.x + event.delta.x) / CANVAS_GRID) * CANVAS_GRID);
      const nextY = Math.max(CANVAS_GRID, Math.round((activeCategory.y + event.delta.y) / CANVAS_GRID) * CANVAS_GRID);
      setCategories((items) => items.map((category) => category.id === active.id ? { ...category, x: nextX, y: nextY } : category));
      setSwappedCategoryId(null);
      return;
    }

    setTasks((items) => {
      const movingTask = items.find((task) => task.id === active.id);
      if (!movingTask) return items;
      const targetTask = items.find((task) => task.id === over.id);
      const targetCategoryId = categories.some((category) => category.id === over.id)
        ? String(over.id)
        : targetTask?.categoryId;
      if (!targetCategoryId) return items;

      const remaining = items.filter((task) => task.id !== active.id);
      const targetIndex = targetTask
        ? remaining.findIndex((task) => task.id === targetTask.id)
        : remaining.reduce((lastIndex, task, index) => task.categoryId === targetCategoryId ? index : lastIndex, -1) + 1;
      const next = { ...movingTask, categoryId: targetCategoryId };
      remaining.splice(Math.max(0, targetIndex), 0, next);
      return remaining;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setSwappedCategoryId(null);
    const activeTask = tasks.find((task) => task.id === event.active.id);
    setDragPreviewCategoryId(activeTask?.categoryId ?? null);
    setDragPreviewTaskId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDropTargetCategoryId(null);
      setDragPreviewCategoryId(null);
      return;
    }
    const targetCategoryId = categories.some((category) => category.id === over.id)
      ? String(over.id)
      : tasks.find((task) => task.id === over.id)?.categoryId ?? null;
    if (categories.some((category) => category.id === active.id)) {
      setDropTargetCategoryId(targetCategoryId === active.id ? null : targetCategoryId);
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (categories.some((category) => category.id === event.active.id)) return;
    const translated = event.active.rect.current.translated;
    if (!translated) return;
    const centerX = translated.left + translated.width / 2;
    const centerY = translated.top + translated.height / 2;
    const element = document.elementFromPoint(centerX, centerY);
    const categoryElement = element?.closest<HTMLElement>("[data-category-id]");
    const taskElement = element?.closest<HTMLElement>("[data-task-id]");
    setDragPreviewCategoryId(categoryElement?.dataset.categoryId ?? null);
    setDragPreviewTaskId(taskElement?.dataset.taskId === String(event.active.id) ? null : taskElement?.dataset.taskId ?? null);
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
      className="relative z-10 min-h-screen w-full px-4 py-12 sm:py-20 pb-32"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="app-top-strip">
        <header className="mb-4 flex flex-col gap-3 border-b border-border/50 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <div className="flex shrink-0 items-center gap-3 self-start md:self-auto">
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 sm:inline">{t.view}</span>
            <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-muted/70 p-1 shadow-sm backdrop-blur">
              {statusLabels.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setStatusFilter(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:px-4 ${
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

        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">{t.categories}</span>
            <span className="text-xs text-muted-foreground/50">{categories.length}</span>
          </div>
        </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={handleDragStart} onDragMove={handleDragMove} onDragOver={handleDragOver} onDragEnd={handleDragEnd}
          onDragCancel={() => { setActiveId(null); setDropTargetCategoryId(null); setDragPreviewCategoryId(null); setDragPreviewTaskId(null); setSwappedCategoryId(null); }}
        >
          {pendingTask && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setPendingTask(null)}
              />
              <motion.div
                className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-4"
                initial={{ opacity: 0, y: -12, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.94 }}
              >
                <div className="flex w-[min(420px,calc(100vw-2rem))] flex-col items-center gap-3">
                  <p className="pending-task-message rounded-full border border-primary/25 bg-card/90 px-4 py-2 text-center text-xs font-semibold text-card-foreground shadow-lg backdrop-blur-xl">{t.chooseCategory}</p>
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
              </motion.div>
            </>
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
          <SortableContext items={categories.map((category) => category.id)} strategy={horizontalListSortingStrategy}>
            <div className="whiteboard-canvas relative min-h-[calc(100vh-220px)] w-full overflow-auto pb-32">
              {categories.map((category) => (
                <BoardColumn
                  key={category.id}
                  dataCategoryId={category.id}
                  category={category}
                  x={category.x}
                  y={category.y}
                  dropTarget={dropTargetCategoryId === category.id}
                  swapPulse={swappedCategoryId === category.id}
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
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeId ? (() => {
              const activeCategory = categories.find((category) => category.id === activeId);
              if (activeCategory) return null;
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
