import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, this would fetch from database
    const history = [
      {
        id: '1',
        query: 'Show me revenue trends for this year',
        timestamp: '2024-01-15T10:30:00Z',
        resultType: 'chart',
        saved: true,
        executionTime: 1250,
        confidence: 0.94
      },
      {
        id: '2',
        query: 'How many new clients did we acquire this month?',
        timestamp: '2024-01-15T09:45:00Z',
        resultType: 'metric',
        saved: false,
        executionTime: 980,
        confidence: 0.89
      },
      {
        id: '3',
        query: 'What is our compliance status?',
        timestamp: '2024-01-14T16:20:00Z',
        resultType: 'insight',
        saved: true,
        executionTime: 1450,
        confidence: 0.86
      },
      {
        id: '4',
        query: 'Compare this quarter vs last quarter performance',
        timestamp: '2024-01-14T14:15:00Z',
        resultType: 'chart',
        saved: false,
        executionTime: 1680,
        confidence: 0.91
      },
      {
        id: '5',
        query: 'Show team performance metrics',
        timestamp: '2024-01-13T11:30:00Z',
        resultType: 'table',
        saved: true,
        executionTime: 1120,
        confidence: 0.88
      },
      {
        id: '6',
        query: 'Which services are most profitable?',
        timestamp: '2024-01-13T09:20:00Z',
        resultType: 'chart',
        saved: false,
        executionTime: 1340,
        confidence: 0.92
      },
      {
        id: '7',
        query: 'Generate monthly business report',
        timestamp: '2024-01-12T15:45:00Z',
        resultType: 'insight',
        saved: true,
        executionTime: 2100,
        confidence: 0.85
      },
      {
        id: '8',
        query: 'What are our key performance indicators?',
        timestamp: '2024-01-12T13:10:00Z',
        resultType: 'table',
        saved: false,
        executionTime: 1050,
        confidence: 0.90
      },
      {
        id: '9',
        query: 'Show client satisfaction trends',
        timestamp: '2024-01-11T16:30:00Z',
        resultType: 'chart',
        saved: true,
        executionTime: 1280,
        confidence: 0.87
      },
      {
        id: '10',
        query: 'Forecast revenue for next quarter',
        timestamp: '2024-01-11T10:15:00Z',
        resultType: 'chart',
        saved: false,
        executionTime: 1890,
        confidence: 0.83
      }
    ];

    const stats = {
      totalQueries: history.length,
      savedQueries: history.filter(h => h.saved).length,
      averageExecutionTime: Math.round(
        history.reduce((sum, h) => sum + h.executionTime, 0) / history.length
      ),
      averageConfidence: Math.round(
        history.reduce((sum, h) => sum + h.confidence, 0) / history.length * 100
      ),
      queryTypes: {
        chart: history.filter(h => h.resultType === 'chart').length,
        table: history.filter(h => h.resultType === 'table').length,
        metric: history.filter(h => h.resultType === 'metric').length,
        insight: history.filter(h => h.resultType === 'insight').length
      }
    };

    return NextResponse.json({
      history,
      stats
    });
  } catch (error) {
    console.error('Error fetching query history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch query history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { queryId, action } = await request.json();
    
    if (action === 'save') {
      // In a real implementation, this would update the database
      return NextResponse.json({
        success: true,
        message: 'Query saved successfully'
      });
    }
    
    if (action === 'delete') {
      // In a real implementation, this would delete from database
      return NextResponse.json({
        success: true,
        message: 'Query deleted successfully'
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating query history:', error);
    return NextResponse.json(
      { error: 'Failed to update query history' },
      { status: 500 }
    );
  }
}