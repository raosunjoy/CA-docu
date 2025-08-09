import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const visualizations = [
      {
        id: '1',
        type: 'bar',
        title: 'Revenue by Quarter',
        dataSource: '1',
        config: { 
          xAxis: 'quarter', 
          yAxis: 'revenue', 
          color: '#3B82F6',
          showTargets: true,
          aggregation: 'sum'
        },
        aiRecommended: true,
        confidence: 0.92,
        insights: [
          'Strong Q3 performance with 23% growth',
          'Seasonal trend detected - Q4 typically strongest',
          'Revenue target exceeded by 15% this quarter'
        ],
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-15T14:30:00Z',
        viewCount: 156,
        shareCount: 23
      },
      {
        id: '2',
        type: 'line',
        title: 'Client Growth Trend',
        dataSource: '2',
        config: { 
          xAxis: 'date', 
          yAxis: 'clients', 
          trend: true,
          smoothing: 0.3,
          showForecast: true
        },
        aiRecommended: true,
        confidence: 0.87,
        insights: [
          'Consistent growth pattern over 6 months',
          'Acceleration in recent months indicates successful campaigns',
          'Projected to reach 1000 clients by Q2'
        ],
        createdAt: '2024-01-08T15:20:00Z',
        updatedAt: '2024-01-14T09:15:00Z',
        viewCount: 89,
        shareCount: 12
      },
      {
        id: '3',
        type: 'pie',
        title: 'Service Distribution',
        dataSource: '1',
        config: { 
          category: 'service_type', 
          value: 'revenue',
          showPercentages: true,
          colorScheme: 'professional'
        },
        aiRecommended: false,
        confidence: 0,
        insights: [],
        createdAt: '2024-01-12T11:45:00Z',
        updatedAt: '2024-01-12T11:45:00Z',
        viewCount: 67,
        shareCount: 8
      },
      {
        id: '4',
        type: 'scatter',
        title: 'Performance vs Satisfaction',
        dataSource: '5',
        config: {
          xAxis: 'performance_score',
          yAxis: 'satisfaction_rating',
          showCorrelation: true,
          trendLine: true
        },
        aiRecommended: true,
        confidence: 0.78,
        insights: [
          'Strong positive correlation (r=0.82) between performance and satisfaction',
          'High performers show 25% higher satisfaction rates',
          'Outliers indicate potential coaching opportunities'
        ],
        createdAt: '2024-01-09T16:30:00Z',
        updatedAt: '2024-01-13T12:20:00Z',
        viewCount: 45,
        shareCount: 5
      },
      {
        id: '5',
        type: 'gauge',
        title: 'Compliance Score',
        dataSource: '1',
        config: {
          value: 87,
          min: 0,
          max: 100,
          thresholds: [60, 80, 95],
          showTrend: true
        },
        aiRecommended: true,
        confidence: 0.94,
        insights: [
          'Compliance score improved 12% this quarter',
          'Above industry average of 82%',
          'Risk level: Low - maintaining good standing'
        ],
        createdAt: '2024-01-11T09:00:00Z',
        updatedAt: '2024-01-15T16:45:00Z',
        viewCount: 78,
        shareCount: 15
      }
    ];

    return NextResponse.json({
      visualizations,
      totalCount: visualizations.length,
      aiRecommendedCount: visualizations.filter(v => v.aiRecommended).length,
      averageConfidence: visualizations
        .filter(v => v.aiRecommended)
        .reduce((sum, v) => sum + v.confidence, 0) / 
        visualizations.filter(v => v.aiRecommended).length
    });
  } catch (error) {
    console.error('Error fetching visualizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visualizations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, title, dataSource, config, aiRecommended = false } = await request.json();
    
    const newVisualization = {
      id: Date.now().toString(),
      type,
      title,
      dataSource,
      config,
      aiRecommended,
      confidence: aiRecommended ? Math.random() * 0.3 + 0.7 : 0,
      insights: aiRecommended ? generateInsights(type, title) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0,
      shareCount: 0
    };

    return NextResponse.json({
      success: true,
      visualization: newVisualization,
      message: 'Visualization created successfully'
    });
  } catch (error) {
    console.error('Error creating visualization:', error);
    return NextResponse.json(
      { error: 'Failed to create visualization' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, updates } = await request.json();
    
    // Simulate update
    const updatedVisualization = {
      id,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      visualization: updatedVisualization,
      message: 'Visualization updated successfully'
    });
  } catch (error) {
    console.error('Error updating visualization:', error);
    return NextResponse.json(
      { error: 'Failed to update visualization' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Visualization ID is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Visualization deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting visualization:', error);
    return NextResponse.json(
      { error: 'Failed to delete visualization' },
      { status: 500 }
    );
  }
}

function generateInsights(type: string, title: string): string[] {
  const insights = {
    bar: [
      'Clear performance differences identified across categories',
      'Top performer exceeds average by 25%',
      'Opportunity for improvement in bottom quartile'
    ],
    line: [
      'Consistent upward trend over time period',
      'Seasonal patterns detected in data',
      'Growth rate accelerating in recent periods'
    ],
    pie: [
      'Distribution shows clear market leaders',
      'Concentration in top 3 categories represents 70% of total',
      'Diversification opportunities identified'
    ],
    scatter: [
      'Strong correlation detected between variables',
      'Outliers indicate special cases requiring attention',
      'Trend line suggests predictable relationship'
    ],
    gauge: [
      'Current performance within acceptable range',
      'Trending positively compared to previous period',
      'Threshold monitoring active for alerts'
    ]
  };

  return insights[type as keyof typeof insights] || [
    'Data patterns analyzed successfully',
    'Key trends identified for business insights',
    'Visualization optimized for clarity'
  ];
}