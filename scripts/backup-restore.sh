#!/bin/bash

# Zetra Platform Backup and Restore Script
# Supports database, file storage, and configuration backups

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
S3_BUCKET="${S3_BUCKET:-zetra-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-zetra}"
DB_USER="${DB_USER:-zetra_admin}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Redis configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${BACKUP_DIR}/backup.log"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "${BACKUP_DIR}/backup.log" >&2
    exit 1
}

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Generate backup timestamp
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_NAME="zetra_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

backup_database() {
    log "Starting database backup..."
    
    mkdir -p "${BACKUP_PATH}/database"
    
    # PostgreSQL backup
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="${BACKUP_PATH}/database/postgres_${TIMESTAMP}.dump"
    
    # Also create a plain SQL backup for easier restoration
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --verbose \
        --no-password \
        --format=plain \
        --file="${BACKUP_PATH}/database/postgres_${TIMESTAMP}.sql"
    
    # Backup database schema only
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --schema-only \
        --verbose \
        --no-password \
        --file="${BACKUP_PATH}/database/schema_${TIMESTAMP}.sql"
    
    log "Database backup completed"
}

backup_redis() {
    log "Starting Redis backup..."
    
    mkdir -p "${BACKUP_PATH}/redis"
    
    if [ -n "${REDIS_PASSWORD}" ]; then
        redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" --rdb "${BACKUP_PATH}/redis/dump_${TIMESTAMP}.rdb"
    else
        redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" --rdb "${BACKUP_PATH}/redis/dump_${TIMESTAMP}.rdb"
    fi
    
    log "Redis backup completed"
}

backup_files() {
    log "Starting file system backup..."
    
    mkdir -p "${BACKUP_PATH}/files"
    
    # Backup uploaded documents (if using local storage)
    if [ -d "/app/uploads" ]; then
        tar -czf "${BACKUP_PATH}/files/uploads_${TIMESTAMP}.tar.gz" -C /app uploads/
    fi
    
    # Backup configuration files
    if [ -d "/app/config" ]; then
        tar -czf "${BACKUP_PATH}/files/config_${TIMESTAMP}.tar.gz" -C /app config/
    fi
    
    # Backup logs
    if [ -d "/app/logs" ]; then
        tar -czf "${BACKUP_PATH}/files/logs_${TIMESTAMP}.tar.gz" -C /app logs/
    fi
    
    log "File system backup completed"
}

backup_kubernetes_config() {
    log "Starting Kubernetes configuration backup..."
    
    mkdir -p "${BACKUP_PATH}/k8s"
    
    # Backup all Kubernetes resources in the zetra namespace
    kubectl get all -n production -o yaml > "${BACKUP_PATH}/k8s/all_resources_${TIMESTAMP}.yaml"
    kubectl get secrets -n production -o yaml > "${BACKUP_PATH}/k8s/secrets_${TIMESTAMP}.yaml"
    kubectl get configmaps -n production -o yaml > "${BACKUP_PATH}/k8s/configmaps_${TIMESTAMP}.yaml"
    kubectl get pvc -n production -o yaml > "${BACKUP_PATH}/k8s/pvc_${TIMESTAMP}.yaml"
    
    log "Kubernetes configuration backup completed"
}

encrypt_backup() {
    if [ -n "${ENCRYPTION_KEY}" ]; then
        log "Encrypting backup..."
        
        tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
        
        # Encrypt the backup
        openssl enc -aes-256-cbc -salt -in "${BACKUP_PATH}.tar.gz" -out "${BACKUP_PATH}.tar.gz.enc" -k "${ENCRYPTION_KEY}"
        
        # Remove unencrypted files
        rm -rf "${BACKUP_PATH}" "${BACKUP_PATH}.tar.gz"
        
        log "Backup encrypted successfully"
    else
        log "Creating compressed backup..."
        tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
        rm -rf "${BACKUP_PATH}"
    fi
}

upload_to_s3() {
    log "Uploading backup to S3..."
    
    local backup_file
    if [ -n "${ENCRYPTION_KEY}" ]; then
        backup_file="${BACKUP_PATH}.tar.gz.enc"
    else
        backup_file="${BACKUP_PATH}.tar.gz"
    fi
    
    aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/backups/$(basename "${backup_file}")" \
        --storage-class STANDARD_IA \
        --metadata "timestamp=${TIMESTAMP},environment=${ENVIRONMENT:-production}"
    
    log "Backup uploaded to S3 successfully"
}

cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Remove local backups older than retention period
    find "${BACKUP_DIR}" -name "zetra_backup_*" -type f -mtime +${RETENTION_DAYS} -delete
    
    # Remove old S3 backups
    aws s3 ls "s3://${S3_BUCKET}/backups/" | while read -r line; do
        backup_date=$(echo "$line" | awk '{print $1}')
        backup_file=$(echo "$line" | awk '{print $4}')
        
        if [ -n "$backup_date" ] && [ -n "$backup_file" ]; then
            backup_timestamp=$(date -d "$backup_date" +%s)
            cutoff_timestamp=$(date -d "${RETENTION_DAYS} days ago" +%s)
            
            if [ "$backup_timestamp" -lt "$cutoff_timestamp" ]; then
                aws s3 rm "s3://${S3_BUCKET}/backups/${backup_file}"
                log "Removed old backup: ${backup_file}"
            fi
        fi
    done
    
    log "Cleanup completed"
}

restore_database() {
    local backup_file="$1"
    
    log "Starting database restore from ${backup_file}..."
    
    # Create a new database for restoration
    PGPASSWORD="${DB_PASSWORD}" createdb \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        "${DB_NAME}_restore_$(date +%s)" || true
    
    # Restore from custom format
    if [[ "$backup_file" == *.dump ]]; then
        PGPASSWORD="${DB_PASSWORD}" pg_restore \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            --verbose \
            --clean \
            --if-exists \
            "$backup_file"
    else
        # Restore from SQL format
        PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            -d "${DB_NAME}" \
            -f "$backup_file"
    fi
    
    log "Database restore completed"
}

restore_redis() {
    local backup_file="$1"
    
    log "Starting Redis restore from ${backup_file}..."
    
    # Stop Redis service (if running locally)
    systemctl stop redis-server || true
    
    # Copy backup file to Redis data directory
    cp "$backup_file" /var/lib/redis/dump.rdb
    chown redis:redis /var/lib/redis/dump.rdb
    
    # Start Redis service
    systemctl start redis-server
    
    log "Redis restore completed"
}

restore_files() {
    local backup_file="$1"
    
    log "Starting file restore from ${backup_file}..."
    
    # Extract files to temporary location
    temp_dir=$(mktemp -d)
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # Restore uploads
    if [ -d "$temp_dir/uploads" ]; then
        cp -r "$temp_dir/uploads"/* /app/uploads/
    fi
    
    # Restore configuration
    if [ -d "$temp_dir/config" ]; then
        cp -r "$temp_dir/config"/* /app/config/
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log "File restore completed"
}

verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity..."
    
    if [[ "$backup_file" == *.enc ]]; then
        # Verify encrypted backup
        openssl enc -aes-256-cbc -d -in "$backup_file" -k "${ENCRYPTION_KEY}" | tar -tzf - > /dev/null
    else
        # Verify regular backup
        tar -tzf "$backup_file" > /dev/null
    fi
    
    log "Backup verification completed successfully"
}

# Main backup function
perform_backup() {
    log "Starting backup process..."
    
    backup_database
    backup_redis
    backup_files
    backup_kubernetes_config
    encrypt_backup
    
    local backup_file
    if [ -n "${ENCRYPTION_KEY}" ]; then
        backup_file="${BACKUP_PATH}.tar.gz.enc"
    else
        backup_file="${BACKUP_PATH}.tar.gz"
    fi
    
    verify_backup "$backup_file"
    upload_to_s3
    cleanup_old_backups
    
    log "Backup process completed successfully"
    log "Backup file: $(basename "$backup_file")"
    log "Backup size: $(du -h "$backup_file" | cut -f1)"
}

# Main restore function
perform_restore() {
    local backup_name="$1"
    
    log "Starting restore process for backup: ${backup_name}"
    
    # Download from S3 if not local
    if [ ! -f "${BACKUP_DIR}/${backup_name}" ]; then
        log "Downloading backup from S3..."
        aws s3 cp "s3://${S3_BUCKET}/backups/${backup_name}" "${BACKUP_DIR}/${backup_name}"
    fi
    
    local backup_file="${BACKUP_DIR}/${backup_name}"
    verify_backup "$backup_file"
    
    # Extract backup
    temp_dir=$(mktemp -d)
    
    if [[ "$backup_name" == *.enc ]]; then
        openssl enc -aes-256-cbc -d -in "$backup_file" -k "${ENCRYPTION_KEY}" | tar -xzf - -C "$temp_dir"
    else
        tar -xzf "$backup_file" -C "$temp_dir"
    fi
    
    # Find the backup directory
    backup_dir=$(find "$temp_dir" -name "zetra_backup_*" -type d | head -1)
    
    if [ -z "$backup_dir" ]; then
        error "Could not find backup directory in archive"
    fi
    
    # Restore components
    if [ -d "$backup_dir/database" ]; then
        restore_database "$backup_dir/database/postgres_"*.dump
    fi
    
    if [ -d "$backup_dir/redis" ]; then
        restore_redis "$backup_dir/redis/dump_"*.rdb
    fi
    
    if [ -d "$backup_dir/files" ]; then
        for file in "$backup_dir/files"/*.tar.gz; do
            restore_files "$file"
        done
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log "Restore process completed successfully"
}

# Command line interface
case "${1:-}" in
    backup)
        perform_backup
        ;;
    restore)
        if [ -z "${2:-}" ]; then
            error "Please specify backup name to restore"
        fi
        perform_restore "$2"
        ;;
    list)
        log "Local backups:"
        ls -la "${BACKUP_DIR}"/zetra_backup_* 2>/dev/null || log "No local backups found"
        
        log "S3 backups:"
        aws s3 ls "s3://${S3_BUCKET}/backups/" || log "No S3 backups found"
        ;;
    verify)
        if [ -z "${2:-}" ]; then
            error "Please specify backup file to verify"
        fi
        verify_backup "$2"
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 {backup|restore|list|verify|cleanup}"
        echo ""
        echo "Commands:"
        echo "  backup          - Create a new backup"
        echo "  restore <name>  - Restore from backup"
        echo "  list            - List available backups"
        echo "  verify <file>   - Verify backup integrity"
        echo "  cleanup         - Remove old backups"
        echo ""
        echo "Environment variables:"
        echo "  BACKUP_DIR      - Local backup directory (default: /backups)"
        echo "  S3_BUCKET       - S3 bucket for backup storage"
        echo "  RETENTION_DAYS  - Backup retention period (default: 30)"
        echo "  ENCRYPTION_KEY  - Encryption key for backups"
        echo "  DB_HOST         - Database host"
        echo "  DB_PASSWORD     - Database password"
        exit 1
        ;;
esac