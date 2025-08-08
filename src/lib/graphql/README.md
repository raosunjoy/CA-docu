# GraphQL Analytics Interface

This directory contains the GraphQL interface implementation for flexible data querying in the Zetra Analytics Platform.

## Overview

The GraphQL interface provides a flexible, type-safe way to query analytics data, KPIs, metrics, and dashboard information. It supports complex queries with filtering, sorting, and aggregation capabilities.

## Architecture

```
src/lib/graphql/
├── schema.ts          # GraphQL schema definitions
├── resolvers.ts       # GraphQL resolvers implementation
├── server.ts          # Apollo Server configuration
├── client.ts          # GraphQL client utilities
└── __tests__/         # Test files
```

## Features

### 1. Analytics Queries
- **Performance Analytics**: Task completion rates, productivity scores, trend analysis
- **Productivity Metrics**: Individual and team productivity tracking
- **Time Tracking Analytics**: Billable hours, utilization rates, time distribution
- **Compliance Metrics**: Compliance scores, risk assessment, pending items
- **Client Engagement Analytics**: Client satisfaction, engagement types, revenue tracking

### 2. KPI Management
- Real-time KPI calculations
- Target tracking and status monitoring
- Trend analysis with percentage changes
- Multiple KPI types support

### 3. Flexible Metrics System
- Custom metric definitions
- Multi-dimensional data querying
- Filtering and sorting capabilities
- Aggregation support

### 4. Dashboard Management
- Dynamic dashboard creation and management
- Widget configuration and positioning
- Role-based dashboard templates
- Real-time dashboard updates

## Usage

### Basic Query Example

```typescript
import { graphqlClient, ANALYTICS_QUERIES } from '../lib/graphql/client'

// Query analytics data
const result = await graphqlClient.query(ANALYTICS_QUERIES.GET_ANALYTICS, {
  input: {
    organizationId: 'org-123',
    metric: 'performance',
    period: 'MONTH',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31')
  }
})

console.log(result.analytics)
```

### Using React Hooks

```typescript
import { useAnalytics, useKPIs } from '../hooks/useGraphQL'

function AnalyticsDashboard({ organizationId, userId, role }) {
  // Get analytics data with automatic refetching
  const { data: analytics, loading, error, refetch } = useAnalytics({
    organizationId,
    userId,
    role,
    metric: 'performance',
    period: 'MONTH'
  }, {
    pollInterval: 30000 // Refresh every 30 seconds
  })

  // Get KPIs
  const { data: kpis } = useKPIs({
    organizationId,
    userId,
    role,
    kpiTypes: ['task-completion-rate', 'team-utilization']
  })

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Analytics Dashboard</h2>
      {/* Render analytics data */}
    </div>
  )
}
```

### Advanced Metrics Query

```typescript
import { analyticsService } from '../lib/graphql/client'

// Query metrics with filtering and sorting
const metrics = await analyticsService.getMetrics({
  organizationId: 'org-123',
  metricTypes: ['task-count', 'completion-rate', 'productivity-score'],
  dimensions: ['team', 'project', 'client'],
  filters: {
    status: ['COMPLETED', 'IN_PROGRESS'],
    priority: ['HIGH', 'URGENT'],
    dateRange: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    }
  },
  groupBy: ['team', 'priority'],
  orderBy: {
    field: 'value',
    direction: 'DESC'
  },
  limit: 50
})
```

## GraphQL Schema

### Core Types

```graphql
type AnalyticsData {
  period: TimePeriod!
  startDate: Date!
  endDate: Date!
  data: [DataPoint!]!
  trend: TrendDirection!
  trendPercentage: Float!
  comparison: ComparisonData
}

type KPIData {
  id: String!
  name: String!
  value: Float!
  target: Float
  unit: String
  format: String
  trend: TrendDirection!
  trendPercentage: Float!
  status: KPIStatus!
  description: String
  lastUpdated: Date!
}

type MetricData {
  id: String!
  name: String!
  value: Float!
  dimensions: JSON
  timestamp: Date!
  metadata: JSON
}
```

### Query Operations

```graphql
type Query {
  # Analytics Queries
  analytics(input: AnalyticsInput!): AnalyticsData
  kpis(input: KPIInput!): [KPIData!]!
  metrics(input: MetricsInput!): [MetricData!]!
  
  # Specialized Analytics
  performanceAnalytics(input: PerformanceAnalyticsInput!): PerformanceAnalytics
  productivityMetrics(input: ProductivityMetricsInput!): [ProductivityMetric!]!
  timeTrackingAnalytics(input: TimeTrackingAnalyticsInput!): TimeTrackingAnalytics
  complianceMetrics(input: ComplianceMetricsInput!): ComplianceMetrics
  clientEngagementAnalytics(input: ClientEngagementAnalyticsInput!): ClientEngagementAnalytics
  
  # Dashboard Queries
  dashboard(id: ID!): Dashboard
  dashboards(filter: DashboardFilter): [Dashboard!]!
}
```

### Mutation Operations

```graphql
type Mutation {
  # Dashboard Mutations
  createDashboard(input: CreateDashboardInput!): Dashboard
  updateDashboard(id: ID!, input: UpdateDashboardInput!): Dashboard
  deleteDashboard(id: ID!): Boolean
  
  # Widget Mutations
  addWidget(dashboardId: ID!, input: AddWidgetInput!): DashboardWidget
  updateWidget(id: ID!, input: UpdateWidgetInput!): DashboardWidget
  removeWidget(id: ID!): Boolean
}
```

## API Endpoint

The GraphQL endpoint is available at:
```
POST /api/graphql
```

### Authentication

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Example Request

```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "query": "query GetAnalytics($input: AnalyticsInput!) { analytics(input: $input) { period data { date value } trend trendPercentage } }",
    "variables": {
      "input": {
        "organizationId": "org-123",
        "metric": "performance",
        "period": "MONTH"
      }
    }
  }'
```

## Error Handling

The GraphQL interface provides comprehensive error handling:

### GraphQL Errors
```json
{
  "errors": [
    {
      "message": "Field 'analytics' of type 'AnalyticsData' must have a selection of subfields.",
      "locations": [{"line": 2, "column": 3}],
      "path": ["analytics"]
    }
  ]
}
```

### Application Errors
```json
{
  "data": null,
  "errors": [
    {
      "message": "Organization not found",
      "extensions": {
        "code": "NOT_FOUND",
        "organizationId": "invalid-org-id"
      }
    }
  ]
}
```

## Performance Considerations

### Caching
- Query results are cached based on parameters
- Cache invalidation on data updates
- Configurable cache TTL per query type

### Rate Limiting
- Per-user rate limiting implemented
- Query complexity analysis
- Resource usage monitoring

### Optimization
- DataLoader for N+1 query prevention
- Query depth limiting
- Field-level permissions

## Security

### Authentication
- JWT token validation
- User context extraction
- Session management

### Authorization
- Role-based access control
- Field-level permissions
- Data filtering based on user permissions

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- Sensitive data masking

## Testing

Run the GraphQL interface tests:

```bash
npm test -- src/lib/graphql/__tests__/
```

### Test Coverage
- Query resolution testing
- Error handling validation
- Authentication and authorization
- Performance and caching
- Integration tests

## Development

### Adding New Queries

1. **Update Schema** (`schema.ts`):
```graphql
extend type Query {
  newAnalytics(input: NewAnalyticsInput!): NewAnalyticsData
}
```

2. **Add Resolver** (`resolvers.ts`):
```typescript
Query: {
  newAnalytics: async (_, { input }) => {
    // Implementation
    return result
  }
}
```

3. **Update Client** (`client.ts`):
```typescript
export const NEW_ANALYTICS_QUERY = gql`
  query GetNewAnalytics($input: NewAnalyticsInput!) {
    newAnalytics(input: $input) {
      # fields
    }
  }
`
```

4. **Add Hook** (`useGraphQL.ts`):
```typescript
export function useNewAnalytics(params, options) {
  // Hook implementation
}
```

### Adding New Mutations

Follow similar pattern for mutations, ensuring proper error handling and validation.

## Monitoring

### Metrics Tracked
- Query execution time
- Error rates
- Cache hit/miss ratios
- Resource usage
- User activity

### Logging
- Query logging with correlation IDs
- Error logging with stack traces
- Performance metrics
- Security events

## Future Enhancements

### Planned Features
- Real-time subscriptions for live data
- Advanced aggregation functions
- Custom visualization queries
- Machine learning integration
- Advanced caching strategies

### Performance Improvements
- Query optimization
- Database indexing
- Connection pooling
- Horizontal scaling

## Support

For questions or issues with the GraphQL interface:

1. Check the test files for usage examples
2. Review the schema documentation
3. Examine the resolver implementations
4. Test queries using GraphQL Playground (development only)

## Contributing

When contributing to the GraphQL interface:

1. Follow the existing schema patterns
2. Add comprehensive tests
3. Update documentation
4. Consider performance implications
5. Ensure security best practices