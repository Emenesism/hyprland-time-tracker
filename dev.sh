#!/bin/bash

# Development script - Run backend and frontend in development mode

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Starting Time Tracker in Development Mode"
echo "==========================================="
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "Starting backend..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
python main.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "Starting frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "==========================================="
echo "Development servers started!"
echo "==========================================="
echo ""
echo "Backend API: http://localhost:8000"
echo "Frontend Dev: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait
