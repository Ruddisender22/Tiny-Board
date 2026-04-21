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
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Github, X, HelpCircle, Globe } from "lucide-react";
import { TaskCard, Task } from "./TaskCard";
import { CreateTaskFrame, CreateTaskFrameHandle } from "./CreateTaskFrame";
import { TaskColor, DEFAULT_HUE } from "@/lib/taskColors";
import { translations, Lang, loadLang, saveLang } from "@/lib/i18n";

const STORAGE_KEY = "whiteboard:tasks:v2";
const GITHUB_USER = "Ruddisender22";

type StatusFilter = "all" | "active" | "completed";

const legacyHueMap: Record<string, number> = {
  blue: 217,
  green: 142,
  red: 4,
  yellow: 45,
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
          }));
      }
    }
    return [];
  } catch {
    return [];
  }
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          {/* Panel */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl border-2 border-border/60 bg-card p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTab("help")}
                  className={`text-sm font-semibold px-3 py-1 rounded-full transition-all ${
                    tab === "help"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.helpTitle}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("changelog")}
                  className={`text-sm font-semibold px-3 py-1 rounded-full transition-all ${
                    tab === "changelog"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.changelog}
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-7 w-7 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {tab === "help" ? (
              <>
                {/* Controls grid — each in its own card */}
                <div className="grid grid-cols-1 gap-2">
                  {t.help.map(({ key, desc }) => (
                    <div
                      key={key}
                      className="flex gap-3 items-start rounded-xl border border-border/50 bg-muted/30 px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-foreground shrink-0 min-w-[90px]">
                        {key}
                      </span>
                      <span className="text-sm text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-muted-foreground/50 text-center">
                  {t.helpSaved}
                </p>
              </>
            ) : (
              /* Changelog */
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {t.changelogEntries.map((entry) => (
                  <div key={entry.version}>
                    <h3 className="text-sm font-semibold text-foreground mb-1.5">
                      v{entry.version}
                    </h3>
                    <ul className="space-y-1">
                      {entry.changes.map((change, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
                        >
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          {change}
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

/* ─── Main whiteboard ───────────────────────────────────────────────── */

export const Whiteboard = () => {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [hovered, setHovered] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [helpOpen, setHelpOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => loadLang());
  const boardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<CreateTaskFrameHandle>(null);

  const t = translations[lang];

  const toggleLang = () => {
    const next: Lang = lang === "en" ? "es" : "en";
    setLang(next);
    saveLang(next);
  };

  // Sticky create-frame logic
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [frameSticky, setFrameSticky] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFrameSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
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

  const shouldSlideRight = statusFilter !== "all";

  const addTask = useCallback((name: string, color: TaskColor, tags: string[]) => {
    setTasks((prev) => [
      { id: crypto.randomUUID(), name, color, completed: false, tags },
      ...prev,
    ]);
    setCreating(false);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addTag = useCallback((id: string, tag: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id && !t.tags.includes(tag) ? { ...t, tags: [...t.tags, tag] } : t
      )
    );
  }, []);

  const removeTag = useCallback((id: string, tag: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, tags: t.tags.filter((x) => x !== tag) } : t))
    );
  }, []);

  const changeColor = useCallback((id: string, color: TaskColor) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
  }, []);

  const renameTask = useCallback((id: string, name: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setTasks((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
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

  const showCreateFrame = hovered || creating;

  return (
    <>
    <main
      ref={boardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleBoardClick}
      className="relative min-h-screen w-full bg-background bg-dot-pattern px-4 py-12 sm:py-20 pb-32"
    >
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.subtitle}
          </p>
        </header>

        {/* Status filter tabs */}
        <div className="mb-4 flex items-center justify-center gap-1 rounded-full bg-muted p-1 w-fit mx-auto">
          {statusLabels.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`
                rounded-full px-4 py-1.5 text-xs font-medium transition-all
                ${statusFilter === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tag filter bar */}
        {allTags.length > 0 && (
          <div className="mb-6 flex items-center gap-2 flex-wrap justify-center">
            <span className="text-xs text-muted-foreground/60 mr-1">{t.tags}</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`
                  inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all
                  ${filterTag === tag
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }
                `}
              >
                {tag}
                {filterTag === tag && <X className="h-3 w-3" />}
              </button>
            ))}
            {filterTag && (
              <button
                type="button"
                onClick={() => setFilterTag(null)}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground underline ml-1 transition-colors"
              >
                {t.clear}
              </button>
            )}
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={displayedTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false} mode="popLayout">
                {displayedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onRename={renameTask}
                    onAddTag={addTag}
                    onRemoveTag={removeTag}
                    onChangeColor={changeColor}
                    exitSlideRight={shouldSlideRight}
                  />
                ))}
              </AnimatePresence>

              {/* In-flow create frame */}
              {!frameSticky && (
                <CreateTaskFrame
                  ref={frameRef}
                  visible={showCreateFrame}
                  active={creating}
                  onActivate={() => setCreating(true)}
                  onSubmit={addTask}
                  onCancel={() => setCreating(false)}
                />
              )}

              <div ref={sentinelRef} className="h-0 w-full" aria-hidden />
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeId
              ? (() => {
                  const t = tasks.find((x) => x.id === activeId);
                  if (!t) return null;
                  return (
                    <TaskCard
                      task={t}
                      onToggle={() => {}}
                      onDelete={() => {}}
                      onRename={() => {}}
                      onAddTag={() => {}}
                      onRemoveTag={() => {}}
                      onChangeColor={() => {}}
                      overlay
                    />
                  );
                })()
              : null}
          </DragOverlay>
        </DndContext>
      </div>

    </main>

    {/* Sticky create frame */}
    {frameSticky && showCreateFrame && (
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
        <CreateTaskFrame
          ref={frameRef}
          visible
          active={creating}
          onActivate={() => setCreating(true)}
          onSubmit={addTask}
          onCancel={() => setCreating(false)}
        />
      </div>
    )}

    {/* Bottom-left buttons: Help + Language */}
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      <button
        type="button"
        aria-label="Help"
        onClick={() => setHelpOpen(true)}
        className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-card/80 backdrop-blur border border-border text-muted-foreground/70 hover:text-foreground hover:bg-card transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Toggle language"
        onClick={toggleLang}
        className="inline-flex items-center justify-center gap-1 h-8 rounded-full bg-card/80 backdrop-blur px-2.5 border border-border text-muted-foreground/70 hover:text-foreground hover:bg-card transition-colors"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase">{lang === "en" ? "ES" : "EN"}</span>
      </button>
    </div>

    <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} lang={lang} />

    <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 text-xs text-muted-foreground/70 pointer-events-none">
      <a
        href={`https://github.com/${GITHUB_USER}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-card/80 backdrop-blur px-3 py-1.5 border border-border hover:text-foreground hover:bg-card transition-colors pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Github className="h-3.5 w-3.5" />
        {t.madeBy} @{GITHUB_USER}
      </a>
    </footer>

    <span className="fixed bottom-4 right-4 z-50 text-[10px] text-muted-foreground/40 select-none">
      v{version}
    </span>
    </>
  );
};
