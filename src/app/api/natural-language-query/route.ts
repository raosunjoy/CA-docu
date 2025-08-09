import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query, context } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Simulate natural language processing
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1500));
    const processingTime = Date.now() - startTime;

    const result = await processNaturalLanguageQuery(query, context);
    
    return NextResponse.json({
      success: true,
      result: {
        ...result,
        executionTime: processingTime
      }
    });
  } catch (error) {
    console.error('Error processing natural language query:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}

async function processNaturalLanguageQuery(query: string, context?: any) {
  const lowerQuery = query.toLowerCase();
  
  // Intent classification and entity extraction
  const intent = classifyIntent(lowerQuery);
  const entities = extractEntities(lowerQuery);
  const timeframe = extractTimeframe(lowerQuery);
  
  // Generate appropriate response based on intent
  switch (intent) {
    case 'revenue_analysis':
      return generateRevenueAnalysis(entities, timeframe);
    case 'client_metrics':
      return generateClientMetrics(entities, timeframe);
    case 'performance_review':
      return generatePerformanceReview(entities, timeframe);
    case 'compliance_check':
      return generateComplianceCheck(entities, timeframe);
    case 'comparison_analysis':
      return generateComparisonAnalysis(entities, timeframe);
    case 'forecasting':
      return generateForecastingAnalysis(entities, timeframe);
    default:
      return generateGeneralResponse(query);
  }
}

function classifyIntent(query: string): string {
  if (query.includes('revenue') || query.includes('sales') || query.includes('income')) {
    return 'revenue_analysis';
  }
  if (query.includes('client') || query.includes('customer') || query.includes('retention')) {
    return 'client_metrics';
  }
  if (query.includes('performance') || query.includes('kpi') || query.includes('metric')) {
    return 'performance_review';
  }
  if (query.includes('compliance') || query.includes('audit') || query.includes('regulation')) {
    return 'compliance_check';
  }
  if (query.includes('compare') || query.includes('vs') || query.includes('versus')) {
    return 'comparison_analysis';
  }
  if (query.includes('forecast') || query.includes('predict') || query.includes('future')) {
    return 'forecasting';
  }
  return 'general';
}

function extractEntities(query: string): string[] {
  const entities = [];
  
  // Service types
  if (query.includes('consulting')) entities.push('consulting');
  if (query.includes('tax')) entities.push('tax');
  if (query.includes('audit')) entities.push('audit');
  if (query.includes('advisory')) entities.push('advisory');
  
  // Metrics
  if (query.includes('satisfaction')) entities.push('satisfaction');
  if (query.includes('retention')) entities.push('retention');
  if (query.includes('acquisition')) entities.push('acquisition');
  if (query.includes('utilization')) entities.push('utilization');
  
  return entities;
}

function extractTimeframe(query: string): string {
  if (query.includes('today') || query.includes('daily')) return 'daily';
  if (query.includes('week') || query.includes('weekly')) return 'weekly';
  if (query.includes('month') || query.includes('monthly')) return 'monthly';
  if (query.includes('quarter') || query.includes('quarterly')) return 'quarterly';
  if (query.includes('year') || query.includes('annual')) return 'yearly';
  if (query.includes('last')) return 'previous_period';
  if (query.includes('this')) return 'current_period';
  return 'default';
}

function generateRevenueAnalysis(entities: string[], timeframe: string) {
  return {
    id: Date.now().toString(),
    query: 'Revenue Analysis',
    timestamp: new Date().toISOString(),
    results: {
      type: 'chart',
      data: {
        chartType: 'line',
        chartData: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Revenue ($K)',
            data: [45, 52, 48, 61, 55, 67],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          }]
        }
      },
      explanation: `Revenue analysis shows a positive trend over the ${timeframe} period. Key insights include strong performance in April with 27% growth, and overall upward trajectory indicating healthy business growth.`,
      confidence: 0.94
    },
    suggestions: [
      'Show revenue breakdown by service',
      'Compare with previous year',
      'Analyze revenue drivers',
      'Generate revenue forecast'
    ]
  };
}

function generateClientMetrics(entities: string[], timeframe: string) {
  return {
    id: Date.now().toString(),
    query: 'Client Metrics',
    timestamp: new Date().toISOString(),
    results: {
      type: 'metric',
      data: {
        value: 245,
        change: 18,
        trend: 'up',
        breakdown: [
          { label: 'New Clients', value: 45, change: 25 },
          { label: 'Retained Clients', value: 200, change: 15 },
          { label: 'Churned Clients', value: 12, change: -8 }
        ]
      },
      explanation: `Client metrics for the ${timeframe} show strong growth with 18% increase in total client base. New client acquisition is particularly strong at 25% growth, while retention remains solid.`,
      confidence: 0.89
    },
    suggestions: [
      'Show client satisfaction scores',
      'Analyze client segments',
      'Review retention strategies',
      'Identify growth opportunities'
    ]
  };
}

function generatePerformanceReview(entities: string[], timeframe: string) {
  return {
    id: Date.now().toString(),
    query: 'Performance Review',
    timestamp: new Date().toISOString(),
    results: {
      type: 'table',
      data: {
        headers: ['KPI', 'Current', 'Target', 'Status', 'Trend'],
        rows: [
          ['Client Satisfaction', '4.8/5', '4.5/5', 'Exceeding', '↗'],
          ['Project Delivery', '92%', '90%', 'On Track', '→'],
          ['Resource Utilization', '78%', '80%', 'Below Target', '↘'],
          ['Quality Score', '94%', '90%', 'Exceeding', '↗'],
          ['Revenue Growth', '15%', '12%', 'Exceeding', '↗']
        ]
      },
      explanation: `Performance review for ${timeframe} shows strong results with 4 out of 5 KPIs meeting or exceeding targets. Areas of excellence include client satisfaction and quality scores.`,
      confidence: 0.91
    },
    suggestions: [
      'Analyze underperforming metrics',
      'Compare team performance',
      'Review improvement strategies',
      'Set new targets'
    ]
  };
}

function generateComplianceCheck(entities: string[], timeframe: string) {
  return {
    id: Date.now().toString(),
    query: 'Compliance Check',
    timestamp: new Date().toISOString(),
    results: {
      type: 'insight',
      data: {
        insights: [
          'Overall compliance score: 87% (improved 12% this quarter)',
          '3 critical compliance items require immediate attention',
          'Document retention policies need updating by Q2 2024',
          'Staff training completion rate increased 15% this period',
          '2 regulatory changes require implementation within 30 days'
        ],
        riskLevel: 'medium',
        actionItems: [
          'Review and address 3 critical compliance items',
          'Update document retention policies',
          'Complete pending regulatory implementations',
          'Schedule additional compliance training'
        ]
      },
      explanation: `Compliance analysis for ${timeframe} shows improving trends but requires attention in specific areas. The overall trajectory is positive with proactive management needed.`,
      confidence: 0.86
    },
    suggestions: [
      'Show compliance trends',
      'List critical items',
      'Generate compliance report',
      'Schedule compliance review'
    ]
  };
}

function generateComparisonAnalysis(entities: string[], timeframe: string) {
  return {
    id: Date.now().toString(),
    query: 'Comparison Analysis',
    timestamp: new Date().toISOString(),
    results: {
      type: 'chart',
      data: {
        chartType: 'bar',
        chartData: {
          labels: ['Current Period', 'Previous Period'],
          datasets: [
            {
              label: 'Revenue',
              data: [67000, 58000],
              backgroundColor: '#3B82F6'
            },
            {
              label: 'Clients',
              data: [245, 207],
              backgroundColor: '#10B981'
            },
            {
              label: 'Projects',
              data: [89, 76],
              backgroundColor: '#F59E0B'
            }
          ]
        }
      },
      explanation: `Comparison analysis shows significant improvements across all key metrics. Revenue increased 15.5%, client base grew 18.4%, and project volume increased 17.1% compared to the previous period.`,
      confidence: 0.93
    },
    suggestions: [
      'Analyze growth drivers',
      'Compare by service type',
      'Review seasonal patterns',
      'Project future trends'
    ]
  };
}

function generateForecastingAnalysis(entities: string[], timeframe: string) {
  return {
    id: Date.now().toString(),
    query: 'Forecasting Analysis',
    timestamp: new Date().toISOString(),
    results: {
      type: 'chart',
      data: {
        chartType: 'line',
        chartData: {
          labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            {
              label: 'Actual',
              data: [67, null, null, null, null, null],
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)'
            },
            {
              label: 'Forecast',
              data: [67, 71, 74, 78, 82, 85],
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderDash: [5, 5]
            },
            {
              label: 'Confidence Band',
              data: [67, 75, 79, 84, 89, 93],
              borderColor: 'rgba(16, 185, 129, 0.3)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: '-1'
            }
          ]
        }
      },
      explanation: `Forecasting analysis predicts continued growth over the next ${timeframe} with 95% confidence. Expected growth rate of 6-8% monthly based on current trends and seasonal patterns.`,
      confidence: 0.88
    },
    suggestions: [
      'Adjust forecast parameters',
      'View scenario analysis',
      'Compare forecast models',
      'Export forecast data'
    ]
  };
}

function generateGeneralResponse(query: string) {
  return {
    id: Date.now().toString(),
    query,
    timestamp: new Date().toISOString(),
    results: {
      type: 'insight',
      data: {
        insights: [
          'I understand you\'re looking for business insights',
          'I can help analyze revenue, clients, performance, and compliance data',
          'Try asking specific questions about metrics, trends, or comparisons',
          'I can also generate forecasts and provide recommendations'
        ],
        suggestions: [
          'Show revenue trends this year',
          'How many clients do we have?',
          'What are our KPIs this quarter?',
          'Generate a compliance report'
        ]
      },
      explanation: 'I can help you analyze your business data using natural language. Try asking specific questions about revenue, clients, performance, or compliance.',
      confidence: 0.75
    },
    suggestions: [
      'Show me revenue trends',
      'How many new clients this month?',
      'What is our performance status?',
      'Check compliance issues'
    ]
  };
}