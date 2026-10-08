import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard, Task } from "./TaskCard";
import { TaskColor, colorVar } from "@/lib/taskColors";
import { GripVertical, X, Plus } from "lucide-react";
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HueSlider } from "./HueSlider";
import { Lang, translations } from "@/lib/i18n";
import { cn, useIsTouchDevice } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";

export interface Category {
  id: string;
  name: string;
  color: TaskColor;
}

interface BoardColumnProps {
  category: Category;
  tasks: Task[];
  onRenameCategory: (id: string, newName: string) => void;
  onDeleteCategory: (id: string) => void;
  onChangeCategoryColor: (id: string, color: TaskColor) => void;
  onAddTask: (categoryId: string) => void;
  
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
  onRenameCategory,
  onDeleteCategory,
  onChangeCategoryColor,
  onAddTask,
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

  useEffect(() => {
    if (!editing) setNameDraft(category.name);
  }, [category.name, editing]);

  useEffect(() => {
    if (editing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editing]);

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
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col bg-card/30 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl w-[320px] max-h-[80vh] flex-shrink-0 transition-opacity",
        isDragging && "opacity-50"
      )}
    >
      {/* Column Header */}
      <div 
        className="flex items-center gap-3 p-4 border-b border-border/30 rounded-t-2xl cursor-grab active:cursor-grabbing bg-card/20 hover:bg-card/40 transition-colors group"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-card-foreground/40 group-hover:text-card-foreground/70" />
        
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Change color"
              onClick={(e) => e.stopPropagation()}
              className="h-3 w-3 rounded-full flex-shrink-0 transition-transform hover:scale-125"
              style={{ backgroundColor: colorVar(category.color) }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" onClick={(e) => e.stopPropagation()}>
            <HueSlider hue={category.color} onChange={(h) => onChangeCategoryColor(category.id, h)} />
          </PopoverContent>
        </Popover>

        <div className="flex-1 min-w-0" onPointerDown={(e) => e.stopPropagation()}>
          {editing ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={handleNameKey}
              onBlur={commitName}
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
          aria-label={`Delete ${category.name}`}
          className="text-card-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-full p-1.5 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Column Body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 kanban-scroll" onPointerDown={(e) => e.stopPropagation()}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false} mode="popLayout">
            {tasks.map(task => (
              <TaskCard 
                key={task.id}
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
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
      
      {/* Column Footer */}
      <div className="p-3 border-t border-border/30 rounded-b-2xl bg-card/10 hover:bg-card/20 transition-colors" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onAddTask(category.id)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-card-foreground/70 hover:text-card-foreground hover:bg-card-foreground/10 transition-all"
        >
          <Plus className="h-4 w-4" />
          {t.add}
        </button>
      </div>
    </div>
  );
};
