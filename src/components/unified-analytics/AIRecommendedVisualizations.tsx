'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { BaseChart } from '@/components/charts/BaseChart';
import { Brain, Sparkles, CheckCircle, XCircle, Eye, TrendingUp, BarChart3 } from 'lucide-react';

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

interface AIRecommendation {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'funnel';
  title: string;
  description: string;
  confidence: number;
  reasoning: string[];
  dataPreview: any;
  insights: string[];
  businessValue: 'high' | 'medium' | 'low';
  complexity: 'simple' | 'moderate' | 'complex';
}

interface AIRecommendedVisualizationsProps {
  dataSources: DataSource[];
  selectedDataSource: string | null;
  existingVisualizations: VisualizationConfig[];
  onVisualizationAccept: (config: Partial<VisualizationConfig>) => void;
}

export const AIRecommendedVisualizations: React.FC<AIRecommendedVisualizationsProps> = ({
  dataSources,
  selectedDataSource,
  existingVisualizations,
  onVisualizationAccept
}) => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    if (selectedDataSource) {
      generateRecommendations();
    }
  }, [selectedDataSource, existingVisualizations]);

  const generateRecommendations = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newRecommendations = await generateMockRecommendations(
        selectedDataSource,
        existingVisualizations
      );
      setRecommendations(newRecommendations);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockRecommendations = async (
    dataSourceId: string | null,
    existing: VisualizationConfig[]
  ): Promise<AIRecommendation[]> => {
    if (!dataSourceId) return [];

    const dataSource = dataSources.find(ds => ds.id === dataSourceId);
    const existingTypes = existing.map(v => v.type);

    const recommendations: AIRecommendation[] = [];

    // Revenue trend analysis
    if (!existingTypes.includes('line')) {
      recommendations.push({
        id: 'rec-1',
        type: 'line',
        title: 'Revenue Trend Analysis',
        description: 'Track revenue performance over time with trend indicators',
        confidence: 0.94,
        reasoning: [
          'Time-series data detected in financial records',
          'Strong correlation between date and revenue fields',
          'Seasonal patterns identified in historical data'
        ],
        dataPreview: generateMockChartData('line'),
        insights: [
          '23% revenue growth over last 6 months',
          'Strong Q4 performance indicates seasonal boost',
          'Consistent month-over-month improvement'
        ],
        businessValue: 'high',
        complexity: 'simple'
      });
    }

    // Service distribution
    if (!existingTypes.includes('pie')) {
      recommendations.push({
        id: 'rec-2',
        type: 'pie',
        title: 'Service Revenue Distribution',
        description: 'Visualize revenue breakdown by service categories',
        confidence: 0.89,
        reasoning: [
          'Multiple service categories identified',
          'Clear revenue attribution per service',
          'Helps identify top-performing services'
        ],
        dataPreview: generateMockChartData('pie'),
        insights: [
          'Consulting services generate 45% of revenue',
          'Tax services show 18% growth this quarter',
          'Audit services maintain steady 25% share'
        ],
        businessValue: 'high',
        complexity: 'simple'
      });
    }

    // Performance comparison
    if (!existingTypes.includes('bar')) {
      recommendations.push({
        id: 'rec-3',
        type: 'bar',
        title: 'Team Performance Comparison',
        description: 'Compare performance metrics across different teams',
        confidence: 0.82,
        reasoning: [
          'Team-based data structure detected',
          'Performance metrics available for comparison',
          'Useful for identifying top performers'
        ],
        dataPreview: generateMockChartData('bar'),
        insights: [
          'Team Alpha leads with 127% of target',
          'Consistent performance across all teams',
          'Opportunity for knowledge sharing identified'
        ],
        businessValue: 'medium',
        complexity: 'moderate'
      });
    }

    // Client satisfaction scatter
    if (!existingTypes.includes('scatter')) {
      recommendations.push({
        id: 'rec-4',
        type: 'scatter',
        title: 'Client Satisfaction vs Revenue',
        description: 'Analyze correlation between client satisfaction and revenue',
        confidence: 0.76,
        reasoning: [
          'Both satisfaction and revenue data available',
          'Correlation analysis reveals interesting patterns',
          'Helps identify high-value, satisfied clients'
        ],
        dataPreview: generateMockChartData('scatter'),
        insights: [
          'Strong positive correlation (r=0.78)',
          'High satisfaction clients generate 40% more revenue',
          'Outliers indicate potential account risks'
        ],
        businessValue: 'high',
        complexity: 'complex'
      });
    }

    // Risk assessment heatmap
    recommendations.push({
      id: 'rec-5',
      type: 'heatmap',
      title: 'Risk Assessment Matrix',
      description: 'Visualize risk levels across different business areas',
      confidence: 0.71,
      reasoning: [
        'Risk assessment data structure identified',
        'Multiple risk categories and severity levels',
        'Helps prioritize risk mitigation efforts'
      ],
      dataPreview: generateMockChartData('heatmap'),
      insights: [
        'Compliance risks concentrated in Q1',
        'Operational risks trending downward',
        'Financial risks require immediate attention'
      ],
      businessValue: 'medium',
      complexity: 'complex'
    });

    return recommendations;
  };

  const generateMockChartData = (type: string) => {
    switch (type) {
      case 'line':
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Revenue',
            data: [45000, 52000, 48000, 61000, 55000, 67000],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          }]
        };
      case 'pie':
        return {
          labels: ['Consulting', 'Tax Services', 'Audit', 'Advisory'],
          datasets: [{
            data: [45, 25, 20, 10],
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
          }]
        };
      case 'bar':
        return {
          labels: ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta'],
          datasets: [{
            label: 'Performance %',
            data: [127, 98, 115, 103],
            backgroundColor: '#3B82F6'
          }]
        };
      case 'scatter':
        return {
          datasets: [{
            label: 'Clients',
            data: [
              { x: 8.5, y: 125000 },
              { x: 7.2, y: 89000 },
              { x: 9.1, y: 156000 },
              { x: 6.8, y: 67000 },
              { x: 8.9, y: 134000 }
            ],
            backgroundColor: '#3B82F6'
          }]
        };
      default:
        return { labels: [], datasets: [] };
    }
  };

  const acceptRecommendation = (recommendation: AIRecommendation) => {
    onVisualizationAccept({
      type: recommendation.type,
      title: recommendation.title,
      dataSource: selectedDataSource || '',
      config: recommendation.dataPreview,
      aiRecommended: true,
      confidence: recommendation.confidence,
      insights: recommendation.insights
    });
  };

  const getBusinessValueColor = (value: string) => {
    switch (value) {
      case 'high': return 'green';
      case 'medium': return 'yellow';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'green';
      case 'moderate': return 'yellow';
      case 'complex': return 'red';
      default: return 'gray';
    }
  };

  const filteredRecommendations = filterBy === 'all' 
    ? recommendations 
    : recommendations.filter(rec => rec.businessValue === filterBy);

  if (!selectedDataSource) {
    return (
      <Card className="p-8 text-center">
        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Data Source</h3>
        <p className="text-gray-600">
          Choose a data source to generate AI-powered visualization recommendations
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Recommendations</h2>
            <p className="text-sm text-gray-600">
              Smart visualization suggestions based on your data
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Business Value:</span>
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isGenerating && (
        <Card className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Your Data</h3>
          <p className="text-gray-600">
            AI is examining patterns and generating visualization recommendations...
          </p>
        </Card>
      )}

      {/* Recommendations Grid */}
      {!isGenerating && (
        <div className="grid lg:grid-cols-2 gap-6">
          {filteredRecommendations.length === 0 ? (
            <div className="lg:col-span-2">
              <Card className="p-8 text-center">
                <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recommendations</h3>
                <p className="text-gray-600">
                  No recommendations found for the selected criteria. Try adjusting your filters.
                </p>
              </Card>
            </div>
          ) : (
            filteredRecommendations.map((recommendation) => (
              <Card key={recommendation.id} className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {recommendation.title}
                      </h3>
                      <Badge variant="purple" size="sm">
                        {Math.round(recommendation.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {recommendation.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getBusinessValueColor(recommendation.businessValue) as any} size="sm">
                        {recommendation.businessValue} value
                      </Badge>
                      <Badge variant={getComplexityColor(recommendation.complexity) as any} size="sm">
                        {recommendation.complexity}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Chart Preview */}
                <div className="h-48 mb-4 bg-gray-50 rounded-lg p-4">
                  <BaseChart 
                    type={recommendation.type as any}
                    data={recommendation.dataPreview}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: recommendation.type !== 'pie' ? {
                        x: { display: false },
                        y: { display: false }
                      } : undefined
                    }}
                  />
                </div>

                {/* AI Reasoning */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">AI Reasoning:</h4>
                  <div className="space-y-1">
                    {recommendation.reasoning.map((reason, index) => (
                      <div key={index} className="flex items-start space-x-2 text-xs text-gray-600">
                        <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Insights:</h4>
                  <div className="space-y-1">
                    {recommendation.insights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">
                        <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedRecommendation(recommendation)}
                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview</span>
                  </button>
                  
                  <div className="flex space-x-2">
                    <button className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800">
                      <XCircle className="w-4 h-4" />
                      <span>Dismiss</span>
                    </button>
                    <button
                      onClick={() => acceptRecommendation(recommendation)}
                      className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Accept</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Summary Stats */}
      {!isGenerating && recommendations.length > 0 && (
        <Card className="p-4">
          <div className="grid md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-purple-900">{recommendations.length}</p>
              <p className="text-sm text-gray-600">Total Recommendations</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">
                {recommendations.filter(r => r.businessValue === 'high').length}
              </p>
              <p className="text-sm text-gray-600">High Value</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">
                {Math.round(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length * 100)}%
              </p>
              <p className="text-sm text-gray-600">Avg Confidence</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-900">
                {recommendations.filter(r => r.complexity === 'simple').length}
              </p>
              <p className="text-sm text-gray-600">Simple to Implement</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};