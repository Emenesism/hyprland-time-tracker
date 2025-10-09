"""
Database models and operations for the Time Tracker application
"""
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


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
        conn = self.get_connection()
        cursor = conn.cursor()

        now = datetime.now()
        date = now.strftime("%Y-%m-%d")

        cursor.execute("""
            INSERT INTO activities (app_name, window_title, start_time, date)
            VALUES (?, ?, ?, ?)
        """, (app_name, window_title, now, date))

        activity_id = cursor.lastrowid

        # Update or insert application
        cursor.execute("""
            INSERT INTO applications (app_name, last_used)
            VALUES (?, ?)
            ON CONFLICT(app_name) DO UPDATE SET
                last_used = ?
        """, (app_name, now, now))

        conn.commit()
        conn.close()

        logger.debug(f"Started activity {activity_id}: {app_name} - {window_title}")
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

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                app_name,
                COUNT(*) as session_count,
                SUM(duration) as total_duration,
                AVG(duration) as avg_duration,
                MIN(start_time) as first_used,
                MAX(end_time) as last_used
            FROM activities
            WHERE date = ? AND duration IS NOT NULL
            GROUP BY app_name
            ORDER BY total_duration DESC
        """, (date,))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def get_weekly_stats(self, start_date: Optional[str] = None) -> List[Dict]:
        """Get statistics for the past week"""
        if start_date is None:
            start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                date,
                app_name,
                SUM(duration) as total_duration,
                COUNT(*) as session_count
            FROM activities
            WHERE date >= ? AND duration IS NOT NULL
            GROUP BY date, app_name
            ORDER BY date DESC, total_duration DESC
        """, (start_date,))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def get_timeline(self, date: Optional[str] = None, limit: int = 100) -> List[Dict]:
        """Get activity timeline for a specific day"""
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")

        conn = self.get_connection()
        cursor = conn.cursor()

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

        return [dict(row) for row in rows]

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

        return [dict(row) for row in rows]

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

        return [dict(row) for row in rows]

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

        # Total applications
        cursor.execute("SELECT COUNT(*) as count FROM applications")
        total_apps = cursor.fetchone()['count']

        # Total activities
        cursor.execute("SELECT COUNT(*) as count FROM activities")
        total_activities = cursor.fetchone()['count']

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
