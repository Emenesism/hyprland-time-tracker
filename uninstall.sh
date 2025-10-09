#!/bin/bash

# Uninstallation script for Time Tracker

set -e

echo "=========================================="
echo "Time Tracker Uninstallation"
echo "=========================================="
echo ""

read -p "Are you sure you want to uninstall Time Tracker? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstallation cancelled."
    exit 0
fi

echo ""
echo "Stopping and removing systemd service..."

# Stop the service
if systemctl --user is-active --quiet timetracker.service; then
    systemctl --user stop timetracker.service
    echo "✓ Service stopped"
fi

# Disable the service
if systemctl --user is-enabled --quiet timetracker.service; then
    systemctl --user disable timetracker.service
    echo "✓ Service disabled"
fi

# Remove service file
SERVICE_FILE="$HOME/.config/systemd/user/timetracker.service"
if [ -f "$SERVICE_FILE" ]; then
    rm "$SERVICE_FILE"
    echo "✓ Service file removed"
fi

# Reload systemd
systemctl --user daemon-reload

echo ""
read -p "Do you want to remove the database and all tracked data? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    DB_FILE="$SCRIPT_DIR/backend/timetracker.db"
    if [ -f "$DB_FILE" ]; then
        rm "$DB_FILE"
        echo "✓ Database removed"
    fi
else
    echo "Database preserved at: backend/timetracker.db"
fi

echo ""
echo "=========================================="
echo "Uninstallation Complete!"
echo "=========================================="
echo ""
echo "The Time Tracker service has been removed."
echo "You can manually delete the project directory if desired:"
echo "  rm -rf $(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo ""
