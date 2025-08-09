'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Modal } from '@/components/atoms/Modal';
import { X, TrendingUp, TrendingDown, BarChart3, PieChart, Lightbulb } from 'lucide-react';
import { BaseChart } from '@/components/charts/BaseChart';

interface AIInsight {
  id: string;
  category: string;
  insight: string;
  confidence: number;
  actionable: boolean;
}

interface DrillDownData {
  metric: string;
  timeRange: string;
  data: Array<{
    timestamp: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  breakdown: Array<{
    category: string;
    value: number;
    percentage: number;
  }>;
  correlations: Array<{
    metric: string;
    correlation: number;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
}

interface InteractiveDrillDownProps {
  metric: string;
  insights: AIInsight[];
  onClose: () => void;
}

export const InteractiveDrillDown: React.FC<InteractiveDrillDownProps> = ({
  metric,
  insights,
  onClose
}) => {
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedView, setSelectedView] = useState<'trend' | 'breakdown' | 'correlations'>('trend');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrillDownData();
  }, [metric, selectedTimeRange]);

  const fetchDrillDownData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/drill-down?metric=${metric}&timeRange=${selectedTimeRange}`);
      const data = await response.json();
      setDrillDownData(data);
    } catch (error) {
      console.error('Failed to fetch drill-down data:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeRanges = [
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' }
  ];

  const getMetricIcon = (metricName: string) => {
    if (metricName.includes('revenue') || metricName.includes('sales')) return TrendingUp;
    if (metricName.includes('performance') || metricName.includes('load')) return BarChart3;
    return PieChart;
  };

  const MetricIcon = getMetricIcon(metric);

  const renderTrendView = () => {
    if (!drillDownData?.data) return null;

    const chartData = {
      labels: drillDownData.data.map(d => new Date(d.timestamp).toLocaleTimeString()),
      datasets: [{
        label: metric,
        data: drillDownData.data.map(d => d.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }]
    };

    return (
      <div className="space-y-4">
        <div className="h-64">
          <BaseChart type="line" data={chartData} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {drillDownData.data.slice(-3).map((point, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {new Date(point.timestamp).toLocaleTimeString()}
                  </p>
                  <p className="text-lg font-semibold">{point.value.toLocaleString()}</p>
                </div>
                <div className={`p-1 rounded ${
                  point.trend === 'up' ? 'bg-green-100' : 
                  point.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {point.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : point.trend === 'down' ? (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  ) : (
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderBreakdownView = () => {
    if (!drillDownData?.breakdown) return null;

    const chartData = {
      labels: drillDownData.breakdown.map(b => b.category),
      datasets: [{
        data: drillDownData.breakdown.map(b => b.value),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ]
      }]
    };

    return (
      <div className="space-y-4">
        <div className="h-64">
          <BaseChart type="doughnut" data={chartData} />
        </div>
        <div className="space-y-2">
          {drillDownData.breakdown.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium">{item.category}</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{item.percentage}%</span>
                <Badge variant="blue" size="sm">{item.value.toLocaleString()}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCorrelationsView = () => {
    if (!drillDownData?.correlations) return null;

    return (
      <div className="space-y-3">
        {drillDownData.correlations.map((correlation, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{correlation.metric}</p>
                <p className="text-sm text-gray-600">
                  Correlation strength: {Math.abs(correlation.correlation * 100).toFixed(1)}%
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={
                    correlation.impact === 'positive' ? 'green' :
                    correlation.impact === 'negative' ? 'red' : 'gray'
                  }
                  size="sm"
                >
                  {correlation.impact}
                </Badge>
                <div className={`w-16 h-2 rounded-full ${
                  correlation.correlation > 0 ? 'bg-green-200' : 'bg-red-200'
                }`}>
                  <div 
                    className={`h-full rounded-full ${
                      correlation.correlation > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.abs(correlation.correlation) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const relevantInsights = insights.filter(insight => 
    insight.category.toLowerCase().includes(metric.toLowerCase()) ||
    insight.insight.toLowerCase().includes(metric.toLowerCase())
  );

  return (
    <Modal isOpen={true} onClose={onClose} size="xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MetricIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {metric} Analysis
              </h2>
              <p className="text-sm text-gray-600">Interactive drill-down with AI insights</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Time Range:</span>
            <div className="flex space-x-1">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setSelectedTimeRange(range.value)}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedTimeRange === range.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex space-x-1">
              {[
                { value: 'trend', label: 'Trend' },
                { value: 'breakdown', label: 'Breakdown' },
                { value: 'correlations', label: 'Correlations' }
              ].map((view) => (
                <button
                  key={view.value}
                  onClick={() => setSelectedView(view.value as any)}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedView === view.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {selectedView === 'trend' && renderTrendView()}
                  {selectedView === 'breakdown' && renderBreakdownView()}
                  {selectedView === 'correlations' && renderCorrelationsView()}
                </>
              )}
            </Card>
          </div>

          {/* AI Insights Sidebar */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <h3 className="font-medium text-gray-900">AI Insights</h3>
              </div>
              <div className="space-y-3">
                {relevantInsights.length > 0 ? (
                  relevantInsights.map((insight) => (
                    <div key={insight.id} className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="blue" size="sm">{insight.category}</Badge>
                        <span className="text-xs text-gray-500">
                          {Math.round(insight.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{insight.insight}</p>
                      {insight.actionable && (
                        <Badge variant="green" size="sm" className="mt-2">
                          Actionable
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    No specific insights available for this metric.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Modal>
  );
};