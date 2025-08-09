'use client';

import React from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { BaseChart } from '@/components/charts/BaseChart';
import { KPICard } from '@/components/charts/KPICard';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity, DollarSign } from 'lucide-react';

interface AnalyticsData {
  type: 'chart' | 'metric' | 'insight' | 'kpi' | 'comparison';
  data: any;
  title: string;
  description?: string;
  insights?: string[];
}

interface AnalyticsVisualizationInChatProps {
  data: AnalyticsData;
}

export const AnalyticsVisualizationInChat: React.FC<AnalyticsVisualizationInChatProps> = ({
  data
}) => {
  const renderChart = () => {
    const { chartType, chartData, options } = data.data;
    
    return (
      <div className="h-64 w-full">
        <BaseChart 
          type={chartType} 
          data={chartData} 
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom' as const,
                labels: {
                  boxWidth: 12,
                  font: { size: 11 }
                }
              }
            },
            scales: chartType !== 'doughnut' && chartType !== 'pie' ? {
              x: {
                ticks: { font: { size: 10 } }
              },
              y: {
                ticks: { font: { size: 10 } }
              }
            } : undefined,
            ...options
          }}
        />
      </div>
    );
  };

  const renderMetric = () => {
    const { value, change, trend, unit, comparison } = data.data;
    
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;
    const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
    
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit && <span className="text-lg text-gray-600 ml-1">{unit}</span>}
          </p>
          <p className="text-sm text-gray-600">{data.title}</p>
        </div>
        <div className="text-right">
          <div className={`flex items-center space-x-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
          {comparison && (
            <p className="text-xs text-gray-500 mt-1">{comparison}</p>
          )}
        </div>
      </div>
    );
  };

  const renderKPI = () => {
    const { metrics } = data.data;
    
    return (
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric: any, index: number) => (
          <div key={index} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">{metric.label}</span>
              <Badge variant={metric.status === 'good' ? 'green' : metric.status === 'warning' ? 'yellow' : 'red'} size="sm">
                {metric.status}
              </Badge>
            </div>
            <p className="text-lg font-bold text-gray-900">{metric.value}</p>
            {metric.change && (
              <div className={`flex items-center space-x-1 mt-1 ${
                metric.change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span className="text-xs">{Math.abs(metric.change)}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderInsight = () => {
    const { insights, confidence, category, actionable } = data.data;
    
    return (
      <div className="space-y-3">
        {insights.map((insight: string, index: number) => (
          <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <div className="flex items-start justify-between mb-2">
              <Badge variant="blue" size="sm">{category}</Badge>
              {confidence && (
                <span className="text-xs text-blue-600 font-medium">
                  {Math.round(confidence * 100)}% confidence
                </span>
              )}
            </div>
            <p className="text-sm text-blue-800">{insight}</p>
            {actionable && (
              <Badge variant="green" size="sm" className="mt-2">
                Actionable
              </Badge>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderComparison = () => {
    const { items, metric } = data.data;
    
    return (
      <div className="space-y-2">
        {items.map((item: any, index: number) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color || '#3B82F6' }}
              />
              <span className="text-sm font-medium text-gray-900">{item.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{item.value}</span>
              {item.change && (
                <div className={`flex items-center space-x-1 ${
                  item.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {item.change > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span className="text-xs">{Math.abs(item.change)}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getVisualizationIcon = () => {
    switch (data.type) {
      case 'chart': return BarChart3;
      case 'metric': return DollarSign;
      case 'kpi': return Activity;
      case 'insight': return TrendingUp;
      case 'comparison': return PieChart;
      default: return BarChart3;
    }
  };

  const Icon = getVisualizationIcon();

  return (
    <Card className="mt-3 p-4 bg-white border border-gray-200">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="p-1 bg-blue-100 rounded">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">{data.title}</h4>
          {data.description && (
            <p className="text-xs text-gray-600">{data.description}</p>
          )}
        </div>
        <Badge variant="blue" size="sm">
          {data.type.toUpperCase()}
        </Badge>
      </div>

      {/* Visualization Content */}
      <div className="mb-3">
        {data.type === 'chart' && renderChart()}
        {data.type === 'metric' && renderMetric()}
        {data.type === 'kpi' && renderKPI()}
        {data.type === 'insight' && renderInsight()}
        {data.type === 'comparison' && renderComparison()}
      </div>

      {/* Additional Insights */}
      {data.insights && data.insights.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Key Insights:</p>
          <div className="space-y-1">
            {data.insights.map((insight, index) => (
              <p key={index} className="text-xs text-gray-600 flex items-start space-x-1">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{insight}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Elements */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        <div className="flex space-x-2">
          <button className="text-xs text-blue-600 hover:text-blue-800">
            View Details
          </button>
          <button className="text-xs text-blue-600 hover:text-blue-800">
            Export
          </button>
        </div>
        <span className="text-xs text-gray-500">
          Generated {new Date().toLocaleTimeString()}
        </span>
      </div>
    </Card>
  );
};