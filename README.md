# Ruddis' Tiny Board

A clean, minimalist task whiteboard built with React and TypeScript.

🌐 **Live Demo:** [ruddisender22.github.io/Tiny-Board](https://ruddisender22.github.io/Tiny-Board/)

## ✨ Features

- **Create tasks** — Hover over the board and start typing to add a new task
- **Inline rename** — Double-click any task name to edit it in place
- **Drag & drop reorder** — Grab the handle to rearrange your tasks
- **Custom colors** — Click the color dot to pick any hue with a smooth slider
- **Tags & filtering** — Add tags to organize tasks, then filter by tag to focus
- **Complete & delete** — Right-click a task to mark it done (sinks to bottom), or hit ✕ to remove it
- **Persistent storage** — All tasks are saved to LocalStorage automatically
- **Responsive design** — Works great on desktop and mobile

## 🛠️ Tech Stack

- **React 18** + **TypeScript**
- **Vite** — Fast dev server and build tool
- **Framer Motion** — Smooth animations and transitions
- **dnd-kit** — Accessible drag & drop
- **Tailwind CSS** — Utility-first styling
- **Radix UI** — Headless, accessible popover
- **LocalStorage** — Client-side persistence (no backend needed)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:8080/`.

## 📦 Build for Production

```bash
npm run build
```

The output will be in the `dist/` directory, ready to deploy.

## 📄 License

MIT
