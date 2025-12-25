"""
FastAPI backend for the Time Tracker application
Provides REST API for tracking data and serves the frontend
"""
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from database import Database
from tracker import create_tracker
import asyncio

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(config.LOG_FILE)
    ]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=config.APP_NAME,
    version=config.APP_VERSION,
    description="Time tracking application for Arch Linux with Hyprland"
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
    name: str
    created_at: str
    updated_at: str
    task_count: int
    total_duration: int


class CreateFolderRequest(BaseModel):
    name: str


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
                logger.info("Tracker initialized (not started - waiting for manual start)")
                break
            except Exception as e:
                logger.warning(f"Tracker init attempt {attempt} failed: {e}")
                if attempt < attempts:
                    await asyncio.sleep(delay)
                else:
                    logger.error("Failed to initialize tracker after retries. API will run without tracking functionality")


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
        "tracker_available": tracker is not None
    }


@app.get("/api/tracker/status", response_model=TrackerStatusResponse)
async def get_tracker_status():
    """Get current tracker status"""
    if not tracker:
        raise HTTPException(status_code=503, detail="Tracker not available")
    
    return tracker.get_status()


# Task Management Endpoints
@app.post("/api/tasks", response_model=TaskResponse)
async def create_task(title: str, description: Optional[str] = None, folder_id: Optional[int] = None):
    """Create a new task"""
    try:
        task_id = db.create_task(title, description, folder_id)
        task = db.get_task(task_id)
        return task
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasks")
async def get_tasks(limit: int = Query(default=100, ge=1, le=1000), folder_id: Optional[int] = None):
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


@app.get("/api/folders", response_model=List[FolderResponse])
async def list_folders():
    """List all folders with summary stats"""
    try:
        folders = db.get_folders_with_stats()
        return folders
    except Exception as e:
        logger.error(f"Error getting folders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/folders", response_model=FolderResponse)
async def create_folder(request: CreateFolderRequest):
    """Create a new folder"""
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Folder name cannot be empty")

    try:
        folder_id = db.create_folder(name)
        folder = db.get_folder(folder_id)
        folder.update({
            "task_count": 0,
            "total_duration": 0
        })
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
        raise HTTPException(status_code=400, detail="Folder name cannot be empty")

    try:
        updated = db.rename_folder(folder_id, name)
        if not updated:
            raise HTTPException(status_code=404, detail="Folder not found")
        folders = db.get_folders_with_stats()
        folder = next((f for f in folders if f['id'] == folder_id), None)
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
        updated = db.update_task(task_id, task_data.title, task_data.description)
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
            raise HTTPException(status_code=404, detail="Folder not found or already deleted")
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
        return {
            "task": task,
            "stats": stats
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Manual Tracking Control Endpoints
@app.post("/api/tracker/start")
async def start_tracking(task_id: int):
    """Start tracking for a specific task"""
    if not tracker:
        raise HTTPException(status_code=503, detail="Tracker not available")
    
    try:
        # Verify task exists
        task = db.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Stop current tracking if running
        if tracker.running:
            tracker.stop_tracking()
        
        # Start tracking for new task
        tracker.start_tracking(task_id)
        
        return {
            "status": "started",
            "task_id": task_id,
            "task_title": task['title']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting tracker: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tracker/stop")
async def stop_tracking():
    """Stop tracking"""
    if not tracker:
        raise HTTPException(status_code=503, detail="Tracker not available")
    
    try:
        tracker.stop_tracking()
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
            "statistics": stats
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
            date = stat['date']
            if date not in grouped:
                grouped[date] = []
            grouped[date].append(stat)
        
        return {
            "start_date": start_date or (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
            "end_date": datetime.now().strftime("%Y-%m-%d"),
            "statistics": grouped
        }
    except Exception as e:
        logger.error(f"Error getting weekly stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/timeline")
async def get_timeline(
    date: Optional[str] = None,
    limit: Optional[int] = Query(default=None, ge=1)
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
            "activities": timeline
        }
    except Exception as e:
        logger.error(f"Error getting timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/applications")
async def get_applications():
    """Get all tracked applications"""
    try:
        applications = db.get_all_applications()
        return {
            "applications": applications
        }
    except Exception as e:
        logger.error(f"Error getting applications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/activities")
async def get_activities(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    app_name: Optional[str] = None,
    limit: int = Query(default=1000, ge=1, le=10000)
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
        return {
            "activities": activities,
            "count": len(activities)
        }
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


@app.get("/api/export/data")
async def export_data(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format")
):
    """
    Get activities grouped by date -> task -> app for export
    Returns data structured for PDF generation
    """
    try:
        data = db.get_export_data(start_date, end_date)
        return {
            "start_date": start_date,
            "end_date": end_date,
            "data": data
        }
    except Exception as e:
        logger.error(f"Error getting export data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/pdf")
async def export_pdf(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format")
):
    """Generate and download PDF report for date range with summary and details"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch, cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Frame, PageTemplate
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
        import io
        
        # Get data
        data = db.get_export_data(start_date, end_date)
        
        # Calculate summary stats
        total_seconds = 0
        app_stats = {}
        task_stats = {}
        
        for day_data in data:
            for task in day_data.get('tasks', []):
                t_seconds = task['total_time']
                total_seconds += t_seconds
                
                # Task Stats
                t_title = task['task_title']
                if t_title not in task_stats:
                    task_stats[t_title] = 0
                task_stats[t_title] += t_seconds
                
                # App Stats
                for app in task.get('apps', []):
                    a_name = app['app_name']
                    a_seconds = app['duration']
                    if a_name not in app_stats:
                        app_stats[a_name] = 0
                    app_stats[a_name] += a_seconds

        # Sort stats
        sorted_apps = sorted(app_stats.items(), key=lambda x: x[1], reverse=True)[:5]
        sorted_tasks = sorted(task_stats.items(), key=lambda x: x[1], reverse=True)[:5]

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
            topMargin=0.8*inch, 
            bottomMargin=0.8*inch,
            leftMargin=0.8*inch,
            rightMargin=0.8*inch
        )
        
        # Define styles
        styles = getSampleStyleSheet()
        
        # Color Palette
        PRIMARY_COLOR = colors.HexColor('#6366f1') # Indigo 500
        SECONDARY_COLOR = colors.HexColor('#8b5cf6') # Violet 500
        ACCENT_COLOR = colors.HexColor('#a5b4fc') # Indigo 300
        BG_COLOR = colors.HexColor('#f9fafb') # Gray 50
        TEXT_COLOR = colors.HexColor('#1f2937') # Gray 800
        LIGHT_TEXT_COLOR = colors.HexColor('#6b7280') # Gray 500
        
        # Custom Styles
        style_title = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=28,
            textColor=PRIMARY_COLOR,
            spaceAfter=10,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        style_subtitle = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Normal'],
            fontSize=12,
            textColor=LIGHT_TEXT_COLOR,
            spaceAfter=40,
            alignment=TA_CENTER
        )
        
        style_section_header = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=SECONDARY_COLOR,
            spaceBefore=20,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        style_card_label = ParagraphStyle(
            'CardLabel',
            parent=styles['Normal'],
            fontSize=10,
            textColor=LIGHT_TEXT_COLOR,
            alignment=TA_CENTER
        )
        
        style_card_value = ParagraphStyle(
            'CardValue',
            parent=styles['Heading2'],
            fontSize=20,
            textColor=TEXT_COLOR,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        style_table_header = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.white,
            fontName='Helvetica-Bold'
        )
        
        # Container for elements
        elements = []
        
        # --- TITLE PAGE / SUMMARY ---
        
        elements.append(Paragraph("Time Tracking Report", style_title))
        elements.append(Paragraph(f"{start_date} — {end_date}", style_subtitle))
        
        # Total Time Card
        elements.append(Paragraph("TOTAL TIME LOGGED", style_card_label))
        elements.append(Paragraph(format_duration(total_seconds), style_card_value))
        elements.append(Spacer(1, 0.5*inch))
        
        # Top Applications & Tasks Table
        elements.append(Paragraph("Top Applications", style_section_header))
        
        if sorted_apps:
            table_data = [['Application', 'Duration']]
            for app, dur in sorted_apps:
                table_data.append([app, format_duration(dur)])
            
            t = Table(table_data, colWidths=[4*inch, 2*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('TOPPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_COLOR]),
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph("No application data available.", styles['Normal']))
            
        elements.append(Spacer(1, 0.3*inch))
        elements.append(Paragraph("Top Tasks", style_section_header))
        
        if sorted_tasks:
            table_data = [['Task', 'Duration']]
            for task, dur in sorted_tasks:
                table_data.append([task, format_duration(dur)])
            
            t = Table(table_data, colWidths=[4*inch, 2*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('TOPPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_COLOR]),
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph("No task data available.", styles['Normal']))
            
        elements.append(PageBreak())
        
        # --- DETAILED REPORT ---
        
        # Styles for details
        style_day_header = ParagraphStyle(
            'DayHeader',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=TEXT_COLOR,
            spaceBefore=15,
            spaceAfter=10,
            fontName='Helvetica-Bold',
            borderPadding=5,
            borderColor=colors.lightgrey,
            borderWidth=0,
            backColor=colors.HexColor('#f3f4f6')
        )
        
        style_task_title = ParagraphStyle(
            'TaskTitle',
            parent=styles['Heading3'],
            fontSize=11,
            textColor=PRIMARY_COLOR,
            spaceBefore=5,
            spaceAfter=2,
            fontName='Helvetica-Bold'
        )

        elements.append(Paragraph("Detailed Daily Activity", style_title))
        elements.append(Spacer(1, 0.2*inch))
        
        if not data:
             elements.append(Paragraph("No activities found for this period.", styles['Normal']))
        else:
            for i, day_data in enumerate(data):
                date_str = day_data['date']
                tasks = day_data['tasks']
                
                # Format nice date: "2023-10-27" -> "Friday, Oct 27"
                try:
                    dt = datetime.strptime(date_str, "%Y-%m-%d")
                    nice_date = dt.strftime("%A, %b %d")
                except:
                    nice_date = date_str
                
                elements.append(Paragraph(f"📅 {nice_date}", style_day_header))
                
                if not tasks:
                    elements.append(Paragraph("No recorded activity.", styles['Italic']))
                    continue
                    
                table_data = [['Task / Application', 'Time', 'Sessions']]
                
                for task_data in tasks:
                    # Task Row
                    task_title = task_data['task_title']
                    task_total = format_duration_detailed(task_data['total_time'])
                    
                    # Add task as a "Section" row in the table
                    table_data.append([
                        Paragraph(f"<b>{task_title}</b>", styles['Normal']),
                        Paragraph(f"<b>{task_total}</b>", styles['Normal']),
                        ""
                    ])
                    
                    # App Rows
                    for app in task_data.get('apps', []):
                        app_name = app['app_name']
                        app_dur = format_duration_detailed(app['duration'])
                        sess_count = str(app['session_count'])
                        
                        table_data.append([
                            Paragraph(f"<font color='#6b7280'>&nbsp;&nbsp;&nbsp;• {app_name}</font>", styles['Normal']),
                            Paragraph(f"<font color='#6b7280'>{app_dur}</font>", styles['Normal']),
                            Paragraph(f"<font color='#6b7280'>{sess_count}</font>", styles['Normal'])
                        ])
                
                # Render the table for this day
                t = Table(table_data, colWidths=[3.5*inch, 1.5*inch, 1*inch])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), LIGHT_TEXT_COLOR),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                    ('TOPPADDING', (0, 0), (-1, 0), 6),
                    
                    # General Rows
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('ALIGN', (1, 1), (-1, -1), 'LEFT'), # Duration column
                    ('ALIGN', (2, 1), (-1, -1), 'CENTER'), # Session column
                    ('LINEBELOW', (0, 0), (-1, -1), 0.25, colors.HexColor('#e5e7eb')),
                ]))
                
                elements.append(t)
                elements.append(Spacer(1, 0.3*inch))
                
                # Check for page break potential if it's getting long? 
                # ReportLab handles auto page breaks mostly fine with SimpleDocTemplate.

        # Build PDF
        def footer(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 9)
            canvas.setFillColor(colors.grey)
            page_num = canvas.getPageNumber()
            text = f"Page {page_num}"
            canvas.drawRightString(A4[0] - inch, 0.5*inch, text)
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
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except ImportError:
        raise HTTPException(
            status_code=500, 
            detail="reportlab not installed. Run: pip install reportlab"
        )
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/folder/{folder_id}/pdf")
async def export_folder_pdf(folder_id: int):
    """Generate and download PDF report for all tasks in a folder"""
    try:
        folder = db.get_folder(folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch, cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Frame, PageTemplate
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
        import io

        # Get data for folder (all dates)
        data = db.get_export_data_for_folder(folder_id)
        
        # Calculate summary stats for the folder
        total_seconds = 0
        app_stats = {}
        task_stats = {}
        
        for day_data in data:
            for task in day_data.get('tasks', []):
                t_seconds = task['total_time']
                total_seconds += t_seconds
                
                # Task Stats (within this folder)
                t_title = task['task_title']
                if t_title not in task_stats:
                    task_stats[t_title] = 0
                task_stats[t_title] += t_seconds
                
                # App Stats
                for app in task.get('apps', []):
                    a_name = app['app_name']
                    a_seconds = app['duration']
                    if a_name not in app_stats:
                        app_stats[a_name] = 0
                    app_stats[a_name] += a_seconds

        # Sort stats
        sorted_apps = sorted(app_stats.items(), key=lambda x: x[1], reverse=True)[:5]
        sorted_tasks = sorted(task_stats.items(), key=lambda x: x[1], reverse=True)[:5]

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
            topMargin=0.8*inch, 
            bottomMargin=0.8*inch,
            leftMargin=0.8*inch,
            rightMargin=0.8*inch
        )
        
        # Define styles (Same as export_pdf)
        styles = getSampleStyleSheet()
        
        # Color Palette
        PRIMARY_COLOR = colors.HexColor('#6366f1') # Indigo 500
        SECONDARY_COLOR = colors.HexColor('#8b5cf6') # Violet 500
        ACCENT_COLOR = colors.HexColor('#a5b4fc') # Indigo 300
        BG_COLOR = colors.HexColor('#f9fafb') # Gray 50
        TEXT_COLOR = colors.HexColor('#1f2937') # Gray 800
        LIGHT_TEXT_COLOR = colors.HexColor('#6b7280') # Gray 500
        
        # Custom Styles
        style_title = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=28,
            textColor=PRIMARY_COLOR,
            spaceAfter=10,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        style_subtitle = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Normal'],
            fontSize=12,
            textColor=LIGHT_TEXT_COLOR,
            spaceAfter=40,
            alignment=TA_CENTER
        )
        
        style_section_header = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=SECONDARY_COLOR,
            spaceBefore=20,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        style_card_label = ParagraphStyle(
            'CardLabel',
            parent=styles['Normal'],
            fontSize=10,
            textColor=LIGHT_TEXT_COLOR,
            alignment=TA_CENTER
        )
        
        style_card_value = ParagraphStyle(
            'CardValue',
            parent=styles['Heading2'],
            fontSize=20,
            textColor=TEXT_COLOR,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        elements = []
        
        # --- TITLE PAGE / SUMMARY ---
        
        elements.append(Paragraph(f"Folder Report: {folder['name']}", style_title))
        elements.append(Paragraph("Time Tracking Summary", style_subtitle))
        
        # Total Time Card
        elements.append(Paragraph("TOTAL TIME LOGGED", style_card_label))
        elements.append(Paragraph(format_duration(total_seconds), style_card_value))
        elements.append(Spacer(1, 0.5*inch))
        
        # Stats
        elements.append(Paragraph("Top Applications in Folder", style_section_header))
        
        if sorted_apps:
            table_data = [['Application', 'Duration']]
            for app, dur in sorted_apps:
                table_data.append([app, format_duration(dur)])
            
            t = Table(table_data, colWidths=[4*inch, 2*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('TOPPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_COLOR]),
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph("No application data available.", styles['Normal']))
            
        elements.append(Spacer(1, 0.3*inch))
        elements.append(Paragraph("Top Tasks in Folder", style_section_header))
        
        if sorted_tasks:
            table_data = [['Task', 'Duration']]
            for task, dur in sorted_tasks:
                table_data.append([task, format_duration(dur)])
            
            t = Table(table_data, colWidths=[4*inch, 2*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('TOPPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_COLOR]),
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph("No task data available.", styles['Normal']))
            
        elements.append(PageBreak())
        
         # --- DETAILED REPORT ---
        
        style_day_header = ParagraphStyle(
            'DayHeader',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=TEXT_COLOR,
            spaceBefore=15,
            spaceAfter=10,
            fontName='Helvetica-Bold',
            borderPadding=5,
            borderColor=colors.lightgrey,
            borderWidth=0,
            backColor=colors.HexColor('#f3f4f6')
        )

        elements.append(Paragraph("Detailed Daily Activity", style_section_header))
        
        if not data:
             elements.append(Paragraph("No activities found.", styles['Normal']))
        else:
             for i, day_data in enumerate(data):
                date_str = day_data['date']
                tasks = day_data['tasks']
                
                try:
                    dt = datetime.strptime(date_str, "%Y-%m-%d")
                    nice_date = dt.strftime("%A, %b %d")
                except:
                    nice_date = date_str
                
                elements.append(Paragraph(f"📅 {nice_date}", style_day_header))
                
                if not tasks:
                    elements.append(Paragraph("No recorded activity.", styles['Italic']))
                    continue
                    
                table_data = [['Task / Application', 'Time', 'Sessions']]
                
                for task_data in tasks:
                    # Task Row
                    task_title = task_data['task_title']
                    task_total = format_duration_detailed(task_data['total_time'])
                    
                    # Add task as a "Section" row in the table
                    table_data.append([
                        Paragraph(f"<b>{task_title}</b>", styles['Normal']),
                        Paragraph(f"<b>{task_total}</b>", styles['Normal']),
                        ""
                    ])
                    
                    # App Rows
                    for app in task_data.get('apps', []):
                        app_name = app['app_name']
                        app_dur = format_duration_detailed(app['duration'])
                        sess_count = str(app['session_count'])
                        
                        table_data.append([
                            Paragraph(f"<font color='#6b7280'>&nbsp;&nbsp;&nbsp;• {app_name}</font>", styles['Normal']),
                            Paragraph(f"<font color='#6b7280'>{app_dur}</font>", styles['Normal']),
                            Paragraph(f"<font color='#6b7280'>{sess_count}</font>", styles['Normal'])
                        ])
                
                # Render the table for this day
                t = Table(table_data, colWidths=[3.5*inch, 1.5*inch, 1*inch])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), LIGHT_TEXT_COLOR),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                    ('TOPPADDING', (0, 0), (-1, 0), 6),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('ALIGN', (1, 1), (-1, -1), 'LEFT'),
                    ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
                    ('LINEBELOW', (0, 0), (-1, -1), 0.25, colors.HexColor('#e5e7eb')),
                ]))
                
                elements.append(t)
                elements.append(Spacer(1, 0.3*inch))

        # Build PDF with Footer
        def footer(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 9)
            canvas.setFillColor(colors.grey)
            page_num = canvas.getPageNumber()
            text = f"Page {page_num}"
            canvas.drawRightString(A4[0] - inch, 0.5*inch, text)
            canvas.restoreState()

        doc.build(elements, onFirstPage=footer, onLaterPages=footer)

        # Return PDF
        pdf_data = buffer.getvalue()
        buffer.close()

        from fastapi.responses import Response
        filename = f"folder_report_{folder['name']}.pdf"
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"Error generating folder PDF: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        folder_title = Paragraph(f"<b>{folder['name']}</b>", folder_title_style)
        elements.append(Spacer(1, 0.8*inch))
        elements.append(folder_title)
        elements.append(Spacer(1, 0.3*inch))

        # Add overall total time under the title (centered)
        total_style = ParagraphStyle('TotalStyle', parent=styles['Normal'], fontSize=14, alignment=TA_CENTER)
        elements.append(Paragraph(f"Total time: <b>{format_duration(overall_total)}</b>", total_style))
        elements.append(PageBreak())

        # --- Detailed per-day sections follow ---
        if data:
            for day_data in data:
                date_str = day_data['date']
                tasks = day_data['tasks']

                day_heading = Paragraph(f"📅 {date_str}", heading_style)
                elements.append(day_heading)

                if not tasks:
                    elements.append(Paragraph("No activities tracked.", styles['Normal']))
                    elements.append(Spacer(1, 0.2*inch))
                    continue

                for task_data in tasks:
                    task_title = task_data['task_title']
                    task_description = task_data.get('task_description')
                    apps = task_data['apps']
                    total_time = task_data['total_time']

                    task_heading = Paragraph(
                        f"Task: {task_title} (Total: {format_duration(total_time)})",
                        subheading_style
                    )
                    elements.append(task_heading)

                    if task_description:
                        description_para = Paragraph(f"<i>{task_description}</i>", styles['Normal'])
                        elements.append(description_para)
                        elements.append(Spacer(1, 0.1*inch))

                    table_data = [['Application', 'Time Spent']]
                    for app in apps:
                        table_data.append([
                            app['app_name'],
                            format_duration(app['duration']),
                        ])

                    table = Table(table_data, colWidths=[3*inch, 1.5*inch, 1*inch])
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')])
                    ]))

                    elements.append(table)
                    elements.append(Spacer(1, 0.15*inch))

                if day_data != data[-1]:
                    elements.append(PageBreak())

        doc.build(elements)

        pdf_data = buffer.getvalue()
        buffer.close()

        from fastapi.responses import Response

        filename = f"folder_{folder_id}_{folder['name']}.pdf"
        # sanitize filename optionally
        filename = filename.replace(' ', '_')

        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="reportlab not installed. Run: pip install reportlab"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating folder PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/folder/{folder_id}/details.pdf")
async def export_folder_details_pdf(folder_id: int):
    """Generate a PDF containing only folder title (first page) and then
    a clean list of task name + description (no durations) for all tasks in the folder."""
    try:
        folder = db.get_folder(folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        # Fetch tasks for the folder (no limit or large limit)
        tasks = db.get_tasks(limit=1000, folder_id=folder_id)

        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        import io

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.8*inch, bottomMargin=0.5*inch)

        elements = []
        styles = getSampleStyleSheet()

        # Large folder title style
        folder_title_style = ParagraphStyle(
            'FolderTitle',
            parent=styles['Heading1'],
            fontSize=36,
            textColor=colors.HexColor('#8b5cf6'),
            alignment=TA_CENTER,
            spaceAfter=12
        )

        # Task title style (fancy)
        task_title_style = ParagraphStyle(
            'TaskTitle',
            parent=styles['Heading2'],
            fontSize=16,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#111111'),
            spaceAfter=6,
            leftIndent=6
        )

        # Task description style (darker for readability)
        task_desc_style = ParagraphStyle(
            'TaskDesc',
            parent=styles['Normal'],
            fontSize=11,
            fontName='Helvetica',
            textColor=colors.HexColor('#333333'),
            leftIndent=8,
            spaceAfter=12
        )

        # First page: folder name only
        elements.append(Spacer(1, 1.0*inch))
        elements.append(Paragraph(f"<b>{folder['name']}</b>", folder_title_style))
        elements.append(PageBreak())

        # Then each task: title + description (no durations)
        if not tasks:
            elements.append(Paragraph("No tasks in this folder.", styles['Normal']))
        else:
            for t in tasks:
                title = t.get('title') or f"Task {t.get('id')}"
                desc = t.get('description') or ''
                elements.append(Paragraph(title, task_title_style))
                if desc:
                    # Wrap description in italic for a 'fancy' look
                    elements.append(Paragraph(f"<i>{desc}</i>", task_desc_style))
                else:
                    # Add a small spacer if no description to keep spacing consistent
                    elements.append(Spacer(1, 0.1*inch))

        doc.build(elements)

        pdf_data = buffer.getvalue()
        buffer.close()

        from fastapi.responses import Response

        filename = f"folder_{folder_id}_{folder['name']}_details.pdf".replace(' ', '_')
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab not installed. Run: pip install reportlab")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating folder details PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Serve frontend static files
if config.FRONTEND_BUILD_PATH.exists():
    app.mount("/assets", StaticFiles(directory=config.FRONTEND_BUILD_PATH / "assets"), name="assets")
    
    @app.get("/")
    async def serve_frontend():
        """Serve the frontend application"""
        index_file = config.FRONTEND_BUILD_PATH / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse(
            status_code=404,
            content={"detail": "Frontend not built. Run 'npm run build' in the frontend directory."}
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
        
        return JSONResponse(
            status_code=404,
            content={"detail": "Not found"}
        )
else:
    logger.warning(f"Frontend build directory not found: {config.FRONTEND_BUILD_PATH}")
    logger.warning("Frontend will not be served. Please build the frontend first.")


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting server on {config.API_HOST}:{config.API_PORT}")
    logger.info(f"Database location: {config.DB_PATH}")
    logger.info(f"Frontend build path: {config.FRONTEND_BUILD_PATH}")
    
    uvicorn.run(
        app,
        host=config.API_HOST,
        port=config.API_PORT,
        log_level=config.LOG_LEVEL.lower()
    )
