#!/bin/bash

# Zetra Platform Stop Script
# Stops all Zetra platform services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$PROJECT_DIR/pids"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo -e "${RED}
╔══════════════════════════════════════════════════════════════════════════════╗
║                        Stopping Zetra Platform                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${NC}"

log "Stopping all Zetra services..."

# Stop processes using PID files
if [ -f "$PID_DIR/frontend.pid" ]; then
    log "Stopping Next.js frontend..."
    kill "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null || true
    rm -f "$PID_DIR/frontend.pid"
fi

if [ -f "$PID_DIR/prisma-studio.pid" ]; then
    log "Stopping Prisma Studio..."
    kill "$(cat "$PID_DIR/prisma-studio.pid")" 2>/dev/null || true
    rm -f "$PID_DIR/prisma-studio.pid"
fi

# Kill any remaining processes
log "Cleaning up remaining processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "prisma studio" 2>/dev/null || true

# Kill processes on specific ports
for port in 3000 3003 5555; do
    if lsof -ti:$port >/dev/null 2>&1; then
        log "Killing process on port $port"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

log "✅ All Zetra services stopped successfully!"
log "To restart, run: ./start-zetra.sh"