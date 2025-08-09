'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Upload, FileText, CheckCircle, XCircle, Clock, Zap, AlertTriangle } from 'lucide-react';

interface ProcessingJob {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  startTime?: string;
  endTime?: string;
  error?: string;
  results?: {
    sentiment: string;
    confidence: number;
    keyTopics: string[];
    riskLevel: string;
    complianceScore: number;
  };
}

interface BatchDocumentProcessorProps {
  onProcessingComplete: () => void;
}

export const BatchDocumentProcessor: React.FC<BatchDocumentProcessorProps> = ({
  onProcessingComplete
}) => {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSettings, setProcessingSettings] = useState({
    enableSentimentAnalysis: true,
    enableTopicExtraction: true,
    enableComplianceCheck: true,
    enableRiskAssessment: true,
    batchSize: 5
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFilesToQueue(files);
  };

  const addFilesToQueue = (files: File[]) => {
    const newJobs: ProcessingJob[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName: file.name,
      fileSize: file.size,
      status: 'queued',
      progress: 0
    }));

    setJobs(prev => [...prev, ...newJobs]);
  };

  const startBatchProcessing = async () => {
    const queuedJobs = jobs.filter(job => job.status === 'queued');
    if (queuedJobs.length === 0) return;

    setIsProcessing(true);

    // Process jobs in batches
    for (let i = 0; i < queuedJobs.length; i += processingSettings.batchSize) {
      const batch = queuedJobs.slice(i, i + processingSettings.batchSize);
      await processBatch(batch);
    }

    setIsProcessing(false);
    onProcessingComplete();
  };

  const processBatch = async (batch: ProcessingJob[]) => {
    // Start processing for all jobs in batch
    batch.forEach(job => {
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { ...j, status: 'processing', startTime: new Date().toISOString() }
          : j
      ));
    });

    // Simulate processing with progress updates
    const promises = batch.map(job => processJob(job));
    await Promise.all(promises);
  };

  const processJob = async (job: ProcessingJob) => {
    try {
      // Simulate processing with progress updates
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, progress } : j
        ));
      }

      // Simulate AI analysis results
      const results = {
        sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
        confidence: Math.random() * 0.3 + 0.7, // 70-100%
        keyTopics: [
          'Financial Analysis', 'Risk Assessment', 'Compliance Review',
          'Market Research', 'Strategic Planning', 'Operational Efficiency'
        ].slice(0, Math.floor(Math.random() * 3) + 2),
        riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        complianceScore: Math.floor(Math.random() * 40) + 60 // 60-100%
      };

      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: 'completed', 
              progress: 100,
              endTime: new Date().toISOString(),
              results
            }
          : j
      ));
    } catch (error) {
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: 'error', 
              endTime: new Date().toISOString(),
              error: 'Processing failed'
            }
          : j
      ));
    }
  };

  const removeJob = (jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const retryJob = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status: 'queued', progress: 0, error: undefined }
        : job
    ));
  };

  const clearCompleted = () => {
    setJobs(prev => prev.filter(job => job.status !== 'completed'));
  };

  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'queued': return Clock;
      case 'processing': return Zap;
      case 'completed': return CheckCircle;
      case 'error': return XCircle;
      default: return FileText;
    }
  };

  const getStatusColor = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'queued': return 'gray';
      case 'processing': return 'blue';
      case 'completed': return 'green';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProcessingTime = (startTime?: string, endTime?: string) => {
    if (!startTime) return null;
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${diff}s`;
  };

  const completedJobs = jobs.filter(job => job.status === 'completed').length;
  const errorJobs = jobs.filter(job => job.status === 'error').length;
  const processingJobs = jobs.filter(job => job.status === 'processing').length;
  const queuedJobs = jobs.filter(job => job.status === 'queued').length;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card 
        className={`p-8 border-2 border-dashed transition-colors ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload Documents for Batch Processing
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop files here, or click to select files
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Files
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Supported formats: PDF, DOC, DOCX, TXT (Max 10MB per file)
          </p>
        </div>
      </Card>

      {/* Processing Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Settings</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Analysis Options</h4>
            {[
              { key: 'enableSentimentAnalysis', label: 'Sentiment Analysis' },
              { key: 'enableTopicExtraction', label: 'Topic Extraction' },
              { key: 'enableComplianceCheck', label: 'Compliance Check' },
              { key: 'enableRiskAssessment', label: 'Risk Assessment' }
            ].map(option => (
              <label key={option.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={processingSettings[option.key as keyof typeof processingSettings] as boolean}
                  onChange={(e) => setProcessingSettings(prev => ({
                    ...prev,
                    [option.key]: e.target.checked
                  }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Batch Size</h4>
            <select
              value={processingSettings.batchSize}
              onChange={(e) => setProcessingSettings(prev => ({
                ...prev,
                batchSize: parseInt(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 document at a time</option>
              <option value={3}>3 documents at a time</option>
              <option value={5}>5 documents at a time</option>
              <option value={10}>10 documents at a time</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Higher batch sizes process faster but use more resources
            </p>
          </div>
        </div>
      </Card>

      {/* Processing Queue */}
      {jobs.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Processing Queue</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Completed: {completedJobs}</span>
                <span>Processing: {processingJobs}</span>
                <span>Queued: {queuedJobs}</span>
                {errorJobs > 0 && <span className="text-red-600">Errors: {errorJobs}</span>}
              </div>
              <div className="flex space-x-2">
                {completedJobs > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Clear Completed
                  </button>
                )}
                <button
                  onClick={startBatchProcessing}
                  disabled={isProcessing || queuedJobs === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : `Start Processing (${queuedJobs})`}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {jobs.map((job) => {
              const StatusIcon = getStatusIcon(job.status);
              const statusColor = getStatusColor(job.status);
              
              return (
                <div key={job.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`p-2 bg-${statusColor}-100 rounded-lg`}>
                    <StatusIcon className={`w-4 h-4 text-${statusColor}-600`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {job.fileName}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant={statusColor as any} size="sm">
                          {job.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(job.fileSize)}
                        </span>
                      </div>
                    </div>
                    
                    {job.status === 'processing' && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        {job.status === 'processing' && (
                          <span>{job.progress}% complete</span>
                        )}
                        {getProcessingTime(job.startTime, job.endTime) && (
                          <span>Time: {getProcessingTime(job.startTime, job.endTime)}</span>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        {job.status === 'error' && (
                          <button
                            onClick={() => retryJob(job.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          onClick={() => removeJob(job.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    
                    {job.error && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                        Error: {job.error}
                      </div>
                    )}
                    
                    {job.results && (
                      <div className="mt-2 p-2 bg-green-50 rounded">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="gray" size="sm">
                            {job.results.sentiment} sentiment
                          </Badge>
                          <Badge variant="gray" size="sm">
                            {job.results.riskLevel} risk
                          </Badge>
                          <Badge variant="gray" size="sm">
                            {job.results.complianceScore}% compliance
                          </Badge>
                          <Badge variant="gray" size="sm">
                            {Math.round(job.results.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};