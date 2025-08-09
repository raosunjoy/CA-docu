import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const metric = searchParams.get('metric');
  const timeRange = searchParams.get('timeRange') || '24h';

  if (!metric) {
    return NextResponse.json({ error: 'Metric parameter is required' }, { status: 400 });
  }

  try {
    // Generate mock drill-down data based on metric and time range
    const drillDownData = generateDrillDownData(metric, timeRange);
    
    return NextResponse.json(drillDownData);
  } catch (error) {
    console.error('Error fetching drill-down data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drill-down data' },
      { status: 500 }
    );
  }
}

function generateDrillDownData(metric: string, timeRange: string) {
  const now = new Date();
  const dataPoints = getDataPointsForTimeRange(timeRange);
  
  // Generate time series data
  const data = Array.from({ length: dataPoints }, (_, i) => {
    const timestamp = new Date(now.getTime() - (dataPoints - i - 1) * getIntervalMs(timeRange));
    const baseValue = getBaseValueForMetric(metric);
    const variation = (Math.random() - 0.5) * baseValue * 0.3;
    const value = Math.max(0, baseValue + variation);
    
    return {
      timestamp: timestamp.toISOString(),
      value: Math.round(value),
      trend: getTrend(value, baseValue)
    };
  });

  // Generate breakdown data
  const breakdown = generateBreakdownData(metric);
  
  // Generate correlations
  const correlations = generateCorrelations(metric);

  return {
    metric,
    timeRange,
    data,
    breakdown,
    correlations
  };
}

function getDataPointsForTimeRange(timeRange: string): number {
  switch (timeRange) {
    case '1h': return 12; // 5-minute intervals
    case '24h': return 24; // 1-hour intervals
    case '7d': return 14; // 12-hour intervals
    case '30d': return 30; // 1-day intervals
    default: return 24;
  }
}

function getIntervalMs(timeRange: string): number {
  switch (timeRange) {
    case '1h': return 5 * 60 * 1000; // 5 minutes
    case '24h': return 60 * 60 * 1000; // 1 hour
    case '7d': return 12 * 60 * 60 * 1000; // 12 hours
    case '30d': return 24 * 60 * 60 * 1000; // 1 day
    default: return 60 * 60 * 1000;
  }
}

function getBaseValueForMetric(metric: string): number {
  switch (metric) {
    case 'revenue': return 45000;
    case 'activeUsers': return 850;
    case 'systemLoad': return 65;
    case 'errorRate': return 1.2;
    default: return 100;
  }
}

function getTrend(value: number, baseValue: number): 'up' | 'down' | 'stable' {
  const diff = (value - baseValue) / baseValue;
  if (diff > 0.05) return 'up';
  if (diff < -0.05) return 'down';
  return 'stable';
}

function generateBreakdownData(metric: string) {
  const categories = getBreakdownCategories(metric);
  const total = Math.random() * 1000 + 500;
  
  return categories.map((category, index) => {
    const value = Math.random() * (total / categories.length) + (total / categories.length * 0.5);
    return {
      category,
      value: Math.round(value),
      percentage: Math.round((value / total) * 100)
    };
  });
}

function getBreakdownCategories(metric: string): string[] {
  switch (metric) {
    case 'revenue':
      return ['Consulting', 'Tax Services', 'Audit', 'Advisory', 'Other'];
    case 'activeUsers':
      return ['Partners', 'Managers', 'Associates', 'Interns', 'Clients'];
    case 'systemLoad':
      return ['Database', 'API Server', 'File Storage', 'Cache', 'Analytics'];
    case 'errorRate':
      return ['Authentication', 'Database', 'API Calls', 'File Upload', 'Network'];
    default:
      return ['Category A', 'Category B', 'Category C', 'Category D'];
  }
}

function generateCorrelations(metric: string) {
  const correlatedMetrics = getCorrelatedMetrics(metric);
  
  return correlatedMetrics.map(correlatedMetric => ({
    metric: correlatedMetric.name,
    correlation: correlatedMetric.correlation,
    impact: correlatedMetric.impact
  }));
}

function getCorrelatedMetrics(metric: string) {
  switch (metric) {
    case 'revenue':
      return [
        { name: 'Client Satisfaction', correlation: 0.85, impact: 'positive' as const },
        { name: 'Project Completion Rate', correlation: 0.72, impact: 'positive' as const },
        { name: 'Staff Utilization', correlation: 0.68, impact: 'positive' as const },
        { name: 'Error Rate', correlation: -0.45, impact: 'negative' as const }
      ];
    case 'activeUsers':
      return [
        { name: 'System Performance', correlation: -0.35, impact: 'negative' as const },
        { name: 'Feature Usage', correlation: 0.78, impact: 'positive' as const },
        { name: 'Support Tickets', correlation: 0.42, impact: 'neutral' as const },
        { name: 'Revenue', correlation: 0.65, impact: 'positive' as const }
      ];
    case 'systemLoad':
      return [
        { name: 'Active Users', correlation: 0.82, impact: 'positive' as const },
        { name: 'Response Time', correlation: 0.91, impact: 'positive' as const },
        { name: 'Error Rate', correlation: 0.67, impact: 'positive' as const },
        { name: 'User Satisfaction', correlation: -0.58, impact: 'negative' as const }
      ];
    case 'errorRate':
      return [
        { name: 'System Load', correlation: 0.73, impact: 'positive' as const },
        { name: 'User Satisfaction', correlation: -0.89, impact: 'negative' as const },
        { name: 'Support Tickets', correlation: 0.84, impact: 'positive' as const },
        { name: 'Revenue', correlation: -0.52, impact: 'negative' as const }
      ];
    default:
      return [
        { name: 'Related Metric 1', correlation: 0.5, impact: 'positive' as const },
        { name: 'Related Metric 2', correlation: -0.3, impact: 'negative' as const }
      ];
  }
}