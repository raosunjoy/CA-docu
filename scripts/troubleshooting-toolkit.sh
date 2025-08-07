#!/bin/bash

# Production Troubleshooting Toolkit for Zetra Platform
# Collection of diagnostic and troubleshooting tools

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-./troubleshooting-output}"
NAMESPACE="${NAMESPACE:-production}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# System information collection
collect_system_info() {
    log_info "Collecting system information..."
    
    local output_file="${OUTPUT_DIR}/system_info_${TIMESTAMP}.txt"
    
    {
        echo "=== System Information ==="
        echo "Date: $(date)"
        echo "Hostname: $(hostname)"
        echo "Uptime: $(uptime)"
        echo "Kernel: $(uname -a)"
        echo ""
        
        echo "=== CPU Information ==="
        lscpu || echo "lscpu not available"
        echo ""
        
        echo "=== Memory Information ==="
        free -h
        echo ""
        
        echo "=== Disk Usage ==="
        df -h
        echo ""
        
        echo "=== Network Interfaces ==="
        ip addr show || ifconfig
        echo ""
        
        echo "=== Running Processes ==="
        ps aux --sort=-%cpu | head -20
        echo ""
        
        echo "=== Load Average ==="
        cat /proc/loadavg
        echo ""
        
        echo "=== System Limits ==="
        ulimit -a
        
    } > "$output_file"
    
    log_success "System information saved to: $output_file"
}

# Kubernetes diagnostics
collect_k8s_info() {
    log_info "Collecting Kubernetes information..."
    
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, skipping Kubernetes diagnostics"
        return
    fi
    
    local output_file="${OUTPUT_DIR}/k8s_info_${TIMESTAMP}.txt"
    
    {
        echo "=== Kubernetes Cluster Information ==="
        echo "Date: $(date)"
        echo ""
        
        echo "=== Cluster Info ==="
        kubectl cluster-info || echo "Failed to get cluster info"
        echo ""
        
        echo "=== Node Status ==="
        kubectl get nodes -o wide || echo "Failed to get nodes"
        echo ""
        
        echo "=== Node Resource Usage ==="
        kubectl top nodes || echo "Metrics server not available"
        echo ""
        
        echo "=== Pods in $NAMESPACE namespace ==="
        kubectl get pods -n "$NAMESPACE" -o wide || echo "Failed to get pods"
        echo ""
        
        echo "=== Pod Resource Usage ==="
        kubectl top pods -n "$NAMESPACE" || echo "Metrics server not available"
        echo ""
        
        echo "=== Services ==="
        kubectl get services -n "$NAMESPACE" || echo "Failed to get services"
        echo ""
        
        echo "=== Ingress ==="
        kubectl get ingress -n "$NAMESPACE" || echo "Failed to get ingress"
        echo ""
        
        echo "=== ConfigMaps ==="
        kubectl get configmaps -n "$NAMESPACE" || echo "Failed to get configmaps"
        echo ""
        
        echo "=== Secrets ==="
        kubectl get secrets -n "$NAMESPACE" || echo "Failed to get secrets"
        echo ""
        
        echo "=== Persistent Volumes ==="
        kubectl get pv || echo "Failed to get persistent volumes"
        echo ""
        
        echo "=== Persistent Volume Claims ==="
        kubectl get pvc -n "$NAMESPACE" || echo "Failed to get PVCs"
        echo ""
        
        echo "=== Events (last 1 hour) ==="
        kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -50 || echo "Failed to get events"
        
    } > "$output_file"
    
    log_success "Kubernetes information saved to: $output_file"
}

# Application logs collection
collect_app_logs() {
    log_info "Collecting application logs..."
    
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, skipping application logs"
        return
    fi
    
    local logs_dir="${OUTPUT_DIR}/logs_${TIMESTAMP}"
    mkdir -p "$logs_dir"
    
    # Get all zetra-platform pods
    local pods
    pods=$(kubectl get pods -n "$NAMESPACE" -l app=zetra-platform --no-headers | awk '{print $1}' || echo "")
    
    if [ -z "$pods" ]; then
        log_warning "No zetra-platform pods found"
        return
    fi
    
    for pod in $pods; do
        log_info "Collecting logs for pod: $pod"
        
        # Current logs
        kubectl logs "$pod" -n "$NAMESPACE" --tail=1000 > "$logs_dir/${pod}_current.log" 2>&1 || echo "Failed to get current logs for $pod"
        
        # Previous logs (if pod restarted)
        kubectl logs "$pod" -n "$NAMESPACE" --previous --tail=1000 > "$logs_dir/${pod}_previous.log" 2>&1 || echo "No previous logs for $pod"
        
        # Pod description
        kubectl describe pod "$pod" -n "$NAMESPACE" > "$logs_dir/${pod}_describe.txt" 2>&1 || echo "Failed to describe $pod"
    done
    
    log_success "Application logs saved to: $logs_dir"
}

# Database diagnostics
collect_db_info() {
    log_info "Collecting database information..."
    
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, skipping database diagnostics"
        return
    fi
    
    local output_file="${OUTPUT_DIR}/database_info_${TIMESTAMP}.txt"
    
    # Find PostgreSQL pod
    local postgres_pod
    postgres_pod=$(kubectl get pods -n "$NAMESPACE" -l app=postgresql --no-headers | head -1 | awk '{print $1}' || echo "")
    
    if [ -z "$postgres_pod" ]; then
        log_warning "PostgreSQL pod not found"
        return
    fi
    
    {
        echo "=== Database Information ==="
        echo "Date: $(date)"
        echo "PostgreSQL Pod: $postgres_pod"
        echo ""
        
        echo "=== Database Version ==="
        kubectl exec -it "$postgres_pod" -n "$NAMESPACE" -- psql -U zetra_admin -d zetra -c "SELECT version();" 2>/dev/null || echo "Failed to get database version"
        echo ""
        
        echo "=== Database Size ==="
        kubectl exec -it "$postgres_pod" -n "$NAMESPACE" -- psql -U zetra_admin -d zetra -c "
            SELECT 
                pg_database.datname,
                pg_size_pretty(pg_database_size(pg_database.datname)) AS size
            FROM pg_database
            ORDER BY pg_database_size(pg_database.datname) DESC;
        " 2>/dev/null || echo "Failed to get database size"
        echo ""
        
        echo "=== Active Connections ==="
        kubectl exec -it "$postgres_pod" -n "$NAMESPACE" -- psql -U zetra_admin -d zetra -c "
            SELECT 
                count(*) as active_connections,
                state,
                application_name
            FROM pg_stat_activity 
            WHERE state IS NOT NULL 
            GROUP BY state, application_name
            ORDER BY active_connections DESC;
        " 2>/dev/null || echo "Failed to get active connections"
        echo ""
        
        echo "=== Long Running Queries ==="
        kubectl exec -it "$postgres_pod" -n "$NAMESPACE" -- psql -U zetra_admin -d zetra -c "
            SELECT 
                pid,
                now() - pg_stat_activity.query_start AS duration,
                query,
                state
            FROM pg_stat_activity
            WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
            ORDER BY duration DESC;
        " 2>/dev/null || echo "Failed to get long running queries"
        echo ""
        
        echo "=== Database Statistics ==="
        kubectl exec -it "$postgres_pod" -n "$NAMESPACE" -- psql -U zetra_admin -d zetra -c "
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_tuples,
                n_dead_tup as dead_tuples
            FROM pg_stat_user_tables
            ORDER BY n_live_tup DESC
            LIMIT 20;
        " 2>/dev/null || echo "Failed to get database statistics"
        echo ""
        
        echo "=== Index Usage ==="
        kubectl exec -it "$postgres_pod" -n "$NAMESPACE" -- psql -U zetra_admin -d zetra -c "
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch
            FROM pg_stat_user_indexes
            WHERE idx_scan > 0
            ORDER BY idx_scan DESC
            LIMIT 20;
        " 2>/dev/null || echo "Failed to get index usage"
        
    } > "$output_file"
    
    log_success "Database information saved to: $output_file"
}

# Network diagnostics
collect_network_info() {
    log_info "Collecting network information..."
    
    local output_file="${OUTPUT_DIR}/network_info_${TIMESTAMP}.txt"
    
    {
        echo "=== Network Information ==="
        echo "Date: $(date)"
        echo ""
        
        echo "=== Network Interfaces ==="
        ip addr show || ifconfig
        echo ""
        
        echo "=== Routing Table ==="
        ip route show || route -n
        echo ""
        
        echo "=== DNS Configuration ==="
        cat /etc/resolv.conf
        echo ""
        
        echo "=== Network Connections ==="
        netstat -tulpn | head -50 || ss -tulpn | head -50
        echo ""
        
        echo "=== Connectivity Tests ==="
        echo "Testing external connectivity..."
        
        # Test external connectivity
        for host in "8.8.8.8" "google.com" "github.com"; do
            if ping -c 3 "$host" &>/dev/null; then
                echo "✓ $host is reachable"
            else
                echo "✗ $host is unreachable"
            fi
        done
        echo ""
        
        echo "=== DNS Resolution Tests ==="
        for domain in "zetra.app" "google.com" "github.com"; do
            if nslookup "$domain" &>/dev/null; then
                echo "✓ $domain resolves correctly"
            else
                echo "✗ $domain resolution failed"
            fi
        done
        
    } > "$output_file"
    
    log_success "Network information saved to: $output_file"
}

# Performance analysis
analyze_performance() {
    log_info "Analyzing system performance..."
    
    local output_file="${OUTPUT_DIR}/performance_analysis_${TIMESTAMP}.txt"
    
    {
        echo "=== Performance Analysis ==="
        echo "Date: $(date)"
        echo ""
        
        echo "=== CPU Usage ==="
        top -bn1 | head -20
        echo ""
        
        echo "=== Memory Usage ==="
        free -h
        echo ""
        echo "Memory usage by process:"
        ps aux --sort=-%mem | head -10
        echo ""
        
        echo "=== Disk I/O ==="
        if command -v iostat &> /dev/null; then
            iostat -x 1 3
        else
            echo "iostat not available"
        fi
        echo ""
        
        echo "=== Network I/O ==="
        if command -v iftop &> /dev/null; then
            timeout 10 iftop -t -s 10 2>/dev/null || echo "iftop not available or failed"
        else
            echo "iftop not available"
        fi
        echo ""
        
        echo "=== Load Average History ==="
        if [ -f /proc/loadavg ]; then
            echo "Current: $(cat /proc/loadavg)"
        fi
        
        if command -v uptime &> /dev/null; then
            uptime
        fi
        
    } > "$output_file"
    
    log_success "Performance analysis saved to: $output_file"
}

# Application-specific diagnostics
diagnose_application() {
    log_info "Diagnosing application-specific issues..."
    
    local output_file="${OUTPUT_DIR}/app_diagnostics_${TIMESTAMP}.txt"
    
    {
        echo "=== Application Diagnostics ==="
        echo "Date: $(date)"
        echo ""
        
        echo "=== Health Check Results ==="
        echo "Main health endpoint:"
        curl -s -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" https://zetra.app/api/health || echo "Health check failed"
        echo ""
        
        echo "Database health endpoint:"
        curl -s -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" https://zetra.app/api/health/db || echo "Database health check failed"
        echo ""
        
        echo "=== SSL Certificate Check ==="
        echo | openssl s_client -servername zetra.app -connect zetra.app:443 2>/dev/null | openssl x509 -noout -dates -subject -issuer 2>/dev/null || echo "SSL certificate check failed"
        echo ""
        
        echo "=== DNS Resolution ==="
        nslookup zetra.app || echo "DNS resolution failed"
        echo ""
        
        echo "=== HTTP Headers ==="
        curl -I https://zetra.app 2>/dev/null || echo "Failed to get HTTP headers"
        echo ""
        
        if command -v kubectl &> /dev/null; then
            echo "=== Application Metrics ==="
            local app_pod
            app_pod=$(kubectl get pods -n "$NAMESPACE" -l app=zetra-platform --no-headers | head -1 | awk '{print $1}' || echo "")
            
            if [ -n "$app_pod" ]; then
                echo "Pod: $app_pod"
                kubectl exec -it "$app_pod" -n "$NAMESPACE" -- curl -s http://localhost:3000/api/metrics | head -50 2>/dev/null || echo "Failed to get application metrics"
            else
                echo "No application pod found"
            fi
        fi
        
    } > "$output_file"
    
    log_success "Application diagnostics saved to: $output_file"
}

# Security analysis
analyze_security() {
    log_info "Analyzing security status..."
    
    local output_file="${OUTPUT_DIR}/security_analysis_${TIMESTAMP}.txt"
    
    {
        echo "=== Security Analysis ==="
        echo "Date: $(date)"
        echo ""
        
        echo "=== SSL/TLS Configuration ==="
        echo "Testing SSL configuration for zetra.app..."
        
        if command -v nmap &> /dev/null; then
            nmap --script ssl-enum-ciphers -p 443 zetra.app 2>/dev/null | grep -E "(TLS|SSL|Cipher)" || echo "SSL scan failed"
        else
            echo "nmap not available for SSL testing"
        fi
        echo ""
        
        echo "=== Security Headers ==="
        curl -I https://zetra.app 2>/dev/null | grep -i -E "(strict-transport|x-frame|x-content|content-security|x-xss)" || echo "No security headers found"
        echo ""
        
        echo "=== Open Ports ==="
        if command -v nmap &> /dev/null; then
            nmap -sT -O localhost 2>/dev/null | grep -E "(open|filtered)" || echo "Port scan failed"
        else
            netstat -tulpn | grep LISTEN | head -20 || echo "Failed to get listening ports"
        fi
        echo ""
        
        echo "=== Failed Login Attempts ==="
        if [ -f /var/log/auth.log ]; then
            grep "Failed password" /var/log/auth.log | tail -10 || echo "No failed login attempts found"
        else
            echo "Auth log not available"
        fi
        echo ""
        
        echo "=== System Updates ==="
        if command -v apt &> /dev/null; then
            apt list --upgradable 2>/dev/null | head -10 || echo "Failed to check updates"
        elif command -v yum &> /dev/null; then
            yum check-update | head -10 || echo "Failed to check updates"
        else
            echo "Package manager not available"
        fi
        
    } > "$output_file"
    
    log_success "Security analysis saved to: $output_file"
}

# Generate comprehensive report
generate_report() {
    log_info "Generating comprehensive troubleshooting report..."
    
    local report_file="${OUTPUT_DIR}/troubleshooting_report_${TIMESTAMP}.md"
    
    {
        echo "# Troubleshooting Report - Zetra Platform"
        echo ""
        echo "**Generated:** $(date)"
        echo "**Hostname:** $(hostname)"
        echo "**Report ID:** troubleshooting_${TIMESTAMP}"
        echo ""
        
        echo "## Executive Summary"
        echo ""
        echo "This report contains comprehensive diagnostic information collected from the Zetra Platform production environment."
        echo ""
        
        echo "## Files Generated"
        echo ""
        for file in "${OUTPUT_DIR}"/*_"${TIMESTAMP}".*; do
            if [ -f "$file" ]; then
                echo "- $(basename "$file")"
            fi
        done
        echo ""
        
        echo "## Quick Health Check"
        echo ""
        
        # Quick health checks
        if curl -s --max-time 10 https://zetra.app/api/health &>/dev/null; then
            echo "✅ Application health endpoint is responding"
        else
            echo "❌ Application health endpoint is not responding"
        fi
        
        if curl -s --max-time 10 https://zetra.app/api/health/db &>/dev/null; then
            echo "✅ Database health endpoint is responding"
        else
            echo "❌ Database health endpoint is not responding"
        fi
        
        if command -v kubectl &> /dev/null; then
            local unhealthy_pods
            unhealthy_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers | grep -v Running | wc -l || echo "0")
            
            if [ "$unhealthy_pods" -eq 0 ]; then
                echo "✅ All Kubernetes pods are running"
            else
                echo "❌ $unhealthy_pods pods are not in Running state"
            fi
        fi
        
        echo ""
        echo "## System Resources"
        echo ""
        echo "**CPU Load:** $(uptime | awk -F'load average:' '{print $2}')"
        echo "**Memory Usage:** $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
        echo "**Disk Usage:** $(df / | tail -1 | awk '{print $5}')"
        echo ""
        
        echo "## Recommendations"
        echo ""
        echo "1. Review the generated diagnostic files for detailed analysis"
        echo "2. Check application logs for any error patterns"
        echo "3. Monitor resource usage trends"
        echo "4. Verify external dependencies are accessible"
        echo "5. Ensure security configurations are up to date"
        echo ""
        
        echo "## Next Steps"
        echo ""
        echo "If issues persist after reviewing this report:"
        echo "1. Escalate to L2 support team"
        echo "2. Consider engaging vendor support if needed"
        echo "3. Review recent changes or deployments"
        echo "4. Consider scaling resources if performance issues are identified"
        
    } > "$report_file"
    
    log_success "Comprehensive report generated: $report_file"
}

# Main execution
case "${1:-all}" in
    system)
        collect_system_info
        ;;
    k8s|kubernetes)
        collect_k8s_info
        ;;
    logs)
        collect_app_logs
        ;;
    database|db)
        collect_db_info
        ;;
    network)
        collect_network_info
        ;;
    performance|perf)
        analyze_performance
        ;;
    app|application)
        diagnose_application
        ;;
    security)
        analyze_security
        ;;
    report)
        generate_report
        ;;
    all)
        log_info "Running comprehensive troubleshooting collection..."
        collect_system_info
        collect_k8s_info
        collect_app_logs
        collect_db_info
        collect_network_info
        analyze_performance
        diagnose_application
        analyze_security
        generate_report
        
        log_success "All diagnostics completed. Files saved to: $OUTPUT_DIR"
        ;;
    *)
        echo "Usage: $0 {system|k8s|logs|database|network|performance|app|security|report|all}"
        echo ""
        echo "Commands:"
        echo "  system      - Collect system information"
        echo "  k8s         - Collect Kubernetes diagnostics"
        echo "  logs        - Collect application logs"
        echo "  database    - Collect database diagnostics"
        echo "  network     - Collect network information"
        echo "  performance - Analyze system performance"
        echo "  app         - Diagnose application-specific issues"
        echo "  security    - Analyze security status"
        echo "  report      - Generate comprehensive report"
        echo "  all         - Run all diagnostics (default)"
        echo ""
        echo "Environment variables:"
        echo "  OUTPUT_DIR  - Output directory (default: ./troubleshooting-output)"
        echo "  NAMESPACE   - Kubernetes namespace (default: production)"
        exit 1
        ;;
esac