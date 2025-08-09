'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Eye, BarChart3 } from 'lucide-react';

interface DocumentAnalysis {
  id: string;
  name: string;
  aiInsights: {
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    keyTopics: string[];
    riskLevel: 'low' | 'medium' | 'high';
    complianceScore: number;
    extractedEntities: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
  };
}

interface AIInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'recommendation' | 'trend';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  relatedDocuments: string[];
}

interface AIInsightsPanelProps {
  selectedDocuments: DocumentAnalysis[];
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  selectedDocuments
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedInsightType, setSelectedInsightType] = useState<'all' | 'pattern' | 'anomaly' | 'recommendation' | 'trend'>('all');

  useEffect(() => {
    if (selectedDocuments.length > 0) {
      generateInsights();
    } else {
      setInsights([]);
    }
  }, [selectedDocuments]);

  const generateInsights = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const generatedInsights = generateMockInsights(selectedDocuments);
    setInsights(generatedInsights);
    setIsAnalyzing(false);
  };

  const generateMockInsights = (documents: DocumentAnalysis[]): AIInsight[] => {
    if (documents.length === 0) return [];

    const insights: AIInsight[] = [];
    
    // Pattern insights
    const commonTopics = findCommonTopics(documents);
    if (commonTopics.length > 0) {
      insights.push({
        id: 'pattern-1',
        type: 'pattern',
        title: 'Common Topic Pattern Detected',
        description: `${commonTopics.length} documents share common topics: ${commonTopics.slice(0, 3).join(', ')}. This suggests a thematic relationship that could indicate coordinated business activities.`,
        confidence: 0.87,
        impact: 'medium',
        actionable: true,
        relatedDocuments: documents.map(d => d.id)
      });
    }

    // Risk analysis
    const highRiskDocs = documents.filter(d => d.aiInsights.riskLevel === 'high');
    if (highRiskDocs.length > 0) {
      insights.push({
        id: 'anomaly-1',
        type: 'anomaly',
        title: 'High Risk Documents Identified',
        description: `${highRiskDocs.length} document(s) flagged as high risk. Immediate review recommended to assess potential compliance or operational issues.`,
        confidence: 0.94,
        impact: 'high',
        actionable: true,
        relatedDocuments: highRiskDocs.map(d => d.id)
      });
    }

    // Compliance insights
    const avgCompliance = documents.reduce((sum, doc) => sum + doc.aiInsights.complianceScore, 0) / documents.length;
    if (avgCompliance < 80) {
      insights.push({
        id: 'recommendation-1',
        type: 'recommendation',
        title: 'Compliance Score Below Threshold',
        description: `Average compliance score of ${Math.round(avgCompliance)}% is below the recommended 80% threshold. Consider reviewing document standards and compliance procedures.`,
        confidence: 0.91,
        impact: 'high',
        actionable: true,
        relatedDocuments: documents.filter(d => d.aiInsights.complianceScore < 80).map(d => d.id)
      });
    }

    // Sentiment analysis
    const sentiments = documents.map(d => d.aiInsights.sentiment);
    const negativeSentiments = sentiments.filter(s => s === 'negative').length;
    if (negativeSentiments > documents.length * 0.3) {
      insights.push({
        id: 'trend-1',
        type: 'trend',
        title: 'Negative Sentiment Trend',
        description: `${Math.round((negativeSentiments / documents.length) * 100)}% of documents show negative sentiment. This could indicate emerging issues or concerns that require attention.`,
        confidence: 0.83,
        impact: 'medium',
        actionable: true,
        relatedDocuments: documents.filter(d => d.aiInsights.sentiment === 'negative').map(d => d.id)
      });
    }

    // Entity extraction insights
    const allEntities = documents.flatMap(d => d.aiInsights.extractedEntities);
    const entityTypes = [...new Set(allEntities.map(e => e.type))];
    if (entityTypes.length > 5) {
      insights.push({
        id: 'pattern-2',
        type: 'pattern',
        title: 'Rich Entity Diversity',
        description: `Documents contain ${entityTypes.length} different entity types including ${entityTypes.slice(0, 3).join(', ')}. This indicates comprehensive business documentation.`,
        confidence: 0.76,
        impact: 'low',
        actionable: false,
        relatedDocuments: documents.map(d => d.id)
      });
    }

    return insights;
  };

  const findCommonTopics = (documents: DocumentAnalysis[]): string[] => {
    const topicCounts: { [key: string]: number } = {};
    
    documents.forEach(doc => {
      doc.aiInsights.keyTopics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    return Object.entries(topicCounts)
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .map(([topic, _]) => topic);
  };

  const filteredInsights = selectedInsightType === 'all' 
    ? insights 
    : insights.filter(insight => insight.type === selectedInsightType);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return BarChart3;
      case 'anomaly': return AlertTriangle;
      case 'recommendation': return CheckCircle;
      case 'trend': return TrendingUp;
      default: return Brain;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern': return 'blue';
      case 'anomaly': return 'red';
      case 'recommendation': return 'green';
      case 'trend': return 'purple';
      default: return 'gray';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  if (selectedDocuments.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Insights</h3>
        <p className="text-gray-600 text-sm">
          Select documents to generate AI-powered insights and recommendations
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <span>AI Insights</span>
          </h3>
          <Badge variant="purple" size="sm">
            {selectedDocuments.length} docs
          </Badge>
        </div>

        {/* Insight Type Filter */}
        <div className="flex flex-wrap gap-1 mb-4">
          {[
            { value: 'all', label: 'All' },
            { value: 'pattern', label: 'Patterns' },
            { value: 'anomaly', label: 'Anomalies' },
            { value: 'recommendation', label: 'Recommendations' },
            { value: 'trend', label: 'Trends' }
          ].map(type => (
            <button
              key={type.value}
              onClick={() => setSelectedInsightType(type.value as any)}
              className={`px-2 py-1 text-xs rounded ${
                selectedInsightType === type.value
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isAnalyzing && (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Analyzing documents...</p>
          </div>
        )}

        {/* Insights List */}
        {!isAnalyzing && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredInsights.length === 0 ? (
              <div className="text-center py-4">
                <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  No {selectedInsightType === 'all' ? '' : selectedInsightType} insights found
                </p>
              </div>
            ) : (
              filteredInsights.map((insight) => {
                const Icon = getInsightIcon(insight.type);
                const typeColor = getInsightColor(insight.type);
                const impactColor = getImpactColor(insight.impact);
                
                return (
                  <div key={insight.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className={`p-1 bg-${typeColor}-100 rounded`}>
                        <Icon className={`w-4 h-4 text-${typeColor}-600`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {insight.title}
                          </h4>
                          <div className="flex items-center space-x-1">
                            <Badge variant={impactColor as any} size="sm">
                              {insight.impact}
                            </Badge>
                            {insight.actionable && (
                              <Badge variant="green" size="sm">
                                Actionable
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2">
                          {insight.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>Confidence: {Math.round(insight.confidence * 100)}%</span>
                            <span>•</span>
                            <span>{insight.relatedDocuments.length} docs</span>
                          </div>
                          
                          <Badge variant={typeColor as any} size="sm">
                            {insight.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

      {/* Summary Stats */}
      {selectedDocuments.length > 0 && !isAnalyzing && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Analysis Summary</h4>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 bg-blue-50 rounded">
              <p className="text-lg font-semibold text-blue-900">
                {Math.round(selectedDocuments.reduce((sum, doc) => sum + doc.aiInsights.confidence, 0) / selectedDocuments.length * 100)}%
              </p>
              <p className="text-xs text-blue-700">Avg Confidence</p>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <p className="text-lg font-semibold text-green-900">
                {Math.round(selectedDocuments.reduce((sum, doc) => sum + doc.aiInsights.complianceScore, 0) / selectedDocuments.length)}%
              </p>
              <p className="text-xs text-green-700">Avg Compliance</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded">
              <p className="text-lg font-semibold text-yellow-900">
                {selectedDocuments.filter(doc => doc.aiInsights.riskLevel === 'high').length}
              </p>
              <p className="text-xs text-yellow-700">High Risk</p>
            </div>
            <div className="p-2 bg-purple-50 rounded">
              <p className="text-lg font-semibold text-purple-900">
                {insights.filter(i => i.actionable).length}
              </p>
              <p className="text-xs text-purple-700">Actionable</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};