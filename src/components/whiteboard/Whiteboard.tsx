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
import { Github, X, HelpCircle } from "lucide-react";
import { TaskCard, Task } from "./TaskCard";
import { CreateTaskFrame, CreateTaskFrameHandle } from "./CreateTaskFrame";
import { TaskColor, DEFAULT_HUE } from "@/lib/taskColors";

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

/** Sort tasks so completed ones sink to the bottom while preserving relative order. */
const sortWithCompletedLast = (tasks: Task[]): Task[] => {
  const active = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);
  return [...active, ...done];
};

/* ─── Help modal ────────────────────────────────────────────────────── */

const HelpModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
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
          className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Controls & Features</h2>
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close help"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-foreground font-medium shrink-0">Hover</span>
              <span>— over the board to reveal the create-task button.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-foreground font-medium shrink-0">Double-click</span>
              <span>— a task name to rename it inline.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-foreground font-medium shrink-0">Right-click</span>
              <span>— a task to toggle complete / not complete.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-foreground font-medium shrink-0">Drag</span>
              <span>— the ⠿ handle to reorder tasks.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-foreground font-medium shrink-0">Color dot</span>
              <span>— click the dot to change the task color.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-foreground font-medium shrink-0">Tags</span>
              <span>— click "+ tag" to add tags, then use the filter bar.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-foreground font-medium shrink-0">Status bar</span>
              <span>— switch between All / Active / Completed views.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-foreground font-medium shrink-0">✕ button</span>
              <span>— delete a task (appears on hover).</span>
            </li>
          </ul>

          <p className="mt-4 text-xs text-muted-foreground/50 text-center">
            All tasks are saved automatically in your browser.
          </p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ─── Main whiteboard ───────────────────────────────────────────────── */

export const Whiteboard = () => {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [hovered, setHovered] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [helpOpen, setHelpOpen] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<CreateTaskFrameHandle>(null);

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

  // Collect all unique tags across tasks
  const allTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => t.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [tasks]);

  // Sorted and filtered task list
  const displayedTasks = useMemo(() => {
    let list = sortWithCompletedLast(tasks);
    if (statusFilter === "active") list = list.filter((t) => !t.completed);
    else if (statusFilter === "completed") list = list.filter((t) => t.completed);
    if (filterTag) list = list.filter((t) => t.tags.includes(filterTag));
    return list;
  }, [tasks, filterTag, statusFilter]);

  // Whether toggling a task in the current filter should trigger slide-right exit
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
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
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
            Ruddis' Tiny Board
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hover anywhere to create a task. Drag to reorder. Right-click to complete.
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
            <span className="text-xs text-muted-foreground/60 mr-1">Tags:</span>
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
                Clear
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

              {/* In-flow create frame (when visible at the bottom of the list) */}
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

              {/* Sentinel: when this scrolls out of view, the frame goes sticky */}
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

    {/* Sticky create frame — fixed at viewport bottom when scrolled past the in-flow position */}
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

    {/* Help button */}
    <button
      type="button"
      aria-label="Help"
      onClick={() => setHelpOpen(true)}
      className="fixed bottom-4 left-4 z-50 inline-flex items-center justify-center h-8 w-8 rounded-full bg-card/80 backdrop-blur border border-border text-muted-foreground/70 hover:text-foreground hover:bg-card transition-colors"
    >
      <HelpCircle className="h-4 w-4" />
    </button>

    <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

    <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 text-xs text-muted-foreground/70 pointer-events-none">
      <a
        href={`https://github.com/${GITHUB_USER}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-card/80 backdrop-blur px-3 py-1.5 border border-border hover:text-foreground hover:bg-card transition-colors pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Github className="h-3.5 w-3.5" />
        Made by @{GITHUB_USER}
      </a>
    </footer>

    <span className="fixed bottom-4 right-4 z-50 text-[10px] text-muted-foreground/40 select-none">
      v{version}
    </span>
    </>
  );
};
