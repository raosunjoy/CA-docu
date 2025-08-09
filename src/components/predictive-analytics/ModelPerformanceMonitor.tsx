'use client';

import React, { useState } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { BaseChart } from '@/components/charts/BaseChart';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  Zap
} from 'lucide-react';

interface PredictionModel {
  id: string;
  name: string;
  type: string;
  status: string;
  accuracy: number;
  lastTrained: string;
  nextUpdate: string;
  predictions: any[];
}

interface ModelPerformanceMonitorProps {
  models: PredictionModel[];
  onModelRetrain: (modelId: string) => void;
}

interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse: number;
  mae: number;
  trend: 'improving' | 'declining' | 'stable';
  lastEvaluation: string;
}

export const ModelPerformanceMonitor: React.FC<ModelPerformanceMonitorProps> = ({
  models,
  onModelRetrain
}) => {
  const [selectedModel, setSelectedModel] = useState<string | null>(models[0]?.id || null);
  const [performanceData, setPerformanceData] = useState<Record<string, PerformanceMetrics>>({});
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  React.useEffect(() => {
    // Generate mock performance data
    const mockData: Record<string, PerformanceMetrics> = {};
    models.forEach(model => {
      mockData[model.id] = {
        accuracy: model.accuracy,
        precision: Math.min(1, model.accuracy + Math.random() * 0.1),
        recall: Math.min(1, model.accuracy + Math.random() * 0.05),
        f1Score: Math.min(1, model.accuracy + Math.random() * 0.08),
        mse: Math.random() * 0.1,
        mae: Math.random() * 0.05,
        trend: Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining',
        lastEvaluation: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    });
    setPerformanceData(mockData);
  }, [models]);

  const generatePerformanceHistory = (modelId: string) => {
    const periods = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const baseAccuracy = models.find(m => m.id === modelId)?.accuracy || 0.8;
    
    return Array.from({ length: periods }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - periods + i);
      
      // Simulate accuracy evolution with some noise and trend
      const trend = (i / periods) * 0.05; // Slight improvement over time
      const noise = (Math.random() - 0.5) * 0.02;
      const accuracy = Math.max(0.5, Math.min(1, baseAccuracy + trend + noise));
      
      return {
        date: date.toISOString().split('T')[0],
        accuracy,
        precision: Math.min(1, accuracy + Math.random() * 0.05),
        recall: Math.min(1, accuracy + Math.random() * 0.03),
        f1Score: Math.min(1, accuracy + Math.random() * 0.04)
      };
    });
  };

  const getPerformanceChartData = (modelId: string) => {
    const history = generatePerformanceHistory(modelId);
    
    return {
      labels: history.map(h => new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Accuracy',
          data: history.map(h => h.accuracy * 100),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'Precision',
          data: history.map(h => h.precision * 100),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        },
        {
          label: 'Recall',
          data: history.map(h => h.recall * 100),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4
        },
        {
          label: 'F1 Score',
          data: history.map(h => h.f1Score * 100),
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        }
      ]
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'training': return 'blue';
      case 'inactive': return 'gray';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return TrendingUp;
      case 'declining': return TrendingDown;
      case 'stable': return Activity;
      default: return Activity;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const selectedModelData = models.find(m => m.id === selectedModel);
  const selectedPerformance = selectedModel ? performanceData[selectedModel] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Model Performance Monitor</h2>
          <p className="text-gray-600 mt-1">
            Track model accuracy, performance metrics, and training status
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Time Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
          </select>
        </div>
      </div>

      {/* Model Overview Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => {
          const performance = performanceData[model.id];
          const isSelected = selectedModel === model.id;
          const statusColor = getStatusColor(model.status);
          const TrendIcon = performance ? getTrendIcon(performance.trend) : Activity;
          const trendColor = performance ? getTrendColor(performance.trend) : 'text-gray-600';
          
          return (
            <Card
              key={model.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setSelectedModel(model.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">{model.name}</h3>
                  <div className="flex items-center space-x-2">
                    <Badge variant={statusColor as any} size="sm">
                      {model.status}
                    </Badge>
                    <Badge variant="gray" size="sm">
                      {model.type}
                    </Badge>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onModelRetrain(model.id);
                  }}
                  disabled={model.status === 'training'}
                  className={`p-2 rounded-lg transition-colors ${
                    model.status === 'training'
                      ? 'bg-blue-100 text-blue-600 animate-spin'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Accuracy:</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium">
                      {Math.round(model.accuracy * 100)}%
                    </span>
                    {performance && (
                      <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Predictions:</span>
                  <span className="text-sm font-medium">{model.predictions.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Trained:</span>
                  <span className="text-sm text-gray-500">
                    {new Date(model.lastTrained).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Performance</span>
                  <span className="text-xs text-gray-600">
                    {Math.round(model.accuracy * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full bg-${statusColor}-500`}
                    style={{ width: `${model.accuracy * 100}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detailed Performance Analysis */}
      {selectedModel && selectedModelData && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Performance Chart */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedModelData.name} Performance History
                </h3>
                <p className="text-sm text-gray-600">
                  Performance metrics over the last {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}
                </p>
              </div>
              
              {selectedPerformance && (
                <div className="flex items-center space-x-2">
                  {React.createElement(getTrendIcon(selectedPerformance.trend), {
                    className: `w-5 h-5 ${getTrendColor(selectedPerformance.trend)}`
                  })}
                  <span className={`text-sm font-medium ${getTrendColor(selectedPerformance.trend)}`}>
                    {selectedPerformance.trend}
                  </span>
                </div>
              )}
            </div>

            <div className="h-80">
              <BaseChart
                type="line"
                data={getPerformanceChartData(selectedModel)}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const
                    }
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Date'
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Performance (%)'
                      },
                      min: 0,
                      max: 100
                    }
                  }
                }}
              />
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Metrics</h3>
            
            {selectedPerformance ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Accuracy:</span>
                    <span className="text-sm font-medium">
                      {Math.round(selectedPerformance.accuracy * 100)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Precision:</span>
                    <span className="text-sm font-medium">
                      {Math.round(selectedPerformance.precision * 100)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Recall:</span>
                    <span className="text-sm font-medium">
                      {Math.round(selectedPerformance.recall * 100)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">F1 Score:</span>
                    <span className="text-sm font-medium">
                      {Math.round(selectedPerformance.f1Score * 100)}%
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Error Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">MSE:</span>
                      <span className="text-sm font-medium">
                        {selectedPerformance.mse.toFixed(4)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">MAE:</span>
                      <span className="text-sm font-medium">
                        {selectedPerformance.mae.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Training Info</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Trained:</span>
                      <span className="text-sm text-gray-500">
                        {new Date(selectedModelData.lastTrained).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Next Update:</span>
                      <span className="text-sm text-gray-500">
                        {new Date(selectedModelData.nextUpdate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge variant={getStatusColor(selectedModelData.status) as any} size="sm">
                        {selectedModelData.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <button
                    onClick={() => onModelRetrain(selectedModel)}
                    disabled={selectedModelData.status === 'training'}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${selectedModelData.status === 'training' ? 'animate-spin' : ''}`} />
                    <span>
                      {selectedModelData.status === 'training' ? 'Training...' : 'Retrain Model'}
                    </span>
                  </button>
                  
                  <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    View Detailed Logs
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading performance data...</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Performance Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {models.filter(m => m.status === 'active').length}
          </p>
          <p className="text-sm text-gray-600">Active Models</p>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Target className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round(models.reduce((sum, m) => sum + m.accuracy, 0) / models.length * 100)}%
          </p>
          <p className="text-sm text-gray-600">Avg Accuracy</p>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {models.filter(m => m.status === 'training').length}
          </p>
          <p className="text-sm text-gray-600">Training</p>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {models.filter(m => m.status === 'error').length}
          </p>
          <p className="text-sm text-gray-600">Errors</p>
        </Card>
      </div>
    </div>
  );
};