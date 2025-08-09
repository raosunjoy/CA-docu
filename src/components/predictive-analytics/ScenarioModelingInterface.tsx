'use client';

import React, { useState } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { 
  Plus, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Settings,
  Play,
  Pause,
  BarChart3,
  DollarSign
} from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, number>;
  predictions: any[];
  businessImpact: {
    revenue: number;
    costs: number;
    risk: number;
  };
}

interface PredictionModel {
  id: string;
  name: string;
  type: string;
  status: string;
  accuracy: number;
}

interface ScenarioModelingInterfaceProps {
  scenarios: Scenario[];
  models: PredictionModel[];
  onScenarioCreate: (scenario: Partial<Scenario>) => void;
}

export const ScenarioModelingInterface: React.FC<ScenarioModelingInterfaceProps> = ({
  scenarios,
  models,
  onScenarioCreate
}) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRunning, setIsRunning] = useState<Set<string>>(new Set());
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    parameters: {
      marketGrowth: 0.1,
      clientRetention: 0.9,
      newClientAcquisition: 1.0,
      operationalEfficiency: 0.85,
      competitiveAdvantage: 0.75
    }
  });

  const parameterDefinitions = [
    {
      key: 'marketGrowth',
      label: 'Market Growth Rate',
      description: 'Expected market growth percentage',
      min: -0.2,
      max: 0.3,
      step: 0.01,
      format: (value: number) => `${(value * 100).toFixed(1)}%`
    },
    {
      key: 'clientRetention',
      label: 'Client Retention Rate',
      description: 'Percentage of clients retained',
      min: 0.5,
      max: 1.0,
      step: 0.01,
      format: (value: number) => `${(value * 100).toFixed(1)}%`
    },
    {
      key: 'newClientAcquisition',
      label: 'New Client Acquisition Multiplier',
      description: 'Multiplier for new client acquisition rate',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      format: (value: number) => `${value.toFixed(1)}x`
    },
    {
      key: 'operationalEfficiency',
      label: 'Operational Efficiency',
      description: 'Overall operational efficiency score',
      min: 0.5,
      max: 1.0,
      step: 0.01,
      format: (value: number) => `${(value * 100).toFixed(1)}%`
    },
    {
      key: 'competitiveAdvantage',
      label: 'Competitive Advantage',
      description: 'Relative competitive position',
      min: 0.3,
      max: 1.0,
      step: 0.01,
      format: (value: number) => `${(value * 100).toFixed(1)}%`
    }
  ];

  const runScenario = async (scenarioId: string) => {
    setIsRunning(prev => new Set([...prev, scenarioId]));
    
    // Simulate scenario execution
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsRunning(prev => {
      const newSet = new Set(prev);
      newSet.delete(scenarioId);
      return newSet;
    });
  };

  const createScenario = () => {
    onScenarioCreate({
      name: newScenario.name,
      description: newScenario.description,
      parameters: newScenario.parameters,
      businessImpact: calculateBusinessImpact(newScenario.parameters)
    });
    
    setIsCreating(false);
    setNewScenario({
      name: '',
      description: '',
      parameters: {
        marketGrowth: 0.1,
        clientRetention: 0.9,
        newClientAcquisition: 1.0,
        operationalEfficiency: 0.85,
        competitiveAdvantage: 0.75
      }
    });
  };

  const calculateBusinessImpact = (parameters: Record<string, number>) => {
    // Simplified business impact calculation
    const baseRevenue = 1000000;
    const baseCosts = 700000;
    
    const revenueMultiplier = 
      (1 + parameters.marketGrowth) * 
      parameters.clientRetention * 
      parameters.newClientAcquisition * 
      parameters.competitiveAdvantage;
    
    const costMultiplier = 1 / parameters.operationalEfficiency;
    
    const revenue = baseRevenue * revenueMultiplier;
    const costs = baseCosts * costMultiplier;
    const risk = Math.max(0, Math.min(1, 
      (1 - parameters.clientRetention) * 0.5 + 
      (1 - parameters.operationalEfficiency) * 0.3 + 
      Math.abs(parameters.marketGrowth) * 0.2
    ));
    
    return { revenue, costs, risk };
  };

  const getImpactColor = (current: number, baseline: number) => {
    const change = (current - baseline) / baseline;
    if (change > 0.1) return 'text-green-600';
    if (change < -0.1) return 'text-red-600';
    return 'text-gray-600';
  };

  const getImpactIcon = (current: number, baseline: number) => {
    const change = (current - baseline) / baseline;
    if (change > 0.05) return TrendingUp;
    if (change < -0.05) return TrendingDown;
    return Activity;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scenario Modeling</h2>
          <p className="text-gray-600 mt-1">
            Create and analyze what-if scenarios with predictive modeling
          </p>
        </div>
        
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          <span>New Scenario</span>
        </button>
      </div>

      {/* Scenarios Grid */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {scenarios.map((scenario) => {
          const isCurrentlyRunning = isRunning.has(scenario.id);
          const baselineImpact = { revenue: 1000000, costs: 700000, risk: 0.2 };
          
          return (
            <Card 
              key={scenario.id} 
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedScenario?.id === scenario.id ? 'ring-2 ring-green-500' : ''
              }`}
              onClick={() => setSelectedScenario(scenario)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{scenario.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{scenario.description}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    runScenario(scenario.id);
                  }}
                  disabled={isCurrentlyRunning}
                  className={`p-2 rounded-lg transition-colors ${
                    isCurrentlyRunning
                      ? 'bg-blue-100 text-blue-600 animate-pulse'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isCurrentlyRunning ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Business Impact */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Revenue Impact</span>
                  <div className="flex items-center space-x-1">
                    {React.createElement(
                      getImpactIcon(scenario.businessImpact.revenue, baselineImpact.revenue),
                      { 
                        className: `w-4 h-4 ${getImpactColor(scenario.businessImpact.revenue, baselineImpact.revenue)}` 
                      }
                    )}
                    <span className={`text-sm font-medium ${getImpactColor(scenario.businessImpact.revenue, baselineImpact.revenue)}`}>
                      ${(scenario.businessImpact.revenue / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cost Impact</span>
                  <div className="flex items-center space-x-1">
                    {React.createElement(
                      getImpactIcon(baselineImpact.costs, scenario.businessImpact.costs),
                      { 
                        className: `w-4 h-4 ${getImpactColor(baselineImpact.costs, scenario.businessImpact.costs)}` 
                      }
                    )}
                    <span className={`text-sm font-medium ${getImpactColor(baselineImpact.costs, scenario.businessImpact.costs)}`}>
                      ${(scenario.businessImpact.costs / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Risk Level</span>
                  <Badge 
                    variant={
                      scenario.businessImpact.risk < 0.2 ? 'green' :
                      scenario.businessImpact.risk < 0.4 ? 'yellow' : 'red'
                    } 
                    size="sm"
                  >
                    {(scenario.businessImpact.risk * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>

              {/* Parameters Preview */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(scenario.parameters).slice(0, 3).map(([key, value]) => {
                    const param = parameterDefinitions.find(p => p.key === key);
                    return (
                      <Badge key={key} variant="gray" size="sm">
                        {param?.label.split(' ')[0]}: {param?.format(value)}
                      </Badge>
                    );
                  })}
                  {Object.keys(scenario.parameters).length > 3 && (
                    <Badge variant="gray" size="sm">
                      +{Object.keys(scenario.parameters).length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {isCurrentlyRunning ? 'Running...' : 'Ready to run'}
                </span>
                <span>
                  {scenario.predictions.length} predictions
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Scenario Details */}
      {selectedScenario && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedScenario.name}</h3>
              <p className="text-gray-600">{selectedScenario.description}</p>
            </div>
            <div className="flex space-x-2">
              <button className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                <Settings className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => runScenario(selectedScenario.id)}
                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Play className="w-4 h-4" />
                <span>Run Scenario</span>
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Parameters */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Scenario Parameters</h4>
              <div className="space-y-4">
                {parameterDefinitions.map((param) => {
                  const value = selectedScenario.parameters[param.key] || 0;
                  
                  return (
                    <div key={param.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                          {param.label}
                        </label>
                        <span className="text-sm text-gray-600">
                          {param.format(value)}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={value}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          readOnly
                        />
                        <div 
                          className="absolute top-0 h-2 bg-green-500 rounded-lg pointer-events-none"
                          style={{ 
                            width: `${((value - param.min) / (param.max - param.min)) * 100}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">{param.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Business Impact */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Projected Business Impact</h4>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">Revenue</span>
                    </div>
                    <span className="text-lg font-bold text-green-900">
                      ${(selectedScenario.businessImpact.revenue / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <p className="text-sm text-green-700">
                    {((selectedScenario.businessImpact.revenue / 1000000 - 1) * 100).toFixed(1)}% vs baseline
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Costs</span>
                    </div>
                    <span className="text-lg font-bold text-blue-900">
                      ${(selectedScenario.businessImpact.costs / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {((selectedScenario.businessImpact.costs / 700000 - 1) * 100).toFixed(1)}% vs baseline
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Target className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-900">Risk Level</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-900">
                      {(selectedScenario.businessImpact.risk * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    {selectedScenario.businessImpact.risk < 0.2 ? 'Low risk' : 
                     selectedScenario.businessImpact.risk < 0.4 ? 'Medium risk' : 'High risk'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Create Scenario Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Scenario</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scenario Name
                  </label>
                  <Input
                    value={newScenario.name}
                    onChange={(e) => setNewScenario(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter scenario name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newScenario.description}
                    onChange={(e) => setNewScenario(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this scenario"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                  />
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Parameters</h4>
                  <div className="space-y-4">
                    {parameterDefinitions.map((param) => {
                      const value = newScenario.parameters[param.key];
                      
                      return (
                        <div key={param.key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              {param.label}
                            </label>
                            <span className="text-sm text-gray-600">
                              {param.format(value)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={param.min}
                            max={param.max}
                            step={param.step}
                            value={value}
                            onChange={(e) => setNewScenario(prev => ({
                              ...prev,
                              parameters: {
                                ...prev.parameters,
                                [param.key]: parseFloat(e.target.value)
                              }
                            }))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-gray-500">{param.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={createScenario}
                  disabled={!newScenario.name}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Create Scenario
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};