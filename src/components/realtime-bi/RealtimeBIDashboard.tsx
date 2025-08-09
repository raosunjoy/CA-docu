'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { useWebSocket } from '@/hooks/useWebSocket';
import { AnomalyAlertSystem } from './AnomalyAlertSystem';
import { InteractiveDrillDown } from './InteractiveDrillDown';
import { RealtimeMetricsGrid } from './RealtimeMetricsGrid';
import { PerformanceMonitor } from './PerformanceMonitor';

interface RealtimeData {
  timestamp: string;
  metrics: {
    revenue: number;
    activeUsers: number;
    systemLoad: number;
    errorRate: number;
  };
  anomalies: Anomaly[];
  insights: AIInsight[];
}

interface Anomaly {
  id: string;
  type: 'revenue' | 'performance' | 'security' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  affectedMetrics: string[];
}

interface AIInsight {
  id: string;
  category: string;
  insight: string;
  confidence: number;
  actionable: boolean;
}

export const RealtimeBIDashboard: React.FC = () => {
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [responseTime, setResponseTime] = useState<number>(0);

  const { socket, isConnected: wsConnected } = useWebSocket('/api/dashboard/realtime');

  useEffect(() => {
    if (socket) {
      const startTime = Date.now();
      
      socket.on('dashboard-data', (data: RealtimeData) => {
        const endTime = Date.now();
        setResponseTime(endTime - startTime);
        setRealtimeData(data);
        setIsConnected(true);
      });

      socket.on('anomaly-detected', (anomaly: Anomaly) => {
        setRealtimeData(prev => prev ? {
          ...prev,
          anomalies: [anomaly, ...prev.anomalies.slice(0, 9)]
        } : null);
      });

      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));

      return () => {
        socket.off('dashboard-data');
        socket.off('anomaly-detected');
        socket.off('connect');
        socket.off('disconnect');
      };
    }
  }, [socket]);

  const handleMetricClick = (metricName: string) => {
    setSelectedMetric(metricName);
  };

  const getConnectionStatus = () => {
    if (!isConnected) return { status: 'disconnected', color: 'red' };
    if (responseTime > 1000) return { status: 'slow', color: 'yellow' };
    return { status: 'optimal', color: 'green' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="space-y-6 p-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real-time BI Dashboard</h1>
          <p className="text-gray-600 mt-1">Live business intelligence with AI-powered insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <PerformanceMonitor responseTime={responseTime} />
          <Badge 
            variant={connectionStatus.color as any}
            className="flex items-center space-x-2"
          >
            <div className={`w-2 h-2 rounded-full bg-${connectionStatus.color}-400 animate-pulse`} />
            <span className="capitalize">{connectionStatus.status}</span>
          </Badge>
        </div>
      </div>

      {/* Anomaly Alert System */}
      <AnomalyAlertSystem 
        anomalies={realtimeData?.anomalies || []}
        onAnomalyClick={(anomaly) => setSelectedMetric(anomaly.affectedMetrics[0])}
      />

      {/* Real-time Metrics Grid */}
      <RealtimeMetricsGrid 
        metrics={realtimeData?.metrics}
        onMetricClick={handleMetricClick}
        selectedMetric={selectedMetric}
      />

      {/* Interactive Drill-down */}
      {selectedMetric && (
        <InteractiveDrillDown 
          metric={selectedMetric}
          insights={realtimeData?.insights || []}
          onClose={() => setSelectedMetric(null)}
        />
      )}

      {/* AI Insights Panel */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">AI-Powered Insights</h3>
        <div className="space-y-3">
          {realtimeData?.insights.map((insight) => (
            <div 
              key={insight.id}
              className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg"
            >
              <div className="flex-shrink-0">
                <Badge variant={insight.actionable ? 'blue' : 'gray'}>
                  {Math.round(insight.confidence * 100)}%
                </Badge>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{insight.category}</p>
                <p className="text-sm text-gray-600 mt-1">{insight.insight}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Mobile Optimization Indicator */}
      <div className="md:hidden fixed bottom-4 right-4">
        <Badge variant="blue" className="shadow-lg">
          Mobile Optimized
        </Badge>
      </div>
    </div>
  );
};