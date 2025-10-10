"""
Database models and operations for the Time Tracker application
"""
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def normalize_app_name(app_name: str, window_title: str = None) -> str:
    """Normalize application names so similar windows are grouped.

    Examples:
    - any Chrome/Chromium/Brave -> 'chrome'
    - VSCode/Visual Studio Code -> 'code'
    - firefox -> 'firefox'
    - terminals -> 'terminal'
    Falls back to the original app_name when no rule matches.
    """
    if not app_name:
        return 'unknown'

    s = app_name.lower()

    # Browsers
    if 'chrome' in s or 'chromium' in s or 'brave' in s or 'google-chrome' in s:
        return 'chrome'
    if 'firefox' in s:
        return 'firefox'

    # VSCode / Visual Studio Code
    if 'code' in s or 'visual studio' in s or 'vscode' in s:
        return 'code'

    # Terminals
    if 'kitty' in s or 'alacritty' in s or 'gnome-terminal' in s or 'konsole' in s or 'terminal' in s:
        return 'terminal'

    # Fallback: try to clean common suffixes/prefixes
    cleaned = s.strip()
    if cleaned:
        return cleaned

    return app_name


class Database:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        """Get a database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initialize the database with required tables"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Activities table - stores time tracking data
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_name TEXT NOT NULL,
                window_title TEXT,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                duration INTEGER,
                date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Applications table - stores unique applications
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_name TEXT UNIQUE NOT NULL,
                category TEXT,
                total_time INTEGER DEFAULT 0,
                last_used TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create indexes for better query performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_activities_date 
            ON activities(date)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_activities_app 
            ON activities(app_name)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_activities_start 
            ON activities(start_time)
        """)

        conn.commit()
        conn.close()
        logger.info(f"Database initialized at {self.db_path}")

    def start_activity(self, app_name: str, window_title: str) -> int:
        """Start tracking a new activity"""
        # Normalize app name so similar windows are grouped (e.g., Chrome tabs -> chrome)
        canonical_app = normalize_app_name(app_name, window_title)

        conn = self.get_connection()
        cursor = conn.cursor()

        now = datetime.now()
        date = now.strftime("%Y-%m-%d")

        cursor.execute("""
            INSERT INTO activities (app_name, window_title, start_time, date)
            VALUES (?, ?, ?, ?)
        """, (canonical_app, window_title, now, date))

        activity_id = cursor.lastrowid

        # Update or insert application
        cursor.execute("""
            INSERT INTO applications (app_name, last_used)
            VALUES (?, ?)
            ON CONFLICT(app_name) DO UPDATE SET
                last_used = ?
        """, (canonical_app, now, now))

        conn.commit()
        conn.close()

        logger.debug(f"Started activity {activity_id}: {canonical_app} - {window_title}")
        return activity_id

    def end_activity(self, activity_id: int):
        """End tracking for an activity"""
        conn = self.get_connection()
        cursor = conn.cursor()

        now = datetime.now()

        cursor.execute("""
            UPDATE activities
            SET end_time = ?,
                duration = (julianday(?) - julianday(start_time)) * 86400
            WHERE id = ? AND end_time IS NULL
        """, (now, now, activity_id))

        # Get the activity details to update application total time
        cursor.execute("""
            SELECT app_name, duration FROM activities WHERE id = ?
        """, (activity_id,))
        
        row = cursor.fetchone()
        if row:
            app_name = row['app_name']
            duration = row['duration']
            
            if duration:
                cursor.execute("""
                    UPDATE applications
                    SET total_time = total_time + ?
                    WHERE app_name = ?
                """, (int(duration), app_name))

        conn.commit()
        conn.close()

        logger.debug(f"Ended activity {activity_id}")

    def get_active_activity(self) -> Optional[Dict]:
        """Get the currently active activity"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM activities
            WHERE end_time IS NULL
            ORDER BY start_time DESC
            LIMIT 1
        """)

        row = cursor.fetchone()
        conn.close()

        if row:
            return dict(row)
        return None

    def get_daily_stats(self, date: Optional[str] = None) -> List[Dict]:
        """Get statistics for a specific day"""
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        # Fetch raw activity rows and aggregate in Python after normalizing app names
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT app_name, duration, start_time, end_time
            FROM activities
            WHERE date = ? AND duration IS NOT NULL
        """, (date,))

        rows = cursor.fetchall()

        agg: Dict[str, Dict] = {}
        for row in rows:
            raw_app = row['app_name']
            # window_title is not selected in this query, pass only raw_app
            norm = normalize_app_name(raw_app)
            duration = row['duration'] or 0
            start = row['start_time']
            end = row['end_time']

            if norm not in agg:
                agg[norm] = {
                    'app_name': norm,
                    'session_count': 0,
                    'total_duration': 0,
                    'first_used': start,
                    'last_used': end
                }

            entry = agg[norm]
            entry['session_count'] += 1
            entry['total_duration'] += duration
            # first_used is earliest start
            if start and (entry['first_used'] is None or start < entry['first_used']):
                entry['first_used'] = start
            # last_used is latest end
            if end and (entry['last_used'] is None or end > entry['last_used']):
                entry['last_used'] = end

        conn.close()

        # Compute average and prepare list
        results: List[Dict] = []
        for v in agg.values():
            avg = int(v['total_duration'] / v['session_count']) if v['session_count'] > 0 else 0
            results.append({
                'app_name': v['app_name'],
                'session_count': v['session_count'],
                'total_duration': v['total_duration'],
                'avg_duration': avg,
                'first_used': v['first_used'],
                'last_used': v['last_used']
            })

        results.sort(key=lambda x: x['total_duration'], reverse=True)
        return results

    def get_weekly_stats(self, start_date: Optional[str] = None) -> List[Dict]:
        """Get statistics for the past week"""
        if start_date is None:
            start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT date, app_name, duration
            FROM activities
            WHERE date >= ? AND duration IS NOT NULL
        """, (start_date,))

        rows = cursor.fetchall()
        conn.close()

        grouped: Dict[str, Dict[str, Dict]] = {}
        for row in rows:
            date = row['date']
            raw_app = row['app_name']
            norm = normalize_app_name(raw_app)
            duration = row['duration'] or 0

            if date not in grouped:
                grouped[date] = {}
            if norm not in grouped[date]:
                grouped[date][norm] = {'date': date, 'app_name': norm, 'total_duration': 0, 'session_count': 0}

            grouped[date][norm]['total_duration'] += duration
            grouped[date][norm]['session_count'] += 1

        results: List[Dict] = []
        for date, apps in grouped.items():
            for app_stat in apps.values():
                results.append(app_stat)

        # Order by date desc then total_duration desc similar to previous behavior
        results.sort(key=lambda x: (x['date'], x['total_duration']), reverse=True)
        return results

    def get_timeline(self, date: Optional[str] = None, limit: Optional[int] = None) -> List[Dict]:
        """Get activity timeline for a specific day"""
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")

        conn = self.get_connection()
        cursor = conn.cursor()

        if limit is None:
            cursor.execute("""
                SELECT 
                    id,
                    app_name,
                    window_title,
                    start_time,
                    end_time,
                    duration,
                    date
                FROM activities
                WHERE date = ?
                ORDER BY start_time DESC
            """, (date,))
        else:
            cursor.execute("""
                SELECT 
                    id,
                    app_name,
                    window_title,
                    start_time,
                    end_time,
                    duration,
                    date
                FROM activities
                WHERE date = ?
                ORDER BY start_time DESC
                LIMIT ?
            """, (date, limit))

        rows = cursor.fetchall()
        conn.close()

        result = []
        for row in rows:
            r = dict(row)
            # sqlite3.Row doesn't have get(), use dict keys
            r['app_name'] = normalize_app_name(row['app_name'], row['window_title'])
            result.append(r)
        return result

    def get_all_applications(self) -> List[Dict]:
        """Get all tracked applications with their statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                app_name,
                category,
                total_time,
                last_used
            FROM applications
            ORDER BY total_time DESC
        """)

        rows = cursor.fetchall()
        conn.close()

        agg: Dict[str, Dict] = {}
        for row in rows:
            raw_app = row['app_name']
            norm = normalize_app_name(raw_app)
            total = row['total_time'] or 0
            last = row['last_used']
            category = row['category']

            if norm not in agg:
                agg[norm] = {'app_name': norm, 'category': category, 'total_time': 0, 'last_used': last}

            agg[norm]['total_time'] += total
            # latest last_used
            if last and (agg[norm]['last_used'] is None or last > agg[norm]['last_used']):
                agg[norm]['last_used'] = last

        results = list(agg.values())
        results.sort(key=lambda x: x['total_time'], reverse=True)
        return results

    def get_activities(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        app_name: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict]:
        """Get activities with optional filters"""
        conn = self.get_connection()
        cursor = conn.cursor()

        query = """
            SELECT 
                id,
                app_name,
                window_title,
                start_time,
                end_time,
                duration,
                date
            FROM activities
            WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND date >= ?"
            params.append(start_date)

        if end_date:
            query += " AND date <= ?"
            params.append(end_date)

        if app_name:
            query += " AND app_name = ?"
            params.append(app_name)

        query += " ORDER BY start_time DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        result = []
        for row in rows:
            r = dict(row)
            r['app_name'] = normalize_app_name(row['app_name'], row['window_title'])
            result.append(r)
        return result

    def get_summary_stats(self) -> Dict:
        """Get overall summary statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Total tracked time
        cursor.execute("""
            SELECT SUM(duration) as total_time
            FROM activities
            WHERE duration IS NOT NULL
        """)
        total_time = cursor.fetchone()['total_time'] or 0

        # Total activities
        cursor.execute("SELECT COUNT(*) as count FROM activities")
        total_activities = cursor.fetchone()['count']

        # Unique applications based on normalized app name (from activities)
        cursor.execute("SELECT app_name FROM activities WHERE duration IS NOT NULL")
        rows = cursor.fetchall()
        apps_set = set()
        for r in rows:
            apps_set.add(normalize_app_name(r['app_name']))

        total_apps = len(apps_set)

        # Today's time
        today = datetime.now().strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT SUM(duration) as today_time
            FROM activities
            WHERE date = ? AND duration IS NOT NULL
        """, (today,))
        today_time = cursor.fetchone()['today_time'] or 0

        # This week's time
        week_start = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT SUM(duration) as week_time
            FROM activities
            WHERE date >= ? AND duration IS NOT NULL
        """, (week_start,))
        week_time = cursor.fetchone()['week_time'] or 0

        conn.close()

        return {
            'total_time': int(total_time),
            'total_applications': total_apps,
            'total_activities': total_activities,
            'today_time': int(today_time),
            'week_time': int(week_time)
        }

    def cleanup_old_data(self, days: int = 90):
        """Remove data older than specified days"""
        cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM activities
            WHERE date < ?
        """, (cutoff_date,))

        deleted = cursor.rowcount
        conn.commit()
        conn.close()

        logger.info(f"Cleaned up {deleted} old activities")
        return deleted
