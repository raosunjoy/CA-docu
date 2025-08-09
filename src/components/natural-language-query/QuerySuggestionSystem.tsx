'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Shield, 
  BarChart3,
  Clock,
  Star
} from 'lucide-react';

interface QuerySuggestion {
  id: string;
  query: string;
  category: 'revenue' | 'clients' | 'performance' | 'compliance' | 'general';
  popularity: number;
  description: string;
  expectedResultType: 'chart' | 'table' | 'metric' | 'insight';
}

interface QuerySuggestionSystemProps {
  onSuggestionClick: (query: string) => void;
  currentQuery: string;
}

export const QuerySuggestionSystem: React.FC<QuerySuggestionSystemProps> = ({
  onSuggestionClick,
  currentQuery
}) => {
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'revenue' | 'clients' | 'performance' | 'compliance' | 'general'>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentQuery.length > 2) {
      generateContextualSuggestions(currentQuery);
    } else {
      setSuggestions(defaultSuggestions);
    }
  }, [currentQuery]);

  const generateContextualSuggestions = async (query: string) => {
    setIsLoading(true);
    
    // Simulate AI-powered suggestion generation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const contextualSuggestions = getContextualSuggestions(query);
    setSuggestions(contextualSuggestions);
    setIsLoading(false);
  };

  const getContextualSuggestions = (query: string): QuerySuggestion[] => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('revenue') || lowerQuery.includes('sales')) {
      return [
        {
          id: 'rev-1',
          query: 'Show revenue trends by month this year',
          category: 'revenue',
          popularity: 95,
          description: 'Monthly revenue breakdown with trend analysis',
          expectedResultType: 'chart'
        },
        {
          id: 'rev-2',
          query: 'Compare revenue by service type',
          category: 'revenue',
          popularity: 88,
          description: 'Revenue distribution across different services',
          expectedResultType: 'chart'
        },
        {
          id: 'rev-3',
          query: 'What factors are driving revenue growth?',
          category: 'revenue',
          popularity: 82,
          description: 'AI analysis of revenue growth drivers',
          expectedResultType: 'insight'
        },
        {
          id: 'rev-4',
          query: 'Forecast revenue for next quarter',
          category: 'revenue',
          popularity: 79,
          description: 'Predictive revenue forecast with confidence bands',
          expectedResultType: 'chart'
        }
      ];
    }
    
    if (lowerQuery.includes('client') || lowerQuery.includes('customer')) {
      return [
        {
          id: 'cli-1',
          query: 'How many new clients did we acquire this month?',
          category: 'clients',
          popularity: 92,
          description: 'New client acquisition metrics',
          expectedResultType: 'metric'
        },
        {
          id: 'cli-2',
          query: 'Show client retention rates by service',
          category: 'clients',
          popularity: 85,
          description: 'Client retention analysis by service type',
          expectedResultType: 'table'
        },
        {
          id: 'cli-3',
          query: 'Which clients generate the most revenue?',
          category: 'clients',
          popularity: 78,
          description: 'Top revenue-generating clients analysis',
          expectedResultType: 'table'
        },
        {
          id: 'cli-4',
          query: 'What is our client satisfaction score?',
          category: 'clients',
          popularity: 74,
          description: 'Overall client satisfaction metrics',
          expectedResultType: 'metric'
        }
      ];
    }
    
    if (lowerQuery.includes('performance') || lowerQuery.includes('kpi')) {
      return [
        {
          id: 'perf-1',
          query: 'Show all key performance indicators',
          category: 'performance',
          popularity: 90,
          description: 'Complete KPI dashboard overview',
          expectedResultType: 'table'
        },
        {
          id: 'perf-2',
          query: 'Compare team performance this quarter',
          category: 'performance',
          popularity: 83,
          description: 'Team-by-team performance comparison',
          expectedResultType: 'chart'
        },
        {
          id: 'perf-3',
          query: 'Which metrics are below target?',
          category: 'performance',
          popularity: 76,
          description: 'Underperforming metrics analysis',
          expectedResultType: 'insight'
        }
      ];
    }
    
    // Default contextual suggestions based on partial matches
    return defaultSuggestions.filter(s => 
      s.query.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery)
    ).slice(0, 6);
  };

  const categories = [
    { id: 'all', label: 'All', icon: Sparkles, count: suggestions.length },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, count: suggestions.filter(s => s.category === 'revenue').length },
    { id: 'clients', label: 'Clients', icon: Users, count: suggestions.filter(s => s.category === 'clients').length },
    { id: 'performance', label: 'Performance', icon: TrendingUp, count: suggestions.filter(s => s.category === 'performance').length },
    { id: 'compliance', label: 'Compliance', icon: Shield, count: suggestions.filter(s => s.category === 'compliance').length }
  ];

  const filteredSuggestions = selectedCategory === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.category === selectedCategory);

  const getResultTypeIcon = (type: string) => {
    switch (type) {
      case 'chart': return BarChart3;
      case 'table': return BarChart3;
      case 'metric': return TrendingUp;
      case 'insight': return Sparkles;
      default: return BarChart3;
    }
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'chart': return 'blue';
      case 'table': return 'green';
      case 'metric': return 'purple';
      case 'insight': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold text-gray-900">Smart Suggestions</h3>
        {isLoading && (
          <div className="animate-spin w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full" />
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1 mb-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id as any)}
              className={`flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors ${
                selectedCategory === category.id
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{category.label}</span>
              {category.count > 0 && (
                <Badge variant="gray" size="sm">
                  {category.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Suggestions List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-4">
            <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {currentQuery ? 'No matching suggestions' : 'Start typing to see suggestions'}
            </p>
          </div>
        ) : (
          filteredSuggestions.map((suggestion) => {
            const ResultIcon = getResultTypeIcon(suggestion.expectedResultType);
            const resultColor = getResultTypeColor(suggestion.expectedResultType);
            
            return (
              <div
                key={suggestion.id}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSuggestionClick(suggestion.query)}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 flex-1 pr-2">
                    {suggestion.query}
                  </p>
                  <div className="flex items-center space-x-1">
                    {suggestion.popularity > 80 && (
                      <Star className="w-3 h-3 text-yellow-500" />
                    )}
                    <Badge variant={resultColor as any} size="sm">
                      <ResultIcon className="w-3 h-3 mr-1" />
                      {suggestion.expectedResultType}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 mb-2">
                  {suggestion.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <Badge variant="gray" size="sm">
                    {suggestion.category}
                  </Badge>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>{suggestion.popularity}% popular</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-2">Quick Actions:</p>
        <div className="flex flex-wrap gap-1">
          {[
            'Show dashboard',
            'Generate report',
            'Export data',
            'Schedule alert'
          ].map((action, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(action)}
              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

// Default suggestions when no query is entered
const defaultSuggestions: QuerySuggestion[] = [
  {
    id: 'def-1',
    query: 'Show me revenue trends for this year',
    category: 'revenue',
    popularity: 95,
    description: 'Annual revenue performance with monthly breakdown',
    expectedResultType: 'chart'
  },
  {
    id: 'def-2',
    query: 'How many new clients did we acquire this month?',
    category: 'clients',
    popularity: 92,
    description: 'Monthly new client acquisition metrics',
    expectedResultType: 'metric'
  },
  {
    id: 'def-3',
    query: 'What are our key performance indicators?',
    category: 'performance',
    popularity: 89,
    description: 'Complete KPI dashboard overview',
    expectedResultType: 'table'
  },
  {
    id: 'def-4',
    query: 'Show compliance status and any issues',
    category: 'compliance',
    popularity: 86,
    description: 'Current compliance posture with issue highlights',
    expectedResultType: 'insight'
  },
  {
    id: 'def-5',
    query: 'Compare this quarter vs last quarter',
    category: 'general',
    popularity: 83,
    description: 'Quarterly performance comparison analysis',
    expectedResultType: 'chart'
  },
  {
    id: 'def-6',
    query: 'Which services are most profitable?',
    category: 'revenue',
    popularity: 80,
    description: 'Service profitability analysis and ranking',
    expectedResultType: 'table'
  },
  {
    id: 'def-7',
    query: 'Show team performance metrics',
    category: 'performance',
    popularity: 77,
    description: 'Team-by-team performance comparison',
    expectedResultType: 'chart'
  },
  {
    id: 'def-8',
    query: 'What is our client satisfaction score?',
    category: 'clients',
    popularity: 74,
    description: 'Overall client satisfaction metrics and trends',
    expectedResultType: 'metric'
  },
  {
    id: 'def-9',
    query: 'Generate monthly business report',
    category: 'general',
    popularity: 71,
    description: 'Comprehensive monthly business performance report',
    expectedResultType: 'insight'
  },
  {
    id: 'def-10',
    query: 'Show resource utilization rates',
    category: 'performance',
    popularity: 68,
    description: 'Resource allocation and utilization analysis',
    expectedResultType: 'chart'
  }
];