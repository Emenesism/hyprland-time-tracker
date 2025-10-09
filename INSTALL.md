# 🚀 Installation & Setup Instructions

Welcome to Time Tracker! Follow these steps to get your time tracking system up and running.

## 📋 Prerequisites

Before installation, ensure you have the following:

### Required Packages
```bash
# Update system
sudo pacman -Syu

# Install required packages
sudo pacman -S python python-pip sqlite nodejs npm

# Verify installations
python --version    # Should be Python 3.10+
node --version      # Should be Node 18+
npm --version       # Should be npm 9+
```

### Window Tracker (Choose One)

**Option 1: Hyprland (Recommended)**
```bash
# If you're running Hyprland, hyprctl should already be available
hyprctl version

# Verify Hyprland environment variable
echo $HYPRLAND_INSTANCE_SIGNATURE
```

**Option 2: X11 Fallback**
```bash
# If not using Hyprland, install xdotool
sudo pacman -S xdotool xprop

# Test xdotool
xdotool version
```

## 🔧 Installation Steps

### Step 1: Navigate to Project Directory
```bash
cd /home/em/Desktop/Tracker
```

### Step 2: Run Installation Script
```bash
./install.sh
```

The installation script will:
1. ✓ Create Python virtual environment
2. ✓ Install Python dependencies (FastAPI, Uvicorn, etc.)
3. ✓ Install Node.js dependencies (React, Vite, Recharts)
4. ✓ Build the React frontend for production
5. ✓ Install systemd user service
6. ✓ Enable auto-start on boot
7. ✓ Start the service immediately

**Expected Output:**
```
==========================================
Time Tracker Installation
==========================================

Checking for required dependencies...
✓ Hyprland detected

Step 1: Setting up Python backend...
Creating Python virtual environment...
Installing Python dependencies...
✓ Backend setup complete

Step 2: Setting up React frontend...
Installing npm dependencies...
Building frontend for production...
✓ Frontend build complete

Step 3: Installing systemd service...
✓ Systemd service installed and enabled

Step 4: Starting the service...
✓ Service started successfully

==========================================
Installation Complete!
==========================================

Access the dashboard at: http://localhost:8000
```

### Step 3: Verify Installation
```bash
./test.sh
```

This will run comprehensive tests to ensure everything is working correctly.

**Expected Test Results:**
```
==========================================
Time Tracker Test Suite
==========================================

Test 1: Python installation
✓ Python installed: Python 3.11.5

Test 2: Virtual environment
✓ Virtual environment exists

Test 3: Python dependencies
✓ fastapi installed
✓ uvicorn installed
✓ pydantic installed

Test 4: Node.js installation
✓ Node.js installed: v20.9.0
✓ npm installed: 10.1.0

Test 5: Frontend build
✓ Frontend build exists
✓ Frontend index.html exists

Test 6: Window tracker
✓ hyprctl found (Hyprland tracker available)
✓ Hyprland is running

Test 7: Systemd service
✓ Systemd service file installed
✓ Service is enabled
✓ Service is running

Test 8: Database
✓ Database file exists
✓ Database is accessible

Test 9: API connectivity
✓ API is responding
✓ API health check passed

==========================================
Test Summary
==========================================
Passed: 17
Failed: 0

All critical tests passed! ✓
```

## 🌐 Accessing the Dashboard

### Open in Browser
```bash
# The dashboard is now available at:
http://localhost:8000

# Or use xdg-open to launch your default browser
xdg-open http://localhost:8000
```

### What You'll See
1. **Header** - Shows Time Tracker logo and current tracking status
2. **Navigation** - Four tabs: Overview, Daily, Weekly, Applications
3. **Overview Tab** - Quick stats and today's charts
4. **Dashboard** - Beautiful, interactive visualizations

## 🎯 First Use

### The tracker starts automatically!

Once installed, the tracker:
- ✓ Monitors your active windows
- ✓ Records application usage
- ✓ Stores data in SQLite database
- ✓ Updates the dashboard in real-time

### Check Tracking Status

The header shows a status indicator:
- 🟢 **Green dot + app name** = Currently tracking
- 🔴 **Red dot + "Inactive"** = Not tracking

### View Your Data

1. **Overview Tab**
   - Total time tracked
   - Today's activity summary
   - Top applications chart
   - Time distribution pie chart

2. **Daily Tab**
   - Select any date to view
   - Timeline of activities
   - Session statistics per app
   - Total time breakdown

3. **Weekly Tab**
   - 7-day activity trend line
   - Daily breakdown by application
   - Week-at-a-glance view

4. **Applications Tab**
   - All tracked applications
   - Total time spent in each
   - Last used timestamps
   - Card-based grid view

## 🔄 Service Management

### Check Service Status
```bash
systemctl --user status timetracker
```

### View Live Logs
```bash
journalctl --user -u timetracker -f
```

### Restart Service
```bash
systemctl --user restart timetracker
```

### Stop Service
```bash
systemctl --user stop timetracker
```

### Start Service
```bash
systemctl --user start timetracker
```

### Disable Auto-Start
```bash
systemctl --user disable timetracker
```

### Re-enable Auto-Start
```bash
systemctl --user enable timetracker
```

## 🛠️ Development Mode

If you want to develop or modify the application:

### Run Development Server
```bash
./dev.sh
```

This starts:
- **Backend**: http://localhost:8000 (with auto-reload)
- **Frontend**: http://localhost:5173 (with hot module replacement)

In development mode:
- Changes to Python files auto-reload the backend
- Changes to React files hot-reload in the browser
- Frontend proxies API requests to backend

### Stop Development Servers
Press `Ctrl+C` in the terminal running `dev.sh`

## 📊 Understanding Your Data

### Time Formats
- **Hours**: `2h 30m` = 2 hours 30 minutes
- **Minutes**: `45m 12s` = 45 minutes 12 seconds
- **Seconds**: `30s` = 30 seconds

### Activity Sessions
- Each window switch creates a new session
- Sessions track start time, end time, and duration
- Current session has no end time (still active)

### Statistics
- **Total Time**: All time tracked since installation
- **Today's Activity**: Time tracked today (resets at midnight)
- **This Week**: Last 7 days of activity
- **Session Count**: Number of times you used an app

## 🗄️ Database Location

Your data is stored locally at:
```bash
/home/em/Desktop/Tracker/backend/timetracker.db
```

### Backup Your Data
```bash
# Create a backup
cp backend/timetracker.db backend/backup_$(date +%Y%m%d).db

# Or use the full path
cp /home/em/Desktop/Tracker/backend/timetracker.db ~/timetracker_backup.db
```

### Restore from Backup
```bash
# Stop the service first
systemctl --user stop timetracker

# Restore the database
cp ~/timetracker_backup.db backend/timetracker.db

# Start the service
systemctl --user start timetracker
```

## 🔧 Configuration

Edit `backend/config.py` to customize:

```python
# How often to check for window changes (seconds)
TRACKER_POLL_INTERVAL = 2

# Port for the web interface
API_PORT = 8000

# Database location
DB_PATH = BASE_DIR / "timetracker.db"

# Consider system idle after this many seconds
IDLE_TIMEOUT = 300
```

After changing configuration:
```bash
systemctl --user restart timetracker
```

## 🔍 Troubleshooting

### Service Won't Start

**Check the logs:**
```bash
journalctl --user -u timetracker -n 50
```

**Common issues:**
- Port 8000 already in use: Change `API_PORT` in config.py
- Python dependencies missing: Re-run `install.sh`
- Virtual environment broken: Delete `backend/venv` and re-run `install.sh`

### Tracker Not Detecting Windows

**For Hyprland:**
```bash
# Verify Hyprland is running
echo $HYPRLAND_INSTANCE_SIGNATURE

# Test hyprctl manually
hyprctl activewindow -j
```

**For X11:**
```bash
# Install xdotool if missing
sudo pacman -S xdotool

# Test xdotool manually
xdotool getactivewindow
```

### Frontend Not Loading

**Rebuild the frontend:**
```bash
cd frontend
npm install
npm run build
systemctl --user restart timetracker
```

### Database Errors

**Check database integrity:**
```bash
cd backend
source venv/bin/activate
python -c "from database import Database; from config import DB_PATH; db = Database(DB_PATH); print('OK')"
```

**Reset database (⚠️ DELETES ALL DATA):**
```bash
systemctl --user stop timetracker
rm backend/timetracker.db
systemctl --user start timetracker
```

## 🗑️ Uninstallation

To remove Time Tracker:

```bash
./uninstall.sh
```

This will:
1. Stop the service
2. Disable auto-start
3. Remove systemd service file
4. Optionally delete the database

To completely remove the project:
```bash
./uninstall.sh
cd ..
rm -rf Tracker
```

## 📚 Additional Resources

- **README.md** - Project overview and features
- **QUICKSTART.md** - Quick reference guide
- **ARCHITECTURE.md** - Technical architecture details
- **API Docs** - http://localhost:8000/docs (when running)

## 💡 Tips for Best Results

1. **Let it run continuously** - The longer it runs, the better your data
2. **Check weekly stats** - Review your patterns every week
3. **Backup regularly** - Save your database periodically
4. **Monitor the logs** - Check for any errors occasionally
5. **Customize polling interval** - Adjust based on your needs (1-5 seconds recommended)

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs**
   ```bash
   journalctl --user -u timetracker -n 100
   ```

2. **Run the test script**
   ```bash
   ./test.sh
   ```

3. **Verify dependencies**
   ```bash
   python --version
   node --version
   hyprctl version  # or xdotool version
   ```

4. **Check service status**
   ```bash
   systemctl --user status timetracker
   ```

5. **Review the troubleshooting section** in QUICKSTART.md

## ✅ Post-Installation Checklist

- [ ] Installation script completed successfully
- [ ] Test script shows all tests passed
- [ ] Service is running (check with `systemctl --user status timetracker`)
- [ ] Dashboard loads at http://localhost:8000
- [ ] Tracker status shows green indicator with current app
- [ ] Can see activities being tracked in real-time
- [ ] Charts and statistics are displaying
- [ ] Service enabled for auto-start on boot

## 🎉 You're All Set!

Your Time Tracker is now installed and running. It will:
- ✓ Start automatically when you log in
- ✓ Track all your applications silently in the background
- ✓ Store data securely on your local machine
- ✓ Provide beautiful visualizations of your time usage

**Enjoy your new time tracking system!**

Visit http://localhost:8000 to start exploring your activity data.
