import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { colorVar } from "@/lib/taskColors";

interface HueSliderProps {
  hue: number;
  onChange: (hue: number) => void;
  className?: string;
}

export const HueSlider = ({ hue, onChange, className }: HueSliderProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const pct = rect.width === 0 ? 0 : x / rect.width;
      onChange(Math.round(pct * 359));
    },
    [onChange]
  );

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      updateFromClientX(e.clientX);
    };
    const up = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [updateFromClientX]);

  const pct = (hue / 359) * 100;

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Color hue"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={hue}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
        updateFromClientX(e.clientX);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onChange((hue + 359 - 5) % 360);
        else if (e.key === "ArrowRight") onChange((hue + 5) % 360);
      }}
      className={cn(
        "relative h-2.5 w-32 rounded-full cursor-pointer touch-none select-none",
        className
      )}
      style={{
        background:
          "linear-gradient(to right, hsl(0 78% 52%), hsl(60 78% 52%), hsl(120 78% 52%), hsl(180 78% 52%), hsl(240 78% 52%), hsl(300 78% 52%), hsl(360 78% 52%))",
      }}
    >
      <div
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none"
        style={{
          left: `${pct}%`,
          backgroundColor: colorVar(hue),
        }}
      />
    </div>
  );
};
