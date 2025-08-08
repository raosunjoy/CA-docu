# Zetra Platform Startup Scripts

This document explains how to use the startup scripts to run the Zetra platform with all its services.

## Quick Start

### Option 1: Using the startup script directly
```bash
# Start with default settings (PostgreSQL + Frontend)
./start-zetra.sh

# Start with all services
./start-zetra.sh --with-redis --with-elasticsearch --with-prisma-studio

# Stop all services
./stop-zetra.sh
```

### Option 2: Using npm scripts (recommended)
```bash
# Start with default settings
npm run zetra:start

# Start in development mode
npm run zetra:dev

# Start with all services
npm run zetra:full

# Check service status
npm run zetra:status

# Stop all services
npm run zetra:stop
```

## Available Scripts

### Startup Script: `start-zetra.sh`

The main startup script that handles all services for the Zetra platform.

#### Command Line Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |
| `-d, --dev` | Start in development mode (default) |
| `-p, --production` | Start in production mode |
| `--no-postgres` | Skip PostgreSQL startup |
| `--with-redis` | Start Redis server |
| `--with-elasticsearch` | Start Elasticsearch server |
| `--with-prisma-studio` | Start Prisma Studio |
| `--frontend-only` | Start only the frontend |
| `--status` | Show current service status |
| `--stop` | Stop all services |

#### Examples

```bash
# Basic startup (PostgreSQL + Frontend)
./start-zetra.sh

# Development mode with all services
./start-zetra.sh --dev --with-redis --with-elasticsearch --with-prisma-studio

# Production mode
./start-zetra.sh --production

# Frontend only (useful for API development)
./start-zetra.sh --frontend-only

# Check what's running
./start-zetra.sh --status

# Stop everything
./start-zetra.sh --stop
```

### Stop Script: `stop-zetra.sh`

Dedicated script to stop all Zetra services gracefully.

```bash
./stop-zetra.sh
```

## NPM Scripts

For convenience, several npm scripts are available:

| Script | Command | Description |
|--------|---------|-------------|
| `npm run zetra:start` | `./start-zetra.sh` | Start with default settings |
| `npm run zetra:dev` | `./start-zetra.sh --dev` | Start in development mode |
| `npm run zetra:prod` | `./start-zetra.sh --production` | Start in production mode |
| `npm run zetra:full` | `./start-zetra.sh --with-redis --with-elasticsearch --with-prisma-studio` | Start all services |
| `npm run zetra:status` | `./start-zetra.sh --status` | Show service status |
| `npm run zetra:stop` | `./stop-zetra.sh` | Stop all services |

## Services Overview

### Core Services (Always Started)

1. **PostgreSQL Database**
   - Port: 5432
   - Required for all data storage
   - Automatically syncs Prisma schema

2. **Next.js Frontend**
   - Port: 3000 (or next available)
   - Serves the main application interface
   - Hot reload in development mode

### Optional Services

3. **Redis** (--with-redis)
   - Port: 6379
   - Used for caching and session management
   - Improves performance

4. **Elasticsearch** (--with-elasticsearch)
   - Port: 9200
   - Provides advanced search capabilities
   - Used for document and content search

5. **Prisma Studio** (--with-prisma-studio)
   - Port: 5555
   - Database administration interface
   - Useful for development and debugging

## Service Status

After starting, you'll see a status overview like this:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                            Service Status                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
PostgreSQL:     ✓ Running (localhost:5432)
Redis:          ○ Not Started
Elasticsearch:  ○ Not Started
Frontend:       ✓ Running (http://localhost:3000)
Prisma Studio:  ○ Not Started
```

Legend:
- ✓ Running (green) - Service is active and healthy
- ✗ Not Running (red) - Service failed to start
- ○ Not Started (yellow) - Service not configured to start

## Logs and Debugging

### Log Files
All service logs are stored in the `logs/` directory:

- `logs/frontend.log` - Next.js frontend logs
- `logs/prisma-studio.log` - Prisma Studio logs

### Viewing Logs
```bash
# View frontend logs in real-time
tail -f logs/frontend.log

# View Prisma Studio logs
tail -f logs/prisma-studio.log
```

### Process IDs
PID files are stored in the `pids/` directory for process management:

- `pids/frontend.pid` - Next.js frontend process ID
- `pids/prisma-studio.pid` - Prisma Studio process ID

## Troubleshooting

### Common Issues

#### Port Already in Use
If you see port conflicts, the script will:
1. Try to find the next available port
2. Show a warning with the actual port being used
3. Continue startup with the new port

#### PostgreSQL Not Starting
- Ensure Homebrew is installed: `brew --version`
- Install PostgreSQL: `brew install postgresql@15`
- Start manually: `brew services start postgresql@15`

#### Dependencies Out of Date
The script automatically runs `npm install` if needed, but you can also run:
```bash
npm install
npm run db:generate
```

#### Permission Issues
Make sure scripts are executable:
```bash
chmod +x start-zetra.sh
chmod +x stop-zetra.sh
```

### Environment Variables

The scripts use the following environment variables (automatically loaded from `.env`):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT secret for authentication
- `REDIS_HOST`, `REDIS_PORT` - Redis configuration
- `ELASTICSEARCH_URL` - Elasticsearch connection

### Health Checks

The startup script includes comprehensive health checks:
1. Port availability verification
2. Service response testing
3. Database connection validation
4. Frontend accessibility check

If any health check fails, the script will:
1. Show detailed error information
2. Suggest troubleshooting steps
3. Exit with error code for automated environments

## Development Workflow

### Typical Development Session

1. **Start services**:
   ```bash
   npm run zetra:dev
   ```

2. **Check status**:
   ```bash
   npm run zetra:status
   ```

3. **View logs** (in separate terminal):
   ```bash
   tail -f logs/frontend.log
   ```

4. **Stop when done**:
   ```bash
   npm run zetra:stop
   ```

### Production Deployment

1. **Build and start in production mode**:
   ```bash
   npm run zetra:prod
   ```

2. **Start with all services for full functionality**:
   ```bash
   npm run zetra:full
   ```

## Support

If you encounter issues with the startup scripts:

1. Check the logs in `logs/` directory
2. Verify all dependencies are installed
3. Ensure PostgreSQL is properly configured
4. Run `./start-zetra.sh --status` to check service states
5. Try `./start-zetra.sh --help` for all available options

For more detailed troubleshooting, refer to the main project documentation or contact the development team.