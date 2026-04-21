import { useEffect, useRef, useState, useCallback } from "react";
import { version } from "../../../package.json";
import { AnimatePresence } from "framer-motion";
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
import { Github } from "lucide-react";
import { TaskCard, Task } from "./TaskCard";
import { CreateTaskFrame, CreateTaskFrameHandle } from "./CreateTaskFrame";
import { TaskColor, DEFAULT_HUE } from "@/lib/taskColors";

const STORAGE_KEY = "whiteboard:tasks:v2";
const GITHUB_USER = "Ruddisender22";

const legacyHueMap: Record<string, number> = {
  blue: 217,
  green: 142,
  red: 4,
  yellow: 45,
};

const loadTasks = (): Task[] => {
  try {
    // Try v2 first
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
    // Migrate from v1
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

export const Whiteboard = () => {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [hovered, setHovered] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<CreateTaskFrameHandle>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

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

  return (
    <>
    <main
      ref={boardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleBoardClick}
      className="relative min-h-screen w-full bg-background bg-dot-pattern px-4 py-12 sm:py-20"
    >
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Tiny Board
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hover anywhere to create a task. Drag to reorder. Click to complete.
          </p>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onRename={renameTask}
                    onAddTag={addTag}
                    onRemoveTag={removeTag}
                    onChangeColor={changeColor}
                  />
                ))}
              </AnimatePresence>

              <CreateTaskFrame
                ref={frameRef}
                visible={hovered || creating}
                active={creating}
                onActivate={() => setCreating(true)}
                onSubmit={addTask}
                onCancel={() => setCreating(false)}
              />
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
