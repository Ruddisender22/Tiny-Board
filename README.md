# Ruddis' Tiny Board

A minimal task board that lives in your browser. No accounts, no servers — just open it and start adding tasks.

**Live:** [ruddisender22.github.io/Tiny-Board](https://ruddisender22.github.io/Tiny-Board/)

## How it works

- **Hover** over the board to create a new task.
- **Double-click** a task name to edit it.
- **Right-click** a task to mark it complete (or undo).
- **Drag** the handle to reorder.
- Click the **color dot** to pick a color, or toggle **Full-Color** in settings.
- Add **tags** to organize, then filter by tag or by status (All / Active / Completed).
- Create category columns, rename them, change their color, reorder them, and move tasks between columns.
- Switch between **Light**, **Mixed**, and **Dark** themes from settings.
- Available in **English** and **Spanish**.

Everything saves to your browser automatically.

## Releases

- **v1.9.0**:
  - Added glass-style category columns with horizontal scrolling on mobile.
  - Added category creation, renaming, color changes, deletion, and reordering.
  - Added moving and reordering tasks across categories.

- **v1.8.0 (Current Release)**:
  - Added "Delete all" button (🗑) with a confirmation dialog.
  - Create-task button: translucent & dashed when in-flow, solid & larger when floating.
  - Mobile touch support (single-tap to edit, double-tap to complete, hold handle to move).
  - Rapid-entry mode (Enter submits and keeps input open). Global Enter shortcut.
  - Three themes (Light, Mixed, Dark), Full-Color cards, English & Spanish.

## Run locally

```bash
npm install
npm run dev
```

## License

MIT
