'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { BaseChart } from '@/components/charts/BaseChart';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Download,
  Lightbulb,
  BarChart3,
  LineChart,
  PieChart,
  ScatterChart as Scatter,
  Activity
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface VisualizationConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'funnel';
  title: string;
  dataSource: string;
  config: any;
  aiRecommended: boolean;
  confidence: number;
  insights: string[];
}

interface InteractiveAnalyticsExplorerProps {
  dataSources: DataSource[];
  selectedDataSource: string | null;
  visualizations: VisualizationConfig[];
  onVisualizationCreate: (config: Partial<VisualizationConfig>) => void;
  onVisualizationUpdate: (id: string, updates: Partial<VisualizationConfig>) => void;
  onVisualizationDelete: (id: string) => void;
  isLoading: boolean;
}

export const InteractiveAnalyticsExplorer: React.FC<InteractiveAnalyticsExplorerProps> = ({
  dataSources,
  selectedDataSource,
  visualizations,
  onVisualizationCreate,
  onVisualizationUpdate,
  onVisualizationDelete,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'bar' | 'line' | 'pie' | 'scatter'>('all');
  const [selectedVisualization, setSelectedVisualization] = useState<VisualizationConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [guidedInsights, setGuidedInsights] = useState<string[]>([]);

  useEffect(() => {
    if (selectedDataSource) {
      generateGuidedInsights();
    }
  }, [selectedDataSource, visualizations]);

  const generateGuidedInsights = async () => {
    // Simulate AI-generated insights
    const insights = [
      'Revenue data shows strong seasonal patterns - consider time-series analysis',
      'Client satisfaction scores correlate with retention rates',
      'Service type distribution suggests opportunity for portfolio optimization',
      'Performance metrics indicate team-based analysis would be valuable'
    ];
    setGuidedInsights(insights);
  };

  const filteredVisualizations = visualizations.filter(viz => {
    const matchesSearch = viz.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || viz.type === filterType;
    const matchesDataSource = !selectedDataSource || viz.dataSource === selectedDataSource;
    
    return matchesSearch && matchesFilter && matchesDataSource;
  });

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return BarChart3;
      case 'line': return LineChart;
      case 'pie': return PieChart;
      case 'scatter': return Scatter;
      default: return Activity;
    }
  };

  const getChartData = (viz: VisualizationConfig) => {
    // Generate mock data based on visualization type
    switch (viz.type) {
      case 'bar':
        return {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          datasets: [{
            label: 'Revenue',
            data: [45000, 52000, 48000, 61000],
            backgroundColor: '#3B82F6'
          }]
        };
      case 'line':
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Growth',
            data: [12, 19, 15, 25, 22, 30],
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4
          }]
        };
      case 'pie':
        return {
          labels: ['Consulting', 'Tax', 'Audit', 'Advisory'],
          datasets: [{
            data: [45, 25, 20, 10],
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
          }]
        };
      default:
        return { labels: [], datasets: [] };
    }
  };

  const handleCreateVisualization = () => {
    setIsCreating(true);
  };

  const handleSaveVisualization = (config: Partial<VisualizationConfig>) => {
    onVisualizationCreate(config);
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search visualizations..."
              className="pl-10 w-64"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="bar">Bar Charts</option>
            <option value="line">Line Charts</option>
            <option value="pie">Pie Charts</option>
            <option value="scatter">Scatter Plots</option>
          </select>
        </div>

        <button
          onClick={handleCreateVisualization}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Create Visualization</span>
        </button>
      </div>

      {/* Guided Insights */}
      {guidedInsights.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-2 mb-3">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Guided Insights</h3>
          </div>
          <div className="space-y-2">
            {guidedInsights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-2 text-sm text-blue-800">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Visualizations Grid */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVisualizations.length === 0 ? (
          <div className="lg:col-span-2 xl:col-span-3">
            <Card className="p-8 text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Visualizations Found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterType !== 'all' 
                  ? 'No visualizations match your current filters.'
                  : 'Create your first visualization to get started.'
                }
              </p>
              <button
                onClick={handleCreateVisualization}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Visualization
              </button>
            </Card>
          </div>
        ) : (
          filteredVisualizations.map((viz) => {
            const ChartIcon = getChartIcon(viz.type);
            const chartData = getChartData(viz);
            
            return (
              <Card key={viz.id} className="p-4 hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ChartIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{viz.title}</h3>
                      <p className="text-xs text-gray-600">
                        {dataSources.find(ds => ds.id === viz.dataSource)?.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {viz.aiRecommended && (
                      <Badge variant="purple" size="sm">
                        AI
                      </Badge>
                    )}
                    <Badge variant="gray" size="sm">
                      {viz.type}
                    </Badge>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-48 mb-4 bg-gray-50 rounded-lg p-2">
                  <BaseChart 
                    type={viz.type as any}
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: viz.type !== 'pie' ? {
                        x: {
                          ticks: { font: { size: 10 } }
                        },
                        y: {
                          ticks: { font: { size: 10 } }
                        }
                      } : undefined
                    }}
                  />
                </div>

                {/* Insights */}
                {viz.insights.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-gray-700 mb-2">Key Insights:</h4>
                    <div className="space-y-1">
                      {viz.insights.slice(0, 2).map((insight, index) => (
                        <div key={index} className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    {viz.aiRecommended && (
                      <span className="text-xs text-purple-600">
                        {Math.round(viz.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setSelectedVisualization(viz)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {/* Handle edit */}}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onVisualizationDelete(viz.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Visualization Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Visualization</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <Input placeholder="Enter visualization title" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chart Type
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="scatter">Scatter Plot</option>
                </select>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => handleSaveVisualization({
                    title: 'New Visualization',
                    type: 'bar',
                    dataSource: selectedDataSource || ''
                  })}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};