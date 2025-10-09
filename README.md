# Time Tracker for Arch Linux + Hyprland

A beautiful, privacy-focused time tracking application designed for Arch Linux with Hyprland/Wayland compositor.

## Features

- 🎯 **Automatic Tracking**: Tracks all applications and active windows under Hyprland/Wayland
- 📊 **Beautiful Dashboard**: Modern React frontend with interactive charts and timelines
- 💾 **Local Storage**: All data stored locally in SQLite3 database
- 🚀 **Background Service**: Runs automatically on startup via systemd
- 📈 **Analytics**: Daily/weekly timelines, time spent per app, productivity graphs
- 🔒 **Privacy First**: All data stays on your machine

## Architecture

- **Backend**: FastAPI (Python) - REST API and data collection
- **Frontend**: React + Vite + Recharts - Beautiful, responsive UI
- **Database**: SQLite3 - Local data storage
- **Tracker**: Python daemon monitoring Hyprland windows
- **Service**: systemd user service for automatic startup

## Prerequisites

```bash
# Install required system packages
sudo pacman -S python python-pip sqlite nodejs npm

# Install Hyprland (if not already installed)
sudo pacman -S hyprland
```

## Installation

### 1. Clone/Navigate to the project directory
```bash
cd /home/em/Desktop/Tracker
```

### 2. Set up the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Set up the Frontend
```bash
cd ../frontend
npm install
npm run build
```

### 4. Install the systemd service
```bash
cd ..
./install.sh
```

This will:
- Install the systemd user service
- Enable it to start on boot
- Start the service immediately

## Usage

### Starting/Stopping the Service

```bash
# Start the tracker
systemctl --user start timetracker

# Stop the tracker
systemctl --user stop timetracker

# Check status
systemctl --user status timetracker

# View logs
journalctl --user -u timetracker -f
```

### Accessing the Dashboard

Open your browser and navigate to:
```
http://localhost:8000
```

The backend API documentation is available at:
```
http://localhost:8000/docs
```

### Manual Running (Development)

**Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
```

**Frontend (Development Mode):**
```bash
cd frontend
npm run dev
```

## API Endpoints

- `GET /api/stats/daily` - Get daily statistics
- `GET /api/stats/weekly` - Get weekly statistics
- `GET /api/timeline` - Get activity timeline
- `GET /api/applications` - Get all tracked applications
- `GET /api/activities` - Get activity log with filters
- `GET /api/stats/summary` - Get summary statistics

## Project Structure

```
Tracker/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── tracker.py           # Hyprland window tracker
│   ├── database.py          # Database models and operations
│   ├── config.py            # Configuration
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── components/     # React components
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   └── vite.config.js
├── timetracker.service      # systemd service file
├── install.sh               # Installation script
└── README.md
```

## Configuration

Edit `backend/config.py` to customize:
- Database location
- API port
- Tracker polling interval
- Idle timeout detection

## Troubleshooting

### Service not starting
```bash
# Check logs
journalctl --user -u timetracker -n 50

# Verify Python environment
cd backend
source venv/bin/activate
python -c "import fastapi; print('OK')"
```

### Tracker not detecting windows
```bash
# Verify Hyprland is running
echo $HYPRLAND_INSTANCE_SIGNATURE

# Test hyprctl command
hyprctl activewindow
```

### Frontend not loading
```bash
# Rebuild frontend
cd frontend
npm run build
```

## Uninstallation

```bash
# Stop and disable service
systemctl --user stop timetracker
systemctl --user disable timetracker

# Remove service file
rm ~/.config/systemd/user/timetracker.service

# Reload systemd
systemctl --user daemon-reload

# Optionally, remove the project directory
# rm -rf /home/em/Desktop/Tracker
```

## License

MIT License - Feel free to modify and use as needed.

## Contributing

This is a personal project, but feel free to fork and customize for your needs!
