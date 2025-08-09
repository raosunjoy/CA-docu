'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Send, 
  Mic, 
  MicOff, 
  Search, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Brain,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  Zap,
  Target
} from 'lucide-react'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts'

interface NLQueryResult {
  requestId: string
  queryId: string
  naturalLanguageQuery: string
  interpretedQuery: {
    intent: {
      primaryAction: string
      secondaryActions: string[]
      complexity: string
      confidence: number
    }
    entities: Array<{
      entity: string
      type: string
      value: string
      confidence: number
    }>
    metrics: string[]
    dimensions: string[]
    filters: Record<string, any>
    timeframe: {
      start: Date
      end: Date
      period: string
    }
    sorting: Array<{
      field: string
      direction: string
    }>
    limits: {
      maxResults: number
    }
    confidence: number
    ambiguities: Array<{
      type: string
      description: string
      options: string[]
      recommendation: string
    }>
  }
  executionResults: {
    data: any[]
    totalRows: number
    executedQueries: Array<{
      query: string
      queryType: string
      executionTime: number
      rowsAffected: number
    }>
    aggregations: Record<string, number>
    metadata: {
      dataSource: string
      queryOptimized: boolean
      cacheHit: boolean
    }
  }
  insights: Array<{
    id: string
    type: string
    title: string
    description: string
    significance: string
    confidence: number
    impact: {
      level: string
      description: string
      business: string
    }
    evidence: {
      statisticalTests: string[]
      dataPoints: number
      confidenceInterval: [number, number]
    }
    actionable: boolean
  }>
  recommendations: Array<{
    id: string
    type: string
    title: string
    description: string
    priority: string
    effort: string
    suggestedQuery?: string
    reasoning: string
    expectedBenefit: string
  }>
  visualizations: Array<{
    id: string
    type: string
    title: string
    description: string
    data: any[]
    config: {
      xAxis: string
      yAxis: string
      colorScheme: string[]
    }
    priority: number
  }>
  narrative: {
    summary: string
    keyFindings: string[]
    explanation: string
    limitations: string[]
    confidence: number
  }
  executionMetadata: {
    processingTime: number
    confidenceScore: number
    dataPointsAnalyzed: number
    cachedResults: boolean
  }
}

interface QuerySuggestion {
  query: string
  category: string
  description: string
  complexity: string
  estimatedExecutionTime: number
  expectedInsights: string[]
}

const NaturalLanguageQueryInterface: React.FC = () => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [currentResult, setCurrentResult] = useState<NLQueryResult | null>(null)
  const [queryHistory, setQueryHistory] = useState<NLQueryResult[]>([])
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sessionId] = useState(`session_${Date.now()}`)
  const [activeTab, setActiveTab] = useState('query')
  
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    // Load initial suggestions
    loadQuerySuggestions()
  }, [])

  const loadQuerySuggestions = async () => {
    try {
      const response = await fetch('/api/nl-analytics?action=get_query_suggestions&userRole=MANAGER&currentFocus=FINANCIAL_ANALYSIS')
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }

  const handleVoiceInput = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleSubmitQuery = async () => {
    if (!query.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/nl-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_query',
          query: query.trim(),
          sessionId,
          context: {
            userRole: 'MANAGER',
            dataScope: ['financial', 'operational', 'client'],
            timeframe: {
              start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Last 6 months
              end: new Date()
            }
          },
          preferences: {
            responseFormat: 'STRUCTURED',
            includeCharts: true,
            includeRecommendations: true,
            detailLevel: 'DETAILED',
            confidenceThreshold: 0.7
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process query')
      }

      const data = await response.json()
      const result = data.result as NLQueryResult
      
      setCurrentResult(result)
      setQueryHistory(prev => [result, ...prev.slice(0, 9)]) // Keep last 10 queries
      setQuery('')

      // Switch to results tab
      setActiveTab('results')

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: QuerySuggestion) => {
    setQuery(suggestion.query)
    inputRef.current?.focus()
  }

  const renderVisualization = (viz: any) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff']

    switch (viz.type) {
      case 'LINE_CHART':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={viz.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={viz.config.xAxis} />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey={viz.config.yAxis} 
                stroke={colors[0]} 
                strokeWidth={2}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        )
      
      case 'BAR_CHART':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={viz.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={viz.config.xAxis} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={viz.config.yAxis} fill={colors[1]} />
            </BarChart>
          </ResponsiveContainer>
        )
      
      case 'PIE_CHART':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Tooltip />
              <RechartsPieChart data={viz.data} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                {viz.data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </RechartsPieChart>
            </RechartsPieChart>
          </ResponsiveContainer>
        )
      
      default:
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Visualization: {viz.type}</p>
            <p className="text-xs text-gray-500">{viz.description}</p>
          </div>
        )
    }
  }

  const getIntentIcon = (intent: string) => {
    switch (intent.toLowerCase()) {
      case 'analyze': return <BarChart3 className="h-4 w-4" />
      case 'compare': return <TrendingUp className="h-4 w-4" />
      case 'trend': return <LineChart className="h-4 w-4" />
      case 'forecast': return <Target className="h-4 w-4" />
      case 'summarize': return <PieChart className="h-4 w-4" />
      default: return <Search className="h-4 w-4" />
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'trend': return <TrendingUp className="h-4 w-4" />
      case 'anomaly': return <AlertTriangle className="h-4 w-4" />
      case 'pattern': return <Sparkles className="h-4 w-4" />
      case 'correlation': return <Zap className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <CardTitle>Natural Language Analytics</CardTitle>
          </div>
          <CardDescription>
            Ask questions about your data in plain English and get instant insights with visualizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Ask me anything about your business data... e.g., 'What was our revenue trend last quarter?'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitQuery()}
                disabled={isLoading}
                className="pr-12"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1 h-8 w-8"
                onClick={handleVoiceInput}
                disabled={isLoading}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button 
              onClick={handleSubmitQuery} 
              disabled={isLoading || !query.trim()}
              className="shrink-0"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {error && (
            <Alert className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isListening && (
            <Alert className="mb-4">
              <Mic className="h-4 w-4" />
              <AlertDescription>Listening... Speak your question now.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="query">Query Assistant</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5" />
                  <span>Query Suggestions</span>
                </CardTitle>
                <CardDescription>Try these sample queries to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-sm">{suggestion.query}</p>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.complexity}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{suggestion.description}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{suggestion.estimatedExecutionTime}s</span>
                          <Separator orientation="vertical" className="h-3" />
                          <span>{suggestion.expectedInsights.length} insights</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5" />
                  <span>Query Tips</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">What you can ask:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Revenue trends and forecasts</li>
                    <li>• Team productivity metrics</li>
                    <li>• Client analysis and satisfaction</li>
                    <li>• Project completion rates</li>
                    <li>• Compliance status</li>
                    <li>• Financial comparisons</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Example phrases:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• "Show me..." / "What is..."</li>
                    <li>• "Compare this quarter vs last quarter"</li>
                    <li>• "Predict next month's revenue"</li>
                    <li>• "Which team performs best?"</li>
                    <li>• "Find patterns in client data"</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Time ranges:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• "last week/month/quarter/year"</li>
                    <li>• "this quarter vs previous quarter"</li>
                    <li>• "over the past 6 months"</li>
                    <li>• "year-to-date performance"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {currentResult ? (
            <div className="space-y-6">
              {/* Query Interpretation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getIntentIcon(currentResult.interpretedQuery.intent.primaryAction)}
                    <span>Query Understanding</span>
                    <Badge variant="outline">
                      {Math.round(currentResult.interpretedQuery.confidence * 100)}% confidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Intent</h4>
                      <Badge className="mb-2">{currentResult.interpretedQuery.intent.primaryAction}</Badge>
                      <p className="text-sm text-gray-600">{currentResult.interpretedQuery.intent.complexity} complexity</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Metrics</h4>
                      <div className="space-y-1">
                        {currentResult.interpretedQuery.metrics.map((metric, index) => (
                          <Badge key={index} variant="secondary">{metric}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Time Period</h4>
                      <p className="text-sm">{currentResult.interpretedQuery.timeframe.period}</p>
                    </div>
                  </div>
                  
                  {currentResult.interpretedQuery.ambiguities.length > 0 && (
                    <div className="mt-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Clarifications:</strong>
                          <ul className="mt-1 space-y-1">
                            {currentResult.interpretedQuery.ambiguities.map((amb, index) => (
                              <li key={index} className="text-sm">• {amb.description}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Narrative Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5" />
                    <span>Executive Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-base">{currentResult.narrative.summary}</p>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Key Findings:</h4>
                      <ul className="space-y-1">
                        {currentResult.narrative.keyFindings.map((finding, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Target className="h-4 w-4" />
                        <span>Confidence: {Math.round(currentResult.narrative.confidence * 100)}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-4 w-4" />
                        <span>{currentResult.executionMetadata.dataPointsAnalyzed} data points</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{currentResult.executionMetadata.processingTime}ms</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visualizations */}
              {currentResult.visualizations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Data Visualizations</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {currentResult.visualizations
                        .sort((a, b) => b.priority - a.priority)
                        .map((viz, index) => (
                        <div key={index} className="space-y-3">
                          <div>
                            <h4 className="font-semibold">{viz.title}</h4>
                            <p className="text-sm text-gray-600">{viz.description}</p>
                          </div>
                          {renderVisualization(viz)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Table */}
              {currentResult.executionResults.data.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Table className="h-5 w-5" />
                      <span>Raw Data</span>
                      <Badge variant="outline">
                        {currentResult.executionResults.totalRows} rows
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {Object.keys(currentResult.executionResults.data[0] || {}).map((key) => (
                                <th key={key} className="text-left p-2 font-medium">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentResult.executionResults.data.slice(0, 50).map((row, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                {Object.values(row).map((value, valueIndex) => (
                                  <td key={valueIndex} className="p-2">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                <p className="text-gray-600">Submit a query to see your analytics results here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {currentResult?.insights.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {currentResult.insights.map((insight, index) => (
                <Card key={index} className="relative">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {getInsightIcon(insight.type)}
                      <span>{insight.title}</span>
                      <Badge 
                        variant={insight.significance === 'CRITICAL' ? 'destructive' : 
                               insight.significance === 'HIGH' ? 'default' : 'secondary'}
                      >
                        {insight.significance}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{insight.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Confidence:</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={insight.confidence * 100} className="flex-1" />
                          <span>{Math.round(insight.confidence * 100)}%</span>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Impact:</span>
                        <Badge variant="outline" className="ml-2">{insight.impact.level}</Badge>
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-sm">Business Impact:</span>
                      <p className="text-sm text-gray-600 mt-1">{insight.impact.business}</p>
                    </div>

                    {insight.actionable && (
                      <Badge className="absolute top-2 right-2">
                        Actionable
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Insights Available</h3>
                <p className="text-gray-600">Submit a query to generate AI-powered insights</p>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {currentResult?.recommendations.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentResult.recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{rec.title}</h4>
                        <div className="flex space-x-2">
                          <Badge variant={rec.priority === 'HIGH' ? 'destructive' : 
                                         rec.priority === 'MEDIUM' ? 'default' : 'secondary'}>
                            {rec.priority}
                          </Badge>
                          <Badge variant="outline">{rec.effort} effort</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-medium">Reasoning:</span>
                          <p className="text-gray-600 mt-1">{rec.reasoning}</p>
                        </div>
                        <div>
                          <span className="font-medium">Expected Benefit:</span>
                          <p className="text-gray-600 mt-1">{rec.expectedBenefit}</p>
                        </div>
                      </div>
                      {rec.suggestedQuery && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setQuery(rec.suggestedQuery!)
                              setActiveTab('query')
                            }}
                          >
                            Try Suggested Query
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {queryHistory.length > 0 ? (
            <div className="space-y-4">
              {queryHistory.map((result, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setCurrentResult(result)
                        setActiveTab('results')
                      }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{result.naturalLanguageQuery}</p>
                      <Badge variant="outline" className="ml-2">
                        {Math.round(result.executionMetadata.confidenceScore * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{result.executionMetadata.processingTime}ms</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-3 w-3" />
                        <span>{result.insights.length} insights</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span>{result.recommendations.length} recommendations</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Query History</h3>
                <p className="text-gray-600">Your previous queries will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NaturalLanguageQueryInterface