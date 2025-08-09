'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { AlertTriangle, TrendingDown, Shield, FileText, X } from 'lucide-react';

interface Anomaly {
  id: string;
  type: 'revenue' | 'performance' | 'security' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  affectedMetrics: string[];
}

interface AnomalyAlertSystemProps {
  anomalies: Anomaly[];
  onAnomalyClick: (anomaly: Anomaly) => void;
}

export const AnomalyAlertSystem: React.FC<AnomalyAlertSystemProps> = ({
  anomalies,
  onAnomalyClick
}) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);

  const activeAnomalies = anomalies.filter(a => !dismissedAlerts.has(a.id));
  const criticalAnomalies = activeAnomalies.filter(a => a.severity === 'critical');

  useEffect(() => {
    // Play sound for critical anomalies
    if (criticalAnomalies.length > 0 && soundEnabled) {
      const audio = new Audio('/sounds/alert.mp3');
      audio.play().catch(() => {}); // Ignore if sound fails
    }
  }, [criticalAnomalies.length, soundEnabled]);

  const getAnomalyIcon = (type: Anomaly['type']) => {
    switch (type) {
      case 'revenue': return TrendingDown;
      case 'performance': return AlertTriangle;
      case 'security': return Shield;
      case 'compliance': return FileText;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const dismissAlert = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (activeAnomalies.length === 0) {
    return (
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-800 font-medium">All systems normal</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Critical Alerts Banner */}
      {criticalAnomalies.length > 0 && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-r-lg animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-semibold">
                {criticalAnomalies.length} Critical Alert{criticalAnomalies.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Sound: {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Anomaly Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeAnomalies.slice(0, 6).map((anomaly) => {
          const Icon = getAnomalyIcon(anomaly.type);
          const severityColor = getSeverityColor(anomaly.severity);
          
          return (
            <Card 
              key={anomaly.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-lg border-l-4 border-${severityColor}-500 ${
                anomaly.severity === 'critical' ? 'animate-pulse' : ''
              }`}
              onClick={() => onAnomalyClick(anomaly)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-lg bg-${severityColor}-100`}>
                    <Icon className={`w-4 h-4 text-${severityColor}-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={severityColor as any} size="sm">
                        {anomaly.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(anomaly.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1 capitalize">
                      {anomaly.type} Anomaly
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {anomaly.message}
                    </p>
                    {anomaly.affectedMetrics.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Affected metrics:</p>
                        <div className="flex flex-wrap gap-1">
                          {anomaly.affectedMetrics.slice(0, 3).map((metric) => (
                            <Badge key={metric} variant="gray" size="sm">
                              {metric}
                            </Badge>
                          ))}
                          {anomaly.affectedMetrics.length > 3 && (
                            <Badge variant="gray" size="sm">
                              +{anomaly.affectedMetrics.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => dismissAlert(anomaly.id, e)}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Show More Button */}
      {activeAnomalies.length > 6 && (
        <div className="text-center">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View {activeAnomalies.length - 6} more alerts
          </button>
        </div>
      )}

      {/* Mobile Alert Summary */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        {criticalAnomalies.length > 0 && (
          <Badge variant="red" className="animate-bounce shadow-lg">
            {criticalAnomalies.length} Critical
          </Badge>
        )}
      </div>
    </div>
  );
};