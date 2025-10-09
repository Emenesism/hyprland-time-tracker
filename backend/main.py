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

# Initialize tracker
tracker = None

try:
    tracker = create_tracker(db, config.TRACKER_POLL_INTERVAL)
except Exception as e:
    logger.error(f"Failed to initialize tracker: {e}")
    logger.warning("API will run without tracking functionality")


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


class TrackerStatusResponse(BaseModel):
    running: bool
    current_app: Optional[str]
    current_window: Optional[str]
    activity_id: Optional[int]


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Start the tracker when the application starts"""
    logger.info("Starting Time Tracker application")
    if tracker:
        try:
            tracker.start_tracking()
            logger.info("Tracker started successfully")
        except Exception as e:
            logger.error(f"Failed to start tracker: {e}")


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
    limit: int = Query(default=100, ge=1, le=1000)
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
