'use client';

import React, { useState } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { BaseChart } from '@/components/charts/BaseChart';
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  Eye, 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';

interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'funnel';
  category: 'financial' | 'performance' | 'compliance' | 'operational' | 'strategic';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  popularity: number;
  config: any;
  previewData: any;
  tags: string[];
  useCase: string;
  businessValue: string;
}

interface VisualizationConfig {
  id: string;
  type: string;
  title: string;
  dataSource: string;
  config: any;
  aiRecommended: boolean;
  confidence: number;
  insights: string[];
}

interface VisualizationLibraryProps {
  onTemplateSelect: (config: Partial<VisualizationConfig>) => void;
}

export const VisualizationLibrary: React.FC<VisualizationLibraryProps> = ({
  onTemplateSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'financial' | 'performance' | 'compliance' | 'operational' | 'strategic'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'name' | 'difficulty'>('popularity');
  const [selectedTemplate, setSelectedTemplate] = useState<ChartTemplate | null>(null);

  const templates: ChartTemplate[] = [
    {
      id: 'revenue-trend',
      name: 'Revenue Trend Analysis',
      description: 'Track revenue performance over time with trend indicators and forecasting',
      type: 'line',
      category: 'financial',
      difficulty: 'beginner',
      popularity: 95,
      config: {
        showTrend: true,
        showForecast: true,
        smoothing: 0.3
      },
      previewData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue',
          data: [45000, 52000, 48000, 61000, 55000, 67000],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }]
      },
      tags: ['revenue', 'trend', 'financial', 'forecasting'],
      useCase: 'Monitor revenue performance and identify growth trends',
      businessValue: 'Enables data-driven financial planning and performance tracking'
    },
    {
      id: 'service-distribution',
      name: 'Service Revenue Distribution',
      description: 'Visualize revenue breakdown by service categories with percentage labels',
      type: 'pie',
      category: 'financial',
      difficulty: 'beginner',
      popularity: 88,
      config: {
        showPercentages: true,
        showLabels: true,
        colorScheme: 'professional'
      },
      previewData: {
        labels: ['Consulting', 'Tax Services', 'Audit', 'Advisory'],
        datasets: [{
          data: [45, 25, 20, 10],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
        }]
      },
      tags: ['revenue', 'distribution', 'services', 'portfolio'],
      useCase: 'Understand service portfolio performance and identify opportunities',
      businessValue: 'Optimize service mix and resource allocation'
    },
    {
      id: 'team-performance',
      name: 'Team Performance Comparison',
      description: 'Compare KPIs across teams with target lines and variance indicators',
      type: 'bar',
      category: 'performance',
      difficulty: 'intermediate',
      popularity: 82,
      config: {
        showTargets: true,
        showVariance: true,
        grouping: 'team'
      },
      previewData: {
        labels: ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta'],
        datasets: [{
          label: 'Performance %',
          data: [127, 98, 115, 103],
          backgroundColor: '#3B82F6'
        }]
      },
      tags: ['performance', 'teams', 'comparison', 'kpi'],
      useCase: 'Monitor team performance and identify top performers',
      businessValue: 'Improve team productivity and resource management'
    },
    {
      id: 'compliance-score',
      name: 'Compliance Score Tracker',
      description: 'Track compliance scores with threshold alerts and trend analysis',
      type: 'gauge',
      category: 'compliance',
      difficulty: 'intermediate',
      popularity: 76,
      config: {
        thresholds: [60, 80, 95],
        showTrend: true,
        alertLevels: true
      },
      previewData: {
        value: 87,
        min: 0,
        max: 100,
        thresholds: [60, 80, 95]
      },
      tags: ['compliance', 'score', 'monitoring', 'alerts'],
      useCase: 'Monitor compliance levels and ensure regulatory adherence',
      businessValue: 'Reduce compliance risks and avoid penalties'
    },
    {
      id: 'client-satisfaction',
      name: 'Client Satisfaction vs Revenue',
      description: 'Analyze correlation between client satisfaction and revenue generation',
      type: 'scatter',
      category: 'strategic',
      difficulty: 'advanced',
      popularity: 71,
      config: {
        showCorrelation: true,
        trendLine: true,
        outlierDetection: true
      },
      previewData: {
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
      },
      tags: ['satisfaction', 'revenue', 'correlation', 'clients'],
      useCase: 'Identify high-value clients and satisfaction drivers',
      businessValue: 'Improve client retention and revenue optimization'
    },
    {
      id: 'operational-efficiency',
      name: 'Operational Efficiency Heatmap',
      description: 'Visualize efficiency metrics across departments and time periods',
      type: 'heatmap',
      category: 'operational',
      difficulty: 'advanced',
      popularity: 68,
      config: {
        colorScale: 'efficiency',
        showValues: true,
        clustering: true
      },
      previewData: {
        labels: {
          x: ['Q1', 'Q2', 'Q3', 'Q4'],
          y: ['Finance', 'Operations', 'HR', 'IT']
        },
        data: [
          [85, 92, 78, 95],
          [90, 88, 85, 92],
          [75, 82, 90, 87],
          [88, 95, 83, 91]
        ]
      },
      tags: ['efficiency', 'operations', 'departments', 'heatmap'],
      useCase: 'Identify operational bottlenecks and improvement opportunities',
      businessValue: 'Optimize operations and reduce costs'
    }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'financial', label: 'Financial' },
    { value: 'performance', label: 'Performance' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'operational', label: 'Operational' },
    { value: 'strategic', label: 'Strategic' }
  ];

  const difficulties = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const filteredTemplates = templates
    .filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.popularity - a.popularity;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'difficulty':
          const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        default:
          return 0;
      }
    });

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return BarChart3;
      case 'line': return LineChart;
      case 'pie': return PieChart;
      case 'scatter': return TrendingUp;
      default: return Activity;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'green';
      case 'intermediate': return 'yellow';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'financial': return 'blue';
      case 'performance': return 'green';
      case 'compliance': return 'purple';
      case 'operational': return 'orange';
      case 'strategic': return 'red';
      default: return 'gray';
    }
  };

  const handleTemplateSelect = (template: ChartTemplate) => {
    onTemplateSelect({
      type: template.type,
      title: template.name,
      config: template.config,
      aiRecommended: false,
      confidence: 0,
      insights: []
    });
  };

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
              placeholder="Search templates..."
              className="pl-10 w-64"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {difficulties.map(difficulty => (
              <option key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="popularity">Popularity</option>
            <option value="name">Name</option>
            <option value="difficulty">Difficulty</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTemplates.length === 0 ? (
          <div className="lg:col-span-2 xl:col-span-3">
            <Card className="p-8 text-center">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Found</h3>
              <p className="text-gray-600">
                No templates match your current filters. Try adjusting your search criteria.
              </p>
            </Card>
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const ChartIcon = getChartIcon(template.type);
            const difficultyColor = getDifficultyColor(template.difficulty);
            const categoryColor = getCategoryColor(template.category);
            
            return (
              <Card key={template.id} className="p-4 hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 bg-${categoryColor}-100 rounded-lg`}>
                      <ChartIcon className={`w-4 h-4 text-${categoryColor}-600`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={categoryColor as any} size="sm">
                          {template.category}
                        </Badge>
                        <Badge variant={difficultyColor as any} size="sm">
                          {template.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">{template.popularity}</span>
                  </div>
                </div>

                {/* Chart Preview */}
                <div className="h-32 mb-4 bg-gray-50 rounded-lg p-2">
                  <BaseChart 
                    type={template.type as any}
                    data={template.previewData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: template.type !== 'pie' && template.type !== 'gauge' ? {
                        x: { display: false },
                        y: { display: false }
                      } : undefined
                    }}
                  />
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="gray" size="sm">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 3 && (
                    <Badge variant="gray" size="sm">
                      +{template.tags.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview</span>
                  </button>
                  
                  <button
                    onClick={() => handleTemplateSelect(template)}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Use Template</span>
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Template Details Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {selectedTemplate.name}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getCategoryColor(selectedTemplate.category) as any}>
                      {selectedTemplate.category}
                    </Badge>
                    <Badge variant={getDifficultyColor(selectedTemplate.difficulty) as any}>
                      {selectedTemplate.difficulty}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-600">{selectedTemplate.popularity}% popularity</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="h-64 mb-6 bg-gray-50 rounded-lg p-4">
                <BaseChart 
                  type={selectedTemplate.type as any}
                  data={selectedTemplate.previewData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false
                  }}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Use Case</h3>
                  <p className="text-sm text-gray-600">{selectedTemplate.useCase}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Business Value</h3>
                  <p className="text-sm text-gray-600">{selectedTemplate.businessValue}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.tags.map((tag, index) => (
                      <Badge key={index} variant="gray" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleTemplateSelect(selectedTemplate);
                    setSelectedTemplate(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Use This Template
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};