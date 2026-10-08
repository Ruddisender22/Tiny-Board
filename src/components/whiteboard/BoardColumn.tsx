import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard, Task } from "./TaskCard";
import { TaskColor, colorVar, colorVarSoft } from "@/lib/taskColors";
import { X } from "lucide-react";
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ColorPicker } from "./ColorPicker";
import { Lang, translations } from "@/lib/i18n";
import { cn, useIsTouchDevice } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export interface Category {
  id: string;
  name: string;
  color: TaskColor;
}

interface BoardColumnProps {
  category: Category;
  tasks: Task[];
  dropTarget: boolean;
  swapPulse: boolean;
  isSingleColumn: boolean;
  dataCategoryId: string;
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
  swapPulse,
  isSingleColumn,
  dataCategoryId,
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
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    data: {
      type: "Column",
      category,
    },
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
    <motion.div
      ref={setNodeRef}
      data-category-id={dataCategoryId}
      style={{ ...style, width: isSingleColumn ? "100%" : width, minWidth: isSingleColumn ? 0 : minWidth }}
      className={cn(
        "board-column relative flex flex-col rounded-2xl max-h-[80vh] flex-shrink-0 transition-[box-shadow,border-color]",
        isSingleColumn && "board-column-single",
        isDragging && "z-50 opacity-0",
        dropTarget && !isDragging && "category-drop-glow",
        swapPulse && "category-swap-pulse",
        selectionMode && "category-selection-glow relative z-50 cursor-pointer"
      )}
      onClick={() => selectionMode && onSelectCategory(category.id)}
    >
      {/* Column Header */}
      <div 
        className="board-column-header flex items-center gap-3 rounded-t-2xl border-b p-4 cursor-grab active:cursor-grabbing transition-colors group"
        {...attributes}
        {...listeners}
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
        className="absolute right-0 top-3 bottom-3 z-10 w-2 cursor-ew-resize rounded-full opacity-40 transition-opacity hover:bg-primary/40 sm:opacity-0 sm:group-hover:opacity-100"
      />
      
      {/* Column Body */}
      <div className={cn(
        "board-column-body flex flex-col gap-3 flex-1 min-h-0 p-3 overflow-y-auto overscroll-contain kanban-scroll",
        isSingleColumn && "board-column-single-body"
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
    </motion.div>
  );
};
