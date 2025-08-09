'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Zap, Clock, Wifi } from 'lucide-react';

interface PerformanceMonitorProps {
  responseTime: number;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  responseTime
}) => {
  const [averageResponseTime, setAverageResponseTime] = useState<number>(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);

  useEffect(() => {
    if (responseTime > 0) {
      setResponseTimes(prev => {
        const newTimes = [...prev, responseTime].slice(-10); // Keep last 10 measurements
        const average = newTimes.reduce((sum, time) => sum + time, 0) / newTimes.length;
        setAverageResponseTime(average);
        return newTimes;
      });
    }
  }, [responseTime]);

  const getPerformanceStatus = () => {
    if (averageResponseTime === 0) return { status: 'initializing', color: 'gray', icon: Clock };
    if (averageResponseTime < 500) return { status: 'excellent', color: 'green', icon: Zap };
    if (averageResponseTime < 1000) return { status: 'good', color: 'blue', icon: Wifi };
    if (averageResponseTime < 2000) return { status: 'slow', color: 'yellow', icon: Clock };
    return { status: 'critical', color: 'red', icon: Clock };
  };

  const performance = getPerformanceStatus();
  const Icon = performance.icon;

  return (
    <div className="flex items-center space-x-2">
      <Badge variant={performance.color as any} className="flex items-center space-x-1">
        <Icon className="w-3 h-3" />
        <span>{Math.round(averageResponseTime)}ms</span>
      </Badge>
      <div className="hidden md:flex items-center space-x-1 text-xs text-gray-500">
        <span>Avg:</span>
        <span className={`font-medium ${
          performance.color === 'green' ? 'text-green-600' :
          performance.color === 'blue' ? 'text-blue-600' :
          performance.color === 'yellow' ? 'text-yellow-600' :
          performance.color === 'red' ? 'text-red-600' : 'text-gray-600'
        }`}>
          {Math.round(averageResponseTime)}ms
        </span>
      </div>
    </div>
  );
};