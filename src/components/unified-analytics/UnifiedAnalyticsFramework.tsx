'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { AIRecommendedVisualizations } from './AIRecommendedVisualizations';
import { InteractiveAnalyticsExplorer } from './InteractiveAnalyticsExplorer';
import { VisualizationExporter } from './VisualizationExporter';
import { VisualizationLibrary } from './VisualizationLibrary';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Brain, 
  Download, 
  Search,
  Filter,
  Sparkles,
  Eye,
  Settings
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'realtime';
  status: 'connected' | 'disconnected' | 'error';
  lastUpdated: string;
  recordCount: number;
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

export const UnifiedAnalyticsFramework: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [visualizations, setVisualizations] = useState<VisualizationConfig[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'explore' | 'recommendations' | 'library' | 'export'>('explore');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDataSources();
    fetchVisualizations();
  }, []);

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/analytics/data-sources');
      const data = await response.json();
      setDataSources(data.sources || mockDataSources);
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
      setDataSources(mockDataSources);
    }
  };

  const fetchVisualizations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analytics/visualizations');
      const data = await response.json();
      setVisualizations(data.visualizations || mockVisualizations);
    } catch (error) {
      console.error('Failed to fetch visualizations:', error);
      setVisualizations(mockVisualizations);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVisualizationCreate = (config: Partial<VisualizationConfig>) => {
    const newVisualization: VisualizationConfig = {
      id: Date.now().toString(),
      type: config.type || 'bar',
      title: config.title || 'New Visualization',
      dataSource: config.dataSource || selectedDataSource || '',
      config: config.config || {},
      aiRecommended: false,
      confidence: 0,
      insights: []
    };

    setVisualizations(prev => [...prev, newVisualization]);
  };

  const handleVisualizationUpdate = (id: string, updates: Partial<VisualizationConfig>) => {
    setVisualizations(prev => prev.map(viz => 
      viz.id === id ? { ...viz, ...updates } : viz
    ));
  };

  const handleVisualizationDelete = (id: string) => {
    setVisualizations(prev => prev.filter(viz => viz.id !== id));
  };

  const getDataSourceStatus = (status: string) => {
    switch (status) {
      case 'connected': return { color: 'green', label: 'Connected' };
      case 'disconnected': return { color: 'gray', label: 'Disconnected' };
      case 'error': return { color: 'red', label: 'Error' };
      default: return { color: 'gray', label: 'Unknown' };
    }
  };

  const views = [
    { id: 'explore', label: 'Explore', icon: Eye, description: 'Interactive analytics exploration' },
    { id: 'recommendations', label: 'AI Recommendations', icon: Brain, description: 'AI-suggested visualizations' },
    { id: 'library', label: 'Library', icon: BarChart3, description: 'Visualization templates' },
    { id: 'export', label: 'Export', icon: Download, description: 'Export and sharing options' }
  ];

  const aiRecommendedCount = visualizations.filter(v => v.aiRecommended).length;
  const connectedSources = dataSources.filter(ds => ds.status === 'connected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Unified Analytics Framework</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive charting with AI-recommended visualizations and interactive exploration
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="blue" className="animate-pulse">
            AI-Powered
          </Badge>
          <Badge variant="green">
            {connectedSources} Sources
          </Badge>
          <Badge variant="purple">
            {visualizations.length} Charts
          </Badge>
        </div>
      </div>

      {/* Data Sources Overview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800">
            + Connect New Source
          </button>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dataSources.map((source) => {
            const status = getDataSourceStatus(source.status);
            
            return (
              <div
                key={source.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedDataSource === source.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedDataSource(source.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 truncate">{source.name}</h4>
                  <Badge variant={status.color as any} size="sm">
                    {status.label}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Type: {source.type}</p>
                  <p>Records: {source.recordCount.toLocaleString()}</p>
                  <p>Updated: {new Date(source.lastUpdated).toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

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
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{view.label}</span>
              {view.id === 'recommendations' && aiRecommendedCount > 0 && (
                <Badge variant="purple" size="sm">
                  {aiRecommendedCount}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeView === 'explore' && (
        <InteractiveAnalyticsExplorer
          dataSources={dataSources}
          selectedDataSource={selectedDataSource}
          visualizations={visualizations}
          onVisualizationCreate={handleVisualizationCreate}
          onVisualizationUpdate={handleVisualizationUpdate}
          onVisualizationDelete={handleVisualizationDelete}
          isLoading={isLoading}
        />
      )}

      {activeView === 'recommendations' && (
        <AIRecommendedVisualizations
          dataSources={dataSources}
          selectedDataSource={selectedDataSource}
          existingVisualizations={visualizations}
          onVisualizationAccept={handleVisualizationCreate}
        />
      )}

      {activeView === 'library' && (
        <VisualizationLibrary
          onTemplateSelect={handleVisualizationCreate}
        />
      )}

      {activeView === 'export' && (
        <VisualizationExporter
          visualizations={visualizations}
        />
      )}

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{visualizations.length}</p>
          <p className="text-sm text-gray-600">Total Visualizations</p>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Brain className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{aiRecommendedCount}</p>
          <p className="text-sm text-gray-600">AI Recommended</p>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{connectedSources}</p>
          <p className="text-sm text-gray-600">Connected Sources</p>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Sparkles className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round(visualizations.reduce((sum, v) => sum + v.confidence, 0) / visualizations.length * 100) || 0}%
          </p>
          <p className="text-sm text-gray-600">Avg AI Confidence</p>
        </Card>
      </div>
    </div>
  );
};

// Mock data for development
const mockDataSources: DataSource[] = [
  {
    id: '1',
    name: 'Financial Database',
    type: 'database',
    status: 'connected',
    lastUpdated: '2024-01-15T10:30:00Z',
    recordCount: 125000
  },
  {
    id: '2',
    name: 'Client Analytics API',
    type: 'api',
    status: 'connected',
    lastUpdated: '2024-01-15T09:45:00Z',
    recordCount: 89000
  },
  {
    id: '3',
    name: 'Real-time Metrics',
    type: 'realtime',
    status: 'connected',
    lastUpdated: '2024-01-15T11:00:00Z',
    recordCount: 15000
  },
  {
    id: '4',
    name: 'Document Archive',
    type: 'file',
    status: 'disconnected',
    lastUpdated: '2024-01-14T16:20:00Z',
    recordCount: 45000
  }
];

const mockVisualizations: VisualizationConfig[] = [
  {
    id: '1',
    type: 'bar',
    title: 'Revenue by Quarter',
    dataSource: '1',
    config: { xAxis: 'quarter', yAxis: 'revenue', color: '#3B82F6' },
    aiRecommended: true,
    confidence: 0.92,
    insights: ['Strong Q3 performance', 'Seasonal trend detected']
  },
  {
    id: '2',
    type: 'line',
    title: 'Client Growth Trend',
    dataSource: '2',
    config: { xAxis: 'date', yAxis: 'clients', trend: true },
    aiRecommended: true,
    confidence: 0.87,
    insights: ['Consistent growth pattern', 'Acceleration in recent months']
  },
  {
    id: '3',
    type: 'pie',
    title: 'Service Distribution',
    dataSource: '1',
    config: { category: 'service_type', value: 'revenue' },
    aiRecommended: false,
    confidence: 0,
    insights: []
  }
];