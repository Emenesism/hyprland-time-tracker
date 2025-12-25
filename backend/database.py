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
    DEFAULT_FOLDER_NAME = "Unsorted"

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.init_db()
        self.default_folder_id = self.ensure_folder_support()

    def get_connection(self):
        """Get a database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initialize the database with required tables"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Folders table - groups tasks/projects
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Tasks table - stores user-defined tasks/projects
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                folder_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
            )
        """)

        # Activities table - stores time tracking data
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                app_name TEXT NOT NULL,
                window_title TEXT,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                duration INTEGER,
                date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
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
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_activities_task 
            ON activities(task_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_tasks_folder
            ON tasks(folder_id)
        """)

        conn.commit()
        conn.close()
        logger.info(f"Database initialized at {self.db_path}")

    def ensure_folder_support(self) -> int:
        """Ensure folder table, default folder and column relationships exist"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Ensure folders table exists (idempotent)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Ensure tasks table has folder_id column for legacy databases
        cursor.execute("PRAGMA table_info(tasks)")
        columns = {row['name'] for row in cursor.fetchall()}
        if 'folder_id' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN folder_id INTEGER")

        # Create default folder if missing
        cursor.execute("SELECT id FROM folders WHERE name = ?", (self.DEFAULT_FOLDER_NAME,))
        row = cursor.fetchone()
        if row:
            default_folder_id = row['id']
        else:
            cursor.execute("INSERT INTO folders (name) VALUES (?)", (self.DEFAULT_FOLDER_NAME,))
            default_folder_id = cursor.lastrowid

        # Assign existing tasks without a folder to the default
        cursor.execute("""
            UPDATE tasks
            SET folder_id = ?
            WHERE folder_id IS NULL
        """, (default_folder_id,))

        conn.commit()
        conn.close()
        return default_folder_id

    def create_task(self, title: str, description: str = None, folder_id: Optional[int] = None) -> int:
        """Create a new task"""
        conn = self.get_connection()
        cursor = conn.cursor()

        now = datetime.now()

        if folder_id is not None:
            cursor.execute("SELECT id FROM folders WHERE id = ?", (folder_id,))
            row = cursor.fetchone()
            target_folder_id = folder_id if row else self.default_folder_id
        else:
            target_folder_id = self.default_folder_id

        cursor.execute("""
            INSERT INTO tasks (title, description, folder_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (title, description, target_folder_id, now, now))

        task_id = cursor.lastrowid

        cursor.execute("""
            UPDATE folders
            SET updated_at = ?
            WHERE id = ?
        """, (now, target_folder_id))

        conn.commit()
        conn.close()

        logger.info(f"Created task {task_id}: {title}")
        return task_id

    def get_folders(self) -> List[Dict]:
        """Get all folders"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, created_at, updated_at
            FROM folders
            ORDER BY name COLLATE NOCASE
        """)

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def get_folder(self, folder_id: int) -> Optional[Dict]:
        """Retrieve a single folder"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, created_at, updated_at
            FROM folders
            WHERE id = ?
        """, (folder_id,))

        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def create_folder(self, name: str) -> int:
        """Create a new folder"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now()

        try:
            cursor.execute("""
                INSERT INTO folders (name, created_at, updated_at)
                VALUES (?, ?, ?)
            """, (name, now, now))
        except sqlite3.IntegrityError as exc:
            conn.rollback()
            conn.close()
            raise ValueError("Folder name must be unique") from exc

        folder_id = cursor.lastrowid
        conn.commit()
        conn.close()
        logger.info(f"Created folder {folder_id}: {name}")
        return folder_id

    def rename_folder(self, folder_id: int, name: str) -> bool:
        """Rename an existing folder"""
        if folder_id == self.default_folder_id:
            raise ValueError("Cannot rename the default folder")

        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now()

        cursor.execute("""
            UPDATE folders
            SET name = ?, updated_at = ?
            WHERE id = ?
        """, (name, now, folder_id))

        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return updated

    def delete_folder(self, folder_id: int) -> bool:
        """Delete a folder and move tasks to default"""
        if folder_id == self.default_folder_id:
            raise ValueError("Cannot delete the default folder")

        conn = self.get_connection()
        cursor = conn.cursor()

        # Reassign tasks
        cursor.execute("""
            UPDATE tasks
            SET folder_id = ?
            WHERE folder_id = ?
        """, (self.default_folder_id, folder_id))

        cursor.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
        deleted = cursor.rowcount > 0

        if deleted:
            cursor.execute("""
                UPDATE folders
                SET updated_at = ?
                WHERE id = ?
            """, (datetime.now(), self.default_folder_id))

        conn.commit()
        conn.close()
        if deleted:
            logger.info(f"Deleted folder {folder_id}, reassigned tasks to default")
        return deleted

    def move_task_to_folder(self, task_id: int, folder_id: int) -> bool:
        """Move task to a different folder"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT folder_id FROM tasks WHERE id = ?", (task_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False

        current_folder = row['folder_id']

        cursor.execute("SELECT id FROM folders WHERE id = ?", (folder_id,))
        target_row = cursor.fetchone()
        if not target_row:
            folder_id = self.default_folder_id

        now = datetime.now()

        cursor.execute("""
            UPDATE tasks
            SET folder_id = ?, updated_at = ?
            WHERE id = ?
        """, (folder_id, now, task_id))

        updated = cursor.rowcount > 0

        if updated:
            cursor.execute("""
                UPDATE folders
                SET updated_at = ?
                WHERE id = ?
            """, (now, folder_id))

            if current_folder and current_folder != folder_id:
                cursor.execute("""
                    UPDATE folders
                    SET updated_at = ?
                    WHERE id = ?
                """, (now, current_folder))

        conn.commit()
        conn.close()
        return updated

    def get_folders_with_stats(self) -> List[Dict]:
        """Return folders with aggregated task/time stats"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, created_at, updated_at
            FROM folders
        """)
        folders = [dict(row) for row in cursor.fetchall()]

        cursor.execute("""
            SELECT folder_id, COUNT(*) as task_count
            FROM tasks
            GROUP BY folder_id
        """)
        task_counts = {row['folder_id']: row['task_count'] for row in cursor.fetchall() if row['folder_id'] is not None}

        cursor.execute("""
            SELECT t.folder_id as folder_id, SUM(a.duration) as total_duration
            FROM activities a
            JOIN tasks t ON a.task_id = t.id
            WHERE a.duration IS NOT NULL
            GROUP BY t.folder_id
        """)
        durations = {row['folder_id']: row['total_duration'] for row in cursor.fetchall() if row['folder_id'] is not None}

        conn.close()

        for folder in folders:
            fid = folder['id']
            folder['task_count'] = task_counts.get(fid, 0)
            folder['total_duration'] = int(durations.get(fid, 0) or 0)

        folders.sort(key=lambda f: (f['id'] != self.default_folder_id, f['name'].lower()))
        return folders

    def get_tasks(self, limit: int = 100, folder_id: Optional[int] = None) -> List[Dict]:
        """Get all tasks"""
        conn = self.get_connection()
        cursor = conn.cursor()

        if folder_id is not None:
            cursor.execute("""
                SELECT id, title, description, folder_id, created_at, updated_at
                FROM tasks
                WHERE folder_id = ?
                ORDER BY updated_at DESC
                LIMIT ?
            """, (folder_id, limit))
        else:
            cursor.execute("""
                SELECT id, title, description, folder_id, created_at, updated_at
                FROM tasks
                ORDER BY updated_at DESC
                LIMIT ?
            """, (limit,))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def get_task(self, task_id: int) -> Optional[Dict]:
        """Get a specific task"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, title, description, folder_id, created_at, updated_at
            FROM tasks
            WHERE id = ?
        """, (task_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return dict(row)
        return None

    def delete_task(self, task_id: int) -> bool:
        """Delete a task and its associated activities"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT folder_id FROM tasks WHERE id = ?", (task_id,))
        row = cursor.fetchone()
        folder_id = row['folder_id'] if row else None

        # Delete task (CASCADE will delete associated activities)
        cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        deleted = cursor.rowcount > 0

        if deleted and folder_id:
            cursor.execute("""
                UPDATE folders
                SET updated_at = ?
                WHERE id = ?
            """, (datetime.now(), folder_id))

        conn.commit()
        conn.close()

        logger.info(f"Deleted task {task_id}")
        return deleted

    def update_task(self, task_id: int, title: Optional[str] = None, description: Optional[str] = None) -> bool:
        """Update task details"""
        conn = self.get_connection()
        cursor = conn.cursor()

        updates = []
        params = []
        if title is not None:
            updates.append("title = ?")
            params.append(title)
        if description is not None:
            updates.append("description = ?")
            params.append(description)

        if not updates:
            conn.close()
            return False

        updates.append("updated_at = ?")
        params.append(datetime.now())
        params.append(task_id)

        query = f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, tuple(params))
        updated = cursor.rowcount > 0

        conn.commit()
        conn.close()
        
        if updated:
            logger.info(f"Updated task {task_id}")
        
        return updated

    def get_task_timeline(self, task_id: int, limit: Optional[int] = None) -> List[Dict]:
        """Get timeline entries for a specific task"""
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
                WHERE task_id = ?
                ORDER BY start_time DESC
            """, (task_id,))
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
                WHERE task_id = ?
                ORDER BY start_time DESC
                LIMIT ?
            """, (task_id, limit))

        rows = cursor.fetchall()
        conn.close()

        timeline = []
        for row in rows:
            entry = dict(row)
            entry['app_name'] = normalize_app_name(row['app_name'], row['window_title'])
            timeline.append(entry)
        return timeline

    def get_task_stats(self, task_id: int) -> Dict:
        """Get statistics for a specific task"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Total time for this task
        cursor.execute("""
            SELECT SUM(duration) as total_time, COUNT(*) as activity_count
            FROM activities
            WHERE task_id = ? AND duration IS NOT NULL
        """, (task_id,))
        
        row = cursor.fetchone()
        total_time = row['total_time'] or 0
        activity_count = row['activity_count']

        # App breakdown for this task
        cursor.execute("""
            SELECT app_name, SUM(duration) as total_duration, COUNT(*) as session_count
            FROM activities
            WHERE task_id = ? AND duration IS NOT NULL
            GROUP BY app_name
            ORDER BY total_duration DESC
        """, (task_id,))

        apps = []
        for row in cursor.fetchall():
            apps.append({
                'app_name': normalize_app_name(row['app_name']),
                'total_duration': row['total_duration'],
                'session_count': row['session_count']
            })

        conn.close()

        timeline = self.get_task_timeline(task_id)

        return {
            'total_time': int(total_time),
            'activity_count': activity_count,
            'apps': apps,
            'timeline': timeline
        }

    def start_activity(self, task_id: int, app_name: str, window_title: str) -> int:
        """Start tracking a new activity"""
        # Normalize app name so similar windows are grouped (e.g., Chrome tabs -> chrome)
        canonical_app = normalize_app_name(app_name, window_title)

        conn = self.get_connection()
        cursor = conn.cursor()

        now = datetime.now()
        date = now.strftime("%Y-%m-%d")

        cursor.execute("""
            INSERT INTO activities (task_id, app_name, window_title, start_time, date)
            VALUES (?, ?, ?, ?, ?)
        """, (task_id, canonical_app, window_title, now, date))

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

        logger.debug(f"Started activity {activity_id}: {canonical_app} - {window_title} for task {task_id}")
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

        # Last 30 days time
        last_30_start = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT SUM(duration) as last_30_days_time
            FROM activities
            WHERE date >= ? AND duration IS NOT NULL
        """, (last_30_start,))
        last_30_days_time = cursor.fetchone()['last_30_days_time'] or 0

        conn.close()

        return {
            'total_time': int(total_time),
            'total_applications': total_apps,
            'total_activities': total_activities,
            'today_time': int(today_time),
            'week_time': int(week_time),
            'last_30_days_time': int(last_30_days_time)
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

    def get_export_data(self, start_date: str, end_date: str) -> List[Dict]:
        """
        Get activities grouped by date -> task -> app for export
        Returns: List of days, each with tasks, each task with apps and durations
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        # Get all activities in date range
        cursor.execute("""
            SELECT 
                a.date,
                a.task_id,
                t.title as task_title,
                t.description as task_description,
                a.app_name,
                a.window_title,
                a.duration
            FROM activities a
            LEFT JOIN tasks t ON a.task_id = t.id
            WHERE a.date >= ? AND a.date <= ?
            AND a.duration IS NOT NULL
            ORDER BY a.date ASC, a.task_id, a.start_time
        """, (start_date, end_date))

        rows = cursor.fetchall()
        conn.close()

        # Structure: {date: {task_id: {app_name: [durations]}}}
        data_structure = {}

        for row in rows:
            date = row['date']
            task_id = row['task_id']
            task_title = row['task_title'] or f"Task {task_id}"
            task_description = row['task_description']
            app_name = normalize_app_name(row['app_name'], row['window_title'])
            duration = row['duration']

            # Initialize nested structure
            if date not in data_structure:
                data_structure[date] = {}
            
            if task_id not in data_structure[date]:
                data_structure[date][task_id] = {
                    'task_title': task_title,
                    'task_description': task_description,
                    'apps': {}
                }
            
            if app_name not in data_structure[date][task_id]['apps']:
                data_structure[date][task_id]['apps'][app_name] = {
                    'durations': [],
                    'session_count': 0
                }
            
            data_structure[date][task_id]['apps'][app_name]['durations'].append(duration)
            data_structure[date][task_id]['apps'][app_name]['session_count'] += 1

        # Convert to final format
        result = []
        for date in sorted(data_structure.keys()):
            day_data = {
                'date': date,
                'tasks': []
            }

            for task_id, task_info in data_structure[date].items():
                task_data = {
                    'task_id': task_id,
                    'task_title': task_info['task_title'],
                    'task_description': task_info['task_description'],
                    'apps': [],
                    'total_time': 0
                }

                for app_name, app_info in task_info['apps'].items():
                    total_duration = sum(app_info['durations'])
                    task_data['total_time'] += total_duration
                    
                    task_data['apps'].append({
                        'app_name': app_name,
                        'duration': total_duration,
                        'session_count': app_info['session_count']
                    })
                
                # Sort apps by duration (descending)
                task_data['apps'].sort(key=lambda x: x['duration'], reverse=True)
                
                day_data['tasks'].append(task_data)
            
            # Sort tasks by total time (descending)
            day_data['tasks'].sort(key=lambda x: x['total_time'], reverse=True)
            
            result.append(day_data)

        return result
        return deleted

    def get_export_data_for_folder(self, folder_id: int) -> List[Dict]:
        """
        Get activities grouped by date -> task -> app for a specific folder
        Returns: List of days, each with tasks, each task with apps and durations
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        # Get all activities for tasks in the specified folder
        cursor.execute("""
            SELECT 
                a.date,
                a.task_id,
                t.title as task_title,
                t.description as task_description,
                a.app_name,
                a.window_title,
                a.duration
            FROM activities a
            LEFT JOIN tasks t ON a.task_id = t.id
            WHERE t.folder_id = ?
            AND a.duration IS NOT NULL
            ORDER BY a.date ASC, a.task_id, a.start_time
        """, (folder_id,))

        rows = cursor.fetchall()
        conn.close()

        # Structure: {date: {task_id: {app_name: [durations]}}}
        data_structure = {}

        for row in rows:
            date = row['date']
            task_id = row['task_id']
            task_title = row['task_title'] or f"Task {task_id}"
            task_description = row['task_description']
            app_name = normalize_app_name(row['app_name'], row['window_title'])
            duration = row['duration']

            # Initialize nested structure
            if date not in data_structure:
                data_structure[date] = {}
            
            if task_id not in data_structure[date]:
                data_structure[date][task_id] = {
                    'task_title': task_title,
                    'task_description': task_description,
                    'apps': {}
                }
            
            if app_name not in data_structure[date][task_id]['apps']:
                data_structure[date][task_id]['apps'][app_name] = {
                    'durations': [],
                    'session_count': 0
                }
            
            data_structure[date][task_id]['apps'][app_name]['durations'].append(duration)
            data_structure[date][task_id]['apps'][app_name]['session_count'] += 1

        # Convert to final format
        result = []
        for date in sorted(data_structure.keys()):
            day_data = {
                'date': date,
                'tasks': []
            }

            for task_id, task_info in data_structure[date].items():
                task_data = {
                    'task_id': task_id,
                    'task_title': task_info['task_title'],
                    'task_description': task_info['task_description'],
                    'apps': [],
                    'total_time': 0
                }

                for app_name, app_info in task_info['apps'].items():
                    total_duration = sum(app_info['durations'])
                    task_data['total_time'] += total_duration
                    
                    task_data['apps'].append({
                        'app_name': app_name,
                        'duration': total_duration,
                        'session_count': app_info['session_count']
                    })
                
                # Sort apps by duration (descending)
                task_data['apps'].sort(key=lambda x: x['duration'], reverse=True)
                
                day_data['tasks'].append(task_data)
            
            # Sort tasks by total time (descending)
            day_data['tasks'].sort(key=lambda x: x['total_time'], reverse=True)
            
            result.append(day_data)

        return result
