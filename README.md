# Ruddis' Tiny Board

A private local task board that runs in your browser. No account, backend, or task-data collection: your tasks stay in browser storage and are not sent by the app.

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

## Privacy

Tiny Board is local by design. It does not require an account or backend, and task data is stored in your browser rather than sent to the app's servers. Clearing browser storage removes local tasks.

## Releases

- **v1.16.0 (Current Release)**:
  - Fixed task spacing and animated cards below the live insertion preview.
  - Preserved rounded glass styling on the column drag overlay.

- **v1.15.0**:
  - Added a live insertion preview when dragging tasks between cards.

- **v1.14.0**:
  - Redesigned Add category and compacted the Create task area.
  - Centered the floating task preview and category selection message.

- **v1.13.0**:
  - Added a column drag overlay so destination columns stay visible during swaps.
  - Card previews resize smoothly using pointer-based column detection.
  - Moved the Made by credit below the board and added horizontal category color bars.

- **v1.12.0**:
  - Single-category boards now use a clean flat layout without a column frame.

- **v1.11.0**:
  - Create-task button appears only near its interaction area.
  - New tasks use a floating preview and require choosing a category.
  - Removed create-task buttons from inside columns.
  - Added adaptive drag previews, larger task handles, and Full-Color by default.
  - Improved page and column scrollbars.

- **v1.10.0**:
  - Added resizable columns with persisted widths.
  - Added animated column swaps with glow feedback.
  - Improved column header color identification and Light/Mixed theme contrast.
  - Added the shared recent-colors grid.

- **v1.9.0**:
  - Added glass-style category columns with horizontal scrolling on mobile.
  - Added category creation, renaming, color changes, deletion, and reordering.
  - Added moving and reordering tasks across categories.

- **v1.8.0**:
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
