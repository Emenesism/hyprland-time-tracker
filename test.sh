#!/bin/bash

# Test script to verify Time Tracker installation and functionality

echo "=========================================="
echo "Time Tracker Test Suite"
echo "=========================================="
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
TESTS_PASSED=0
TESTS_FAILED=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

test_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Test 1: Check Python installation
echo "Test 1: Python installation"
if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version)
    test_pass "Python installed: $PYTHON_VERSION"
else
    test_fail "Python not found"
fi
echo ""

# Test 2: Check virtual environment
echo "Test 2: Virtual environment"
if [ -d "$BACKEND_DIR/venv" ]; then
    test_pass "Virtual environment exists"
else
    test_fail "Virtual environment not found. Run install.sh first."
fi
echo ""

# Test 3: Check Python dependencies
echo "Test 3: Python dependencies"
cd "$BACKEND_DIR"
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    
    # Check for key dependencies
    DEPS=("fastapi" "uvicorn" "pydantic")
    for dep in "${DEPS[@]}"; do
        if python -c "import $dep" 2>/dev/null; then
            test_pass "$dep installed"
        else
            test_fail "$dep not installed"
        fi
    done
    deactivate
else
    test_fail "Cannot activate virtual environment"
fi
echo ""

# Test 4: Check Node.js and npm
echo "Test 4: Node.js installation"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    test_pass "Node.js installed: $NODE_VERSION"
else
    test_fail "Node.js not found"
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    test_pass "npm installed: $NPM_VERSION"
else
    test_fail "npm not found"
fi
echo ""

# Test 5: Check frontend build
echo "Test 5: Frontend build"
if [ -d "$SCRIPT_DIR/frontend/dist" ]; then
    test_pass "Frontend build exists"
    if [ -f "$SCRIPT_DIR/frontend/dist/index.html" ]; then
        test_pass "Frontend index.html exists"
    else
        test_fail "Frontend index.html not found"
    fi
else
    test_warn "Frontend not built. Run: cd frontend && npm run build"
fi
echo ""

# Test 6: Check window tracker availability
echo "Test 6: Window tracker"
if command -v hyprctl >/dev/null 2>&1; then
    test_pass "hyprctl found (Hyprland tracker available)"
    
    # Test if Hyprland is actually running
    if hyprctl version >/dev/null 2>&1; then
        test_pass "Hyprland is running"
    else
        test_warn "hyprctl found but Hyprland may not be running"
    fi
elif command -v xdotool >/dev/null 2>&1; then
    test_pass "xdotool found (X11 fallback available)"
else
    test_fail "No window tracker found (need hyprctl or xdotool)"
fi
echo ""

# Test 7: Check systemd service
echo "Test 7: Systemd service"
if [ -f "$HOME/.config/systemd/user/timetracker.service" ]; then
    test_pass "Systemd service file installed"
    
    if systemctl --user is-enabled timetracker.service >/dev/null 2>&1; then
        test_pass "Service is enabled"
    else
        test_warn "Service exists but not enabled"
    fi
    
    if systemctl --user is-active timetracker.service >/dev/null 2>&1; then
        test_pass "Service is running"
    else
        test_warn "Service not running. Start with: systemctl --user start timetracker"
    fi
else
    test_warn "Systemd service not installed. Run install.sh"
fi
echo ""

# Test 8: Check database
echo "Test 8: Database"
if [ -f "$BACKEND_DIR/timetracker.db" ]; then
    test_pass "Database file exists"
    
    # Check if database is accessible
    cd "$BACKEND_DIR"
    source venv/bin/activate 2>/dev/null
    if python -c "import sqlite3; conn = sqlite3.connect('timetracker.db'); conn.close(); print('OK')" 2>/dev/null | grep -q "OK"; then
        test_pass "Database is accessible"
    else
        test_fail "Database exists but not accessible"
    fi
    deactivate 2>/dev/null
else
    test_warn "Database not created yet (will be created on first run)"
fi
echo ""

# Test 9: Check API connectivity (if service is running)
echo "Test 9: API connectivity"
if systemctl --user is-active timetracker.service >/dev/null 2>&1; then
    if curl -s -f http://localhost:8000/api/health >/dev/null; then
        test_pass "API is responding"
        
        # Test API endpoint
        API_RESPONSE=$(curl -s http://localhost:8000/api/health)
        if echo "$API_RESPONSE" | grep -q "healthy"; then
            test_pass "API health check passed"
        else
            test_warn "API responding but health check unclear"
        fi
    else
        test_warn "API not responding (service may be starting up)"
    fi
else
    test_warn "Service not running, skipping API test"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Failed:${NC} $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All critical tests passed! ✓${NC}"
    echo ""
    echo "Your Time Tracker installation looks good!"
    echo "Access the dashboard at: http://localhost:8000"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    echo ""
    echo "Please review the failures above and:"
    echo "  1. Make sure all dependencies are installed"
    echo "  2. Run ./install.sh if you haven't already"
    echo "  3. Check the logs: journalctl --user -u timetracker -n 50"
    exit 1
fi
