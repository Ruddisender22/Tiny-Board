// Task color is now a hue (0-360). Saturation/lightness are fixed for a clean Google-ish vibrancy.
export type TaskColor = number;

export const DEFAULT_HUE: TaskColor = 217; // Google blue
export const TASK_SATURATION = 78;
export const TASK_LIGHTNESS = 52;

export const colorVar = (hue: TaskColor) =>
  `hsl(${hue} ${TASK_SATURATION}% ${TASK_LIGHTNESS}%)`;

export const colorVarSoft = (hue: TaskColor, alpha = 0.12) =>
  `hsl(${hue} ${TASK_SATURATION}% ${TASK_LIGHTNESS}% / ${alpha})`;
