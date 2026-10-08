import { ReactNode, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { colorVar } from "@/lib/taskColors";
import { TaskColor } from "@/lib/taskColors";
import { HueSlider } from "./HueSlider";

const RECENT_COLORS_KEY = "whiteboard:recent-colors:v1";
const MAX_RECENT_COLORS = 8;
const FALLBACK_COLORS: TaskColor[] = [217, 4, 142, 45, 262, 190, 28, 330];

interface ColorPickerProps {
  hue: TaskColor;
  onChange: (hue: TaskColor) => void;
  trigger: ReactNode;
  recentLabel: string;
  sliderLabel: string;
  colorLabel: string;
}

const loadRecentColors = (currentHue: TaskColor): TaskColor[] => {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const colors = parsed.filter((color): color is number => typeof color === "number" && color >= 0 && color <= 359);
        if (colors.length > 0) return [currentHue, ...colors.filter((color) => color !== currentHue)].slice(0, MAX_RECENT_COLORS);
      }
    }
  } catch {
    // Use the starter palette when recent colors cannot be read.
  }
  return [currentHue, ...FALLBACK_COLORS.filter((color) => color !== currentHue)].slice(0, MAX_RECENT_COLORS);
};

export const ColorPicker = ({
  hue,
  onChange,
  trigger,
  recentLabel,
  sliderLabel,
  colorLabel,
}: ColorPickerProps) => {
  const [recentColors, setRecentColors] = useState(() => loadRecentColors(hue));

  const rememberColor = (nextHue: TaskColor) => {
    const nextColors = [nextHue, ...recentColors.filter((color) => color !== nextHue)].slice(0, MAX_RECENT_COLORS);
    setRecentColors(nextColors);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(nextColors));
    onChange(nextHue);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-64 p-3" onClick={(event) => event.stopPropagation()}>
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">{recentLabel}</p>
            <div className="grid grid-cols-8 gap-1.5">
              {recentColors.map((recentColor, index) => (
                <button
                  key={`${recentColor}-${index}`}
                  type="button"
                  aria-label={`${colorLabel} ${recentColor}`}
                  title={`${colorLabel} ${recentColor}`}
                  onClick={() => rememberColor(recentColor)}
                  className="group relative grid aspect-square place-items-center rounded-lg border border-white/15 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/60"
                  style={{ backgroundColor: colorVar(recentColor) }}
                >
                  {recentColor === hue && <span className="h-1.5 w-1.5 rounded-full bg-white shadow" />}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-border/60 pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">{sliderLabel}</p>
            <HueSlider hue={hue} onChange={rememberColor} className="w-full" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
