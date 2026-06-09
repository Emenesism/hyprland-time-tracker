"""
FastAPI backend for the Time Tracker application
Provides REST API for tracking data and serves the frontend
"""

import asyncio
import logging
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Tuple
from xml.sax.saxutils import escape

import config
from database import Database
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from tracker import create_tracker

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(config.LOG_FILE),
    ],
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=config.APP_NAME,
    version=config.APP_VERSION,
    description="Time tracking application for Arch Linux with Hyprland",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database(config.DB_PATH)

# Tracker will be initialized on startup (may require compositor/runtime to be available)
tracker = None
tracker_init_lock = asyncio.Lock()

ARABIC_TEXT_RE = re.compile(
    r"[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]"
)


async def ensure_tracker():
    """Initialize the tracker if it was unavailable during application startup."""
    global tracker
    if tracker is not None:
        return tracker

    async with tracker_init_lock:
        if tracker is None:
            tracker = create_tracker(db, config.TRACKER_POLL_INTERVAL)
            logger.info("Tracker initialized")
    return tracker


def resolve_pdf_font_names() -> Tuple[str, str]:
    """Register a Unicode-capable font for PDF exports and return (regular, bold)."""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    font_candidates = [
        (
            "TrackerNotoNaskhArabic",
            "/usr/share/fonts/noto/NotoNaskhArabic-Regular.ttf",
            "/usr/share/fonts/noto/NotoNaskhArabic-Bold.ttf",
        ),
        (
            "TrackerNotoSansArabic",
            "/usr/share/fonts/noto/NotoSansArabic-Regular.ttf",
            "/usr/share/fonts/noto/NotoSansArabic-Bold.ttf",
        ),
        (
            "TrackerDejaVuSans",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        ),
        (
            "TrackerDejaVuSans",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ),
    ]

    registered_fonts = set(pdfmetrics.getRegisteredFontNames())
    for base_name, regular_path, bold_path in font_candidates:
        regular_font = Path(regular_path)
        bold_font = Path(bold_path)
        if not regular_font.exists():
            continue

        regular_alias = f"{base_name}-Regular"
        bold_alias = f"{base_name}-Bold"
        if regular_alias not in registered_fonts:
            pdfmetrics.registerFont(TTFont(regular_alias, str(regular_font)))
            registered_fonts.add(regular_alias)

        # If bold file does not exist, reuse regular to keep style rendering stable.
        if not bold_font.exists():
            bold_font = regular_font
        if bold_alias not in registered_fonts:
            pdfmetrics.registerFont(TTFont(bold_alias, str(bold_font)))
            registered_fonts.add(bold_alias)

        return regular_alias, bold_alias

    return "Helvetica", "Helvetica-Bold"


def to_pdf_paragraph_text(value: Optional[str]) -> str:
    """Escape text for ReportLab Paragraph and preserve user-entered newlines."""
    text = (value or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return ""

    # Optional Arabic/Persian shaping if dependencies are available.
    if ARABIC_TEXT_RE.search(text):
        try:
            import arabic_reshaper
            from bidi.algorithm import get_display

            text = "\n".join(
                get_display(arabic_reshaper.reshape(line)) if line else line
                for line in text.split("\n")
            )
        except Exception:
            pass

    return escape(text).replace("\n", "<br/>")


# Pydantic models for API responses
class ActivityResponse(BaseModel):
    id: int
    app_name: str
    window_title: Optional[str]
    start_time: str
    end_time: Optional[str]
    duration: Optional[int]
    date: str


class DailyStatsResponse(BaseModel):
    app_name: str
    session_count: int
    total_duration: float
    avg_duration: float
    first_used: Optional[str]
    last_used: Optional[str]


class ApplicationResponse(BaseModel):
    app_name: str
    category: Optional[str]
    total_time: int
    last_used: Optional[str]


class SummaryStatsResponse(BaseModel):
    total_time: int
    total_applications: int
    total_activities: int
    today_time: int
    week_time: int
    last_30_days_time: int


class TrackerStatusResponse(BaseModel):
    running: bool
    current_app: Optional[str]
    current_window: Optional[str]
    activity_id: Optional[int]
    task_id: Optional[int]
    start_time: Optional[str]


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    folder_id: Optional[int]
    created_at: str
    updated_at: str


class StartTrackingRequest(BaseModel):
    task_id: int


class FolderResponse(BaseModel):
    id: int
    project_id: Optional[int]
    name: str
    created_at: str
    updated_at: str
    task_count: int
    total_duration: int


class ProjectResponse(BaseModel):
    id: int
    name: str
    created_at: str
    updated_at: str
    folder_count: int
    task_count: int
    total_duration: int


class CreateProjectRequest(BaseModel):
    name: str


class RenameProjectRequest(BaseModel):
    name: str


class CreateFolderRequest(BaseModel):
    name: str
    project_id: Optional[int] = None


class RenameFolderRequest(BaseModel):
    name: str


class MoveTaskRequest(BaseModel):
    folder_id: int


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize the tracker when the application starts (but don't auto-start tracking)"""
    logger.info("Starting Time Tracker application")
    global tracker

    # Try to create the tracker with several retries. This helps if the user service
    # starts before the graphical compositor (Hyprland) is up.
    if tracker is None:
        attempts = 6
        delay = 5
        for attempt in range(1, attempts + 1):
            try:
                tracker = create_tracker(db, config.TRACKER_POLL_INTERVAL)
                logger.info(
                    "Tracker initialized (not started - waiting for manual start)"
                )
                break
            except Exception as e:
                logger.warning(f"Tracker init attempt {attempt} failed: {e}")
                if attempt < attempts:
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "Failed to initialize tracker after retries. API will run without tracking functionality"
                    )


@app.on_event("shutdown")
async def shutdown_event():
    """Stop the tracker when the application shuts down"""
    logger.info("Shutting down Time Tracker application")
    if tracker:
        try:
            tracker.stop_tracking()
            logger.info("Tracker stopped successfully")
        except Exception as e:
            logger.error(f"Error stopping tracker: {e}")


# API Routes
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "tracker_available": tracker is not None,
    }


@app.get("/api/tracker/status", response_model=TrackerStatusResponse)
async def get_tracker_status():
    """Get current tracker status"""
    try:
        active_tracker = await ensure_tracker()
    except Exception as e:
        logger.warning(f"Tracker is unavailable: {e}")
        raise HTTPException(status_code=503, detail="Tracker not available")

    return active_tracker.get_status()


# Task Management Endpoints
@app.post("/api/tasks", response_model=TaskResponse)
async def create_task(
    title: str,
    description: Optional[str] = None,
    folder_id: Optional[int] = None,
):
    """Create a new task"""
    try:
        task_id = db.create_task(title, description, folder_id)
        task = db.get_task(task_id)
        return task
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasks")
async def get_tasks(
    limit: int = Query(default=100, ge=1, le=1000),
    folder_id: Optional[int] = None,
):
    """Get all tasks"""
    try:
        tasks = db.get_tasks(limit, folder_id)
        return {"tasks": tasks}
    except Exception as e:
        logger.error(f"Error getting tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int):
    """Get a specific task"""
    try:
        task = db.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int):
    """Delete a task"""
    try:
        success = db.delete_task(task_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"status": "deleted", "task_id": task_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tasks/{task_id}/move", response_model=TaskResponse)
async def move_task(task_id: int, request: MoveTaskRequest):
    """Move a task to another folder"""
    try:
        success = db.move_task_to_folder(task_id, request.folder_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        task = db.get_task(task_id)
        return task
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error moving task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects", response_model=List[ProjectResponse])
async def list_projects():
    """List all projects with summary stats"""
    try:
        projects = db.get_projects_with_stats()
        return projects
    except Exception as e:
        logger.error(f"Error getting projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest):
    """Create a new project"""
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name cannot be empty")

    try:
        project_id = db.create_project(name)
        project = db.get_project(project_id)
        project.update({"folder_count": 0, "task_count": 0, "total_duration": 0})
        return project
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/projects/{project_id}", response_model=ProjectResponse)
async def rename_project(project_id: int, request: RenameProjectRequest):
    """Rename an existing project"""
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name cannot be empty")

    try:
        updated = db.rename_project(project_id, name)
        if not updated:
            raise HTTPException(status_code=404, detail="Project not found")
        projects = db.get_projects_with_stats()
        project = next((p for p in projects if p["id"] == project_id), None)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error renaming project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int):
    """Delete a project and move folders to default project"""
    try:
        deleted = db.delete_project(project_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Project not found")
        projects = db.get_projects_with_stats()
        return {"status": "deleted", "project_id": project_id, "projects": projects}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/folders", response_model=List[FolderResponse])
async def list_folders(project_id: Optional[int] = None):
    """List all folders with summary stats"""
    try:
        folders = db.get_folders_with_stats(project_id)
        return folders
    except Exception as e:
        logger.error(f"Error getting folders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/folders", response_model=FolderResponse)
async def create_folder(request: CreateFolderRequest):
    """Create a new folder"""
    name = request.name.strip()
    if not name:
        raise HTTPException(
            status_code=400, detail="Folder name cannot be empty"
        )

    try:
        folder_id = db.create_folder(name, request.project_id)
        folder = db.get_folder(folder_id)
        folder.update({"task_count": 0, "total_duration": 0})
        return folder
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/folders/{folder_id}", response_model=FolderResponse)
async def rename_folder(folder_id: int, request: RenameFolderRequest):
    """Rename an existing folder"""
    name = request.name.strip()
    if not name:
        raise HTTPException(
            status_code=400, detail="Folder name cannot be empty"
        )

    try:
        updated = db.rename_folder(folder_id, name)
        if not updated:
            raise HTTPException(status_code=404, detail="Folder not found")
        folders = db.get_folders_with_stats()
        folder = next((f for f in folders if f["id"] == folder_id), None)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
        return folder
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error renaming folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


@app.patch("/api/tasks/{task_id}")
async def update_task(task_id: int, task_data: UpdateTaskRequest):
    """Update task details"""
    try:
        updated = db.update_task(
            task_id, task_data.title, task_data.description
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Task not found")

        task = db.get_task(task_id)
        return task
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/folders/{folder_id}")
async def delete_folder(folder_id: int):
    """Delete a folder (tasks reassigned to default)"""
    try:
        deleted = db.delete_folder(folder_id)
        if not deleted:
            raise HTTPException(
                status_code=404, detail="Folder not found or already deleted"
            )
        folders = db.get_folders_with_stats()
        return {"status": "deleted", "folder_id": folder_id, "folders": folders}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasks/{task_id}/stats")
async def get_task_stats(task_id: int):
    """Get statistics for a specific task"""
    try:
        task = db.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        stats = db.get_task_stats(task_id)
        return {"task": task, "stats": stats}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Manual Tracking Control Endpoints
@app.post("/api/tracker/start")
async def start_tracking(task_id: int):
    """Start tracking for a specific task"""
    try:
        active_tracker = await ensure_tracker()
    except Exception as e:
        logger.warning(f"Tracker is unavailable: {e}")
        raise HTTPException(status_code=503, detail="Tracker not available")

    try:
        # Verify task exists
        task = db.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Stop current tracking if running
        if active_tracker.running:
            active_tracker.stop_tracking()

        # Start tracking for new task
        active_tracker.start_tracking(task_id)

        return {
            "status": "started",
            "task_id": task_id,
            "task_title": task["title"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting tracker: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tracker/stop")
async def stop_tracking():
    """Stop tracking"""
    try:
        active_tracker = await ensure_tracker()
    except Exception as e:
        logger.warning(f"Tracker is unavailable: {e}")
        raise HTTPException(status_code=503, detail="Tracker not available")

    try:
        active_tracker.stop_tracking()
        return {"status": "stopped"}
    except Exception as e:
        logger.error(f"Error stopping tracker: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats/daily")
async def get_daily_stats(date: Optional[str] = None):
    """
    Get daily statistics

    Args:
        date: Date in YYYY-MM-DD format (default: today)
    """
    try:
        stats = db.get_daily_stats(date)
        return {
            "date": date or datetime.now().strftime("%Y-%m-%d"),
            "statistics": stats,
        }
    except Exception as e:
        logger.error(f"Error getting daily stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats/weekly")
async def get_weekly_stats(start_date: Optional[str] = None):
    """
    Get weekly statistics

    Args:
        start_date: Start date in YYYY-MM-DD format (default: 7 days ago)
    """
    try:
        stats = db.get_weekly_stats(start_date)

        # Group by date for easier frontend consumption
        grouped = {}
        for stat in stats:
            date = stat["date"]
            if date not in grouped:
                grouped[date] = []
            grouped[date].append(stat)

        return {
            "start_date": start_date
            or (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
            "end_date": datetime.now().strftime("%Y-%m-%d"),
            "statistics": grouped,
        }
    except Exception as e:
        logger.error(f"Error getting weekly stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats/year")
async def get_year_stats(year: Optional[int] = None):
    """
    Get yearly statistics

    Args:
        year: Year (default: current year)
    """
    try:
        if year is None:
            year = datetime.now().year

        stats = db.get_year_stats(year)

        return {"year": year, "statistics": stats}
    except Exception as e:
        logger.error(f"Error getting year stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/timeline")
async def get_timeline(
    date: Optional[str] = None, limit: Optional[int] = Query(default=None, ge=1)
):
    """
    Get activity timeline

    Args:
        date: Date in YYYY-MM-DD format (default: today)
        limit: Maximum number of activities to return
    """
    try:
        timeline = db.get_timeline(date, limit)
        return {
            "date": date or datetime.now().strftime("%Y-%m-%d"),
            "activities": timeline,
        }
    except Exception as e:
        logger.error(f"Error getting timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/applications")
async def get_applications():
    """Get all tracked applications"""
    try:
        applications = db.get_all_applications()
        return {"applications": applications}
    except Exception as e:
        logger.error(f"Error getting applications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/activities")
async def get_activities(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    app_name: Optional[str] = None,
    limit: int = Query(default=1000, ge=1, le=10000),
):
    """
    Get activities with optional filters

    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        app_name: Filter by application name
        limit: Maximum number of activities to return
    """
    try:
        activities = db.get_activities(start_date, end_date, app_name, limit)
        return {"activities": activities, "count": len(activities)}
    except Exception as e:
        logger.error(f"Error getting activities: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats/summary", response_model=SummaryStatsResponse)
async def get_summary_stats():
    """Get overall summary statistics"""
    try:
        stats = db.get_summary_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting summary stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats/categories")
async def get_category_stats():
    """Get tracked time grouped by app category"""
    try:
        categories = db.get_category_stats()
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Error getting category stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/data")
async def export_data(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
):
    """
    Get activities grouped by date -> task -> app for export
    Returns data structured for PDF generation
    """
    try:
        data = db.get_export_data(start_date, end_date)
        return {"start_date": start_date, "end_date": end_date, "data": data}
    except Exception as e:
        logger.error(f"Error getting export data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/pdf")
async def export_pdf(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
):
    """Generate and download PDF report for date range with summary and details"""
    try:
        import io

        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import cm, inch
        from reportlab.platypus import (
            Frame,
            PageBreak,
            PageTemplate,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )

        # Get data
        data = db.get_export_data(start_date, end_date)

        # Calculate summary stats
        total_seconds = 0
        app_stats = {}
        task_stats = {}

        for day_data in data:
            for task in day_data.get("tasks", []):
                t_seconds = task["total_time"]
                total_seconds += t_seconds

                # Task Stats
                t_title = task["task_title"]
                if t_title not in task_stats:
                    task_stats[t_title] = 0
                task_stats[t_title] += t_seconds

                # App Stats
                for app in task.get("apps", []):
                    a_name = app["app_name"]
                    a_seconds = app["duration"]
                    if a_name not in app_stats:
                        app_stats[a_name] = 0
                    app_stats[a_name] += a_seconds

        # Sort stats
        sorted_apps = sorted(
            app_stats.items(), key=lambda x: x[1], reverse=True
        )[:5]
        sorted_tasks = sorted(
            task_stats.items(), key=lambda x: x[1], reverse=True
        )[:5]

        # Helper function to format duration
        def format_duration(seconds):
            if not seconds:
                return "0m"
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            if hours > 0:
                return f"{hours}h {minutes}m"
            return f"{minutes}m"

        def format_duration_detailed(seconds):
            if not seconds:
                return "0m"
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            if hours > 0:
                return f"{hours}h {minutes}m"
            return f"{minutes}m"

        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=0.8 * inch,
            bottomMargin=0.8 * inch,
            leftMargin=0.8 * inch,
            rightMargin=0.8 * inch,
        )

        # Define styles
        styles = getSampleStyleSheet()

        # Color Palette
        PRIMARY_COLOR = colors.HexColor("#6366f1")  # Indigo 500
        SECONDARY_COLOR = colors.HexColor("#8b5cf6")  # Violet 500
        ACCENT_COLOR = colors.HexColor("#a5b4fc")  # Indigo 300
        BG_COLOR = colors.HexColor("#f9fafb")  # Gray 50
        TEXT_COLOR = colors.HexColor("#1f2937")  # Gray 800
        LIGHT_TEXT_COLOR = colors.HexColor("#6b7280")  # Gray 500

        # Custom Styles
        style_title = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=28,
            textColor=PRIMARY_COLOR,
            spaceAfter=10,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        )

        style_subtitle = ParagraphStyle(
            "CustomSubtitle",
            parent=styles["Normal"],
            fontSize=12,
            textColor=LIGHT_TEXT_COLOR,
            spaceAfter=40,
            alignment=TA_CENTER,
        )

        style_section_header = ParagraphStyle(
            "SectionHeader",
            parent=styles["Heading2"],
            fontSize=16,
            textColor=SECONDARY_COLOR,
            spaceBefore=20,
            spaceAfter=10,
            fontName="Helvetica-Bold",
        )

        style_card_label = ParagraphStyle(
            "CardLabel",
            parent=styles["Normal"],
            fontSize=10,
            textColor=LIGHT_TEXT_COLOR,
            alignment=TA_CENTER,
        )

        style_card_value = ParagraphStyle(
            "CardValue",
            parent=styles["Heading2"],
            fontSize=20,
            textColor=TEXT_COLOR,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        )

        style_table_header = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.white,
            fontName="Helvetica-Bold",
        )

        # Container for elements
        elements = []

        # --- TITLE PAGE / SUMMARY ---

        elements.append(Paragraph("Time Tracking Report", style_title))
        elements.append(Paragraph(f"{start_date} — {end_date}", style_subtitle))

        # Total Time Card
        elements.append(Paragraph("TOTAL TIME LOGGED", style_card_label))
        elements.append(
            Paragraph(format_duration(total_seconds), style_card_value)
        )
        elements.append(Spacer(1, 0.5 * inch))

        # Top Applications & Tasks Table
        elements.append(Paragraph("Top Applications", style_section_header))

        if sorted_apps:
            table_data = [["Application", "Duration"]]
            for app, dur in sorted_apps:
                table_data.append([app, format_duration(dur)])

            t = Table(table_data, colWidths=[4 * inch, 2 * inch])
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_COLOR),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                        ("TOPPADDING", (0, 0), (-1, 0), 10),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [colors.white, BG_COLOR],
                        ),
                    ]
                )
            )
            elements.append(t)
        else:
            elements.append(
                Paragraph("No application data available.", styles["Normal"])
            )

        elements.append(Spacer(1, 0.3 * inch))
        elements.append(Paragraph("Top Tasks", style_section_header))

        if sorted_tasks:
            table_data = [["Task", "Duration"]]
            for task, dur in sorted_tasks:
                table_data.append([task, format_duration(dur)])

            t = Table(table_data, colWidths=[4 * inch, 2 * inch])
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), SECONDARY_COLOR),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                        ("TOPPADDING", (0, 0), (-1, 0), 10),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [colors.white, BG_COLOR],
                        ),
                    ]
                )
            )
            elements.append(t)
        else:
            elements.append(
                Paragraph("No task data available.", styles["Normal"])
            )

        elements.append(PageBreak())

        # --- DETAILED REPORT ---

        # Styles for details
        style_day_header = ParagraphStyle(
            "DayHeader",
            parent=styles["Heading2"],
            fontSize=14,
            textColor=TEXT_COLOR,
            spaceBefore=15,
            spaceAfter=10,
            fontName="Helvetica-Bold",
            borderPadding=5,
            borderColor=colors.lightgrey,
            borderWidth=0,
            backColor=colors.HexColor("#f3f4f6"),
        )

        style_task_title = ParagraphStyle(
            "TaskTitle",
            parent=styles["Heading3"],
            fontSize=11,
            textColor=PRIMARY_COLOR,
            spaceBefore=5,
            spaceAfter=2,
            fontName="Helvetica-Bold",
        )

        elements.append(Paragraph("Detailed Daily Activity", style_title))
        elements.append(Spacer(1, 0.2 * inch))

        if not data:
            elements.append(
                Paragraph(
                    "No activities found for this period.", styles["Normal"]
                )
            )
        else:
            for i, day_data in enumerate(data):
                date_str = day_data["date"]
                tasks = day_data["tasks"]

                # Format nice date: "2023-10-27" -> "Friday, Oct 27"
                try:
                    dt = datetime.strptime(date_str, "%Y-%m-%d")
                    nice_date = dt.strftime("%A, %b %d")
                except:
                    nice_date = date_str

                elements.append(Paragraph(f"📅 {nice_date}", style_day_header))

                if not tasks:
                    elements.append(
                        Paragraph("No recorded activity.", styles["Italic"])
                    )
                    continue

                table_data = [["Task / Application", "Time", "Sessions"]]

                for task_data in tasks:
                    # Task Row
                    task_title = task_data["task_title"]
                    task_total = format_duration_detailed(
                        task_data["total_time"]
                    )

                    # Add task as a "Section" row in the table
                    table_data.append(
                        [
                            Paragraph(f"<b>{task_title}</b>", styles["Normal"]),
                            Paragraph(f"<b>{task_total}</b>", styles["Normal"]),
                            "",
                        ]
                    )

                    # App Rows
                    for app in task_data.get("apps", []):
                        app_name = app["app_name"]
                        app_dur = format_duration_detailed(app["duration"])
                        sess_count = str(app["session_count"])

                        table_data.append(
                            [
                                Paragraph(
                                    f"<font color='#6b7280'>&nbsp;&nbsp;&nbsp;• {app_name}</font>",
                                    styles["Normal"],
                                ),
                                Paragraph(
                                    f"<font color='#6b7280'>{app_dur}</font>",
                                    styles["Normal"],
                                ),
                                Paragraph(
                                    f"<font color='#6b7280'>{sess_count}</font>",
                                    styles["Normal"],
                                ),
                            ]
                        )

                # Render the table for this day
                t = Table(
                    table_data, colWidths=[3.5 * inch, 1.5 * inch, 1 * inch]
                )
                t.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), LIGHT_TEXT_COLOR),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                            ("ALIGN", (0, 0), (-1, 0), "LEFT"),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("FONTSIZE", (0, 0), (-1, 0), 9),
                            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                            ("TOPPADDING", (0, 0), (-1, 0), 6),
                            # General Rows
                            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                            (
                                "ALIGN",
                                (1, 1),
                                (-1, -1),
                                "LEFT",
                            ),  # Duration column
                            (
                                "ALIGN",
                                (2, 1),
                                (-1, -1),
                                "CENTER",
                            ),  # Session column
                            (
                                "LINEBELOW",
                                (0, 0),
                                (-1, -1),
                                0.25,
                                colors.HexColor("#e5e7eb"),
                            ),
                        ]
                    )
                )

                elements.append(t)
                elements.append(Spacer(1, 0.3 * inch))

                # Check for page break potential if it's getting long?
                # ReportLab handles auto page breaks mostly fine with SimpleDocTemplate.

        # Build PDF
        def footer(canvas, doc):
            canvas.saveState()
            canvas.setFont("Helvetica", 9)
            canvas.setFillColor(colors.grey)
            page_num = canvas.getPageNumber()
            text = f"Page {page_num}"
            canvas.drawRightString(A4[0] - inch, 0.5 * inch, text)
            canvas.restoreState()

        doc.build(elements, onFirstPage=footer, onLaterPages=footer)

        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()

        # Return PDF as download
        from fastapi.responses import Response

        filename = f"report_{start_date}_{end_date}.pdf"
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="reportlab not installed. Run: pip install reportlab",
        )
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/folder/{folder_id}/pdf")
async def export_folder_pdf(folder_id: int):
    """Generate a polished PDF report for all tracked time in a folder."""
    try:
        folder = db.get_folder(folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        import io
        from collections import defaultdict

        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            KeepTogether,
            PageBreak,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )

        # Get data for folder (all dates)
        data = db.get_export_data_for_folder(folder_id)

        regular_font_name, bold_font_name = resolve_pdf_font_names()

        total_seconds = 0
        app_stats = defaultdict(int)
        task_stats = defaultdict(int)
        session_count = 0

        for day_data in data:
            for task in day_data.get("tasks", []):
                t_seconds = int(task.get("total_time") or 0)
                total_seconds += t_seconds
                task_stats[task.get("task_title") or f"Task {task.get('task_id')}"] += t_seconds
                for app in task.get("apps", []):
                    app_stats[app.get("app_name") or "Unknown"] += int(app.get("duration") or 0)
                    session_count += int(app.get("session_count") or 0)

        sorted_apps = sorted(app_stats.items(), key=lambda x: x[1], reverse=True)[:6]
        sorted_tasks = sorted(task_stats.items(), key=lambda x: x[1], reverse=True)[:6]

        def format_duration(seconds):
            seconds = int(seconds or 0)
            if seconds <= 0:
                return "0m"
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            if hours:
                return f"{hours}h {minutes}m"
            return f"{minutes}m"

        def clean_text(value):
            return to_pdf_paragraph_text(str(value or "")) or "-"

        def nice_date(date_str):
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                return dt.strftime("%A, %b %d, %Y")
            except Exception:
                return date_str

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=0.55 * inch,
            bottomMargin=0.55 * inch,
            leftMargin=0.62 * inch,
            rightMargin=0.62 * inch,
        )

        styles = getSampleStyleSheet()
        ink = colors.HexColor("#31283b")
        muted = colors.HexColor("#7c7289")
        rose = colors.HexColor("#f472b6")
        coral = colors.HexColor("#fb7185")
        lavender = colors.HexColor("#a78bfa")
        mint = colors.HexColor("#34d399")
        cream = colors.HexColor("#fff7fb")
        soft_purple = colors.HexColor("#f3ecff")
        soft_pink = colors.HexColor("#fdf2f8")
        line = colors.HexColor("#ead7e8")

        style_title = ParagraphStyle(
            "PrettyReportTitle",
            parent=styles["Heading1"],
            fontName=bold_font_name,
            fontSize=30,
            leading=34,
            textColor=ink,
            alignment=TA_CENTER,
            spaceAfter=8,
        )
        style_subtitle = ParagraphStyle(
            "PrettyReportSubtitle",
            parent=styles["Normal"],
            fontName=regular_font_name,
            fontSize=12,
            leading=16,
            textColor=muted,
            alignment=TA_CENTER,
            spaceAfter=18,
        )
        style_section_header = ParagraphStyle(
            "PrettySectionHeader",
            parent=styles["Heading2"],
            fontName=bold_font_name,
            fontSize=15,
            leading=18,
            textColor=ink,
            spaceBefore=14,
            spaceAfter=8,
        )
        style_label = ParagraphStyle(
            "PrettyLabel",
            parent=styles["Normal"],
            fontName=bold_font_name,
            fontSize=8,
            leading=10,
            textColor=muted,
            alignment=TA_CENTER,
        )
        style_value = ParagraphStyle(
            "PrettyValue",
            parent=styles["Normal"],
            fontName=bold_font_name,
            fontSize=16,
            leading=20,
            textColor=ink,
            alignment=TA_CENTER,
        )
        style_table_text = ParagraphStyle(
            "PrettyTableText",
            parent=styles["Normal"],
            fontName=regular_font_name,
            fontSize=9,
            leading=12,
            textColor=ink,
        )
        style_table_muted = ParagraphStyle(
            "PrettyTableMuted",
            parent=style_table_text,
            textColor=muted,
        )

        def stat_card(label, value, accent_color):
            table = Table(
                [[Paragraph(label, style_label)], [Paragraph(value, style_value)]],
                colWidths=[1.85 * inch],
            )
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.8, accent_color),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]))
            return table

        def ranking_table(title, rows, color):
            body = [[Paragraph(title, style_label), Paragraph("Time", style_label)]]
            if rows:
                for name, duration in rows:
                    body.append([
                        Paragraph(clean_text(name), style_table_text),
                        Paragraph(format_duration(duration), style_table_text),
                    ])
            else:
                body.append([Paragraph("No data yet", style_table_muted), Paragraph("0m", style_table_muted)])

            table = Table(body, colWidths=[3.6 * inch, 1.2 * inch])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), color),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, cream]),
                ("BOX", (0, 0), (-1, -1), 0.5, line),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, line),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ]))
            return table

        elements = []
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph(clean_text(folder["name"]), style_title))
        elements.append(Paragraph("Folder time report", style_subtitle))
        elements.append(Table(
            [[
                stat_card("TOTAL FOCUS", format_duration(total_seconds), rose),
                stat_card("TASKS", str(len(task_stats)), lavender),
                stat_card("SESSIONS", str(session_count), mint),
            ]],
            colWidths=[2.0 * inch, 2.0 * inch, 2.0 * inch],
        ))
        elements.append(Spacer(1, 0.35 * inch))
        elements.append(ranking_table("Top applications", sorted_apps, rose))
        elements.append(Spacer(1, 0.18 * inch))
        elements.append(ranking_table("Top tasks", sorted_tasks, lavender))
        elements.append(PageBreak())

        elements.append(Paragraph("Daily activity", style_title))
        elements.append(Paragraph("A clean breakdown by day, task, and app.", style_subtitle))

        if not data:
            elements.append(Paragraph("No tracked activity yet.", style_table_muted))
        else:
            for day_data in data:
                date_str = day_data["date"]
                tasks = day_data["tasks"]
                day_total = sum(int(task.get("total_time") or 0) for task in tasks)

                day_header = Table(
                    [[
                        Paragraph(clean_text(nice_date(date_str)), style_section_header),
                        Paragraph(format_duration(day_total), style_section_header),
                    ]],
                    colWidths=[4.55 * inch, 1.25 * inch],
                )
                day_header.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), soft_purple),
                    ("BOX", (0, 0), (-1, -1), 0.5, line),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ]))
                elements.append(day_header)

                if not tasks:
                    elements.append(Paragraph("No recorded activity.", style_table_muted))
                    elements.append(Spacer(1, 0.16 * inch))
                    continue

                table_data = [["Task / Application", "Time", "Sessions"]]
                for task_data in tasks:
                    table_data.append([
                        Paragraph(f"<b>{clean_text(task_data.get('task_title'))}</b>", style_table_text),
                        Paragraph(f"<b>{format_duration(task_data.get('total_time'))}</b>", style_table_text),
                        "",
                    ])
                    for app in task_data.get("apps", []):
                        table_data.append([
                            Paragraph(f"&nbsp;&nbsp;{clean_text(app.get('app_name'))}", style_table_muted),
                            Paragraph(format_duration(app.get("duration")), style_table_muted),
                            Paragraph(str(app.get("session_count") or 0), style_table_muted),
                        ])

                table = Table(table_data, colWidths=[3.75 * inch, 1.0 * inch, 1.05 * inch], repeatRows=1)
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), rose),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), bold_font_name),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, soft_pink]),
                    ("BOX", (0, 0), (-1, -1), 0.5, line),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, line),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]))
                elements.append(table)
                elements.append(Spacer(1, 0.2 * inch))

        def footer(canvas, doc):
            canvas.saveState()
            canvas.setFont(regular_font_name, 8)
            canvas.setFillColor(muted)
            canvas.drawString(doc.leftMargin, 0.35 * inch, "Time Tracker")
            canvas.drawRightString(A4[0] - doc.rightMargin, 0.35 * inch, f"Page {canvas.getPageNumber()}")
            canvas.restoreState()

        doc.build(elements, onFirstPage=footer, onLaterPages=footer)
        pdf_data = buffer.getvalue()
        buffer.close()

        from fastapi.responses import Response

        filename = re.sub(r"[^A-Za-z0-9_.-]+", "_", f"folder_report_{folder['name']}.pdf")
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="reportlab not installed. Run: pip install reportlab",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating folder PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/folder/{folder_id}/details.pdf")
async def export_folder_details_pdf(folder_id: int):
    """Generate a polished task brief PDF for a folder."""
    try:
        folder = db.get_folder(folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        # Fetch tasks for the folder (no limit or large limit)
        tasks = db.get_tasks(limit=1000, folder_id=folder_id)

        import io

        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            PageBreak,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )

        regular_font_name, bold_font_name = resolve_pdf_font_names()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=0.65 * inch,
            bottomMargin=0.55 * inch,
            leftMargin=0.65 * inch,
            rightMargin=0.65 * inch,
        )

        elements = []
        styles = getSampleStyleSheet()
        ink = colors.HexColor("#31283b")
        muted = colors.HexColor("#7c7289")
        rose = colors.HexColor("#f472b6")
        lavender = colors.HexColor("#a78bfa")
        soft_pink = colors.HexColor("#fff7fb")
        soft_purple = colors.HexColor("#f3ecff")
        line = colors.HexColor("#ead7e8")

        folder_title_style = ParagraphStyle(
            "FolderTitle",
            parent=styles["Heading1"],
            fontName=bold_font_name,
            fontSize=32,
            leading=36,
            textColor=ink,
            alignment=TA_CENTER,
            spaceAfter=8,
        )
        subtitle_style = ParagraphStyle(
            "FolderDetailsSubtitle",
            parent=styles["Normal"],
            fontName=regular_font_name,
            fontSize=12,
            leading=16,
            textColor=muted,
            alignment=TA_CENTER,
            spaceAfter=18,
        )
        task_title_style = ParagraphStyle(
            "TaskTitle",
            parent=styles["Heading2"],
            fontName=bold_font_name,
            fontSize=14,
            leading=18,
            textColor=ink,
            spaceAfter=5,
        )
        task_desc_style = ParagraphStyle(
            "TaskDesc",
            parent=styles["Normal"],
            fontName=regular_font_name,
            fontSize=10.5,
            leading=15,
            textColor=muted,
        )
        task_title_style_rtl = ParagraphStyle(
            "TaskTitleRTL",
            parent=task_title_style,
            alignment=TA_RIGHT,
            wordWrap="RTL",
        )

        task_desc_style_rtl = ParagraphStyle(
            "TaskDescRTL",
            parent=task_desc_style,
            alignment=TA_RIGHT,
            wordWrap="RTL",
        )

        empty_state_style = ParagraphStyle(
            "TaskEmptyState",
            parent=styles["Normal"],
            fontName=regular_font_name,
            textColor=muted,
            alignment=TA_CENTER,
        )

        elements.append(Spacer(1, 0.35 * inch))
        folder_name = (
            to_pdf_paragraph_text(folder["name"]) or f"Folder {folder_id}"
        )
        elements.append(Paragraph(folder_name, folder_title_style))
        elements.append(Paragraph("Task brief and descriptions", subtitle_style))
        cover_table = Table(
            [[
                Paragraph("TASKS", task_desc_style),
                Paragraph(str(len(tasks)), task_title_style),
            ]],
            colWidths=[1.4 * inch, 1.0 * inch],
        )
        cover_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), soft_purple),
            ("BOX", (0, 0), (-1, -1), 0.7, lavender),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ]))
        elements.append(cover_table)
        elements.append(PageBreak())

        elements.append(Paragraph("Tasks", folder_title_style))
        elements.append(Paragraph("A clean view of task names and notes.", subtitle_style))

        if not tasks:
            elements.append(
                Paragraph("No tasks in this folder.", empty_state_style)
            )
        else:
            for index, t in enumerate(tasks, start=1):
                raw_title = t.get("title") or ""
                raw_desc = t.get("description") or ""
                title = to_pdf_paragraph_text(
                    raw_title
                ) or to_pdf_paragraph_text(f"Task {t.get('id')}")
                desc = to_pdf_paragraph_text(raw_desc) or "No description added."
                has_rtl_text = bool(
                    ARABIC_TEXT_RE.search(raw_title)
                    or ARABIC_TEXT_RE.search(raw_desc)
                )
                title_style = (
                    task_title_style_rtl if has_rtl_text else task_title_style
                )
                desc_style = (
                    task_desc_style_rtl if has_rtl_text else task_desc_style
                )

                number_style = ParagraphStyle(
                    f"TaskNumber{index}",
                    parent=task_title_style,
                    alignment=TA_CENTER,
                    textColor=colors.white,
                )
                card = Table(
                    [[
                        Paragraph(str(index), number_style),
                        [Paragraph(title, title_style), Paragraph(desc, desc_style)],
                    ]],
                    colWidths=[0.45 * inch, 5.15 * inch],
                )
                card.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (0, 0), rose),
                    ("BACKGROUND", (1, 0), (1, 0), soft_pink),
                    ("BOX", (0, 0), (-1, -1), 0.5, line),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ]))
                elements.append(card)
                elements.append(Spacer(1, 0.14 * inch))

        def footer(canvas, doc):
            canvas.saveState()
            canvas.setFont(regular_font_name, 8)
            canvas.setFillColor(muted)
            canvas.drawString(doc.leftMargin, 0.35 * inch, "Time Tracker")
            canvas.drawRightString(A4[0] - doc.rightMargin, 0.35 * inch, f"Page {canvas.getPageNumber()}")
            canvas.restoreState()

        doc.build(elements, onFirstPage=footer, onLaterPages=footer)

        pdf_data = buffer.getvalue()
        buffer.close()

        from fastapi.responses import Response

        filename = re.sub(
            r"[^A-Za-z0-9_.-]+",
            "_",
            f"folder_{folder_id}_{folder['name']}_details.pdf",
        )
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="reportlab not installed. Run: pip install reportlab",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating folder details PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Serve frontend static files
if config.FRONTEND_BUILD_PATH.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=config.FRONTEND_BUILD_PATH / "assets"),
        name="assets",
    )

    @app.get("/")
    async def serve_frontend():
        """Serve the frontend application"""
        index_file = config.FRONTEND_BUILD_PATH / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse(
            status_code=404,
            content={
                "detail": "Frontend not built. Run 'npm run build' in the frontend directory."
            },
        )

    @app.get("/{full_path:path}")
    async def serve_frontend_routes(full_path: str):
        """Serve frontend for all other routes (SPA support)"""
        # Check if requesting a static file
        file_path = config.FRONTEND_BUILD_PATH / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # Otherwise serve index.html for SPA routing
        index_file = config.FRONTEND_BUILD_PATH / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

        return JSONResponse(status_code=404, content={"detail": "Not found"})
else:
    logger.warning(
        f"Frontend build directory not found: {config.FRONTEND_BUILD_PATH}"
    )
    logger.warning(
        "Frontend will not be served. Please build the frontend first."
    )


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting server on {config.API_HOST}:{config.API_PORT}")
    logger.info(f"Database location: {config.DB_PATH}")
    logger.info(f"Frontend build path: {config.FRONTEND_BUILD_PATH}")

    uvicorn.run(
        app,
        host=config.API_HOST,
        port=config.API_PORT,
        log_level=config.LOG_LEVEL.lower(),
    )
