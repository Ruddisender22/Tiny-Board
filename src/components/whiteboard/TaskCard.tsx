import { motion } from "framer-motion";
import { X, GripVertical, Plus } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { colorVar, TaskColor } from "@/lib/taskColors";
import { HueSlider } from "./HueSlider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface Task {
  id: string;
  name: string;
  color: TaskColor;
  completed: boolean;
  tags: string[];
}

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onChangeColor: (id: string, color: TaskColor) => void;
  overlay?: boolean;
}

export const TaskCard = ({
  task,
  onToggle,
  onDelete,
  onRename,
  onAddTag,
  onRemoveTag,
  onChangeColor,
  overlay = false,
}: TaskCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: overlay });

  const [tagDraft, setTagDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(task.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync if the task name changes externally
  useEffect(() => {
    if (!editing) setNameDraft(task.name);
  }, [task.name, editing]);

  // Auto-focus and select all text when entering edit mode
  useEffect(() => {
    if (editing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editing]);

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== task.name) {
      onRename(task.id, trimmed);
    } else {
      setNameDraft(task.name);
    }
    setEditing(false);
  };

  const handleNameKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitName();
    } else if (e.key === "Escape") {
      setNameDraft(task.name);
      setEditing(false);
    }
  };

  const style = overlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const commitTag = () => {
    const t = tagDraft.trim().replace(/^#/, "");
    if (t && !task.tags.includes(t)) onAddTag(task.id, t);
    setTagDraft("");
    setAdding(false);
  };

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTag();
    } else if (e.key === "Escape") {
      setTagDraft("");
      setAdding(false);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{
        opacity: isDragging ? 0 : task.completed ? 0.5 : 1,
        y: 0,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl border border-border bg-card task-shadow",
        "px-5 py-4 cursor-default select-none transition-shadow hover:task-shadow-hover",
        overlay && "task-shadow-hover ring-2 ring-primary/20 cursor-grabbing rotate-1"
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        onToggle(task.id);
      }}
    >
      {/* Color accent bar */}
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
        style={{ backgroundColor: colorVar(task.color) }}
      />

      {/* Drag handle */}
      <button
        type="button"
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
        className="ml-1 -mr-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Color dot — popover to change color */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Change color"
            onClick={(e) => e.stopPropagation()}
            className="h-2.5 w-2.5 rounded-full flex-shrink-0 transition-transform hover:scale-125"
            style={{ backgroundColor: colorVar(task.color) }}
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <HueSlider
            hue={task.color}
            onChange={(h) => onChangeColor(task.id, h)}
          />
        </PopoverContent>
      </Popover>

      {/* Task name + tags */}
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        {editing ? (
          <input
            ref={nameInputRef}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={handleNameKey}
            onBlur={commitName}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "text-base font-medium text-foreground bg-transparent outline-none",
              "border-b-2 border-primary/50 focus:border-primary transition-colors",
              "w-full max-w-xs"
            )}
          />
        ) : (
          <span
            className={cn(
              "text-base font-medium text-foreground transition-all cursor-text",
              "hover:border-b hover:border-dashed hover:border-muted-foreground/40",
              task.completed && "line-through text-muted-foreground"
            )}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!overlay) setEditing(true);
            }}
          >
            {task.name}
          </span>
        )}

        {task.tags.map((tag) => (
          <span
            key={tag}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTag(task.id, tag);
              }}
              className="hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {adding ? (
          <input
            autoFocus
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={handleTagKey}
            onBlur={commitTag}
            onClick={(e) => e.stopPropagation()}
            placeholder="tag"
            className="w-16 bg-transparent text-xs outline-none border-b border-dashed border-muted-foreground/40"
          />
        ) : (
          <button
            type="button"
            aria-label="Add tag"
            onClick={(e) => {
              e.stopPropagation();
              setAdding(true);
            }}
            className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Plus className="h-3 w-3" />
            tag
          </button>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        aria-label="Delete task"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        className="flex-shrink-0 h-8 w-8 grid place-items-center rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};
