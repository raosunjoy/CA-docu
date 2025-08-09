'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { GitCompare, FileText, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';

interface DocumentAnalysis {
  id: string;
  name: string;
  type: string;
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

interface ComparisonResult {
  similarity: number;
  differences: Array<{
    type: 'content' | 'structure' | 'metadata' | 'compliance';
    description: string;
    severity: 'low' | 'medium' | 'high';
    location?: string;
  }>;
  commonElements: string[];
  recommendations: string[];
}

interface DocumentComparisonToolProps {
  documents: DocumentAnalysis[];
  selectedDocuments: Set<string>;
  onSelectionChange: (selection: Set<string>) => void;
}

export const DocumentComparisonTool: React.FC<DocumentComparisonToolProps> = ({
  documents,
  selectedDocuments,
  onSelectionChange
}) => {
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'diff' | 'insights'>('side-by-side');

  const selectedDocs = Array.from(selectedDocuments)
    .map(id => documents.find(doc => doc.id === id))
    .filter(Boolean) as DocumentAnalysis[];

  useEffect(() => {
    if (selectedDocs.length === 2) {
      performComparison();
    } else {
      setComparisonResult(null);
    }
  }, [selectedDocuments]);

  const performComparison = async () => {
    if (selectedDocs.length !== 2) return;

    setIsComparing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = generateMockComparison(selectedDocs[0], selectedDocs[1]);
      setComparisonResult(result);
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setIsComparing(false);
    }
  };

  const generateMockComparison = (doc1: DocumentAnalysis, doc2: DocumentAnalysis): ComparisonResult => {
    const commonTopics = doc1.aiInsights.keyTopics.filter(topic => 
      doc2.aiInsights.keyTopics.includes(topic)
    );

    const similarity = Math.random() * 0.4 + 0.3; // 30-70% similarity

    return {
      similarity,
      differences: [
        {
          type: 'content',
          description: 'Document structure differs significantly in sections 3-5',
          severity: 'medium',
          location: 'Sections 3-5'
        },
        {
          type: 'compliance',
          description: `Compliance scores vary by ${Math.abs(doc1.aiInsights.complianceScore - doc2.aiInsights.complianceScore)}%`,
          severity: Math.abs(doc1.aiInsights.complianceScore - doc2.aiInsights.complianceScore) > 20 ? 'high' : 'low'
        },
        {
          type: 'metadata',
          description: 'Different document formats and creation dates',
          severity: 'low'
        }
      ],
      commonElements: commonTopics,
      recommendations: [
        'Consider standardizing document structure for consistency',
        'Review compliance requirements for both document types',
        'Implement version control for better document tracking'
      ]
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity > 0.7) return 'green';
    if (similarity > 0.4) return 'yellow';
    return 'red';
  };

  if (selectedDocs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <GitCompare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Documents to Compare</h3>
        <p className="text-gray-600 mb-4">
          Choose exactly 2 documents from the analysis view to perform AI-powered comparison
        </p>
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Content Analysis</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Visual Diff</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>AI Insights</span>
          </div>
        </div>
      </Card>
    );
  }

  if (selectedDocs.length === 1) {
    return (
      <Card className="p-8 text-center">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <GitCompare className="w-6 h-6 text-gray-400" />
          <div className="p-3 bg-gray-100 rounded-lg">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select One More Document</h3>
        <p className="text-gray-600">
          You've selected "{selectedDocs[0].name}". Choose one more document to compare.
        </p>
      </Card>
    );
  }

  if (selectedDocs.length > 2) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Too Many Documents Selected</h3>
        <p className="text-gray-600 mb-4">
          Please select exactly 2 documents for comparison. You currently have {selectedDocs.length} selected.
        </p>
        <button
          onClick={() => onSelectionChange(new Set())}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Clear Selection
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparison Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-medium text-gray-900 truncate max-w-48">
              {selectedDocs[0].name}
            </span>
          </div>
          
          <GitCompare className="w-5 h-5 text-gray-400" />
          
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <span className="font-medium text-gray-900 truncate max-w-48">
              {selectedDocs[1].name}
            </span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center space-x-1">
          {[
            { id: 'side-by-side', label: 'Side by Side' },
            { id: 'diff', label: 'Visual Diff' },
            { id: 'insights', label: 'AI Insights' }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setComparisonMode(mode.id as any)}
              className={`px-3 py-1 text-sm rounded ${
                comparisonMode === mode.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isComparing && (
        <Card className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis in Progress</h3>
          <p className="text-gray-600">
            Comparing documents using advanced AI algorithms...
          </p>
        </Card>
      )}

      {/* Comparison Results */}
      {comparisonResult && !isComparing && (
        <>
          {/* Similarity Score */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Similarity Analysis</h3>
              <Badge variant={getSimilarityColor(comparisonResult.similarity) as any}>
                {Math.round(comparisonResult.similarity * 100)}% Similar
              </Badge>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className={`h-3 rounded-full bg-${getSimilarityColor(comparisonResult.similarity)}-500`}
                style={{ width: `${comparisonResult.similarity * 100}%` }}
              ></div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {comparisonResult.differences.length}
                </p>
                <p className="text-sm text-gray-600">Differences Found</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {comparisonResult.commonElements.length}
                </p>
                <p className="text-sm text-gray-600">Common Elements</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {comparisonResult.recommendations.length}
                </p>
                <p className="text-sm text-gray-600">Recommendations</p>
              </div>
            </div>
          </Card>

          {comparisonMode === 'side-by-side' && (
            <div className="grid md:grid-cols-2 gap-6">
              {selectedDocs.map((doc, index) => (
                <Card key={doc.id} className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-2 ${index === 0 ? 'bg-blue-100' : 'bg-purple-100'} rounded-lg`}>
                      <FileText className={`w-5 h-5 ${index === 0 ? 'text-blue-600' : 'text-purple-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                      <p className="text-sm text-gray-600">Document {index + 1}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">AI Insights</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Sentiment:</span>
                          <Badge variant={doc.aiInsights.sentiment === 'positive' ? 'green' : 
                                        doc.aiInsights.sentiment === 'negative' ? 'red' : 'gray'} size="sm">
                            {doc.aiInsights.sentiment}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Risk Level:</span>
                          <Badge variant={doc.aiInsights.riskLevel === 'low' ? 'green' : 
                                        doc.aiInsights.riskLevel === 'high' ? 'red' : 'yellow'} size="sm">
                            {doc.aiInsights.riskLevel}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Compliance:</span>
                          <span className="text-sm font-medium">{doc.aiInsights.complianceScore}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Key Topics</p>
                      <div className="flex flex-wrap gap-1">
                        {doc.aiInsights.keyTopics.map((topic, topicIndex) => (
                          <Badge key={topicIndex} variant="gray" size="sm">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {comparisonMode === 'diff' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Differences</h3>
              <div className="space-y-4">
                {comparisonResult.differences.map((diff, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <div className={`p-1 rounded-full bg-${getSeverityColor(diff.severity)}-100`}>
                      {diff.severity === 'high' ? (
                        <XCircle className={`w-4 h-4 text-${getSeverityColor(diff.severity)}-600`} />
                      ) : (
                        <AlertTriangle className={`w-4 h-4 text-${getSeverityColor(diff.severity)}-600`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant={getSeverityColor(diff.severity) as any} size="sm">
                          {diff.severity} severity
                        </Badge>
                        <Badge variant="gray" size="sm">
                          {diff.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-900">{diff.description}</p>
                      {diff.location && (
                        <p className="text-xs text-gray-500 mt-1">Location: {diff.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {comparisonMode === 'insights' && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Common Elements</span>
                </h3>
                <div className="space-y-2">
                  {comparisonResult.commonElements.map((element, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-900">{element}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span>AI Recommendations</span>
                </h3>
                <div className="space-y-3">
                  {comparisonResult.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">{rec}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};