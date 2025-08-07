# Production Support Procedures - Zetra Platform

## 1. Overview

This document outlines the production support procedures for the Zetra Platform,
including monitoring, troubleshooting, maintenance, and escalation procedures.

## 2. Support Team Structure

### Tier 1 Support (L1)

- **Availability:** 24/7
- **Response Time:** 15 minutes
- **Responsibilities:**
  - Initial incident triage
  - Basic troubleshooting
  - Customer communication
  - Escalation to L2 when needed

### Tier 2 Support (L2)

- **Availability:** Business hours + on-call
- **Response Time:** 1 hour
- **Responsibilities:**
  - Advanced troubleshooting
  - System analysis
  - Performance optimization
  - Escalation to L3 when needed

### Tier 3 Support (L3)

- **Availability:** On-call
- **Response Time:** 2 hours
- **Responsibilities:**
  - Complex system issues
  - Code-level debugging
  - Architecture decisions
  - Vendor escalations

## 3. Monitoring and Alerting

### Key Metrics to Monitor

#### Application Metrics

- Response time (95th percentile < 2 seconds)
- Error rate (< 0.1%)
- Throughput (requests per second)
- Active user sessions
- Database connection pool usage

#### Infrastructure Metrics

- CPU utilization (< 80%)
- Memory usage (< 85%)
- Disk usage (< 85%)
- Network I/O
- Container health

#### Business Metrics

- User registrations
- Task completion rate
- Document upload success rate
- Email sync status
- Revenue impact (for paid features)

### Alert Thresholds

#### Critical Alerts (P1)

- Application down (response time > 30 seconds)
- Error rate > 5%
- Database unavailable
- Security breach detected
- Data corruption detected

#### High Priority Alerts (P2)

- Response time > 5 seconds
- Error rate > 1%
- CPU usage > 90%
- Memory usage > 95%
- Disk usage > 90%

#### Medium Priority Alerts (P3)

- Response time > 2 seconds
- Error rate > 0.5%
- CPU usage > 80%
- Memory usage > 85%
- Disk usage > 85%

### Monitoring Tools Configuration

#### Prometheus Alerts

```yaml
groups:
  - name: zetra-production-alerts
    rules:
      - alert: ApplicationDown
        expr: up{job="zetra-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Zetra application is down'
          description: 'Application has been down for more than 1 minute'

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: high
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }} errors per second'

      - alert: HighResponseTime
        expr:
          histogram_quantile(0.95,
          rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: medium
        annotations:
          summary: 'High response time detected'
          description: '95th percentile response time is {{ $value }} seconds'
```

## 4. Troubleshooting Procedures

### Common Issues and Solutions

#### 4.1 Application Performance Issues

**Symptoms:**

- Slow response times
- High CPU/memory usage
- Database connection timeouts

**Troubleshooting Steps:**

1. Check application metrics in Grafana
2. Review recent deployments
3. Analyze database performance
4. Check for memory leaks
5. Review error logs

**Commands:**

```bash
# Check application pods
kubectl get pods -n production
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production --tail=100

# Check resource usage
kubectl top pods -n production
kubectl top nodes

# Check database connections
kubectl exec -it <postgres-pod> -- psql -U zetra_admin -d zetra -c "SELECT count(*) FROM pg_stat_activity;"

# Check application health
curl -f https://zetra.app/api/health
curl -f https://zetra.app/api/health/db
```

#### 4.2 Database Issues

**Symptoms:**

- Connection timeouts
- Slow queries
- Lock contention
- High CPU on database server

**Troubleshooting Steps:**

1. Check database metrics
2. Identify slow queries
3. Check for blocking queries
4. Analyze connection pool usage
5. Review recent schema changes

**Commands:**

```bash
# Connect to database
kubectl exec -it <postgres-pod> -- psql -U zetra_admin -d zetra

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Check blocking queries
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

#### 4.3 Network and Connectivity Issues

**Symptoms:**

- Intermittent connection failures
- High latency
- DNS resolution issues
- Load balancer errors

**Troubleshooting Steps:**

1. Check network connectivity
2. Verify DNS resolution
3. Check load balancer health
4. Analyze network traffic
5. Review firewall rules

**Commands:**

```bash
# Check network connectivity
ping zetra.app
nslookup zetra.app
curl -I https://zetra.app

# Check load balancer status
kubectl get services -n production
kubectl describe service zetra-platform-active -n production

# Check ingress status
kubectl get ingress -n production
kubectl describe ingress zetra-platform-ingress -n production

# Check network policies
kubectl get networkpolicies -n production
```

#### 4.4 Storage Issues

**Symptoms:**

- Disk space warnings
- File upload failures
- Backup failures
- Slow I/O operations

**Troubleshooting Steps:**

1. Check disk usage
2. Identify large files
3. Clean up temporary files
4. Check backup status
5. Verify storage permissions

**Commands:**

```bash
# Check disk usage
df -h
du -sh /app/uploads/*
du -sh /var/log/*

# Check persistent volumes
kubectl get pv
kubectl get pvc -n production

# Clean up old logs
find /var/log -name "*.log" -mtime +7 -delete
find /app/logs -name "*.log" -mtime +7 -delete

# Check S3 storage (if applicable)
aws s3 ls s3://zetra-documents-production/
aws s3api get-bucket-location --bucket zetra-documents-production
```

## 5. Maintenance Procedures

### 5.1 Regular Maintenance Tasks

#### Daily Tasks

- [ ] Check system health dashboards
- [ ] Review error logs
- [ ] Monitor backup status
- [ ] Check security alerts
- [ ] Verify SSL certificate status

#### Weekly Tasks

- [ ] Review performance metrics
- [ ] Analyze user activity patterns
- [ ] Check database performance
- [ ] Review capacity planning
- [ ] Update security patches

#### Monthly Tasks

- [ ] Conduct security review
- [ ] Analyze cost optimization opportunities
- [ ] Review and update documentation
- [ ] Conduct disaster recovery testing
- [ ] Performance optimization review

### 5.2 Deployment Procedures

#### Pre-deployment Checklist

- [ ] Code review completed
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

#### Deployment Steps

1. **Preparation**

   ```bash
   # Create deployment branch
   git checkout -b deploy/$(date +%Y%m%d_%H%M%S)

   # Run final tests
   npm run test:all
   npm run build
   ```

2. **Database Migration (if needed)**

   ```bash
   # Backup database
   kubectl exec -it <postgres-pod> -- pg_dump -U zetra_admin zetra > backup_$(date +%Y%m%d_%H%M%S).sql

   # Run migrations
   kubectl exec -it <app-pod> -- npm run migrate
   ```

3. **Application Deployment**

   ```bash
   # Deploy to staging first
   kubectl apply -f k8s/deployment.yaml --dry-run=client
   kubectl apply -f k8s/deployment.yaml

   # Wait for rollout
   kubectl rollout status deployment/zetra-platform-blue -n production

   # Switch traffic
   kubectl patch service zetra-platform-active -n production -p '{"spec":{"selector":{"slot":"blue"}}}'
   ```

4. **Post-deployment Verification**

   ```bash
   # Health checks
   curl -f https://zetra.app/api/health
   curl -f https://zetra.app/api/health/db

   # Smoke tests
   npm run test:smoke

   # Monitor metrics
   # Check Grafana dashboards for 15 minutes
   ```

#### Rollback Procedures

```bash
# Quick rollback
kubectl rollout undo deployment/zetra-platform-blue -n production

# Switch traffic back
kubectl patch service zetra-platform-active -n production -p '{"spec":{"selector":{"slot":"green"}}}'

# Database rollback (if needed)
kubectl exec -it <postgres-pod> -- psql -U zetra_admin -d zetra < backup_$(date +%Y%m%d_%H%M%S).sql
```

### 5.3 Backup and Recovery

#### Automated Backup Schedule

- **Database:** Every 6 hours
- **File storage:** Daily
- **Configuration:** Daily
- **Full system:** Weekly

#### Backup Verification

```bash
# Run backup script
./scripts/backup-restore.sh backup

# Verify backup integrity
./scripts/backup-restore.sh verify zetra_backup_$(date +%Y%m%d_%H%M%S).tar.gz

# Test restore (in staging)
./scripts/backup-restore.sh restore zetra_backup_$(date +%Y%m%d_%H%M%S).tar.gz
```

#### Recovery Procedures

1. **Assess the situation**
   - Determine scope of data loss
   - Identify last known good backup
   - Estimate recovery time

2. **Prepare for recovery**
   - Notify stakeholders
   - Set up maintenance mode
   - Prepare clean environment

3. **Execute recovery**
   - Restore from backup
   - Verify data integrity
   - Test critical functions

4. **Post-recovery validation**
   - Run comprehensive tests
   - Verify user access
   - Monitor for issues

## 6. Performance Optimization

### 6.1 Database Optimization

#### Query Optimization

```sql
-- Identify slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'tasks';

-- Analyze table statistics
ANALYZE tasks;
ANALYZE documents;
ANALYZE users;
```

#### Index Management

```sql
-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_tasks_assignee_status
ON tasks(assigned_to, status)
WHERE assigned_to IS NOT NULL;

-- Remove unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

### 6.2 Application Optimization

#### Memory Management

```bash
# Monitor memory usage
kubectl top pods -n production --sort-by=memory

# Check for memory leaks
kubectl exec -it <pod-name> -- node --expose-gc -e "
  setInterval(() => {
    const used = process.memoryUsage();
    console.log(JSON.stringify(used));
    global.gc();
  }, 5000);
"
```

#### Cache Optimization

```bash
# Check Redis cache hit rate
kubectl exec -it <redis-pod> -- redis-cli info stats | grep keyspace

# Monitor cache performance
kubectl exec -it <redis-pod> -- redis-cli monitor
```

### 6.3 Infrastructure Optimization

#### Resource Scaling

```bash
# Check resource utilization
kubectl top nodes
kubectl top pods -n production

# Scale deployment
kubectl scale deployment zetra-platform-blue --replicas=5 -n production

# Update resource limits
kubectl patch deployment zetra-platform-blue -n production -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "zetra-app",
          "resources": {
            "requests": {"memory": "1Gi", "cpu": "500m"},
            "limits": {"memory": "2Gi", "cpu": "1000m"}
          }
        }]
      }
    }
  }
}'
```

## 7. Data Management

### 7.1 Data Cleanup Procedures

#### Log Cleanup

```bash
# Clean application logs older than 30 days
find /app/logs -name "*.log" -mtime +30 -delete

# Clean system logs
journalctl --vacuum-time=30d

# Clean Docker logs
docker system prune -f
```

#### Database Cleanup

```sql
-- Clean old audit logs (older than 1 year)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- Clean expired sessions
DELETE FROM sessions WHERE expires < NOW();

-- Clean soft-deleted records (older than 90 days)
DELETE FROM tasks WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '90 days';
DELETE FROM documents WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '90 days';
```

### 7.2 Data Archival

#### Archive Old Data

```bash
# Archive old documents to cold storage
aws s3 sync s3://zetra-documents-production/ s3://zetra-documents-archive/ \
  --storage-class GLACIER \
  --exclude "*" \
  --include "*" \
  --last-modified-before $(date -d '2 years ago' --iso-8601)

# Archive database records
pg_dump -U zetra_admin -d zetra \
  --table=audit_logs \
  --where="created_at < '$(date -d '2 years ago' --iso-8601)'" \
  > audit_logs_archive_$(date +%Y%m%d).sql
```

## 8. Escalation Procedures

### 8.1 Escalation Matrix

| Issue Type   | L1 → L2   | L2 → L3   | L3 → Management |
| ------------ | --------- | --------- | --------------- |
| Performance  | 30 min    | 2 hours   | 4 hours         |
| Security     | Immediate | 15 min    | 30 min          |
| Data Loss    | Immediate | Immediate | Immediate       |
| Service Down | 15 min    | 1 hour    | 2 hours         |

### 8.2 Contact Information

#### Internal Escalation

- **L1 Team Lead:** +1-XXX-XXX-XXXX
- **L2 Team Lead:** +1-XXX-XXX-XXXX
- **L3 Team Lead:** +1-XXX-XXX-XXXX
- **Engineering Manager:** +1-XXX-XXX-XXXX
- **CTO:** +1-XXX-XXX-XXXX

#### External Escalation

- **AWS Support:** +1-XXX-XXX-XXXX
- **Database Vendor:** +1-XXX-XXX-XXXX
- **Security Vendor:** +1-XXX-XXX-XXXX

## 9. Documentation and Knowledge Management

### 9.1 Required Documentation

- [ ] Runbooks for common procedures
- [ ] Architecture diagrams
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Deployment procedures
- [ ] Troubleshooting guides

### 9.2 Knowledge Sharing

- Weekly team knowledge sharing sessions
- Post-incident review documentation
- Best practices documentation
- Tool and process training materials

## 10. Continuous Improvement

### 10.1 Metrics and KPIs

- **Mean Time to Detection (MTTD):** < 5 minutes
- **Mean Time to Response (MTTR):** < 15 minutes
- **Mean Time to Recovery (MTTR):** < 1 hour
- **System Uptime:** > 99.9%
- **Customer Satisfaction:** > 95%

### 10.2 Regular Reviews

- **Weekly:** Incident review and process improvements
- **Monthly:** Performance and capacity review
- **Quarterly:** Process and tool evaluation
- **Annually:** Complete procedure review and update

---

**Document Version:** 1.0 **Last Updated:** $(date) **Next Review Date:** $(date
-d "+3 months") **Owner:** Production Support Team **Approved By:** Engineering
Manager
