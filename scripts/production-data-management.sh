#!/bin/bash

# Production Data Management and Cleanup Script for Zetra Platform
# Handles data archival, cleanup, and optimization tasks

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-/var/log/zetra}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
ARCHIVE_DIR="${ARCHIVE_DIR:-/archives}"
NAMESPACE="${NAMESPACE:-production}"

# Data retention policies (in days)
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-30}"
AUDIT_RETENTION_DAYS="${AUDIT_RETENTION_DAYS:-2555}" # 7 years
SESSION_RETENTION_DAYS="${SESSION_RETENTION_DAYS:-30}"
TEMP_FILE_RETENTION_DAYS="${TEMP_FILE_RETENTION_DAYS:-7}"
DELETED_RECORD_RETENTION_DAYS="${DELETED_RECORD_RETENTION_DAYS:-90}"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-zetra}"
DB_USER="${DB_USER:-zetra_admin}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Create directories
mkdir -p "${LOG_DIR}" "${BACKUP_DIR}" "${ARCHIVE_DIR}"

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_DIR}/data-management.log"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "${LOG_DIR}/data-management.log" >&2
}

log_warning() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" | tee -a "${LOG_DIR}/data-management.log"
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" | tee -a "${LOG_DIR}/data-management.log"
}

# Database connection helper
execute_sql() {
    local sql="$1"
    local description="${2:-SQL query}"
    
    log "Executing: $description"
    
    if [ -n "${DB_PASSWORD}" ]; then
        PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "$sql"
    else
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "$sql"
    fi
}

# Log cleanup functions
cleanup_application_logs() {
    log "Starting application log cleanup..."
    
    local cleaned_files=0
    local freed_space=0
    
    # Clean application logs
    if [ -d "/app/logs" ]; then
        log "Cleaning application logs older than ${LOG_RETENTION_DAYS} days..."
        
        while IFS= read -r -d '' file; do
            local file_size
            file_size=$(du -k "$file" | cut -f1)
            freed_space=$((freed_space + file_size))
            rm "$file"
            cleaned_files=$((cleaned_files + 1))
        done < <(find /app/logs -name "*.log" -type f -mtime +${LOG_RETENTION_DAYS} -print0 2>/dev/null || true)
    fi
    
    # Clean system logs
    if [ -d "/var/log" ]; then
        log "Cleaning system logs older than ${LOG_RETENTION_DAYS} days..."
        
        # Clean rotated logs
        while IFS= read -r -d '' file; do
            local file_size
            file_size=$(du -k "$file" | cut -f1)
            freed_space=$((freed_space + file_size))
            rm "$file"
            cleaned_files=$((cleaned_files + 1))
        done < <(find /var/log -name "*.log.*" -type f -mtime +${LOG_RETENTION_DAYS} -print0 2>/dev/null || true)
        
        # Clean compressed logs
        while IFS= read -r -d '' file; do
            local file_size
            file_size=$(du -k "$file" | cut -f1)
            freed_space=$((freed_space + file_size))
            rm "$file"
            cleaned_files=$((cleaned_files + 1))
        done < <(find /var/log -name "*.gz" -type f -mtime +${LOG_RETENTION_DAYS} -print0 2>/dev/null || true)
    fi
    
    # Clean Docker logs if running in containers
    if command -v docker &> /dev/null; then
        log "Cleaning Docker logs..."
        docker system prune -f --filter "until=${LOG_RETENTION_DAYS}h" &>/dev/null || true
    fi
    
    # Clean Kubernetes logs
    if command -v kubectl &> /dev/null; then
        log "Cleaning old Kubernetes events..."
        kubectl delete events --all-namespaces --field-selector="lastTimestamp<$(date -d "${LOG_RETENTION_DAYS} days ago" --iso-8601)" &>/dev/null || true
    fi
    
    log_success "Log cleanup completed: $cleaned_files files removed, $(( freed_space / 1024 )) MB freed"
}

cleanup_temporary_files() {
    log "Starting temporary file cleanup..."
    
    local cleaned_files=0
    local freed_space=0
    
    # Clean /tmp directory
    if [ -d "/tmp" ]; then
        log "Cleaning temporary files older than ${TEMP_FILE_RETENTION_DAYS} days..."
        
        while IFS= read -r -d '' file; do
            local file_size
            file_size=$(du -k "$file" | cut -f1 2>/dev/null || echo "0")
            freed_space=$((freed_space + file_size))
            rm -rf "$file"
            cleaned_files=$((cleaned_files + 1))
        done < <(find /tmp -type f -mtime +${TEMP_FILE_RETENTION_DAYS} -print0 2>/dev/null || true)
    fi
    
    # Clean application temp directories
    for temp_dir in "/app/temp" "/app/uploads/temp" "/var/tmp/zetra"; do
        if [ -d "$temp_dir" ]; then
            log "Cleaning $temp_dir..."
            
            while IFS= read -r -d '' file; do
                local file_size
                file_size=$(du -k "$file" | cut -f1 2>/dev/null || echo "0")
                freed_space=$((freed_space + file_size))
                rm -rf "$file"
                cleaned_files=$((cleaned_files + 1))
            done < <(find "$temp_dir" -type f -mtime +${TEMP_FILE_RETENTION_DAYS} -print0 2>/dev/null || true)
        fi
    done
    
    log_success "Temporary file cleanup completed: $cleaned_files files removed, $(( freed_space / 1024 )) MB freed"
}

# Database cleanup functions
cleanup_expired_sessions() {
    log "Starting expired session cleanup..."
    
    local cleanup_sql="
        DELETE FROM sessions 
        WHERE expires < NOW() - INTERVAL '${SESSION_RETENTION_DAYS} days';
    "
    
    local count_before
    count_before=$(execute_sql "SELECT COUNT(*) FROM sessions;" "Count sessions before cleanup" | tail -n 1 | xargs)
    
    execute_sql "$cleanup_sql" "Delete expired sessions"
    
    local count_after
    count_after=$(execute_sql "SELECT COUNT(*) FROM sessions;" "Count sessions after cleanup" | tail -n 1 | xargs)
    
    local cleaned_sessions=$((count_before - count_after))
    log_success "Session cleanup completed: $cleaned_sessions expired sessions removed"
}

cleanup_old_audit_logs() {
    log "Starting audit log cleanup..."
    
    # Archive old audit logs before deletion
    local archive_date
    archive_date=$(date -d "${AUDIT_RETENTION_DAYS} days ago" '+%Y-%m-%d')
    
    local archive_sql="
        COPY (
            SELECT * FROM audit_logs 
            WHERE created_at < '${archive_date}'
        ) TO STDOUT WITH CSV HEADER;
    "
    
    local archive_file="${ARCHIVE_DIR}/audit_logs_archive_$(date +%Y%m%d).csv"
    
    log "Archiving audit logs older than ${AUDIT_RETENTION_DAYS} days to $archive_file..."
    
    if [ -n "${DB_PASSWORD}" ]; then
        PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "$archive_sql" > "$archive_file"
    else
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "$archive_sql" > "$archive_file"
    fi
    
    # Compress the archive
    gzip "$archive_file"
    log "Audit log archive compressed: ${archive_file}.gz"
    
    # Delete old audit logs after archiving
    local cleanup_sql="
        DELETE FROM audit_logs 
        WHERE created_at < '${archive_date}';
    "
    
    local count_before
    count_before=$(execute_sql "SELECT COUNT(*) FROM audit_logs;" "Count audit logs before cleanup" | tail -n 1 | xargs)
    
    execute_sql "$cleanup_sql" "Delete old audit logs"
    
    local count_after
    count_after=$(execute_sql "SELECT COUNT(*) FROM audit_logs;" "Count audit logs after cleanup" | tail -n 1 | xargs)
    
    local cleaned_logs=$((count_before - count_after))
    log_success "Audit log cleanup completed: $cleaned_logs old records archived and removed"
}

cleanup_soft_deleted_records() {
    log "Starting soft-deleted record cleanup..."
    
    local cutoff_date
    cutoff_date=$(date -d "${DELETED_RECORD_RETENTION_DAYS} days ago" '+%Y-%m-%d')
    
    # Tables with soft delete functionality
    local tables=("tasks" "documents" "users" "organizations")
    local total_cleaned=0
    
    for table in "${tables[@]}"; do
        log "Cleaning soft-deleted records from $table table..."
        
        # Check if table exists and has is_deleted column
        local table_exists
        table_exists=$(execute_sql "
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = '$table' 
            AND column_name = 'is_deleted';
        " "Check if $table has is_deleted column" | tail -n 1 | xargs)
        
        if [ "$table_exists" -eq 0 ]; then
            log_warning "Table $table does not have is_deleted column, skipping..."
            continue
        fi
        
        # Count records to be deleted
        local count_to_delete
        count_to_delete=$(execute_sql "
            SELECT COUNT(*) 
            FROM $table 
            WHERE is_deleted = true 
            AND deleted_at < '${cutoff_date}';
        " "Count soft-deleted records in $table" | tail -n 1 | xargs)
        
        if [ "$count_to_delete" -gt 0 ]; then
            # Delete the records
            execute_sql "
                DELETE FROM $table 
                WHERE is_deleted = true 
                AND deleted_at < '${cutoff_date}';
            " "Delete old soft-deleted records from $table"
            
            total_cleaned=$((total_cleaned + count_to_delete))
            log_success "Cleaned $count_to_delete soft-deleted records from $table"
        else
            log "No soft-deleted records to clean from $table"
        fi
    done
    
    log_success "Soft-deleted record cleanup completed: $total_cleaned total records removed"
}

cleanup_orphaned_files() {
    log "Starting orphaned file cleanup..."
    
    local cleaned_files=0
    local freed_space=0
    
    # Check for orphaned document files
    if [ -d "/app/uploads" ]; then
        log "Checking for orphaned document files..."
        
        # Get list of files in uploads directory
        local upload_files
        upload_files=$(find /app/uploads -type f -name "*" 2>/dev/null || true)
        
        if [ -n "$upload_files" ]; then
            while IFS= read -r file; do
                local filename
                filename=$(basename "$file")
                
                # Check if file exists in database
                local file_exists
                file_exists=$(execute_sql "
                    SELECT COUNT(*) 
                    FROM documents 
                    WHERE file_path LIKE '%${filename}%' 
                    AND is_deleted = false;
                " "Check if file exists in database" | tail -n 1 | xargs)
                
                if [ "$file_exists" -eq 0 ]; then
                    # File is orphaned, move to archive before deletion
                    local archive_path="${ARCHIVE_DIR}/orphaned_files/$(date +%Y%m%d)"
                    mkdir -p "$archive_path"
                    
                    local file_size
                    file_size=$(du -k "$file" | cut -f1)
                    
                    mv "$file" "$archive_path/"
                    freed_space=$((freed_space + file_size))
                    cleaned_files=$((cleaned_files + 1))
                    
                    log "Archived orphaned file: $filename"
                fi
            done <<< "$upload_files"
        fi
    fi
    
    log_success "Orphaned file cleanup completed: $cleaned_files files archived, $(( freed_space / 1024 )) MB freed"
}

# Database optimization functions
optimize_database() {
    log "Starting database optimization..."
    
    # Update table statistics
    log "Updating table statistics..."
    execute_sql "ANALYZE;" "Update table statistics"
    
    # Vacuum tables to reclaim space
    log "Vacuuming tables to reclaim space..."
    execute_sql "VACUUM;" "Vacuum tables"
    
    # Reindex tables for better performance
    log "Reindexing tables..."
    execute_sql "REINDEX DATABASE ${DB_NAME};" "Reindex database"
    
    # Check for unused indexes
    log "Checking for unused indexes..."
    local unused_indexes
    unused_indexes=$(execute_sql "
        SELECT schemaname, tablename, indexname, idx_scan
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0 
        AND indexname NOT LIKE '%_pkey';
    " "Find unused indexes" | tail -n +3 | head -n -2)
    
    if [ -n "$unused_indexes" ]; then
        log_warning "Found unused indexes:"
        echo "$unused_indexes" | while IFS= read -r line; do
            log_warning "  $line"
        done
        log_warning "Consider reviewing and potentially dropping unused indexes"
    else
        log_success "No unused indexes found"
    fi
    
    log_success "Database optimization completed"
}

# Monitoring and reporting functions
generate_cleanup_report() {
    log "Generating cleanup report..."
    
    local report_file="${LOG_DIR}/cleanup_report_$(date +%Y%m%d_%H%M%S).md"
    
    {
        echo "# Data Management and Cleanup Report"
        echo ""
        echo "**Date:** $(date)"
        echo "**Server:** $(hostname)"
        echo ""
        
        echo "## Summary"
        echo ""
        echo "This report summarizes the data management and cleanup activities performed."
        echo ""
        
        echo "## System Information"
        echo ""
        echo "- **Hostname:** $(hostname)"
        echo "- **Uptime:** $(uptime | awk -F'up ' '{print $2}' | awk -F',' '{print $1}')"
        echo "- **Load Average:** $(uptime | awk -F'load average:' '{print $2}')"
        echo ""
        
        echo "## Disk Usage"
        echo ""
        echo "### Before Cleanup"
        echo "```"
        df -h
        echo "```"
        echo ""
        
        echo "## Database Statistics"
        echo ""
        if command -v psql &> /dev/null; then
            echo "### Database Size"
            echo "```"
            execute_sql "
                SELECT 
                    pg_database.datname,
                    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
                FROM pg_database
                WHERE pg_database.datname = '${DB_NAME}';
            " "Get database size" 2>/dev/null || echo "Database size query failed"
            echo "```"
            echo ""
            
            echo "### Table Sizes"
            echo "```"
            execute_sql "
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
                FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                LIMIT 10;
            " "Get table sizes" 2>/dev/null || echo "Table size query failed"
            echo "```"
        fi
        echo ""
        
        echo "## Cleanup Activities"
        echo ""
        echo "The following cleanup activities were performed:"
        echo ""
        echo "- ✅ Application log cleanup"
        echo "- ✅ Temporary file cleanup"
        echo "- ✅ Expired session cleanup"
        echo "- ✅ Audit log archival and cleanup"
        echo "- ✅ Soft-deleted record cleanup"
        echo "- ✅ Orphaned file cleanup"
        echo "- ✅ Database optimization"
        echo ""
        
        echo "## Recommendations"
        echo ""
        echo "1. Monitor disk usage regularly"
        echo "2. Review database performance metrics"
        echo "3. Consider implementing automated cleanup schedules"
        echo "4. Review and optimize slow queries"
        echo "5. Monitor backup and archive storage usage"
        echo ""
        
        echo "## Next Scheduled Cleanup"
        echo ""
        echo "Next cleanup should be performed in 7 days or when disk usage exceeds 80%."
        
    } > "$report_file"
    
    log_success "Cleanup report generated: $report_file"
}

# Main cleanup orchestration
perform_full_cleanup() {
    log "Starting comprehensive data management and cleanup..."
    
    local start_time
    start_time=$(date +%s)
    
    # Pre-cleanup disk usage
    local disk_usage_before
    disk_usage_before=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    log "Disk usage before cleanup: ${disk_usage_before}%"
    
    # Perform cleanup tasks
    cleanup_application_logs
    cleanup_temporary_files
    cleanup_expired_sessions
    cleanup_old_audit_logs
    cleanup_soft_deleted_records
    cleanup_orphaned_files
    optimize_database
    
    # Post-cleanup disk usage
    local disk_usage_after
    disk_usage_after=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    log "Disk usage after cleanup: ${disk_usage_after}%"
    
    local disk_freed=$((disk_usage_before - disk_usage_after))
    log_success "Disk space freed: ${disk_freed}%"
    
    # Generate report
    generate_cleanup_report
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "Full cleanup completed in ${duration} seconds"
}

# Maintenance mode functions
enable_maintenance_mode() {
    log "Enabling maintenance mode..."
    
    if command -v kubectl &> /dev/null; then
        # Scale down application pods
        kubectl scale deployment zetra-platform-blue --replicas=0 -n "$NAMESPACE" || log_warning "Failed to scale down blue deployment"
        kubectl scale deployment zetra-platform-green --replicas=0 -n "$NAMESPACE" || log_warning "Failed to scale down green deployment"
        
        # Create maintenance page
        kubectl create configmap maintenance-page --from-literal=index.html="
        <!DOCTYPE html>
        <html>
        <head>
            <title>Maintenance - Zetra Platform</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
                .container { max-width: 600px; margin: 0 auto; }
                h1 { color: #333; }
                p { color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <h1>Maintenance in Progress</h1>
                <p>The Zetra Platform is currently undergoing scheduled maintenance.</p>
                <p>We'll be back shortly. Thank you for your patience.</p>
                <p><small>Started: $(date)</small></p>
            </div>
        </body>
        </html>
        " -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - || log_warning "Failed to create maintenance page"
        
        log_success "Maintenance mode enabled"
    else
        log_warning "kubectl not available, cannot enable maintenance mode"
    fi
}

disable_maintenance_mode() {
    log "Disabling maintenance mode..."
    
    if command -v kubectl &> /dev/null; then
        # Remove maintenance page
        kubectl delete configmap maintenance-page -n "$NAMESPACE" || log_warning "Failed to remove maintenance page"
        
        # Scale up application pods
        kubectl scale deployment zetra-platform-blue --replicas=3 -n "$NAMESPACE" || log_warning "Failed to scale up blue deployment"
        
        # Wait for pods to be ready
        kubectl rollout status deployment/zetra-platform-blue -n "$NAMESPACE" --timeout=300s || log_warning "Deployment rollout timed out"
        
        log_success "Maintenance mode disabled"
    else
        log_warning "kubectl not available, cannot disable maintenance mode"
    fi
}

# Main execution
case "${1:-full}" in
    logs)
        cleanup_application_logs
        ;;
    temp)
        cleanup_temporary_files
        ;;
    sessions)
        cleanup_expired_sessions
        ;;
    audit)
        cleanup_old_audit_logs
        ;;
    deleted)
        cleanup_soft_deleted_records
        ;;
    orphaned)
        cleanup_orphaned_files
        ;;
    optimize)
        optimize_database
        ;;
    report)
        generate_cleanup_report
        ;;
    maintenance-on)
        enable_maintenance_mode
        ;;
    maintenance-off)
        disable_maintenance_mode
        ;;
    full)
        perform_full_cleanup
        ;;
    *)
        echo "Usage: $0 {logs|temp|sessions|audit|deleted|orphaned|optimize|report|maintenance-on|maintenance-off|full}"
        echo ""
        echo "Commands:"
        echo "  logs           - Clean application and system logs"
        echo "  temp           - Clean temporary files"
        echo "  sessions       - Clean expired sessions"
        echo "  audit          - Archive and clean old audit logs"
        echo "  deleted        - Clean soft-deleted records"
        echo "  orphaned       - Clean orphaned files"
        echo "  optimize       - Optimize database"
        echo "  report         - Generate cleanup report"
        echo "  maintenance-on - Enable maintenance mode"
        echo "  maintenance-off- Disable maintenance mode"
        echo "  full           - Perform full cleanup (default)"
        echo ""
        echo "Environment variables:"
        echo "  LOG_RETENTION_DAYS           - Log retention period (default: 30)"
        echo "  AUDIT_RETENTION_DAYS         - Audit log retention period (default: 2555)"
        echo "  SESSION_RETENTION_DAYS       - Session retention period (default: 30)"
        echo "  TEMP_FILE_RETENTION_DAYS     - Temporary file retention period (default: 7)"
        echo "  DELETED_RECORD_RETENTION_DAYS- Soft-deleted record retention period (default: 90)"
        echo "  DB_HOST                      - Database host"
        echo "  DB_PASSWORD                  - Database password"
        exit 1
        ;;
esac