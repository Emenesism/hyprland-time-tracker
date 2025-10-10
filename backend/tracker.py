"""
Hyprland/Wayland window tracker for the Time Tracker application
Monitors active windows and tracks application usage
"""
import subprocess
import json
import logging
import time
from datetime import datetime
from typing import Optional, Dict, Tuple
import threading

logger = logging.getLogger(__name__)
from database import normalize_app_name


class HyprlandTracker:
    """Tracks active windows in Hyprland/Wayland"""

    def __init__(self, database, poll_interval: int = 2):
        self.database = database
        self.poll_interval = poll_interval
        self.current_activity_id = None
        self.last_app_name = None
        self.last_window_title = None
        self.running = False
        self.thread = None

    def get_active_window(self) -> Optional[Tuple[str, str]]:
        """
        Get the currently active window using hyprctl
        Returns: (app_name, window_title) or None
        """
        try:
            # Get active window info from Hyprland
            result = subprocess.run(
                ['hyprctl', 'activewindow', '-j'],
                capture_output=True,
                text=True,
                timeout=1
            )

            if result.returncode == 0:
                data = json.loads(result.stdout)
                
                # Extract application name and window title
                app_class = data.get('class', 'Unknown')
                window_title = data.get('title', 'Unknown')
                
                # If no window is active (empty data or special cases)
                if not app_class or app_class == '':
                    return None
                
                return (app_class, window_title)
            else:
                logger.warning(f"hyprctl command failed: {result.stderr}")
                return None

        except subprocess.TimeoutExpired:
            logger.warning("hyprctl command timed out")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse hyprctl output: {e}")
            return None
        except FileNotFoundError:
            logger.error("hyprctl not found. Is Hyprland running?")
            return None
        except Exception as e:
            logger.error(f"Error getting active window: {e}")
            return None

    def check_idle(self) -> bool:
        """
        Check if the system is idle using Hyprland's idle info
        Returns: True if idle, False if active
        """
        try:
            # Get idle state from Hyprland
            result = subprocess.run(
                ['hyprctl', 'dispatch', 'exec', 'true'],
                capture_output=True,
                text=True,
                timeout=1
            )
            # If we can execute commands, system is not idle
            return False
        except Exception:
            # On error, assume not idle
            return False

    def start_tracking(self):
        """Start the tracking thread"""
        if self.running:
            logger.warning("Tracker is already running")
            return

        self.running = True
        self.thread = threading.Thread(target=self._tracking_loop, daemon=True)
        self.thread.start()
        logger.info("Tracker started")

    def stop_tracking(self):
        """Stop the tracking thread"""
        if not self.running:
            return

        self.running = False
        
        # End current activity if any
        if self.current_activity_id:
            self.database.end_activity(self.current_activity_id)
            self.current_activity_id = None

        if self.thread:
            self.thread.join(timeout=5)
        
        logger.info("Tracker stopped")

    def _tracking_loop(self):
        """Main tracking loop that runs in a separate thread"""
        logger.info("Tracking loop started")

        while self.running:
            try:
                # Get current active window
                window_info = self.get_active_window()

                if window_info:
                    raw_app, window_title = window_info

                    # Normalize app name so tabs/windows of same app are grouped
                    canonical_app = normalize_app_name(raw_app, window_title)

                    # Start a new activity only if the normalized app changed.
                    # Ignore window title changes (so different Chrome tabs stay as one "chrome").
                    if canonical_app != self.last_app_name:
                        # End previous activity
                        if self.current_activity_id:
                            self.database.end_activity(self.current_activity_id)
                            logger.info(f"Switched from {self.last_app_name}")

                        # Start new activity for the canonical app
                        self.current_activity_id = self.database.start_activity(
                            canonical_app, window_title
                        )
                        self.last_app_name = canonical_app
                        # Keep last_window_title updated but do not use it for change detection
                        self.last_window_title = window_title
                        
                        logger.info(f"Now tracking: {canonical_app} - {window_title}")
                    else:
                        # Same normalized app; update window title but keep same activity
                        self.last_window_title = window_title

                else:
                    # No active window, end current activity
                    if self.current_activity_id:
                        self.database.end_activity(self.current_activity_id)
                        self.current_activity_id = None
                        self.last_app_name = None
                        self.last_window_title = None
                        logger.info("No active window")

            except Exception as e:
                logger.error(f"Error in tracking loop: {e}")

            # Wait before next check
            time.sleep(self.poll_interval)

        logger.info("Tracking loop ended")

    def get_status(self) -> Dict:
        """Get current tracker status"""
        return {
            'running': self.running,
            'current_app': self.last_app_name,
            'current_window': self.last_window_title,
            'activity_id': self.current_activity_id
        }


# Alternative tracker using X11 for fallback (if Hyprland not available)
class X11Tracker:
    """Fallback tracker using X11 (for non-Wayland environments)"""

    def __init__(self, database, poll_interval: int = 2):
        self.database = database
        self.poll_interval = poll_interval
        self.current_activity_id = None
        self.last_app_name = None
        self.last_window_title = None
        self.running = False
        self.thread = None

    def get_active_window(self) -> Optional[Tuple[str, str]]:
        """Get active window using xdotool and xprop"""
        try:
            # Get active window ID
            result = subprocess.run(
                ['xdotool', 'getactivewindow'],
                capture_output=True,
                text=True,
                timeout=1
            )
            
            if result.returncode != 0:
                return None

            window_id = result.stdout.strip()

            # Get window class
            result = subprocess.run(
                ['xprop', '-id', window_id, 'WM_CLASS'],
                capture_output=True,
                text=True,
                timeout=1
            )
            
            app_class = 'Unknown'
            if result.returncode == 0:
                # Parse WM_CLASS output
                output = result.stdout.strip()
                if '=' in output:
                    class_str = output.split('=')[1].strip()
                    # Extract last class name
                    classes = class_str.strip('"').split('", "')
                    app_class = classes[-1] if classes else 'Unknown'

            # Get window title
            result = subprocess.run(
                ['xdotool', 'getwindowname', window_id],
                capture_output=True,
                text=True,
                timeout=1
            )
            
            window_title = result.stdout.strip() if result.returncode == 0 else 'Unknown'

            return (app_class, window_title)

        except Exception as e:
            logger.error(f"Error getting active window (X11): {e}")
            return None

    # Implement the same interface as HyprlandTracker
    def start_tracking(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._tracking_loop, daemon=True)
        self.thread.start()
        logger.info("X11 Tracker started")

    def stop_tracking(self):
        if not self.running:
            return
        self.running = False
        if self.current_activity_id:
            self.database.end_activity(self.current_activity_id)
            self.current_activity_id = None
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("X11 Tracker stopped")

    def _tracking_loop(self):
        while self.running:
            try:
                window_info = self.get_active_window()
                if window_info:
                    raw_app, window_title = window_info
                    canonical_app = normalize_app_name(raw_app, window_title)
                    if canonical_app != self.last_app_name:
                        if self.current_activity_id:
                            self.database.end_activity(self.current_activity_id)
                        self.current_activity_id = self.database.start_activity(
                            canonical_app, window_title
                        )
                        self.last_app_name = canonical_app
                        self.last_window_title = window_title
                        logger.info(f"Tracking: {canonical_app} - {window_title}")
                    else:
                        # same normalized app; just update title
                        self.last_window_title = window_title
            except Exception as e:
                logger.error(f"Error in X11 tracking loop: {e}")
            time.sleep(self.poll_interval)

    def get_status(self) -> Dict:
        return {
            'running': self.running,
            'current_app': self.last_app_name,
            'current_window': self.last_window_title,
            'activity_id': self.current_activity_id
        }


def create_tracker(database, poll_interval: int = 2):
    """
    Factory function to create the appropriate tracker
    Tries Hyprland first, falls back to X11
    """
    # Check if Hyprland is available
    try:
        result = subprocess.run(
            ['hyprctl', 'version'],
            capture_output=True,
            timeout=1
        )
        if result.returncode == 0:
            logger.info("Using Hyprland tracker")
            return HyprlandTracker(database, poll_interval)
    except Exception:
        pass

    # Fall back to X11
    try:
        result = subprocess.run(
            ['xdotool', 'version'],
            capture_output=True,
            timeout=1
        )
        if result.returncode == 0:
            logger.info("Using X11 tracker (fallback)")
            return X11Tracker(database, poll_interval)
    except Exception:
        pass

    logger.error("No compatible window tracker found!")
    raise RuntimeError(
        "Could not initialize window tracker. "
        "Please ensure you're running Hyprland or have xdotool installed."
    )
