# TaskFlow

A fast, private Kanban task board with a deadline calendar. No account, no build step, no backend. Your tasks are saved in your browser and the whole app is three static files.

## Features

**Tasks**
- Add, edit, delete and complete tasks, each with a title, notes, due date, priority and status
- Quick add bar with shortcuts: `Send invoice @tomorrow !high`
  - `@today`, `@tomorrow` or `@2026-12-31` sets the due date
  - `!high`, `!medium` or `!low` sets the priority
- Due-date badges that read naturally: "Due today", "Due tomorrow", "3 days overdue", with overdue cards marked on the left edge

**Board**
- To do, In progress and Done columns
- Drag and drop between columns, with a drop indicator, and reorder within a column
- Arrow buttons on every card, so moving tasks works on touch screens and with a keyboard
- Click a task to edit it, or use the checkbox to complete it

**Finding things**
- Search titles and notes
- Filter by status and priority, sort by manual order, due date, priority, title or newest
- Select a day in the calendar to show only the tasks due that day

**Calendar and progress**
- A real calendar for any month, starting on Monday, with today highlighted and a dot for each task due that day (red when overdue)
- "Coming up" list of your next deadlines
- Progress bar with overdue, due-today and done-this-week counts

**Safety net**
- Autosave to `localStorage`
- Undo for deletes, moves, edits, imports and more: use the Undo button on the toast, or press `Ctrl/⌘ + Z`
- Export and import tasks as JSON for backups or moving between devices
- Tasks stay in sync across open tabs

**Comfort**
- Light and dark themes, following your system by default and remembered once you choose
- Keyboard shortcuts: `N` new task, `/` search, `Esc` clears search or closes the dialog
- Accessible dialog, labelled controls, visible focus and reduced-motion support
- Responsive layout from phone to widescreen

## Run it locally

```bash
git clone https://github.com/yourusername/taskflow.git
cd taskflow
```

Open `index.html` in a browser. Because everything is static, any simple server also works:

```bash
python3 -m http.server 8000
```

## Deploy to GitHub Pages

The workflow in `.github/workflows/static.yml` publishes the repository to GitHub Pages on every push to `main`.

1. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`.
3. The site URL appears in the workflow run and under **Settings → Pages**.

## Project structure

```
TaskFlow/
├── .github/workflows/static.yml   # GitHub Pages deployment
├── index.html                     # Page structure
├── style.css                      # Themes, layout, components
├── script.js                      # App logic
└── README.md
```

## Data and privacy

- Everything lives in your browser's `localStorage` under the key `taskflow.v2`. Nothing is sent anywhere.
- Clearing site data or switching browsers or devices means starting fresh, so use **Export** (download icon) to back up and **Import** (upload icon) to restore. Importing replaces your current list, and you can undo it.
- If stored data is ever unreadable, a copy is kept under `taskflow.v2.backup` instead of being overwritten.
- The first visit loads a few sample tasks so the board isn't empty. Delete them whenever you like.

## Known limitations

- No sync between devices (use export and import)
- Drag and drop uses the browser's native API, which most mobile browsers don't support; the arrow buttons cover that
- Single user, no reminders or notifications

## Ideas for later

- Labels, subtasks and recurring tasks
- Multiple boards
- Optional cloud sync
- Reminders via the Notifications API

## License

MIT. Use it, change it, share it.
