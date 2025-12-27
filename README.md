# Time Tracker for Arch Linux + Hyprland

A privacy-first time tracking app for Hyprland/Wayland. It runs as a user systemd
service, stores everything locally in SQLite, and serves a React dashboard.

## Features

- Automatic active-window tracking (Hyprland via `hyprctl`, X11 fallback supported)
- Local storage with SQLite (no remote telemetry)
- FastAPI backend with REST endpoints and `/docs` API explorer
- Modern React dashboard with charts, tasks, and folder grouping
- systemd user service for auto-start

## Frontend options

This repo includes two frontends:

- **frontend-cute (default)**: cozy theme, theme switcher, animated stats, focus
  flow + focus garden views, and motivational quotes.
- **frontend**: the classic UI build.

The backend serves whichever frontend was built to `dist`.

## Quickstart (install + run)

From the repo root:

```bash
./install.sh
```

The installer:
- creates the Python virtual environment
- installs backend + frontend dependencies
- builds the selected frontend
- installs and enables `timetracker.service`

Open the dashboard at: http://localhost:8000

## Selecting a frontend

`install.sh` prefers `frontend-cute` when it exists. To force a different
frontend, set `FRONTEND_DIR`:

```bash
FRONTEND_DIR=/home/em/Desktop/Tracker/frontend ./install.sh
```

The installer writes `FRONTEND_BUILD_PATH` into the systemd service so the
backend serves the correct build output.

## Development

Run backend + frontend dev servers:

```bash
./dev.sh
```

Or run a specific frontend in dev mode:

```bash
cd frontend-cute
npm run dev
```

API docs: http://localhost:8000/docs

## Configuration & data

- Database: `backend/timetracker.db`
- Config: `backend/config.py`
- Frontend build path: `FRONTEND_BUILD_PATH` env var (set by `install.sh`)

Backup example:

```bash
cp backend/timetracker.db backend/backup_$(date +%Y%m%d).db
```

## Troubleshooting

- Service status and logs:
  ```bash
  systemctl --user status timetracker
  journalctl --user -u timetracker -f
  ```
- Frontend not loading: rebuild and restart
  ```bash
  cd frontend-cute
  npm install
  npm run build
  systemctl --user restart timetracker
  ```

## Project layout

```
Tracker/
├─ backend/
├─ frontend/           # classic UI
├─ frontend-cute/      # cozy UI
├─ timetracker.service
├─ install.sh
├─ uninstall.sh
└─ README.md
```

## License

MIT
