'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { QuerySuggestionSystem } from './QuerySuggestionSystem';
import { QueryResultVisualization } from './QueryResultVisualization';
import { QueryHistoryManager } from './QueryHistoryManager';
import { 
  Search, 
  Send, 
  Mic, 
  MicOff, 
  Brain, 
  Sparkles, 
  Clock, 
  BookOpen,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Lightbulb
} from 'lucide-react';

interface QueryResult {
  id: string;
  query: string;
  timestamp: string;
  results: {
    type: 'chart' | 'table' | 'metric' | 'insight';
    data: any;
    visualization?: any;
    explanation: string;
    confidence: number;
  };
  suggestions: string[];
  executionTime: number;
}

interface QueryHistory {
  id: string;
  query: string;
  timestamp: string;
  resultType: string;
  saved: boolean;
}

export const NaturalLanguageQueryInterface: React.FC = () => {
  const [currentQuery, setCurrentQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedResult, setSelectedResult] = useState<QueryResult | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load query history
    loadQueryHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [queryResults]);

  const loadQueryHistory = async () => {
    try {
      const response = await fetch('/api/natural-language-query/history');
      const data = await response.json();
      setQueryHistory(data.history || mockHistory);
    } catch (error) {
      console.error('Failed to load query history:', error);
      setQueryHistory(mockHistory);
    }
  };

  const scrollToBottom = () => {
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const processQuery = async (query: string) => {
    if (!query.trim()) return;

    setIsProcessing(true);
    setShowSuggestions(false);
    
    const startTime = Date.now();
    
    try {
      // Simulate API call to natural language processing service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await generateQueryResult(query);
      const executionTime = Date.now() - startTime;
      
      const queryResult: QueryResult = {
        ...result,
        executionTime
      };
      
      setQueryResults(prev => [...prev, queryResult]);
      
      // Add to history
      const historyItem: QueryHistory = {
        id: Date.now().toString(),
        query,
        timestamp: new Date().toISOString(),
        resultType: result.results.type,
        saved: false
      };
      
      setQueryHistory(prev => [historyItem, ...prev.slice(0, 19)]); // Keep last 20
      
    } catch (error) {
      console.error('Query processing failed:', error);
    } finally {
      setIsProcessing(false);
      setCurrentQuery('');
    }
  };

  const generateQueryResult = async (query: string): Promise<Omit<QueryResult, 'executionTime'>> => {
    const lowerQuery = query.toLowerCase();
    
    // Revenue-related queries
    if (lowerQuery.includes('revenue') || lowerQuery.includes('sales')) {
      return {
        id: Date.now().toString(),
        query,
        timestamp: new Date().toISOString(),
        results: {
          type: 'chart',
          data: {
            chartType: 'line',
            chartData: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                label: 'Revenue',
                data: [45000, 52000, 48000, 61000, 55000, 67000],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
              }]
            }
          },
          explanation: 'Revenue has shown a positive trend over the past 6 months, with a notable spike in April. The overall growth rate is 12% compared to the previous period.',
          confidence: 0.94
        },
        suggestions: [
          'Show revenue by service type',
          'Compare with last year',
          'What factors drove the April spike?',
          'Forecast next quarter revenue'
        ]
      };
    }
    
    // Client-related queries
    if (lowerQuery.includes('client') || lowerQuery.includes('customer')) {
      return {
        id: Date.now().toString(),
        query,
        timestamp: new Date().toISOString(),
        results: {
          type: 'metric',
          data: {
            value: 245,
            change: 18,
            trend: 'up',
            breakdown: [
              { label: 'New Clients', value: 45, change: 25 },
              { label: 'Retained Clients', value: 200, change: 15 }
            ]
          },
          explanation: 'Client base has grown by 18% this quarter. New client acquisition is particularly strong at 25% growth, while retention remains solid at 15% growth.',
          confidence: 0.89
        },
        suggestions: [
          'Show client satisfaction scores',
          'Which services attract most new clients?',
          'Client retention by service type',
          'Top performing client segments'
        ]
      };
    }
    
    // Performance queries
    if (lowerQuery.includes('performance') || lowerQuery.includes('kpi')) {
      return {
        id: Date.now().toString(),
        query,
        timestamp: new Date().toISOString(),
        results: {
          type: 'table',
          data: {
            headers: ['Metric', 'Current', 'Target', 'Status'],
            rows: [
              ['Client Satisfaction', '4.8/5', '4.5/5', 'Exceeding'],
              ['Project Delivery', '92%', '90%', 'On Track'],
              ['Resource Utilization', '78%', '80%', 'Below Target'],
              ['Quality Score', '94%', '90%', 'Exceeding']
            ]
          },
          explanation: 'Overall performance is strong with 3 out of 4 KPIs meeting or exceeding targets. Resource utilization is slightly below target but within acceptable range.',
          confidence: 0.91
        },
        suggestions: [
          'Why is resource utilization below target?',
          'Show performance trends over time',
          'Compare team performance',
          'What drives high client satisfaction?'
        ]
      };
    }
    
    // Compliance queries
    if (lowerQuery.includes('compliance') || lowerQuery.includes('audit')) {
      return {
        id: Date.now().toString(),
        query,
        timestamp: new Date().toISOString(),
        results: {
          type: 'insight',
          data: {
            insights: [
              'Compliance score improved 12% this quarter to 87%',
              '3 critical items require immediate attention',
              'Document retention policies need updating by Q2',
              'Staff training completion rate increased 15%'
            ],
            riskLevel: 'medium',
            actionItems: [
              'Review overdue compliance items',
              'Update document retention policies',
              'Schedule additional staff training'
            ]
          },
          explanation: 'Compliance posture is improving but requires attention in specific areas. The upward trend is positive, but immediate action is needed on critical items.',
          confidence: 0.86
        },
        suggestions: [
          'Show compliance trends',
          'List overdue compliance items',
          'Compare with industry standards',
          'Generate compliance report'
        ]
      };
    }
    
    // Default response for unrecognized queries
    return {
      id: Date.now().toString(),
      query,
      timestamp: new Date().toISOString(),
      results: {
        type: 'insight',
        data: {
          insights: [
            'I understand you\'re looking for information about your business data',
            'Try asking about revenue, clients, performance, or compliance',
            'You can also ask for specific time periods or comparisons'
          ],
          suggestions: [
            'Show me revenue trends',
            'How many clients do we have?',
            'What is our performance this quarter?',
            'Generate a compliance report'
          ]
        },
        explanation: 'I can help you analyze your business data using natural language. Try asking specific questions about revenue, clients, performance, or compliance.',
        confidence: 0.75
      },
      suggestions: [
        'Show revenue trends for this year',
        'How many new clients this month?',
        'What are our key performance indicators?',
        'Show compliance status'
      ]
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processQuery(currentQuery);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentQuery(suggestion);
    inputRef.current?.focus();
  };

  const handleVoiceInput = (transcript: string) => {
    if (transcript) {
      processQuery(transcript);
    }
  };

  const saveQuery = (queryId: string) => {
    setQueryHistory(prev => prev.map(item => 
      item.id === queryId ? { ...item, saved: true } : item
    ));
  };

  const popularQueries = [
    'Show me revenue trends for this year',
    'How many new clients did we acquire this month?',
    'What is our team performance this quarter?',
    'Show compliance status and any issues',
    'Compare this year vs last year revenue',
    'Which services are most profitable?'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <span>Natural Language Query</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Ask questions about your data in plain English and get intelligent insights
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="blue" className="animate-pulse">
            AI-Powered
          </Badge>
          <Badge variant="green">
            {queryHistory.length} Queries
          </Badge>
        </div>
      </div>

      {/* Query Input */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                ref={inputRef}
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                placeholder="Ask me anything about your business data..."
                className="pl-12 pr-16 text-lg"
                disabled={isProcessing}
              />
              <button
                type="button"
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className={`absolute right-12 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
                  isVoiceMode 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isVoiceMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
            </div>
            
            <button
              type="submit"
              disabled={!currentQuery.trim() || isProcessing}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Ask</span>
                </>
              )}
            </button>
          </div>
          
          {/* Voice Input */}
          {isVoiceMode && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Mic className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">Voice input active</span>
              </div>
              <p className="text-sm text-blue-700 text-center">
                Speak your question clearly and I'll process it for you
              </p>
            </div>
          )}
        </form>
      </Card>

      {/* Main Content */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Query Results */}
        <div className="lg:col-span-3 space-y-4">
          {queryResults.length === 0 && !isProcessing && showSuggestions && (
            <Card className="p-8 text-center">
              <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ask me anything about your data
              </h3>
              <p className="text-gray-600 mb-6">
                I can help you analyze revenue, clients, performance, compliance, and more using natural language
              </p>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Popular questions:</h4>
                <div className="flex flex-wrap gap-2 justify-center">
                  {popularQueries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(query)}
                      className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <Card className="p-6">
              <div className="flex items-center space-x-4">
                <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
                <div>
                  <p className="font-medium text-gray-900">Processing your query...</p>
                  <p className="text-sm text-gray-600">Analyzing data and generating insights</p>
                </div>
              </div>
            </Card>
          )}

          {/* Query Results */}
          {queryResults.map((result) => (
            <Card key={result.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">You asked:</span>
                  </div>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{result.query}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Badge variant="blue" size="sm">
                    {Math.round(result.results.confidence * 100)}% confident
                  </Badge>
                  <Badge variant="gray" size="sm">
                    {result.executionTime}ms
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Brain className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">AI Analysis:</p>
                    <p className="text-gray-700">{result.results.explanation}</p>
                  </div>
                </div>

                {/* Result Visualization */}
                <QueryResultVisualization result={result.results} />

                {/* Suggestions */}
                {result.suggestions.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-700">Follow-up questions:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-1 text-sm bg-yellow-50 text-yellow-700 rounded-full hover:bg-yellow-100 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
          
          <div ref={resultsEndRef} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Query Suggestions */}
          <QuerySuggestionSystem 
            onSuggestionClick={handleSuggestionClick}
            currentQuery={currentQuery}
          />

          {/* Query History */}
          <QueryHistoryManager 
            history={queryHistory}
            onQuerySelect={handleSuggestionClick}
            onSaveQuery={saveQuery}
          />

          {/* Quick Stats */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Query Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Queries:</span>
                <span className="text-sm font-medium">{queryHistory.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Saved Queries:</span>
                <span className="text-sm font-medium">
                  {queryHistory.filter(q => q.saved).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Response:</span>
                <span className="text-sm font-medium">
                  {queryResults.length > 0 
                    ? Math.round(queryResults.reduce((sum, r) => sum + r.executionTime, 0) / queryResults.length)
                    : 0}ms
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Mock data for development
const mockHistory: QueryHistory[] = [
  {
    id: '1',
    query: 'Show me revenue trends for this year',
    timestamp: '2024-01-15T10:30:00Z',
    resultType: 'chart',
    saved: true
  },
  {
    id: '2',
    query: 'How many new clients this month?',
    timestamp: '2024-01-15T09:45:00Z',
    resultType: 'metric',
    saved: false
  },
  {
    id: '3',
    query: 'What is our compliance status?',
    timestamp: '2024-01-14T16:20:00Z',
    resultType: 'insight',
    saved: true
  }
];