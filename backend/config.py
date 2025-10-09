"""
Configuration settings for the Time Tracker application
"""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent

# Database configuration
DB_PATH = BASE_DIR / "timetracker.db"

# API configuration
API_HOST = "0.0.0.0"
API_PORT = 8000

# Tracker configuration
TRACKER_POLL_INTERVAL = 2  # seconds between checks
IDLE_TIMEOUT = 300  # seconds of inactivity before considering idle (5 minutes)

# Application settings
APP_NAME = "Time Tracker"
APP_VERSION = "1.0.0"

# Frontend configuration
FRONTEND_BUILD_PATH = BASE_DIR.parent / "frontend" / "dist"

# Logging configuration
LOG_LEVEL = "INFO"
LOG_FILE = BASE_DIR / "timetracker.log"
