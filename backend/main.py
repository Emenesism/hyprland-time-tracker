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
    """Generate and download PDF report for date range"""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        import io
        
        # Get data
        data = db.get_export_data(start_date, end_date)
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Container for the PDF elements
        elements = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#8b5cf6'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#6366f1'),
            spaceAfter=12,
            spaceBefore=20
        )
        
        subheading_style = ParagraphStyle(
            'CustomSubHeading',
            parent=styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#8b5cf6'),
            spaceAfter=8,
            spaceBefore=12
        )
        
        # Title
        title = Paragraph(f"Time Tracker Report", title_style)
        elements.append(title)
        
        subtitle = Paragraph(f"Period: {start_date} to {end_date}", styles['Normal'])
        elements.append(subtitle)
        elements.append(Spacer(1, 0.3*inch))
        
        # Helper function to format duration
        def format_duration(seconds):
            if not seconds:
                return "0m"
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            if hours > 0:
                return f"{hours}h {minutes}m"
            return f"{minutes}m"
        
        # Process each day
        if not data:
            elements.append(Paragraph("No activities found for this period.", styles['Normal']))
        else:
            for day_data in data:
                date_str = day_data['date']
                tasks = day_data['tasks']
                
                # Day heading
                day_heading = Paragraph(f"📅 {date_str}", heading_style)
                elements.append(day_heading)
                
                if not tasks:
                    elements.append(Paragraph("No activities tracked.", styles['Normal']))
                    elements.append(Spacer(1, 0.2*inch))
                    continue
                
                # Process each task
                for task_data in tasks:
                    task_title = task_data['task_title']
                    task_description = task_data.get('task_description')
                    apps = task_data['apps']
                    total_time = task_data['total_time']
                    
                    # Task subheading with title
                    task_heading = Paragraph(
                        f"Task: {task_title} (Total: {format_duration(total_time)})",
                        subheading_style
                    )
                    elements.append(task_heading)
                    
                    # Add task description if available
                    if task_description:
                        description_para = Paragraph(
                            f"<i>{task_description}</i>",
                            styles['Normal']
                        )
                        elements.append(description_para)
                        elements.append(Spacer(1, 0.1*inch))
                    
                    # Create table for apps
                    table_data = [['Application', 'Time Spent', 'Sessions']]
                    
                    for app in apps:
                        table_data.append([
                            app['app_name'],
                            format_duration(app['duration']),
                            str(app['session_count'])
                        ])
                    
                    # Create and style table
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
                
                # Add page break after each day (except last)
                if day_data != data[-1]:
                    elements.append(PageBreak())
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Return PDF as download
        from fastapi.responses import Response
        
        filename = f"timetracker_{start_date}_{end_date}.pdf"
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
