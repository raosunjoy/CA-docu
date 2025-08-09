'use client';

import React, { useState } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { BaseChart } from '@/components/charts/BaseChart';
import { 
  Zap, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  Play,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, number>;
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
}

interface SimulationResult {
  scenarioId: string;
  timeHorizon: string;
  results: {
    revenue: Array<{ period: string; value: number; confidence: number }>;
    costs: Array<{ period: string; value: number; confidence: number }>;
    profit: Array<{ period: string; value: number; confidence: number }>;
    risk: Array<{ period: string; value: number; severity: 'low' | 'medium' | 'high' }>;
  };
  summary: {
    totalRevenue: number;
    totalCosts: number;
    netProfit: number;
    roi: number;
    riskScore: number;
  };
}

interface BusinessImpactSimulatorProps {
  scenarios: Scenario[];
  models: PredictionModel[];
}

export const BusinessImpactSimulator: React.FC<BusinessImpactSimulatorProps> = ({
  scenarios,
  models
}) => {
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [timeHorizon, setTimeHorizon] = useState<'3m' | '6m' | '1y' | '2y'>('1y');
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [comparisonView, setComparisonView] = useState<'revenue' | 'costs' | 'profit' | 'risk'>('profit');

  const toggleScenarioSelection = (scenarioId: string) => {
    const newSelection = new Set(selectedScenarios);
    if (newSelection.has(scenarioId)) {
      newSelection.delete(scenarioId);
    } else {
      newSelection.add(scenarioId);
    }
    setSelectedScenarios(newSelection);
  };

  const runSimulation = async () => {
    if (selectedScenarios.size === 0) return;

    setIsRunning(true);
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const results = Array.from(selectedScenarios).map(scenarioId => 
        generateSimulationResult(scenarioId, timeHorizon)
      );
      
      setSimulationResults(results);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const generateSimulationResult = (scenarioId: string, horizon: string): SimulationResult => {
    const scenario = scenarios.find(s => s.id === scenarioId)!;
    const periods = horizon === '3m' ? 3 : horizon === '6m' ? 6 : horizon === '1y' ? 12 : 24;
    
    const baseRevenue = 100000;
    const baseCosts = 70000;
    
    const results = {
      revenue: Array.from({ length: periods }, (_, i) => {
        const growth = Math.pow(1 + (scenario.parameters.marketGrowth || 0.05), i / 12);
        const seasonal = 1 + Math.sin(i * Math.PI / 6) * 0.1;
        const value = baseRevenue * growth * seasonal * (scenario.parameters.clientRetention || 0.9);
        
        return {
          period: `Period ${i + 1}`,
          value: Math.round(value),
          confidence: Math.max(0.6, 0.95 - (i * 0.02))
        };
      }),
      costs: Array.from({ length: periods }, (_, i) => {
        const efficiency = scenario.parameters.operationalEfficiency || 0.85;
        const inflation = Math.pow(1.03, i / 12); // 3% annual inflation
        const value = baseCosts * inflation / efficiency;
        
        return {
          period: `Period ${i + 1}`,
          value: Math.round(value),
          confidence: Math.max(0.7, 0.9 - (i * 0.015))
        };
      }),
      profit: [] as Array<{ period: string; value: number; confidence: number }>,
      risk: Array.from({ length: periods }, (_, i) => {
        const baseRisk = scenario.businessImpact.risk;
        const timeRisk = i * 0.01; // Risk increases over time
        const marketRisk = Math.abs(scenario.parameters.marketGrowth || 0) * 0.5;
        const totalRisk = Math.min(1, baseRisk + timeRisk + marketRisk);
        
        return {
          period: `Period ${i + 1}`,
          value: totalRisk,
          severity: totalRisk < 0.3 ? 'low' as const : totalRisk < 0.6 ? 'medium' as const : 'high' as const
        };
      })
    };

    // Calculate profit
    results.profit = results.revenue.map((rev, i) => ({
      period: rev.period,
      value: rev.value - results.costs[i].value,
      confidence: Math.min(rev.confidence, results.costs[i].confidence)
    }));

    const summary = {
      totalRevenue: results.revenue.reduce((sum, r) => sum + r.value, 0),
      totalCosts: results.costs.reduce((sum, c) => sum + c.value, 0),
      netProfit: results.profit.reduce((sum, p) => sum + p.value, 0),
      roi: 0,
      riskScore: results.risk.reduce((sum, r) => sum + r.value, 0) / results.risk.length
    };
    
    summary.roi = (summary.netProfit / summary.totalCosts) * 100;

    return {
      scenarioId,
      timeHorizon: horizon,
      results,
      summary
    };
  };

  const getComparisonChartData = () => {
    if (simulationResults.length === 0) return null;

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    
    return {
      labels: simulationResults[0].results[comparisonView].map(r => r.period),
      datasets: simulationResults.map((result, index) => {
        const scenario = scenarios.find(s => s.id === result.scenarioId)!;
        const data = result.results[comparisonView].map(r => r.value);
        
        return {
          label: scenario.name,
          data,
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '20',
          tension: 0.4,
          fill: false
        };
      })
    };
  };

  const getSummaryChartData = () => {
    if (simulationResults.length === 0) return null;

    const scenarios = simulationResults.map(result => 
      scenarios.find(s => s.id === result.scenarioId)!.name
    );

    return {
      labels: scenarios,
      datasets: [
        {
          label: 'Revenue',
          data: simulationResults.map(r => r.summary.totalRevenue / 1000),
          backgroundColor: '#3B82F6'
        },
        {
          label: 'Costs',
          data: simulationResults.map(r => r.summary.totalCosts / 1000),
          backgroundColor: '#EF4444'
        },
        {
          label: 'Profit',
          data: simulationResults.map(r => r.summary.netProfit / 1000),
          backgroundColor: '#10B981'
        }
      ]
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Business Impact Simulator</h2>
          <p className="text-gray-600 mt-1">
            Simulate business outcomes and compare scenario impacts
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
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="2y">2 Years</option>
            </select>
          </div>
          
          <button
            onClick={runSimulation}
            disabled={selectedScenarios.size === 0 || isRunning}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            <span>{isRunning ? 'Running...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Scenario Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Scenarios to Compare</h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => {
            const isSelected = selectedScenarios.has(scenario.id);
            
            return (
              <div
                key={scenario.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleScenarioSelection(scenario.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleScenarioSelection(scenario.id)}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {scenario.description}
                </p>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue Impact:</span>
                    <span className="font-medium">
                      ${(scenario.businessImpact.revenue / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Level:</span>
                    <Badge 
                      variant={
                        scenario.businessImpact.risk < 0.3 ? 'green' :
                        scenario.businessImpact.risk < 0.6 ? 'yellow' : 'red'
                      } 
                      size="sm"
                    >
                      {(scenario.businessImpact.risk * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{selectedScenarios.size} scenarios selected</span>
          <button
            onClick={() => setSelectedScenarios(new Set())}
            className="text-blue-600 hover:text-blue-800"
          >
            Clear Selection
          </button>
        </div>
      </Card>

      {/* Simulation Results */}
      {isRunning && (
        <Card className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Running Simulation</h3>
          <p className="text-gray-600">
            Analyzing {selectedScenarios.size} scenarios over {timeHorizon === '3m' ? '3 months' : timeHorizon === '6m' ? '6 months' : timeHorizon === '1y' ? '1 year' : '2 years'}...
          </p>
        </Card>
      )}

      {simulationResults.length > 0 && !isRunning && (
        <>
          {/* Comparison Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Scenario Comparison</h3>
                <select
                  value={comparisonView}
                  onChange={(e) => setComparisonView(e.target.value as any)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                >
                  <option value="revenue">Revenue</option>
                  <option value="costs">Costs</option>
                  <option value="profit">Profit</option>
                  <option value="risk">Risk</option>
                </select>
              </div>
              
              <div className="h-80">
                <BaseChart
                  type="line"
                  data={getComparisonChartData()!}
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
                          text: 'Time Period'
                        }
                      },
                      y: {
                        title: {
                          display: true,
                          text: comparisonView === 'risk' ? 'Risk Level' : 'Value ($)'
                        },
                        ticks: {
                          callback: (value) => 
                            comparisonView === 'risk' 
                              ? `${(Number(value) * 100).toFixed(0)}%`
                              : `$${(Number(value) / 1000).toFixed(0)}K`
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Comparison</h3>
              
              <div className="h-80">
                <BaseChart
                  type="bar"
                  data={getSummaryChartData()!}
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
                          text: 'Scenarios'
                        }
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Value ($K)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Results</h3>
            
            {simulationResults.map((result) => {
              const scenario = scenarios.find(s => s.id === result.scenarioId)!;
              
              return (
                <Card key={result.scenarioId} className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{scenario.name}</h4>
                      <p className="text-gray-600">{scenario.description}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm text-gray-600">ROI:</span>
                        <span className={`text-lg font-bold ${
                          result.summary.roi > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {result.summary.roi.toFixed(1)}%
                        </span>
                      </div>
                      <Badge 
                        variant={
                          result.summary.riskScore < 0.3 ? 'green' :
                          result.summary.riskScore < 0.6 ? 'yellow' : 'red'
                        }
                      >
                        {(result.summary.riskScore * 100).toFixed(0)}% Risk
                      </Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold text-blue-900">
                        ${(result.summary.totalRevenue / 1000).toFixed(0)}K
                      </p>
                      <p className="text-sm text-blue-700">Total Revenue</p>
                    </div>
                    
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <BarChart3 className="w-6 h-6 text-red-600" />
                      </div>
                      <p className="text-2xl font-bold text-red-900">
                        ${(result.summary.totalCosts / 1000).toFixed(0)}K
                      </p>
                      <p className="text-sm text-red-700">Total Costs</p>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-green-900">
                        ${(result.summary.netProfit / 1000).toFixed(0)}K
                      </p>
                      <p className="text-sm text-green-700">Net Profit</p>
                    </div>
                    
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                      </div>
                      <p className="text-2xl font-bold text-yellow-900">
                        {(result.summary.riskScore * 100).toFixed(0)}%
                      </p>
                      <p className="text-sm text-yellow-700">Avg Risk</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Empty State */}
      {simulationResults.length === 0 && !isRunning && (
        <Card className="p-8 text-center">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Simulate</h3>
          <p className="text-gray-600 mb-4">
            Select scenarios above and run simulation to see business impact analysis
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Target className="w-4 h-4" />
              <span>Revenue Projections</span>
            </div>
            <div className="flex items-center space-x-1">
              <BarChart3 className="w-4 h-4" />
              <span>Cost Analysis</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Risk Assessment</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};