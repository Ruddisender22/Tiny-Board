import { motion, AnimatePresence } from "framer-motion";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskColor, DEFAULT_HUE, colorVar } from "@/lib/taskColors";
import { HueSlider } from "./HueSlider";

interface CreateTaskFrameProps {
  visible: boolean;
  active: boolean;
  onActivate: () => void;
  onSubmit: (name: string, color: TaskColor, tags: string[]) => void;
  onCancel: () => void;
}

export interface CreateTaskFrameHandle {
  submit: () => void;
}

export const CreateTaskFrame = forwardRef<CreateTaskFrameHandle, CreateTaskFrameProps>(
  ({ visible, active, onActivate, onSubmit, onCancel }, ref) => {
    const [name, setName] = useState("");
    const [color, setColor] = useState<TaskColor>(DEFAULT_HUE);
    const [tags, setTags] = useState<string[]>([]);
    const [tagDraft, setTagDraft] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (active) {
        setName("");
        setColor(DEFAULT_HUE);
        setTags([]);
        setTagDraft("");
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }, [active]);

    const commitTag = () => {
      const t = tagDraft.trim().replace(/^#/, "");
      if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
      setTagDraft("");
    };

    const submit = () => {
      const trimmed = name.trim();
      const finalTags = [...tags];
      const draft = tagDraft.trim().replace(/^#/, "");
      if (draft && !finalTags.includes(draft)) finalTags.push(draft);
      if (trimmed) onSubmit(trimmed, color, finalTags);
      else onCancel();
    };

    useImperativeHandle(ref, () => ({ submit }), [name, color, tags, tagDraft]);

    const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
        if (tagDraft.trim()) {
          e.preventDefault();
          commitTag();
        }
      } else if (e.key === "Backspace" && !tagDraft && tags.length) {
        setTags((prev) => prev.slice(0, -1));
      }
    };

    if (active) {
      return (
        <motion.div
          layout
          data-create-frame
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "rounded-2xl border-2 bg-card task-shadow-hover px-5 py-4 space-y-3"
          )}
          style={{ borderColor: colorVar(color) }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full flex-shrink-0 transition-colors"
              style={{ backgroundColor: colorVar(color) }}
            />
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                } else if (e.key === "Escape") {
                  onCancel();
                }
              }}
              placeholder="What needs to be done?"
              className="flex-1 min-w-[140px] bg-transparent text-base font-medium text-card-foreground placeholder:text-card-foreground/60 outline-none"
            />
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-card-foreground/10 px-2 py-0.5 text-xs font-medium text-card-foreground/70"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="hover:text-card-foreground"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={handleTagKey}
              onBlur={() => tagDraft.trim() && commitTag()}
              placeholder="+ tag"
              className="w-20 bg-transparent text-xs text-card-foreground/70 placeholder:text-card-foreground/50 outline-none border-b border-dashed border-card-foreground/20 focus:border-card-foreground/40"
            />
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-card-foreground/60">Color</span>
              <HueSlider hue={color} onChange={setColor} />
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            data-create-frame
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 0.6, y: 0 }}
            exit={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-skeleton-border",
              "bg-card/40 backdrop-blur-sm px-5 py-4 text-card-foreground/70 hover:border-card-foreground/40 hover:text-card-foreground transition-colors"
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="text-base font-medium">Create task</span>
          </motion.button>
        )}
      </AnimatePresence>
    );
  }
);

CreateTaskFrame.displayName = "CreateTaskFrame";
