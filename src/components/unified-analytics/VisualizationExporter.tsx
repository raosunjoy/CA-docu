'use client';

import React, { useState } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { 
  Download, 
  FileText, 
  Image, 
  Share2, 
  Mail, 
  Link, 
  Presentation,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

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

interface ExportJob {
  id: string;
  visualizationIds: string[];
  format: 'pdf' | 'png' | 'svg' | 'pptx' | 'excel';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  downloadUrl?: string;
  createdAt: string;
}

interface VisualizationExporterProps {
  visualizations: VisualizationConfig[];
}

export const VisualizationExporter: React.FC<VisualizationExporterProps> = ({
  visualizations
}) => {
  const [selectedVisualizations, setSelectedVisualizations] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'svg' | 'pptx' | 'excel'>('pdf');
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [shareSettings, setShareSettings] = useState({
    includeInsights: true,
    includeData: false,
    watermark: true,
    expiresIn: '7d'
  });

  const exportFormats = [
    { 
      value: 'pdf', 
      label: 'PDF Report', 
      icon: FileText, 
      description: 'Professional report with insights',
      size: 'Small'
    },
    { 
      value: 'png', 
      label: 'PNG Images', 
      icon: Image, 
      description: 'High-quality images for presentations',
      size: 'Medium'
    },
    { 
      value: 'svg', 
      label: 'SVG Vector', 
      icon: Image, 
      description: 'Scalable vector graphics',
      size: 'Small'
    },
    { 
      value: 'pptx', 
      label: 'PowerPoint', 
      icon: Presentation, 
      description: 'Ready-to-present slides',
      size: 'Large'
    },
    { 
      value: 'excel', 
      label: 'Excel Workbook', 
      icon: FileText, 
      description: 'Data and charts in spreadsheet',
      size: 'Medium'
    }
  ];

  const toggleVisualizationSelection = (vizId: string) => {
    const newSelection = new Set(selectedVisualizations);
    if (newSelection.has(vizId)) {
      newSelection.delete(vizId);
    } else {
      newSelection.add(vizId);
    }
    setSelectedVisualizations(newSelection);
  };

  const selectAll = () => {
    setSelectedVisualizations(new Set(visualizations.map(v => v.id)));
  };

  const clearSelection = () => {
    setSelectedVisualizations(new Set());
  };

  const startExport = async () => {
    if (selectedVisualizations.size === 0) return;

    const newJob: ExportJob = {
      id: Date.now().toString(),
      visualizationIds: Array.from(selectedVisualizations),
      format: exportFormat,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString()
    };

    setExportJobs(prev => [newJob, ...prev]);

    // Simulate export process
    simulateExport(newJob.id);
  };

  const simulateExport = async (jobId: string) => {
    // Update to processing
    setExportJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, status: 'processing' } : job
    ));

    // Simulate progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setExportJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, progress } : job
      ));
    }

    // Complete
    setExportJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { 
            ...job, 
            status: 'completed', 
            progress: 100,
            downloadUrl: `/downloads/export-${jobId}.${job.format}`
          } 
        : job
    ));
  };

  const shareVisualization = async (method: 'email' | 'link') => {
    if (selectedVisualizations.size === 0) return;

    // Simulate sharing
    if (method === 'link') {
      const shareUrl = `https://analytics.company.com/share/${Date.now()}`;
      navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } else {
      alert('Email sharing initiated!');
    }
  };

  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending': return Clock;
      case 'processing': return Clock;
      case 'completed': return CheckCircle;
      case 'error': return AlertCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'processing': return 'blue';
      case 'completed': return 'green';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Visualization Selection */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Visualizations</h3>
            <div className="flex space-x-2">
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {visualizations.map((viz) => (
              <div
                key={viz.id}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedVisualizations.has(viz.id)
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => toggleVisualizationSelection(viz.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedVisualizations.has(viz.id)}
                  onChange={() => toggleVisualizationSelection(viz.id)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {viz.title}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="gray" size="sm">
                      {viz.type}
                    </Badge>
                    {viz.aiRecommended && (
                      <Badge variant="purple" size="sm">
                        AI
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {selectedVisualizations.size} of {visualizations.length} visualizations selected
            </p>
          </div>
        </Card>

        {/* Export Options */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>

          {/* Format Selection */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Export Format</h4>
            <div className="space-y-2">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <label
                    key={format.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      exportFormat === format.value
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format.value}
                      checked={exportFormat === format.value}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {format.label}
                      </p>
                      <p className="text-xs text-gray-600">
                        {format.description}
                      </p>
                    </div>
                    <Badge variant="gray" size="sm">
                      {format.size}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Share Settings */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Share Settings</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={shareSettings.includeInsights}
                  onChange={(e) => setShareSettings(prev => ({
                    ...prev,
                    includeInsights: e.target.checked
                  }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Include AI insights</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={shareSettings.includeData}
                  onChange={(e) => setShareSettings(prev => ({
                    ...prev,
                    includeData: e.target.checked
                  }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Include raw data</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={shareSettings.watermark}
                  onChange={(e) => setShareSettings(prev => ({
                    ...prev,
                    watermark: e.target.checked
                  }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Add company watermark</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={startExport}
              disabled={selectedVisualizations.size === 0}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Export Selected</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => shareVisualization('email')}
                disabled={selectedVisualizations.size === 0}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </button>
              <button
                onClick={() => shareVisualization('link')}
                disabled={selectedVisualizations.size === 0}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <Link className="w-4 h-4" />
                <span>Share Link</span>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Export History */}
      {exportJobs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export History</h3>
          
          <div className="space-y-3">
            {exportJobs.map((job) => {
              const StatusIcon = getStatusIcon(job.status);
              const statusColor = getStatusColor(job.status);
              
              return (
                <div key={job.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`p-2 bg-${statusColor}-100 rounded-lg`}>
                    <StatusIcon className={`w-4 h-4 text-${statusColor}-600`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {job.format.toUpperCase()} Export - {job.visualizationIds.length} charts
                      </p>
                      <Badge variant={statusColor as any} size="sm">
                        {job.status}
                      </Badge>
                    </div>
                    
                    {job.status === 'processing' && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Created: {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  {job.status === 'completed' && job.downloadUrl && (
                    <button className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};