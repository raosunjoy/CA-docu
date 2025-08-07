#!/bin/bash

# Automated Health Check and Self-Healing Script for Zetra Platform
# This script performs comprehensive health checks and attempts automatic remediation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-/var/log/zetra}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-300}" # 5 minutes
MAX_RESTART_ATTEMPTS="${MAX_RESTART_ATTEMPTS:-3}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
NAMESPACE="${NAMESPACE:-production}"

# Create log directory
mkdir -p "${LOG_DIR}"

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_DIR}/health-check.log"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "${LOG_DIR}/health-check.log" >&2
}

log_warning() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" | tee -a "${LOG_DIR}/health-check.log"
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" | tee -a "${LOG_DIR}/health-check.log"
}

# Send alert function
send_alert() {
    local severity="$1"
    local message="$2"
    local details="${3:-}"
    
    log "Sending $severity alert: $message"
    
    if [ -n "${ALERT_WEBHOOK}" ]; then
        curl -X POST "${ALERT_WEBHOOK}" \
            -H "Content-Type: application/json" \
            -d "{
                \"severity\": \"$severity\",
                \"message\": \"$message\",
                \"details\": \"$details\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"source\": \"health-check-automation\"
            }" || log_error "Failed to send alert"
    fi
    
    # Also log to system journal
    logger -t zetra-health-check "$severity: $message"
}

# Health check functions
check_application_health() {
    log "Checking application health..."
    
    local health_endpoint="https://zetra.app/api/health"
    local response_code
    local response_time
    
    # Check if we can reach the health endpoint
    if response_code=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "$health_endpoint"); then
        if [ "$response_code" = "200" ]; then
            log_success "Application health check passed (HTTP $response_code)"
            return 0
        else
            log_error "Application health check failed (HTTP $response_code)"
            return 1
        fi
    else
        log_error "Application health check failed (connection error)"
        return 1
    fi
}

check_database_health() {
    log "Checking database health..."
    
    local db_health_endpoint="https://zetra.app/api/health/db"
    local response_code
    
    if response_code=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "$db_health_endpoint"); then
        if [ "$response_code" = "200" ]; then
            log_success "Database health check passed (HTTP $response_code)"
            return 0
        else
            log_error "Database health check failed (HTTP $response_code)"
            return 1
        fi
    else
        log_error "Database health check failed (connection error)"
        return 1
    fi
}

check_kubernetes_pods() {
    log "Checking Kubernetes pods health..."
    
    local unhealthy_pods=0
    local total_pods=0
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, skipping pod health check"
        return 0
    fi
    
    # Get pod status
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            local pod_name=$(echo "$line" | awk '{print $1}')
            local status=$(echo "$line" | awk '{print $3}')
            local ready=$(echo "$line" | awk '{print $2}')
            
            total_pods=$((total_pods + 1))
            
            if [ "$status" != "Running" ] || [[ "$ready" == *"0/"* ]]; then
                log_error "Pod $pod_name is unhealthy (Status: $status, Ready: $ready)"
                unhealthy_pods=$((unhealthy_pods + 1))
            fi
        fi
    done < <(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep zetra-platform || true)
    
    if [ $unhealthy_pods -eq 0 ]; then
        log_success "All $total_pods pods are healthy"
        return 0
    else
        log_error "$unhealthy_pods out of $total_pods pods are unhealthy"
        return 1
    fi
}

check_resource_usage() {
    log "Checking resource usage..."
    
    local issues_found=0
    
    # Check CPU usage
    if command -v kubectl &> /dev/null; then
        local cpu_usage
        cpu_usage=$(kubectl top nodes --no-headers 2>/dev/null | awk '{sum+=$3} END {print sum/NR}' || echo "0")
        
        if [ "${cpu_usage%.*}" -gt 80 ]; then
            log_warning "High CPU usage detected: ${cpu_usage}%"
            issues_found=$((issues_found + 1))
        else
            log_success "CPU usage is normal: ${cpu_usage}%"
        fi
        
        # Check memory usage
        local memory_usage
        memory_usage=$(kubectl top nodes --no-headers 2>/dev/null | awk '{sum+=$5} END {print sum/NR}' || echo "0")
        
        if [ "${memory_usage%.*}" -gt 85 ]; then
            log_warning "High memory usage detected: ${memory_usage}%"
            issues_found=$((issues_found + 1))
        else
            log_success "Memory usage is normal: ${memory_usage}%"
        fi
    fi
    
    # Check disk usage
    local disk_usage
    disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 85 ]; then
        log_warning "High disk usage detected: ${disk_usage}%"
        issues_found=$((issues_found + 1))
    else
        log_success "Disk usage is normal: ${disk_usage}%"
    fi
    
    return $issues_found
}

check_external_dependencies() {
    log "Checking external dependencies..."
    
    local dependencies=(
        "https://api.github.com"
        "https://registry.npmjs.org"
        "8.8.8.8:53"
    )
    
    local failed_deps=0
    
    for dep in "${dependencies[@]}"; do
        if [[ "$dep" == *":53" ]]; then
            # DNS check
            if nslookup google.com "${dep%:*}" &>/dev/null; then
                log_success "DNS dependency $dep is reachable"
            else
                log_error "DNS dependency $dep is unreachable"
                failed_deps=$((failed_deps + 1))
            fi
        else
            # HTTP check
            if curl -s --max-time 10 "$dep" &>/dev/null; then
                log_success "HTTP dependency $dep is reachable"
            else
                log_error "HTTP dependency $dep is unreachable"
                failed_deps=$((failed_deps + 1))
            fi
        fi
    done
    
    return $failed_deps
}

# Self-healing functions
restart_unhealthy_pods() {
    log "Attempting to restart unhealthy pods..."
    
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, cannot restart pods"
        return 1
    fi
    
    local restarted_pods=0
    
    # Get unhealthy pods
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            local pod_name=$(echo "$line" | awk '{print $1}')
            local status=$(echo "$line" | awk '{print $3}')
            local ready=$(echo "$line" | awk '{print $2}')
            
            if [ "$status" != "Running" ] || [[ "$ready" == *"0/"* ]]; then
                log "Restarting unhealthy pod: $pod_name"
                
                if kubectl delete pod "$pod_name" -n "$NAMESPACE" --grace-period=30; then
                    log_success "Successfully restarted pod: $pod_name"
                    restarted_pods=$((restarted_pods + 1))
                else
                    log_error "Failed to restart pod: $pod_name"
                fi
            fi
        fi
    done < <(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep zetra-platform || true)
    
    if [ $restarted_pods -gt 0 ]; then
        log "Waiting for pods to become ready..."
        sleep 60
        
        # Verify pods are healthy after restart
        if check_kubernetes_pods; then
            log_success "Pod restart successful, all pods are now healthy"
            return 0
        else
            log_error "Some pods are still unhealthy after restart"
            return 1
        fi
    fi
    
    return 0
}

scale_application() {
    log "Attempting to scale application..."
    
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, cannot scale application"
        return 1
    fi
    
    local current_replicas
    current_replicas=$(kubectl get deployment zetra-platform-blue -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [ "$current_replicas" -lt 3 ]; then
        log "Scaling application to 3 replicas (current: $current_replicas)"
        
        if kubectl scale deployment zetra-platform-blue --replicas=3 -n "$NAMESPACE"; then
            log_success "Successfully scaled application to 3 replicas"
            
            # Wait for rollout to complete
            kubectl rollout status deployment/zetra-platform-blue -n "$NAMESPACE" --timeout=300s
            return 0
        else
            log_error "Failed to scale application"
            return 1
        fi
    fi
    
    return 0
}

clear_cache() {
    log "Attempting to clear application cache..."
    
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, cannot clear cache"
        return 1
    fi
    
    # Find Redis pod
    local redis_pod
    redis_pod=$(kubectl get pods -n "$NAMESPACE" -l app=redis --no-headers | head -1 | awk '{print $1}' || echo "")
    
    if [ -n "$redis_pod" ]; then
        log "Clearing Redis cache..."
        
        if kubectl exec -it "$redis_pod" -n "$NAMESPACE" -- redis-cli FLUSHDB; then
            log_success "Successfully cleared Redis cache"
            return 0
        else
            log_error "Failed to clear Redis cache"
            return 1
        fi
    else
        log_warning "Redis pod not found, cannot clear cache"
        return 1
    fi
}

cleanup_disk_space() {
    log "Attempting to cleanup disk space..."
    
    local cleaned_space=0
    
    # Clean old log files
    if [ -d "/var/log" ]; then
        local old_logs
        old_logs=$(find /var/log -name "*.log" -mtime +7 -size +100M 2>/dev/null || true)
        
        if [ -n "$old_logs" ]; then
            echo "$old_logs" | xargs rm -f
            cleaned_space=$((cleaned_space + 1))
            log "Cleaned old log files"
        fi
    fi
    
    # Clean Docker images and containers
    if command -v docker &> /dev/null; then
        docker system prune -f &>/dev/null || true
        cleaned_space=$((cleaned_space + 1))
        log "Cleaned Docker system"
    fi
    
    # Clean temporary files
    if [ -d "/tmp" ]; then
        find /tmp -type f -mtime +1 -delete 2>/dev/null || true
        cleaned_space=$((cleaned_space + 1))
        log "Cleaned temporary files"
    fi
    
    if [ $cleaned_space -gt 0 ]; then
        log_success "Disk cleanup completed"
        return 0
    else
        log_warning "No disk cleanup performed"
        return 1
    fi
}

# Main health check and remediation function
perform_health_check() {
    log "Starting comprehensive health check..."
    
    local issues_found=0
    local remediation_attempts=0
    
    # Perform health checks
    if ! check_application_health; then
        issues_found=$((issues_found + 1))
        send_alert "critical" "Application health check failed" "The main application endpoint is not responding"
        
        # Attempt remediation
        if restart_unhealthy_pods; then
            remediation_attempts=$((remediation_attempts + 1))
            sleep 30
            
            # Re-check after remediation
            if check_application_health; then
                send_alert "info" "Application health restored" "Application is responding after pod restart"
            fi
        fi
    fi
    
    if ! check_database_health; then
        issues_found=$((issues_found + 1))
        send_alert "critical" "Database health check failed" "Database endpoint is not responding"
    fi
    
    if ! check_kubernetes_pods; then
        issues_found=$((issues_found + 1))
        send_alert "warning" "Unhealthy pods detected" "Some Kubernetes pods are not in a healthy state"
        
        # Attempt remediation
        if restart_unhealthy_pods; then
            remediation_attempts=$((remediation_attempts + 1))
        fi
    fi
    
    local resource_issues
    resource_issues=$(check_resource_usage || echo $?)
    if [ "$resource_issues" -gt 0 ]; then
        issues_found=$((issues_found + resource_issues))
        send_alert "warning" "High resource usage detected" "CPU, memory, or disk usage is above threshold"
        
        # Attempt remediation
        if [ "$resource_issues" -gt 2 ]; then
            cleanup_disk_space && remediation_attempts=$((remediation_attempts + 1))
            scale_application && remediation_attempts=$((remediation_attempts + 1))
        fi
    fi
    
    local dependency_issues
    dependency_issues=$(check_external_dependencies || echo $?)
    if [ "$dependency_issues" -gt 0 ]; then
        issues_found=$((issues_found + dependency_issues))
        send_alert "warning" "External dependency issues" "$dependency_issues external dependencies are unreachable"
    fi
    
    # Summary
    if [ $issues_found -eq 0 ]; then
        log_success "All health checks passed"
    else
        log_warning "Health check completed with $issues_found issues found"
        
        if [ $remediation_attempts -gt 0 ]; then
            log "Attempted $remediation_attempts remediation actions"
        fi
    fi
    
    return $issues_found
}

# Continuous monitoring function
continuous_monitoring() {
    log "Starting continuous health monitoring (interval: ${HEALTH_CHECK_INTERVAL}s)"
    
    while true; do
        perform_health_check
        
        log "Waiting ${HEALTH_CHECK_INTERVAL} seconds until next health check..."
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Signal handlers
cleanup() {
    log "Received termination signal, shutting down gracefully..."
    exit 0
}

trap cleanup SIGTERM SIGINT

# Main execution
case "${1:-monitor}" in
    check)
        perform_health_check
        ;;
    monitor)
        continuous_monitoring
        ;;
    restart-pods)
        restart_unhealthy_pods
        ;;
    scale)
        scale_application
        ;;
    clear-cache)
        clear_cache
        ;;
    cleanup)
        cleanup_disk_space
        ;;
    *)
        echo "Usage: $0 {check|monitor|restart-pods|scale|clear-cache|cleanup}"
        echo ""
        echo "Commands:"
        echo "  check        - Perform one-time health check"
        echo "  monitor      - Start continuous monitoring (default)"
        echo "  restart-pods - Restart unhealthy pods"
        echo "  scale        - Scale application if needed"
        echo "  clear-cache  - Clear application cache"
        echo "  cleanup      - Cleanup disk space"
        echo ""
        echo "Environment variables:"
        echo "  HEALTH_CHECK_INTERVAL - Monitoring interval in seconds (default: 300)"
        echo "  MAX_RESTART_ATTEMPTS  - Maximum restart attempts (default: 3)"
        echo "  ALERT_WEBHOOK         - Webhook URL for alerts"
        echo "  NAMESPACE             - Kubernetes namespace (default: production)"
        exit 1
        ;;
esac