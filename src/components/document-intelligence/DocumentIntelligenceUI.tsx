'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { DocumentComparisonTool } from './DocumentComparisonTool';
import { BatchDocumentProcessor } from './BatchDocumentProcessor';
import { DocumentWorkflowAutomation } from './DocumentWorkflowAutomation';
import { AIInsightsPanel } from './AIInsightsPanel';
import { 
  FileText, 
  Brain, 
  Search, 
  Filter, 
  Upload, 
  BarChart3,
  Zap,
  Eye,
  GitCompare,
  Workflow
} from 'lucide-react';

interface DocumentAnalysis {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
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
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
}

export const DocumentIntelligenceUI: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentAnalysis[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'analysis' | 'comparison' | 'batch' | 'workflow'>('analysis');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'high-risk' | 'pending' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/documents/intelligence');
      const data = await response.json();
      setDocuments(data.documents || mockDocuments);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments(mockDocuments);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.aiInsights.keyTopics.some(topic => 
                           topic.toLowerCase().includes(searchQuery.toLowerCase())
                         );
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'high-risk' && doc.aiInsights.riskLevel === 'high') ||
                         (filterType === 'pending' && doc.processingStatus === 'pending') ||
                         (filterType === 'completed' && doc.processingStatus === 'completed');
    
    return matchesSearch && matchesFilter;
  });

  const toggleDocumentSelection = (docId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocuments(newSelection);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'processing': return 'blue';
      case 'pending': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  const views = [
    { id: 'analysis', label: 'AI Analysis', icon: Brain },
    { id: 'comparison', label: 'Compare', icon: GitCompare },
    { id: 'batch', label: 'Batch Process', icon: Upload },
    { id: 'workflow', label: 'Automation', icon: Workflow }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Brain className="w-6 h-6 text-purple-600" />
            <span>Document Intelligence</span>
          </h1>
          <p className="text-gray-600 mt-1">AI-powered document analysis and insights</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="purple" className="animate-pulse">
            AI Processing
          </Badge>
          <Badge variant="blue">
            {documents.length} Documents
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* View Selector */}
        <div className="flex items-center space-x-1">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === view.id
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{view.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-10 w-64"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Documents</option>
            <option value="high-risk">High Risk</option>
            <option value="pending">Pending Analysis</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {activeView === 'analysis' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Document List */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                        <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <Card 
                  key={doc.id} 
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedDocuments.has(doc.id) ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => toggleDocumentSelection(doc.id)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Document Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {doc.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(doc.processingStatus) as any} size="sm">
                            {doc.processingStatus}
                          </Badge>
                          <Badge variant={getRiskColor(doc.aiInsights.riskLevel) as any} size="sm">
                            {doc.aiInsights.riskLevel} risk
                          </Badge>
                        </div>
                      </div>

                      {/* AI Insights Summary */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span>Confidence: {Math.round(doc.aiInsights.confidence * 100)}%</span>
                          <span>Compliance: {doc.aiInsights.complianceScore}%</span>
                          <span>Sentiment: {doc.aiInsights.sentiment}</span>
                        </div>

                        {/* Key Topics */}
                        <div className="flex flex-wrap gap-1">
                          {doc.aiInsights.keyTopics.slice(0, 3).map((topic, index) => (
                            <Badge key={index} variant="gray" size="sm">
                              {topic}
                            </Badge>
                          ))}
                          {doc.aiInsights.keyTopics.length > 3 && (
                            <Badge variant="gray" size="sm">
                              +{doc.aiInsights.keyTopics.length - 3} more
                            </Badge>
                          )}
                        </div>

                        {/* Extracted Entities */}
                        {doc.aiInsights.extractedEntities.length > 0 && (
                          <div className="text-xs text-gray-500">
                            Entities: {doc.aiInsights.extractedEntities.slice(0, 2).map(e => e.value).join(', ')}
                            {doc.aiInsights.extractedEntities.length > 2 && '...'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                      <input
                        type="checkbox"
                        checked={selectedDocuments.has(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="w-4 h-4 text-purple-600 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* AI Insights Panel */}
          <div className="lg:col-span-1">
            <AIInsightsPanel 
              selectedDocuments={Array.from(selectedDocuments).map(id => 
                documents.find(doc => doc.id === id)!
              ).filter(Boolean)}
            />
          </div>
        </div>
      )}

      {activeView === 'comparison' && (
        <DocumentComparisonTool 
          documents={documents}
          selectedDocuments={selectedDocuments}
          onSelectionChange={setSelectedDocuments}
        />
      )}

      {activeView === 'batch' && (
        <BatchDocumentProcessor 
          onProcessingComplete={fetchDocuments}
        />
      )}

      {activeView === 'workflow' && (
        <DocumentWorkflowAutomation 
          documents={documents}
          onWorkflowUpdate={fetchDocuments}
        />
      )}

      {/* Selection Actions */}
      {selectedDocuments.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
          <Card className="p-4 bg-white shadow-lg border border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedDocuments.size} selected
              </span>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
                  Analyze
                </button>
                <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                  Compare
                </button>
                <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                  Export
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Mock data for development
const mockDocuments: DocumentAnalysis[] = [
  {
    id: '1',
    name: 'Q3 Financial Report.pdf',
    type: 'pdf',
    size: 2048000,
    uploadDate: '2024-01-15T10:30:00Z',
    processingStatus: 'completed',
    aiInsights: {
      sentiment: 'positive',
      confidence: 0.92,
      keyTopics: ['Revenue Growth', 'Cost Reduction', 'Market Expansion'],
      riskLevel: 'low',
      complianceScore: 95,
      extractedEntities: [
        { type: 'Amount', value: '$2.5M', confidence: 0.98 },
        { type: 'Date', value: 'Q3 2024', confidence: 0.95 },
        { type: 'Company', value: 'Acme Corp', confidence: 0.89 }
      ]
    }
  },
  {
    id: '2',
    name: 'Contract Amendment - Client XYZ.docx',
    type: 'docx',
    size: 512000,
    uploadDate: '2024-01-14T14:20:00Z',
    processingStatus: 'completed',
    aiInsights: {
      sentiment: 'neutral',
      confidence: 0.87,
      keyTopics: ['Contract Terms', 'Payment Schedule', 'Liability'],
      riskLevel: 'medium',
      complianceScore: 78,
      extractedEntities: [
        { type: 'Amount', value: '$150,000', confidence: 0.96 },
        { type: 'Date', value: 'March 2024', confidence: 0.92 },
        { type: 'Person', value: 'John Smith', confidence: 0.85 }
      ]
    }
  },
  {
    id: '3',
    name: 'Compliance Audit Findings.pdf',
    type: 'pdf',
    size: 1024000,
    uploadDate: '2024-01-13T09:15:00Z',
    processingStatus: 'processing',
    aiInsights: {
      sentiment: 'negative',
      confidence: 0.94,
      keyTopics: ['Regulatory Issues', 'Non-compliance', 'Corrective Actions'],
      riskLevel: 'high',
      complianceScore: 45,
      extractedEntities: [
        { type: 'Regulation', value: 'SOX Section 404', confidence: 0.97 },
        { type: 'Date', value: 'December 2023', confidence: 0.93 },
        { type: 'Amount', value: '$50,000 penalty', confidence: 0.91 }
      ]
    }
  }
];