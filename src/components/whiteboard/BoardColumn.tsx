import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard, Task } from "./TaskCard";
import { TaskColor, colorVar, colorVarSoft } from "@/lib/taskColors";
import { X } from "lucide-react";
import { useState, useRef, useEffect, useCallback, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { ColorPicker } from "./ColorPicker";
import { Lang, translations } from "@/lib/i18n";
import { cn, useIsTouchDevice } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export interface Category {
  id: string;
  name: string;
  color: TaskColor;
  x: number;
  y: number;
}

export const COLUMN_TRANSITION =
  "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease, translate 0.2s ease";
export const COLUMN_DRAGGING_TRANSITION = "box-shadow 0.2s ease, border-color 0.2s ease";

interface BoardColumnProps {
  category: Category;
  tasks: Task[];
  dropTarget: boolean;
  /** True while this column is being moved on the canvas. */
  dragging: boolean;
  /** True while this column is being moved or settling into place. */
  raised: boolean;
  isSingleColumn: boolean;
  onHeaderPointerDown: (id: string, event: ReactPointerEvent<HTMLElement>) => void;
  registerElement: (id: string, element: HTMLDivElement | null) => void;
  onMeasure: (id: string, width: number, height: number) => void;
  dataCategoryId: string;
  x: number;
  y: number;
  width: number;
  minWidth: number;
  maxWidth: number;
  onResize: (id: string, width: number) => void;
  selectionMode: boolean;
  onSelectCategory: (id: string) => void;
  previewTaskId: string | null;
  onRenameCategory: (id: string, newName: string) => void;
  onDeleteCategory: (id: string) => void;
  onChangeCategoryColor: (id: string, color: TaskColor) => void;
  
  // Task operations passed down
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onRenameTask: (id: string, name: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onChangeTaskColor: (id: string, color: TaskColor) => void;
  
  fullColor: boolean;
  lang: Lang;
}

export const BoardColumn = ({
  category,
  tasks,
  dropTarget,
  dragging,
  raised,
  isSingleColumn,
  onHeaderPointerDown,
  registerElement,
  onMeasure,
  dataCategoryId,
  x,
  y,
  width,
  minWidth,
  maxWidth,
  onResize,
  selectionMode,
  onSelectCategory,
  previewTaskId,
  onRenameCategory,
  onDeleteCategory,
  onChangeCategoryColor,
  onToggleTask,
  onDeleteTask,
  onRenameTask,
  onAddTag,
  onRemoveTag,
  onChangeTaskColor,
  fullColor,
  lang,
}: BoardColumnProps) => {
  const t = translations[lang];
  const isTouch = useIsTouchDevice();
  
  const { setNodeRef: setDropRef } = useDroppable({
    id: `category-drop:${category.id}`,
    data: { categoryId: category.id },
  });
  const columnRef = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    columnRef.current = node;
    setDropRef(node);
    registerElement(category.id, node);
  }, [setDropRef, registerElement, category.id]);

  // Report the real rendered size so the canvas can place and expand columns accurately.
  useEffect(() => {
    const element = columnRef.current;
    if (!element) return;
    const report = () => onMeasure(category.id, element.offsetWidth, element.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    return () => observer.disconnect();
  }, [category.id, onMeasure]);

  const style = {
    left: 0,
    top: 0,
    transform: `translate3d(${x}px, ${y}px, 0)`,
    transition: dragging ? COLUMN_DRAGGING_TRANSITION : COLUMN_TRANSITION,
    zIndex: raised ? 70 : undefined,
    width: isSingleColumn ? `min(760px, calc(100% - ${Math.round(x) + 24}px))` : width,
    minWidth: isSingleColumn ? 0 : minWidth,
  };

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(category.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!editing) setNameDraft(category.name);
  }, [category.name, editing]);

  useEffect(() => {
    if (editing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!resizeRef.current) return;
      const nextWidth = resizeRef.current.startWidth + event.clientX - resizeRef.current.startX;
      onResize(category.id, Math.min(maxWidth, Math.max(minWidth, nextWidth)));
    };
    const handlePointerUp = () => {
      resizeRef.current = null;
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [category.id, maxWidth, minWidth, onResize]);

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== category.name) {
      onRenameCategory(category.id, trimmed);
    } else {
      setNameDraft(category.name);
    }
    setEditing(false);
  };

  const handleNameKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitName();
    } else if (e.key === "Escape") {
      setNameDraft(category.name);
      setEditing(false);
    }
  };
  
  return (
    <div
      ref={setRefs}
      data-category-id={dataCategoryId}
      style={style}
      className={cn(
        "board-column absolute flex flex-col rounded-2xl flex-shrink-0",
        isSingleColumn && "board-column-single",
        dragging && "column-dragging",
        dropTarget && !dragging && "category-drop-glow",
        selectionMode && "category-selection-glow cursor-pointer"
      )}
      onClick={(event) => {
        if (!selectionMode) return;
        event.stopPropagation();
        onSelectCategory(category.id);
      }}
    >
      {/* Column Header */}
      <div 
        className={cn(
          "board-column-header flex items-center gap-3 rounded-t-2xl border-b p-4 cursor-grab active:cursor-grabbing transition-colors group select-none",
          selectionMode && "pointer-events-none"
        )}
        onPointerDown={(event) => onHeaderPointerDown(category.id, event)}
      >
        <ColorPicker
          hue={category.color}
          onChange={(h) => onChangeCategoryColor(category.id, h)}
          recentLabel={t.recentColors}
          sliderLabel={t.customColor}
          colorLabel={t.color}
          trigger={
            <button
              type="button"
              aria-label={t.changeColor}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-8 rounded-md flex-shrink-0 border border-white/20 shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: colorVar(category.color) }}
            />
          }
        />

        <div
          className="category-name-bar flex-1 min-w-0 truncate rounded-lg px-3 py-2"
          style={{ backgroundColor: colorVarSoft(category.color, 0.22) }}
        >
          {editing ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={handleNameKey}
              onBlur={commitName}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent font-semibold text-card-foreground outline-none border-b border-primary"
            />
          ) : (
            <h3 
              className="font-semibold text-card-foreground truncate cursor-text"
              onDoubleClick={(e) => {
                if (!isTouch) {
                  e.stopPropagation();
                  setEditing(true);
                }
              }}
              onClick={(e) => {
                if (isTouch) {
                  e.stopPropagation();
                  setEditing(true);
                }
              }}
            >
              {category.name}
            </h3>
          )}
        </div>
        
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteCategory(category.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Delete ${category.name}`}
          className="text-card-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-full p-1.5 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          resizeRef.current = { startX: event.clientX, startWidth: width };
        }}
        className={cn(
          "absolute right-0 top-3 bottom-3 z-10 w-2 cursor-ew-resize rounded-full opacity-40 transition-opacity hover:bg-primary/40 sm:opacity-0 sm:group-hover:opacity-100",
          selectionMode && "pointer-events-none"
        )}
      />
      
      {/* Column Body */}
      <div className={cn(
        "board-column-body flex flex-col gap-3 p-3",
        tasks.length === 0 && "board-column-empty-body",
        isSingleColumn && "board-column-single-body",
        selectionMode && "pointer-events-none"
      )} onPointerDown={(e) => e.stopPropagation()}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false} mode="popLayout">
            {tasks.map(task => (
              <motion.div key={task.id} layout className="space-y-3">
                {previewTaskId === task.id && <div className="task-drop-preview" aria-hidden />}
                <TaskCard
                  task={task}
                  onToggle={onToggleTask}
                  onDelete={onDeleteTask}
                  onRename={onRenameTask}
                  onAddTag={onAddTag}
                  onRemoveTag={onRemoveTag}
                  onChangeColor={onChangeTaskColor}
                  fullColor={fullColor}
                  lang={lang}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
      
      <div className="h-2 shrink-0 rounded-b-2xl bg-card-foreground/[0.03]" aria-hidden />
    </div>
  );
};
