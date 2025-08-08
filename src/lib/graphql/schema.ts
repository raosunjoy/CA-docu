import { gql } from 'graphql-tag'

export const typeDefs = gql`
  scalar Date
  scalar JSON

  type Query {
    # Analytics Queries
    analytics(input: AnalyticsInput!): AnalyticsData
    kpis(input: KPIInput!): [KPIData!]!
    metrics(input: MetricsInput!): [MetricData!]!
    
    # Dashboard Queries
    dashboard(id: ID!): Dashboard
    dashboards(filter: DashboardFilter): [Dashboard!]!
    
    # Performance Analytics
    performanceAnalytics(input: PerformanceAnalyticsInput!): PerformanceAnalytics
    productivityMetrics(input: ProductivityMetricsInput!): [ProductivityMetric!]!
    timeTrackingAnalytics(input: TimeTrackingAnalyticsInput!): TimeTrackingAnalytics
    complianceMetrics(input: ComplianceMetricsInput!): ComplianceMetrics
    clientEngagementAnalytics(input: ClientEngagementAnalyticsInput!): ClientEngagementAnalytics
  }

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

  # Input Types
  input AnalyticsInput {
    organizationId: String!
    userId: String
    role: UserRole
    metric: String!
    period: TimePeriod!
    startDate: Date
    endDate: Date
    filters: JSON
  }

  input KPIInput {
    organizationId: String!
    userId: String
    role: UserRole
    kpiTypes: [String!]
    dateRange: DateRangeInput
  }

  input MetricsInput {
    organizationId: String!
    userId: String
    metricTypes: [String!]!
    dimensions: [String!]
    filters: JSON
    groupBy: [String!]
    orderBy: OrderByInput
    limit: Int
  }

  input PerformanceAnalyticsInput {
    organizationId: String!
    userId: String
    role: UserRole
    period: TimePeriod!
    startDate: Date
    endDate: Date
  }

  input ProductivityMetricsInput {
    organizationId: String!
    userId: String
    startDate: Date
    endDate: Date
  }

  input TimeTrackingAnalyticsInput {
    organizationId: String!
    userId: String
    startDate: Date
    endDate: Date
  }

  input ComplianceMetricsInput {
    organizationId: String!
    role: UserRole
  }

  input ClientEngagementAnalyticsInput {
    organizationId: String!
    clientId: String
  }

  input DashboardFilter {
    role: UserRole
    isDefault: Boolean
    createdBy: String
  }

  input CreateDashboardInput {
    name: String!
    description: String
    role: UserRole
    isDefault: Boolean
    widgets: [CreateWidgetInput!]!
  }

  input UpdateDashboardInput {
    name: String
    description: String
    isDefault: Boolean
  }

  input AddWidgetInput {
    type: DashboardWidgetType!
    title: String!
    position: WidgetPositionInput!
    config: JSON
    refreshInterval: Int
  }

  input UpdateWidgetInput {
    title: String
    position: WidgetPositionInput
    config: JSON
    refreshInterval: Int
    isVisible: Boolean
  }

  input CreateWidgetInput {
    type: DashboardWidgetType!
    title: String!
    position: WidgetPositionInput!
    config: JSON
    refreshInterval: Int
  }

  input WidgetPositionInput {
    x: Int!
    y: Int!
    w: Int!
    h: Int!
  }

  input DateRangeInput {
    startDate: Date!
    endDate: Date!
  }

  input OrderByInput {
    field: String!
    direction: SortDirection!
  }

  # Enums
  enum UserRole {
    PARTNER
    MANAGER
    ASSOCIATE
    INTERN
    ADMIN
  }

  enum TimePeriod {
    DAY
    WEEK
    MONTH
    QUARTER
    YEAR
  }

  enum DashboardWidgetType {
    TASK_OVERVIEW
    TASK_BOARD
    COMPLIANCE_STATUS
    TEAM_PERFORMANCE
    WORKLOAD_ANALYTICS
    TIME_TRACKING
    DOCUMENT_STATS
    EMAIL_STATS
    PRODUCTIVITY_METRICS
    CLIENT_ENGAGEMENT
    LEARNING_PROGRESS
    DEADLINES
    NOTIFICATIONS
    QUICK_ACTIONS
    ANALYTICS_CHART
    KPI_CARD
    ACTIVITY_FEED
  }

  enum SortDirection {
    ASC
    DESC
  }

  enum TrendDirection {
    UP
    DOWN
    STABLE
  }

  enum KPIStatus {
    GOOD
    WARNING
    CRITICAL
  }

  enum RiskLevel {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  # Output Types
  type AnalyticsData {
    period: TimePeriod!
    startDate: Date!
    endDate: Date!
    data: [DataPoint!]!
    trend: TrendDirection!
    trendPercentage: Float!
    comparison: ComparisonData
  }

  type DataPoint {
    date: String!
    value: Float!
    label: String
    metadata: JSON
  }

  type ComparisonData {
    period: String!
    value: Float!
    change: Float!
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

  type Dashboard {
    id: String!
    name: String!
    description: String
    role: UserRole
    isDefault: Boolean!
    widgets: [DashboardWidget!]!
    createdBy: String!
    createdAt: Date!
    updatedAt: Date!
  }

  type DashboardWidget {
    id: String!
    type: DashboardWidgetType!
    title: String!
    position: WidgetPosition!
    config: JSON
    refreshInterval: Int
    isVisible: Boolean!
    minSize: WidgetSize
    maxSize: WidgetSize
  }

  type WidgetPosition {
    x: Int!
    y: Int!
    w: Int!
    h: Int!
  }

  type WidgetSize {
    w: Int!
    h: Int!
  }

  type PerformanceAnalytics {
    period: TimePeriod!
    startDate: Date!
    endDate: Date!
    data: [DataPoint!]!
    trend: TrendDirection!
    trendPercentage: Float!
    comparison: ComparisonData
    summary: PerformanceSummary
  }

  type PerformanceSummary {
    totalTasks: Int!
    completedTasks: Int!
    averageCompletionTime: Float!
    productivityScore: Float!
  }

  type ProductivityMetric {
    userId: String!
    date: Date!
    totalHours: Float!
    billableHours: Float!
    tasksCompleted: Int!
    focusScore: Float
    efficiencyScore: Float
    utilizationRate: Float
  }

  type TimeTrackingAnalytics {
    totalHours: Float!
    billableHours: Float!
    nonBillableHours: Float!
    utilizationRate: Float!
    averageHoursPerDay: Float!
    productivityScore: Float!
    timeDistribution: [TimeDistribution!]!
    dailyBreakdown: [DailyTimeBreakdown!]!
  }

  type TimeDistribution {
    category: String!
    hours: Float!
    percentage: Float!
  }

  type DailyTimeBreakdown {
    date: String!
    totalHours: Float!
    billableHours: Float!
    productivity: Float!
  }

  type ComplianceMetrics {
    complianceScore: Float!
    riskLevel: RiskLevel!
    pendingCompliance: Int!
    complianceDeadlines: Int!
    riskFactors: [RiskFactor!]!
  }

  type RiskFactor {
    category: String!
    score: Float!
    level: RiskLevel!
    description: String!
  }

  type ClientEngagementAnalytics {
    totalClients: Int!
    activeEngagements: Int!
    completedEngagements: Int!
    averageEngagementDuration: Float!
    clientSatisfactionScore: Float!
    engagementTypes: [EngagementType!]!
    monthlyEngagements: [MonthlyEngagement!]!
  }

  type EngagementType {
    type: String!
    count: Int!
    averageDuration: Float!
    completionRate: Float!
  }

  type MonthlyEngagement {
    month: String!
    newEngagements: Int!
    completedEngagements: Int!
    revenue: Float!
  }
`