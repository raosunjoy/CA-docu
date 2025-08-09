'use client';

import React from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, AlertCircle } from 'lucide-react';

interface Metrics {
  revenue: number;
  activeUsers: number;
  systemLoad: number;
  errorRate: number;
}

interface RealtimeMetricsGridProps {
  metrics?: Metrics;
  onMetricClick: (metricName: string) => void;
  selectedMetric: string | null;
}

interface MetricCardData {
  key: keyof Metrics;
  label: string;
  icon: React.ComponentType<any>;
  format: (value: number) => string;
  getStatus: (value: number) => 'good' | 'warning' | 'critical';
  getChange: (value: number) => { value: number; trend: 'up' | 'down' | 'stable' };
}

export const RealtimeMetricsGrid: React.FC<RealtimeMetricsGridProps> = ({
  metrics,
  onMetricClick,
  selectedMetric
}) => {
  const metricConfigs: MetricCardData[] = [
    {
      key: 'revenue',
      label: 'Revenue',
      icon: DollarSign,
      format: (value) => `$${(value / 1000).toFixed(1)}K`,
      getStatus: (value) => value > 50000 ? 'good' : value > 25000 ? 'warning' : 'critical',
      getChange: (value) => ({
        value: Math.random() * 10 - 5, // Mock change calculation
        trend: value > 40000 ? 'up' : value < 20000 ? 'down' : 'stable'
      })
    },
    {
      key: 'activeUsers',
      label: 'Active Users',
      icon: Users,
      format: (value) => value.toLocaleString(),
      getStatus: (value) => value > 1000 ? 'good' : value > 500 ? 'warning' : 'critical',
      getChange: (value) => ({
        value: Math.random() * 20 - 10,
        trend: value > 800 ? 'up' : value < 300 ? 'down' : 'stable'
      })
    },
    {
      key: 'systemLoad',
      label: 'System Load',
      icon: Activity,
      format: (value) => `${value.toFixed(1)}%`,
      getStatus: (value) => value < 70 ? 'good' : value < 85 ? 'warning' : 'critical',
      getChange: (value) => ({
        value: Math.random() * 10 - 5,
        trend: value < 60 ? 'down' : value > 80 ? 'up' : 'stable'
      })
    },
    {
      key: 'errorRate',
      label: 'Error Rate',
      icon: AlertCircle,
      format: (value) => `${value.toFixed(2)}%`,
      getStatus: (value) => value < 1 ? 'good' : value < 3 ? 'warning' : 'critical',
      getChange: (value) => ({
        value: Math.random() * 2 - 1,
        trend: value < 1 ? 'down' : value > 2 ? 'up' : 'stable'
      })
    }
  ];

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Activity;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodWhenUp: boolean) => {
    if (trend === 'stable') return 'text-gray-500';
    if (trend === 'up') return isGoodWhenUp ? 'text-green-600' : 'text-red-600';
    return isGoodWhenUp ? 'text-red-600' : 'text-green-600';
  };

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricConfigs.map((config) => (
          <Card key={config.key} className="p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded mb-2"></div>
            <div className="w-24 h-4 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricConfigs.map((config) => {
        const value = metrics[config.key];
        const status = config.getStatus(value);
        const change = config.getChange(value);
        const Icon = config.icon;
        const TrendIcon = getTrendIcon(change.trend);
        const isSelected = selectedMetric === config.key;
        const isGoodWhenUp = config.key === 'revenue' || config.key === 'activeUsers';

        return (
          <Card
            key={config.key}
            className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
              isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
            }`}
            onClick={() => onMetricClick(config.key)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-${getStatusColor(status)}-100`}>
                <Icon className={`w-5 h-5 text-${getStatusColor(status)}-600`} />
              </div>
              <Badge variant={getStatusColor(status) as any} size="sm">
                {status.toUpperCase()}
              </Badge>
            </div>

            {/* Value */}
            <div className="mb-2">
              <p className="text-2xl font-bold text-gray-900">
                {config.format(value)}
              </p>
              <p className="text-sm text-gray-600">{config.label}</p>
            </div>

            {/* Trend */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <TrendIcon 
                  className={`w-4 h-4 ${getTrendColor(change.trend, isGoodWhenUp)}`} 
                />
                <span className={`text-sm font-medium ${getTrendColor(change.trend, isGoodWhenUp)}`}>
                  {change.value > 0 ? '+' : ''}{change.value.toFixed(1)}%
                </span>
              </div>
              <span className="text-xs text-gray-500">vs last hour</span>
            </div>

            {/* Real-time indicator */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">Live</span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date().toLocaleTimeString()}
              </span>
            </div>

            {/* Mobile optimization */}
            <div className="md:hidden mt-2">
              <div className="text-xs text-gray-500 text-center">
                Tap for details
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};