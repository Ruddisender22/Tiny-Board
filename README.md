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
- Switch between **Light**, **Mixed**, and **Dark** themes from settings.
- Available in **English** and **Spanish**.

Everything saves to your browser automatically.

## Releases

- **v1.7.0 (Current Release)**:
  - Improved create-task button: translucent & dashed when in-flow, solid & larger when floating at the bottom.
  - Fixed mobile double-tap to complete tasks (proper timer-based detection).
  - Rapid-entry mode: submit tasks with Enter and stay in input.
  - Global `Enter` shortcut to open the task creator.
  - Full mobile touch support (single-tap to edit, double-tap to complete, hold handle to move).
  - Three themes (Light, Mixed, Dark), Full-Color cards, English & Spanish.

## Run locally

```bash
npm install
npm run dev
```

## License

MIT
