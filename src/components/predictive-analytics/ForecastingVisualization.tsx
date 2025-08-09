'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { BaseChart } from '@/components/charts/BaseChart';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  LineChart,
  Activity
} from 'lucide-react';

interface PredictionModel {
  id: string;
  name: string;
  type: string;
  status: string;
  accuracy: number;
  predictions: any[];
}

interface ForecastData {
  historical: Array<{
    date: string;
    actual: number;
    predicted?: number;
  }>;
  forecast: Array<{
    date: string;
    predicted: number;
    confidenceUpper: number;
    confidenceLower: number;
    factors: Array<{
      name: string;
      impact: number;
    }>;
  }>;
  metadata: {
    forecastHorizon: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    seasonality: boolean;
  };
}

interface ForecastingVisualizationProps {
  models: PredictionModel[];
  selectedModel: string | null;
  onModelSelect: (modelId: string) => void;
}

export const ForecastingVisualization: React.FC<ForecastingVisualizationProps> = ({
  models,
  selectedModel,
  onModelSelect
}) => {
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [timeHorizon, setTimeHorizon] = useState<'1m' | '3m' | '6m' | '1y'>('3m');
  const [confidenceLevel, setConfidenceLevel] = useState<0.8 | 0.9 | 0.95>(0.9);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedModel) {
      generateForecast();
    }
  }, [selectedModel, timeHorizon, confidenceLevel]);

  const generateForecast = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockData = generateMockForecastData(timeHorizon);
      setForecastData(mockData);
    } catch (error) {
      console.error('Failed to generate forecast:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockForecastData = (horizon: string): ForecastData => {
    const now = new Date();
    const historicalPeriods = 12; // 12 months of historical data
    const forecastPeriods = horizon === '1m' ? 1 : horizon === '3m' ? 3 : horizon === '6m' ? 6 : 12;
    
    // Generate historical data
    const historical = Array.from({ length: historicalPeriods }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - historicalPeriods + i + 1, 1);
      const baseValue = 50000 + Math.sin(i * 0.5) * 10000; // Seasonal pattern
      const noise = (Math.random() - 0.5) * 5000;
      const trend = i * 1000; // Growth trend
      
      return {
        date: date.toISOString().split('T')[0],
        actual: Math.max(0, baseValue + noise + trend),
        predicted: i > 6 ? Math.max(0, baseValue + trend + (Math.random() - 0.5) * 2000) : undefined
      };
    });

    // Generate forecast data
    const forecast = Array.from({ length: forecastPeriods }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const lastHistorical = historical[historical.length - 1].actual;
      const growth = 1.05; // 5% monthly growth
      const seasonalFactor = 1 + Math.sin((now.getMonth() + i) * 0.5) * 0.1;
      
      const predicted = lastHistorical * Math.pow(growth, i + 1) * seasonalFactor;
      const confidenceRange = predicted * 0.15; // 15% confidence range
      
      return {
        date: date.toISOString().split('T')[0],
        predicted,
        confidenceUpper: predicted + confidenceRange,
        confidenceLower: Math.max(0, predicted - confidenceRange),
        factors: [
          { name: 'Seasonal Trend', impact: Math.sin((now.getMonth() + i) * 0.5) * 0.1 },
          { name: 'Market Growth', impact: 0.05 },
          { name: 'Competition', impact: -0.02 },
          { name: 'Economic Conditions', impact: Math.random() * 0.04 - 0.02 }
        ]
      };
    });

    return {
      historical,
      forecast,
      metadata: {
        forecastHorizon: forecastPeriods,
        confidence: confidenceLevel,
        trend: 'increasing',
        seasonality: true
      }
    };
  };

  const getChartData = () => {
    if (!forecastData) return null;

    const allDates = [
      ...forecastData.historical.map(h => h.date),
      ...forecastData.forecast.map(f => f.date)
    ];

    return {
      labels: allDates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })),
      datasets: [
        {
          label: 'Historical',
          data: [
            ...forecastData.historical.map(h => h.actual),
            ...Array(forecastData.forecast.length).fill(null)
          ],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Predicted (Historical)',
          data: [
            ...forecastData.historical.map(h => h.predicted || null),
            ...Array(forecastData.forecast.length).fill(null)
          ],
          borderColor: '#10B981',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 2
        },
        {
          label: 'Forecast',
          data: [
            ...Array(forecastData.historical.length).fill(null),
            ...forecastData.forecast.map(f => f.predicted)
          ],
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Confidence Upper',
          data: [
            ...Array(forecastData.historical.length).fill(null),
            ...forecastData.forecast.map(f => f.confidenceUpper)
          ],
          borderColor: 'rgba(245, 158, 11, 0.3)',
          backgroundColor: 'transparent',
          borderDash: [2, 2],
          pointRadius: 0,
          fill: '+1'
        },
        {
          label: 'Confidence Lower',
          data: [
            ...Array(forecastData.historical.length).fill(null),
            ...forecastData.forecast.map(f => f.confidenceLower)
          ],
          borderColor: 'rgba(245, 158, 11, 0.3)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderDash: [2, 2],
          pointRadius: 0,
          fill: false
        }
      ]
    };
  };

  const selectedModelData = models.find(m => m.id === selectedModel);

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Forecasting Visualization</h2>
          <p className="text-gray-600 mt-1">
            Advanced forecasting with confidence bands and trend analysis
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Time Horizon:</span>
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value as any)}
              className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
            >
              <option value="1m">1 Month</option>
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="1y">1 Year</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Confidence:</span>
            <select
              value={confidenceLevel}
              onChange={(e) => setConfidenceLevel(parseFloat(e.target.value) as any)}
              className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
            >
              <option value={0.8}>80%</option>
              <option value={0.9}>90%</option>
              <option value={0.95}>95%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Model Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {models.filter(m => m.status === 'active').map((model) => {
          const isSelected = selectedModel === model.id;
          
          return (
            <Card
              key={model.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-green-500 bg-green-50' : ''
              }`}
              onClick={() => onModelSelect(model.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{model.name}</h3>
                <Badge variant={isSelected ? 'green' : 'gray'} size="sm">
                  {model.type}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Accuracy: {Math.round(model.accuracy * 100)}%</span>
                <span>Predictions: {model.predictions.length}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Forecast Chart */}
      {selectedModel && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedModelData?.name} Forecast
              </h3>
              <p className="text-sm text-gray-600">
                {timeHorizon === '1m' ? '1 month' : 
                 timeHorizon === '3m' ? '3 months' : 
                 timeHorizon === '6m' ? '6 months' : '1 year'} forecast with {Math.round(confidenceLevel * 100)}% confidence bands
              </p>
            </div>
            
            {forecastData && (
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Trend</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      {forecastData.metadata.trend}
                    </span>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600">Seasonality</p>
                  <div className="flex items-center space-x-1">
                    {forecastData.metadata.seasonality ? (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">
                      {forecastData.metadata.seasonality ? 'Detected' : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Generating forecast...</p>
              </div>
            </div>
          ) : forecastData ? (
            <div className="h-96">
              <BaseChart
                type="line"
                data={getChartData()!}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    intersect: false,
                    mode: 'index'
                  },
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                      labels: {
                        filter: (legendItem) => !legendItem.text?.includes('Confidence')
                      }
                    },
                    tooltip: {
                      callbacks: {
                        title: (context) => {
                          const index = context[0].dataIndex;
                          const isHistorical = index < forecastData.historical.length;
                          return `${context[0].label} ${isHistorical ? '(Historical)' : '(Forecast)'}`;
                        },
                        afterBody: (context) => {
                          const index = context[0].dataIndex;
                          if (index >= forecastData.historical.length) {
                            const forecastIndex = index - forecastData.historical.length;
                            const factors = forecastData.forecast[forecastIndex]?.factors || [];
                            return factors.map(f => 
                              `${f.name}: ${f.impact > 0 ? '+' : ''}${(f.impact * 100).toFixed(1)}%`
                            );
                          }
                          return [];
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Time Period'
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Value'
                      },
                      ticks: {
                        callback: (value) => `$${(Number(value) / 1000).toFixed(0)}K`
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a model to view forecast</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Forecast Summary */}
      {forecastData && (
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Forecast Summary</h3>
                <p className="text-sm text-gray-600">Key predictions</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Next Period:</span>
                <span className="text-sm font-medium">
                  ${(forecastData.forecast[0]?.predicted / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">End of Period:</span>
                <span className="text-sm font-medium">
                  ${(forecastData.forecast[forecastData.forecast.length - 1]?.predicted / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Growth:</span>
                <span className="text-sm font-medium text-green-600">
                  +{(((forecastData.forecast[forecastData.forecast.length - 1]?.predicted / forecastData.historical[forecastData.historical.length - 1]?.actual) - 1) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Key Factors</h3>
                <p className="text-sm text-gray-600">Impact drivers</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {forecastData.forecast[0]?.factors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{factor.name}:</span>
                  <span className={`text-sm font-medium ${
                    factor.impact > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {factor.impact > 0 ? '+' : ''}{(factor.impact * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Confidence Analysis</h3>
                <p className="text-sm text-gray-600">Prediction reliability</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Model Accuracy:</span>
                <span className="text-sm font-medium">
                  {Math.round((selectedModelData?.accuracy || 0) * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Confidence Level:</span>
                <span className="text-sm font-medium">
                  {Math.round(confidenceLevel * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Uncertainty Range:</span>
                <span className="text-sm font-medium">
                  ±{((forecastData.forecast[0]?.confidenceUpper - forecastData.forecast[0]?.predicted) / forecastData.forecast[0]?.predicted * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};