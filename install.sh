#!/bin/bash

# Installation script for Time Tracker
# This script sets up the backend, frontend, and systemd service

set -e  # Exit on error

echo "=========================================="
echo "Time Tracker Installation"
echo "=========================================="
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR_ENV="${FRONTEND_DIR:-}"
if [ -n "$FRONTEND_DIR_ENV" ]; then
    FRONTEND_DIR="$FRONTEND_DIR_ENV"
elif [ -d "$SCRIPT_DIR/frontend-cute" ]; then
    FRONTEND_DIR="$SCRIPT_DIR/frontend-cute"
else
    FRONTEND_DIR="$SCRIPT_DIR/frontend"
fi
FRONTEND_BUILD_PATH="$FRONTEND_DIR/dist"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Error: frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

# Check for required commands
echo "Checking for required dependencies..."
command -v python3 >/dev/null 2>&1 || { echo "Error: python3 is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required but not installed."; exit 1; }

# Check if hyprctl is available
if command -v hyprctl >/dev/null 2>&1; then
    echo "✓ Hyprland detected"
else
    echo "⚠ Warning: hyprctl not found. Make sure Hyprland is installed and running."
    echo "  Alternatively, install xdotool for X11 fallback: sudo pacman -S xdotool"
fi

echo ""
echo "Step 1: Setting up Python backend..."
cd "$BACKEND_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
else
    echo "Virtual environment already exists."
fi

# Activate virtual environment and install dependencies
echo "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "✓ Backend setup complete"
echo ""

echo "Step 2: Setting up React frontend..."
echo "Using frontend directory: $FRONTEND_DIR"
cd "$FRONTEND_DIR"

# Install Node.js dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
else
    echo "Node modules already installed. Running npm install to update..."
    npm install
fi

# Build the frontend
echo "Building frontend for production..."
npm run build

echo "✓ Frontend build complete"
echo ""

echo "Step 3: Installing systemd service..."

# Create systemd user directory if it doesn't exist
mkdir -p ~/.config/systemd/user

# Copy service file, replace %h with actual home directory, and set frontend build path
SERVICE_FILE="$SCRIPT_DIR/timetracker.service"
TARGET_SERVICE="$HOME/.config/systemd/user/timetracker.service"

awk -v build_path="$FRONTEND_BUILD_PATH" -v home="$HOME" '
    {
        gsub("%h", home)
    }
    /^\[Install\]/ && !added {
        print "Environment=\"FRONTEND_BUILD_PATH=" build_path "\""
        added=1
    }
    { print }
    END {
        if (!added) {
            print "Environment=\"FRONTEND_BUILD_PATH=" build_path "\""
        }
    }
' "$SERVICE_FILE" > "$TARGET_SERVICE"

# Reload systemd daemon
systemctl --user daemon-reload

# Enable the service to start on boot
systemctl --user enable timetracker.service

echo "✓ Systemd service installed and enabled"
echo ""

echo "Step 4: Starting the service..."
systemctl --user start timetracker.service

# Wait a moment for service to start
sleep 2

# Check service status
if systemctl --user is-active --quiet timetracker.service; then
    echo "✓ Service started successfully"
else
    echo "⚠ Warning: Service may not have started properly"
    echo "  Check status with: systemctl --user status timetracker"
fi

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "The Time Tracker is now running and will start automatically on boot."
echo ""
echo "Access the dashboard at: http://localhost:8000"
echo "API documentation at: http://localhost:8000/docs"
echo ""
echo "Useful commands:"
echo "  systemctl --user status timetracker    # Check service status"
echo "  systemctl --user stop timetracker      # Stop the service"
echo "  systemctl --user start timetracker     # Start the service"
echo "  systemctl --user restart timetracker   # Restart the service"
echo "  journalctl --user -u timetracker -f    # View live logs"
echo ""
echo "Enjoy tracking your time! 🚀"
