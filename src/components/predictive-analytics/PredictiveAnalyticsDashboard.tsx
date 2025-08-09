'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { ScenarioModelingInterface } from './ScenarioModelingInterface';
import { ForecastingVisualization } from './ForecastingVisualization';
import { ModelPerformanceMonitor } from './ModelPerformanceMonitor';
import { BusinessImpactSimulator } from './BusinessImpactSimulator';
import { 
  TrendingUp, 
  Brain, 
  Target, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Zap,
  BarChart3,
  Settings
} from 'lucide-react';

interface PredictionModel {
  id: string;
  name: string;
  type: 'revenue' | 'growth' | 'risk' | 'demand' | 'performance';
  status: 'active' | 'training' | 'inactive' | 'error';
  accuracy: number;
  lastTrained: string;
  nextUpdate: string;
  predictions: PredictionData[];
}

interface PredictionData {
  id: string;
  timestamp: string;
  value: number;
  confidence: number;
  scenario: string;
  factors: Array<{
    name: string;
    impact: number;
    confidence: number;
  }>;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, number>;
  predictions: PredictionData[];
  businessImpact: {
    revenue: number;
    costs: number;
    risk: number;
  };
}

export const PredictiveAnalyticsDashboard: React.FC = () => {
  const [models, setModels] = useState<PredictionModel[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'scenarios' | 'forecasting' | 'performance' | 'simulation'>('overview');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchModelsAndScenarios();
  }, []);

  const fetchModelsAndScenarios = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setModels(mockModels);
      setScenarios(mockScenarios);
    } catch (error) {
      console.error('Failed to fetch predictive analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScenarioCreate = (scenario: Partial<Scenario>) => {
    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: scenario.name || 'New Scenario',
      description: scenario.description || '',
      parameters: scenario.parameters || {},
      predictions: [],
      businessImpact: scenario.businessImpact || { revenue: 0, costs: 0, risk: 0 }
    };
    
    setScenarios(prev => [...prev, newScenario]);
  };

  const handleModelRetrain = async (modelId: string) => {
    setModels(prev => prev.map(model => 
      model.id === modelId 
        ? { ...model, status: 'training' }
        : model
    ));

    // Simulate training
    setTimeout(() => {
      setModels(prev => prev.map(model => 
        model.id === modelId 
          ? { 
              ...model, 
              status: 'active',
              accuracy: Math.min(0.98, model.accuracy + Math.random() * 0.05),
              lastTrained: new Date().toISOString()
            }
          : model
      ));
    }, 3000);
  };

  const getModelStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'training': return 'blue';
      case 'inactive': return 'gray';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'revenue': return TrendingUp;
      case 'growth': return BarChart3;
      case 'risk': return AlertTriangle;
      case 'demand': return Target;
      case 'performance': return Activity;
      default: return Brain;
    }
  };

  const views = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'scenarios', label: 'Scenarios', icon: Target },
    { id: 'forecasting', label: 'Forecasting', icon: TrendingUp },
    { id: 'performance', label: 'Model Performance', icon: Activity },
    { id: 'simulation', label: 'Impact Simulation', icon: Zap }
  ];

  const activeModels = models.filter(m => m.status === 'active').length;
  const averageAccuracy = models.reduce((sum, m) => sum + m.accuracy, 0) / models.length;
  const totalPredictions = models.reduce((sum, m) => sum + m.predictions.length, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span>Predictive Analytics Dashboard</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Advanced forecasting with scenario modeling and business impact simulation
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="green" className="animate-pulse">
            AI Forecasting
          </Badge>
          <Badge variant="blue">
            {activeModels} Active Models
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Brain className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{models.length}</p>
          <p className="text-sm text-gray-600">Prediction Models</p>
          <div className="mt-2">
            <Badge variant="green" size="sm">
              {activeModels} Active
            </Badge>
          </div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Target className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round(averageAccuracy * 100)}%
          </p>
          <p className="text-sm text-gray-600">Average Accuracy</p>
          <div className="mt-2">
            <Badge variant={averageAccuracy > 0.9 ? 'green' : averageAccuracy > 0.8 ? 'yellow' : 'red'} size="sm">
              {averageAccuracy > 0.9 ? 'Excellent' : averageAccuracy > 0.8 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalPredictions}</p>
          <p className="text-sm text-gray-600">Total Predictions</p>
          <div className="mt-2">
            <Badge variant="purple" size="sm">
              Last 30 days
            </Badge>
          </div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Zap className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{scenarios.length}</p>
          <p className="text-sm text-gray-600">Active Scenarios</p>
          <div className="mt-2">
            <Badge variant="yellow" size="sm">
              Simulations Ready
            </Badge>
          </div>
        </Card>
      </div>

      {/* View Navigation */}
      <div className="flex items-center space-x-1">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === view.id
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{view.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeView === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Models Overview */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Prediction Models</h3>
            <div className="space-y-4">
              {models.map((model) => {
                const Icon = getModelTypeIcon(model.type);
                const statusColor = getModelStatusColor(model.status);
                
                return (
                  <div
                    key={model.id}
                    className={`flex items-center space-x-4 p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedModel === model.id
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <div className={`p-2 bg-${statusColor}-100 rounded-lg`}>
                      <Icon className={`w-5 h-5 text-${statusColor}-600`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">{model.name}</h4>
                        <Badge variant={statusColor as any} size="sm">
                          {model.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Accuracy: {Math.round(model.accuracy * 100)}%</span>
                        <span>Type: {model.type}</span>
                        <span>Predictions: {model.predictions.length}</span>
                      </div>
                    </div>
                    
                    {model.status === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModelRetrain(model.id);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent Predictions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Predictions</h3>
            <div className="space-y-3">
              {models
                .flatMap(m => m.predictions)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((prediction) => (
                  <div key={prediction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {prediction.scenario}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(prediction.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {prediction.value.toLocaleString()}
                      </p>
                      <div className="flex items-center space-x-1">
                        <Badge variant="blue" size="sm">
                          {Math.round(prediction.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {activeView === 'scenarios' && (
        <ScenarioModelingInterface
          scenarios={scenarios}
          models={models}
          onScenarioCreate={handleScenarioCreate}
        />
      )}

      {activeView === 'forecasting' && (
        <ForecastingVisualization
          models={models}
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
        />
      )}

      {activeView === 'performance' && (
        <ModelPerformanceMonitor
          models={models}
          onModelRetrain={handleModelRetrain}
        />
      )}

      {activeView === 'simulation' && (
        <BusinessImpactSimulator
          scenarios={scenarios}
          models={models}
        />
      )}
    </div>
  );
};

// Mock data for development
const mockModels: PredictionModel[] = [
  {
    id: '1',
    name: 'Revenue Forecasting Model',
    type: 'revenue',
    status: 'active',
    accuracy: 0.94,
    lastTrained: '2024-01-15T10:00:00Z',
    nextUpdate: '2024-01-22T10:00:00Z',
    predictions: [
      {
        id: 'p1',
        timestamp: '2024-01-15T14:30:00Z',
        value: 125000,
        confidence: 0.92,
        scenario: 'Q1 Revenue Forecast',
        factors: [
          { name: 'Seasonal Trends', impact: 0.15, confidence: 0.89 },
          { name: 'Market Conditions', impact: 0.08, confidence: 0.76 },
          { name: 'Client Pipeline', impact: 0.23, confidence: 0.94 }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'Client Growth Predictor',
    type: 'growth',
    status: 'active',
    accuracy: 0.87,
    lastTrained: '2024-01-14T15:20:00Z',
    nextUpdate: '2024-01-21T15:20:00Z',
    predictions: [
      {
        id: 'p2',
        timestamp: '2024-01-15T12:15:00Z',
        value: 45,
        confidence: 0.85,
        scenario: 'Monthly Client Acquisition',
        factors: [
          { name: 'Marketing Campaigns', impact: 0.31, confidence: 0.88 },
          { name: 'Referral Rate', impact: 0.19, confidence: 0.82 },
          { name: 'Market Expansion', impact: 0.12, confidence: 0.74 }
        ]
      }
    ]
  },
  {
    id: '3',
    name: 'Risk Assessment Model',
    type: 'risk',
    status: 'training',
    accuracy: 0.91,
    lastTrained: '2024-01-13T09:30:00Z',
    nextUpdate: '2024-01-20T09:30:00Z',
    predictions: []
  }
];

const mockScenarios: Scenario[] = [
  {
    id: '1',
    name: 'Optimistic Growth',
    description: 'Best-case scenario with favorable market conditions',
    parameters: {
      marketGrowth: 0.15,
      clientRetention: 0.95,
      newClientAcquisition: 1.2
    },
    predictions: [],
    businessImpact: {
      revenue: 1250000,
      costs: 850000,
      risk: 0.15
    }
  },
  {
    id: '2',
    name: 'Conservative Forecast',
    description: 'Realistic scenario based on current trends',
    parameters: {
      marketGrowth: 0.08,
      clientRetention: 0.88,
      newClientAcquisition: 1.0
    },
    predictions: [],
    businessImpact: {
      revenue: 980000,
      costs: 720000,
      risk: 0.25
    }
  }
];