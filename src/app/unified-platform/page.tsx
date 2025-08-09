'use client';

import React, { useState } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { RealtimeBIDashboard } from '@/components/realtime-bi/RealtimeBIDashboard';
import { ConversationalAIChat } from '@/components/ai-chat/ConversationalAIChat';
import { DocumentIntelligenceUI } from '@/components/document-intelligence/DocumentIntelligenceUI';
import { UnifiedAnalyticsFramework } from '@/components/unified-analytics/UnifiedAnalyticsFramework';
import { PredictiveAnalyticsDashboard } from '@/components/predictive-analytics/PredictiveAnalyticsDashboard';
import NaturalLanguageQueryInterface from '@/components/analytics/NaturalLanguageQueryInterface';
import AdvancedComplianceDashboard from '@/components/compliance/AdvancedComplianceDashboard';
import { BarChart3, MessageCircle, Zap, Brain, FileText, TrendingUp, Target, Search, Shield } from 'lucide-react';

export default function UnifiedPlatformPage() {
  const [activeView, setActiveView] = useState<'dashboard' | 'chat' | 'documents' | 'analytics' | 'predictive' | 'nlquery' | 'compliance' | 'unified'>('unified');

  const views = [
    { 
      id: 'dashboard', 
      label: 'BI Dashboard', 
      icon: BarChart3,
      description: 'Real-time analytics with anomaly detection'
    },
    { 
      id: 'chat', 
      label: 'AI Assistant', 
      icon: MessageCircle,
      description: 'Conversational AI with voice capabilities'
    },
    { 
      id: 'documents', 
      label: 'Document Intelligence', 
      icon: FileText,
      description: 'AI-powered document analysis and insights'
    },
    { 
      id: 'analytics', 
      label: 'Analytics Framework', 
      icon: TrendingUp,
      description: 'Unified analytics with AI recommendations'
    },
    { 
      id: 'predictive', 
      label: 'Predictive Analytics', 
      icon: Target,
      description: 'Advanced forecasting and scenario modeling'
    },
    { 
      id: 'nlquery', 
      label: 'Natural Language Query', 
      icon: Search,
      description: 'Ask questions in plain English'
    },
    { 
      id: 'compliance', 
      label: 'Compliance Intelligence', 
      icon: Shield,
      description: 'Advanced compliance monitoring and risk assessment'
    },
    { 
      id: 'unified', 
      label: 'Unified View', 
      icon: Brain,
      description: 'Complete integrated experience'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Zap className="w-6 h-6 text-blue-600" />
              <span>Unified AI-Powered Analytics Platform</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Complete CA Platform - BI Dashboard, AI Chat, Document Intelligence, Analytics, Predictive, NL Query & Compliance
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="green" className="animate-pulse">
              Platform Complete
            </Badge>
            <Badge variant="blue">
              7/7 Components Complete
            </Badge>
            <Badge variant="purple">
              100% Ready
            </Badge>
          </div>
        </div>

        {/* View Selector */}
        <div className="flex items-center space-x-1 mt-4">
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeView === 'dashboard' && (
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Real-time BI Dashboard with Anomaly Alerts
              </h2>
              <p className="text-gray-600">
                Live business intelligence with WebSocket integration, anomaly detection, and interactive drill-down capabilities.
              </p>
            </div>
            <RealtimeBIDashboard />
          </Card>
        )}

        {activeView === 'chat' && (
          <Card className="h-[calc(100vh-200px)]">
            <ConversationalAIChat />
          </Card>
        )}

        {activeView === 'documents' && (
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Advanced Document Intelligence UI
              </h2>
              <p className="text-gray-600">
                AI-powered document analysis with comparison tools, batch processing, and workflow automation.
              </p>
            </div>
            <DocumentIntelligenceUI />
          </Card>
        )}

        {activeView === 'analytics' && (
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Unified Analytics Visualization Framework
              </h2>
              <p className="text-gray-600">
                Comprehensive charting library with AI-recommended visualizations and interactive exploration.
              </p>
            </div>
            <UnifiedAnalyticsFramework />
          </Card>
        )}

        {activeView === 'predictive' && (
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Interactive Predictive Analytics Dashboard
              </h2>
              <p className="text-gray-600">
                Advanced forecasting with scenario modeling and business impact simulation.
              </p>
            </div>
            <PredictiveAnalyticsDashboard />
          </Card>
        )}

        {activeView === 'nlquery' && (
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Natural Language Query Interface
              </h2>
              <p className="text-gray-600">
                Ask questions about your data in plain English and get instant insights with visualizations.
              </p>
            </div>
            <NaturalLanguageQueryInterface />
          </Card>
        )}

        {activeView === 'compliance' && (
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Advanced Compliance Intelligence Dashboard
              </h2>
              <p className="text-gray-600">
                Real-time compliance monitoring, risk assessment, and regulatory intelligence.
              </p>
            </div>
            <AdvancedComplianceDashboard />
          </Card>
        )}

        {activeView === 'unified' && (
          <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-4 h-[calc(100vh-200px)]">
            {/* BI Dashboard */}
            <Card className="p-4 overflow-hidden">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Real-time BI Dashboard
                </h2>
                <p className="text-sm text-gray-600">
                  Live analytics with anomaly detection
                </p>
              </div>
              <div className="h-full overflow-y-auto">
                <RealtimeBIDashboard />
              </div>
            </Card>

            {/* AI Chat */}
            <Card className="overflow-hidden">
              <div className="h-full">
                <ConversationalAIChat />
              </div>
            </Card>

            {/* Document Intelligence */}
            <Card className="p-4 overflow-hidden">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Document Intelligence
                </h2>
                <p className="text-sm text-gray-600">
                  AI-powered document analysis
                </p>
              </div>
              <div className="h-full overflow-y-auto">
                <DocumentIntelligenceUI />
              </div>
            </Card>

            {/* Analytics Framework */}
            <Card className="p-4 overflow-hidden">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Analytics Framework
                </h2>
                <p className="text-sm text-gray-600">
                  AI-recommended visualizations
                </p>
              </div>
              <div className="h-full overflow-y-auto">
                <UnifiedAnalyticsFramework />
              </div>
            </Card>

            {/* Predictive Analytics */}
            <Card className="p-4 overflow-hidden">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Predictive Analytics
                </h2>
                <p className="text-sm text-gray-600">
                  Forecasting and scenario modeling
                </p>
              </div>
              <div className="h-full overflow-y-auto">
                <PredictiveAnalyticsDashboard />
              </div>
            </Card>

            {/* Natural Language Query */}
            <Card className="p-4 overflow-hidden">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Natural Language Query
                </h2>
                <p className="text-sm text-gray-600">
                  Ask questions in plain English
                </p>
              </div>
              <div className="h-full overflow-y-auto">
                <NaturalLanguageQueryInterface />
              </div>
            </Card>

            {/* Compliance Intelligence */}
            <Card className="p-4 overflow-hidden">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Compliance Intelligence
                </h2>
                <p className="text-sm text-gray-600">
                  Real-time compliance monitoring
                </p>
              </div>
              <div className="h-full overflow-y-auto">
                <AdvancedComplianceDashboard />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="fixed bottom-6 right-6">
        <Card className="p-4 bg-white shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Platform Complete</p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-24 h-2 bg-gray-200 rounded-full">
                  <div className="w-full h-full bg-green-600 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-600">7/7 Complete</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}