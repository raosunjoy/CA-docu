#!/bin/bash

# Zetra Platform Penetration Testing Script
# This script performs automated security testing against the application

set -euo pipefail

# Configuration
TARGET_URL="${TARGET_URL:-https://zetra.app}"
API_BASE="${API_BASE:-${TARGET_URL}/api}"
REPORT_DIR="${REPORT_DIR:-./security-reports}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
REPORT_FILE="${REPORT_DIR}/pentest_report_${TIMESTAMP}.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "${REPORT_FILE}"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1" | tee -a "${REPORT_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "${REPORT_FILE}"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1" | tee -a "${REPORT_FILE}"
}

# Create report directory
mkdir -p "${REPORT_DIR}"

# Initialize report
cat > "${REPORT_FILE}" << EOF
# Penetration Testing Report - Zetra Platform

**Date:** $(date)
**Target:** ${TARGET_URL}
**Tester:** Automated Security Testing
**Report ID:** pentest_${TIMESTAMP}

## Executive Summary

This report contains the results of automated penetration testing performed against the Zetra Platform.

## Test Results

EOF

log_info "Starting penetration testing for ${TARGET_URL}"

# Test 1: SSL/TLS Configuration
test_ssl_tls() {
    log_info "Testing SSL/TLS configuration..."
    
    echo -e "\n### SSL/TLS Configuration Test\n" >> "${REPORT_FILE}"
    
    # Check SSL certificate
    if command -v openssl &> /dev/null; then
        ssl_info=$(echo | openssl s_client -servername $(echo ${TARGET_URL} | sed 's|https://||') -connect $(echo ${TARGET_URL} | sed 's|https://||'):443 2>/dev/null | openssl x509 -noout -dates -subject -issuer 2>/dev/null || echo "SSL check failed")
        
        if [[ "$ssl_info" != "SSL check failed" ]]; then
            log_success "SSL certificate is valid"
            echo "```" >> "${REPORT_FILE}"
            echo "$ssl_info" >> "${REPORT_FILE}"
            echo "```" >> "${REPORT_FILE}"
        else
            log_error "SSL certificate validation failed"
        fi
    fi
    
    # Check TLS version support
    if command -v nmap &> /dev/null; then
        log_info "Checking TLS version support..."
        tls_scan=$(nmap --script ssl-enum-ciphers -p 443 $(echo ${TARGET_URL} | sed 's|https://||') 2>/dev/null || echo "TLS scan failed")
        
        if [[ "$tls_scan" != "TLS scan failed" ]]; then
            if echo "$tls_scan" | grep -q "TLSv1.3"; then
                log_success "TLS 1.3 is supported"
            else
                log_warning "TLS 1.3 is not supported"
            fi
            
            if echo "$tls_scan" | grep -q "TLSv1.0\|TLSv1.1"; then
                log_error "Insecure TLS versions (1.0/1.1) are supported"
            else
                log_success "Insecure TLS versions are disabled"
            fi
        fi
    fi
}

# Test 2: HTTP Security Headers
test_security_headers() {
    log_info "Testing HTTP security headers..."
    
    echo -e "\n### HTTP Security Headers Test\n" >> "${REPORT_FILE}"
    
    headers=$(curl -s -I "${TARGET_URL}" || echo "Header check failed")
    
    if [[ "$headers" != "Header check failed" ]]; then
        echo "```" >> "${REPORT_FILE}"
        echo "$headers" >> "${REPORT_FILE}"
        echo "```" >> "${REPORT_FILE}"
        
        # Check for security headers
        if echo "$headers" | grep -qi "strict-transport-security"; then
            log_success "HSTS header is present"
        else
            log_error "HSTS header is missing"
        fi
        
        if echo "$headers" | grep -qi "x-frame-options"; then
            log_success "X-Frame-Options header is present"
        else
            log_warning "X-Frame-Options header is missing"
        fi
        
        if echo "$headers" | grep -qi "x-content-type-options"; then
            log_success "X-Content-Type-Options header is present"
        else
            log_warning "X-Content-Type-Options header is missing"
        fi
        
        if echo "$headers" | grep -qi "content-security-policy"; then
            log_success "Content-Security-Policy header is present"
        else
            log_warning "Content-Security-Policy header is missing"
        fi
        
        if echo "$headers" | grep -qi "x-xss-protection"; then
            log_success "X-XSS-Protection header is present"
        else
            log_warning "X-XSS-Protection header is missing"
        fi
    else
        log_error "Failed to retrieve HTTP headers"
    fi
}

# Test 3: Authentication Security
test_authentication() {
    log_info "Testing authentication security..."
    
    echo -e "\n### Authentication Security Test\n" >> "${REPORT_FILE}"
    
    # Test login endpoint
    login_response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"wrongpassword"}' || echo "000")
    
    if [[ "$login_response" == "401" ]]; then
        log_success "Login endpoint properly rejects invalid credentials"
    elif [[ "$login_response" == "429" ]]; then
        log_success "Rate limiting is active on login endpoint"
    else
        log_warning "Login endpoint response: HTTP $login_response"
    fi
    
    # Test for common authentication bypasses
    bypass_attempts=(
        '{"email":"admin","password":"admin"}'
        '{"email":"admin@zetra.app","password":"password"}'
        '{"email":"test@example.com","password":"password123"}'
        '{"email":"admin","password":"123456"}'
    )
    
    for attempt in "${bypass_attempts[@]}"; do
        response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/auth/login" \
            -H "Content-Type: application/json" \
            -d "$attempt" || echo "000")
        
        if [[ "$response" == "200" ]]; then
            log_error "Potential authentication bypass with: $attempt"
        fi
    done
}

# Test 4: SQL Injection
test_sql_injection() {
    log_info "Testing for SQL injection vulnerabilities..."
    
    echo -e "\n### SQL Injection Test\n" >> "${REPORT_FILE}"
    
    # Common SQL injection payloads
    sql_payloads=(
        "' OR '1'='1"
        "' OR 1=1--"
        "'; DROP TABLE users;--"
        "' UNION SELECT * FROM users--"
        "admin'--"
        "admin' #"
        "admin'/*"
        "' or 1=1#"
        "' or 1=1--"
        "') or '1'='1--"
        "') or ('1'='1--"
    )
    
    # Test login endpoint for SQL injection
    for payload in "${sql_payloads[@]}"; do
        response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$payload\",\"password\":\"test\"}" || echo "000")
        
        if [[ "$response" == "200" ]]; then
            log_error "Potential SQL injection vulnerability with payload: $payload"
        elif [[ "$response" == "500" ]]; then
            log_warning "Server error with payload: $payload (potential SQL injection)"
        fi
    done
    
    log_success "SQL injection tests completed"
}

# Test 5: XSS Vulnerabilities
test_xss() {
    log_info "Testing for XSS vulnerabilities..."
    
    echo -e "\n### XSS Vulnerability Test\n" >> "${REPORT_FILE}"
    
    # XSS payloads
    xss_payloads=(
        "<script>alert('XSS')</script>"
        "<img src=x onerror=alert('XSS')>"
        "<svg onload=alert('XSS')>"
        "javascript:alert('XSS')"
        "<iframe src=javascript:alert('XSS')></iframe>"
        "<body onload=alert('XSS')>"
    )
    
    # Test various endpoints for XSS
    test_endpoints=(
        "/api/search?q="
        "/api/tasks?filter="
        "/api/documents?search="
    )
    
    for endpoint in "${test_endpoints[@]}"; do
        for payload in "${xss_payloads[@]}"; do
            encoded_payload=$(echo "$payload" | sed 's/ /%20/g' | sed 's/</%3C/g' | sed 's/>/%3E/g')
            response=$(curl -s "${TARGET_URL}${endpoint}${encoded_payload}" || echo "Request failed")
            
            if echo "$response" | grep -q "$payload"; then
                log_error "Potential XSS vulnerability at ${endpoint} with payload: $payload"
            fi
        done
    done
    
    log_success "XSS tests completed"
}

# Test 6: CSRF Protection
test_csrf() {
    log_info "Testing CSRF protection..."
    
    echo -e "\n### CSRF Protection Test\n" >> "${REPORT_FILE}"
    
    # Test if CSRF tokens are required
    csrf_test=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/tasks" \
        -H "Content-Type: application/json" \
        -d '{"title":"CSRF Test Task","description":"Testing CSRF protection"}' || echo "000")
    
    if [[ "$csrf_test" == "403" ]]; then
        log_success "CSRF protection is active (403 Forbidden)"
    elif [[ "$csrf_test" == "401" ]]; then
        log_success "Authentication required (401 Unauthorized)"
    else
        log_warning "CSRF test response: HTTP $csrf_test"
    fi
}

# Test 7: Directory Traversal
test_directory_traversal() {
    log_info "Testing for directory traversal vulnerabilities..."
    
    echo -e "\n### Directory Traversal Test\n" >> "${REPORT_FILE}"
    
    # Directory traversal payloads
    traversal_payloads=(
        "../../../etc/passwd"
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts"
        "....//....//....//etc/passwd"
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        "..%252f..%252f..%252fetc%252fpasswd"
    )
    
    # Test file download endpoints
    for payload in "${traversal_payloads[@]}"; do
        response=$(curl -s "${API_BASE}/documents/download?file=${payload}" || echo "Request failed")
        
        if echo "$response" | grep -q "root:"; then
            log_error "Directory traversal vulnerability found with payload: $payload"
        fi
    done
    
    log_success "Directory traversal tests completed"
}

# Test 8: Information Disclosure
test_information_disclosure() {
    log_info "Testing for information disclosure..."
    
    echo -e "\n### Information Disclosure Test\n" >> "${REPORT_FILE}"
    
    # Test for sensitive files
    sensitive_files=(
        "/.env"
        "/config.json"
        "/package.json"
        "/.git/config"
        "/robots.txt"
        "/sitemap.xml"
        "/admin"
        "/debug"
        "/test"
    )
    
    for file in "${sensitive_files[@]}"; do
        response=$(curl -s -w "%{http_code}" -o /dev/null "${TARGET_URL}${file}" || echo "000")
        
        if [[ "$response" == "200" ]]; then
            log_warning "Accessible file found: $file"
        fi
    done
    
    # Test for error message disclosure
    error_response=$(curl -s "${API_BASE}/nonexistent-endpoint" || echo "Request failed")
    
    if echo "$error_response" | grep -qi "stack trace\|error.*line\|exception"; then
        log_warning "Detailed error messages may be disclosed"
    else
        log_success "Error messages appear to be properly handled"
    fi
}

# Test 9: Rate Limiting
test_rate_limiting() {
    log_info "Testing rate limiting..."
    
    echo -e "\n### Rate Limiting Test\n" >> "${REPORT_FILE}"
    
    # Test rate limiting on login endpoint
    rate_limit_count=0
    for i in {1..20}; do
        response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${API_BASE}/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"email":"test@example.com","password":"test"}' || echo "000")
        
        if [[ "$response" == "429" ]]; then
            rate_limit_count=$((rate_limit_count + 1))
        fi
        
        sleep 0.1
    done
    
    if [[ $rate_limit_count -gt 0 ]]; then
        log_success "Rate limiting is active (triggered $rate_limit_count times)"
    else
        log_warning "Rate limiting may not be properly configured"
    fi
}

# Test 10: API Security
test_api_security() {
    log_info "Testing API security..."
    
    echo -e "\n### API Security Test\n" >> "${REPORT_FILE}"
    
    # Test for API versioning
    api_version_response=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}/v1/health" || echo "000")
    
    if [[ "$api_version_response" == "200" ]]; then
        log_success "API versioning is implemented"
    else
        log_warning "API versioning may not be implemented"
    fi
    
    # Test for proper HTTP methods
    options_response=$(curl -s -w "%{http_code}" -o /dev/null -X OPTIONS "${API_BASE}/tasks" || echo "000")
    
    if [[ "$options_response" == "200" ]]; then
        log_success "OPTIONS method is properly handled"
    fi
    
    # Test for unauthorized access
    unauthorized_response=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}/admin/users" || echo "000")
    
    if [[ "$unauthorized_response" == "401" || "$unauthorized_response" == "403" ]]; then
        log_success "Admin endpoints are properly protected"
    else
        log_warning "Admin endpoints may be accessible without authentication"
    fi
}

# Run all tests
run_all_tests() {
    log_info "Starting comprehensive penetration testing..."
    
    test_ssl_tls
    test_security_headers
    test_authentication
    test_sql_injection
    test_xss
    test_csrf
    test_directory_traversal
    test_information_disclosure
    test_rate_limiting
    test_api_security
    
    echo -e "\n## Summary\n" >> "${REPORT_FILE}"
    echo "Penetration testing completed at $(date)" >> "${REPORT_FILE}"
    echo "Full report available at: ${REPORT_FILE}" >> "${REPORT_FILE}"
    
    log_info "Penetration testing completed. Report saved to: ${REPORT_FILE}"
}

# Main execution
case "${1:-all}" in
    ssl)
        test_ssl_tls
        ;;
    headers)
        test_security_headers
        ;;
    auth)
        test_authentication
        ;;
    sqli)
        test_sql_injection
        ;;
    xss)
        test_xss
        ;;
    csrf)
        test_csrf
        ;;
    traversal)
        test_directory_traversal
        ;;
    disclosure)
        test_information_disclosure
        ;;
    ratelimit)
        test_rate_limiting
        ;;
    api)
        test_api_security
        ;;
    all)
        run_all_tests
        ;;
    *)
        echo "Usage: $0 {ssl|headers|auth|sqli|xss|csrf|traversal|disclosure|ratelimit|api|all}"
        echo ""
        echo "Tests:"
        echo "  ssl         - SSL/TLS configuration test"
        echo "  headers     - HTTP security headers test"
        echo "  auth        - Authentication security test"
        echo "  sqli        - SQL injection test"
        echo "  xss         - XSS vulnerability test"
        echo "  csrf        - CSRF protection test"
        echo "  traversal   - Directory traversal test"
        echo "  disclosure  - Information disclosure test"
        echo "  ratelimit   - Rate limiting test"
        echo "  api         - API security test"
        echo "  all         - Run all tests (default)"
        exit 1
        ;;
esac