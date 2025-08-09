'use client';

import React from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { BaseChart } from '@/components/charts/BaseChart';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Info,
  Lightbulb
} from 'lucide-react';

interface QueryResult {
  type: 'chart' | 'table' | 'metric' | 'insight';
  data: any;
  visualization?: any;
  explanation: string;
  confidence: number;
}

interface QueryResultVisualizationProps {
  result: QueryResult;
}

export const QueryResultVisualization: React.FC<QueryResultVisualizationProps> = ({
  result
}) => {
  const renderChart = () => {
    const { chartType, chartData } = result.data;
    
    return (
      <div className="h-64 w-full">
        <BaseChart 
          type={chartType}
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom' as const,
                labels: {
                  boxWidth: 12,
                  font: { size: 11 }
                }
              }
            },
            scales: chartType !== 'doughnut' && chartType !== 'pie' ? {
              x: {
                ticks: { font: { size: 10 } }
              },
              y: {
                ticks: { 
                  font: { size: 10 },
                  callback: (value) => {
                    if (typeof value === 'number') {
                      return value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toString();
                    }
                    return value;
                  }
                }
              }
            } : undefined
          }}
        />
      </div>
    );
  };

  const renderTable = () => {
    const { headers, rows } = result.data;
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {headers.map((header: string, index: number) => (
                <th key={index} className="text-left py-2 px-3 font-medium text-gray-900">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any[], rowIndex: number) => (
              <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="py-2 px-3 text-gray-700">
                    {cellIndex === headers.length - 1 && typeof cell === 'string' ? (
                      <Badge 
                        variant={
                          cell.toLowerCase().includes('exceed') ? 'green' :
                          cell.toLowerCase().includes('below') || cell.toLowerCase().includes('critical') ? 'red' :
                          'blue'
                        }
                        size="sm"
                      >
                        {cell}
                      </Badge>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMetric = () => {
    const { value, change, trend, breakdown } = result.data;
    
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;
    const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
    
    return (
      <div className="space-y-4">
        {/* Main Metric */}
        <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <TrendIcon className={`w-6 h-6 ${trendColor}`} />
            <span className="text-3xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
          </div>
          {change && (
            <div className={`flex items-center justify-center space-x-1 ${trendColor}`}>
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change}% change
              </span>
            </div>
          )}
        </div>

        {/* Breakdown */}
        {breakdown && breakdown.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {breakdown.map((item: any, index: number) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  <span className="text-lg font-bold text-gray-900">
                    {item.value.toLocaleString()}
                  </span>
                </div>
                {item.change && (
                  <div className={`flex items-center space-x-1 ${
                    item.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span className="text-xs font-medium">
                      {item.change > 0 ? '+' : ''}{item.change}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderInsight = () => {
    const { insights, riskLevel, actionItems, suggestions } = result.data;
    
    return (
      <div className="space-y-4">
        {/* Insights */}
        {insights && (
          <div className="space-y-3">
            {insights.map((insight: string, index: number) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  <Info className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm text-blue-900">{insight}</p>
              </div>
            ))}
          </div>
        )}

        {/* Risk Level */}
        {riskLevel && (
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Risk Level:</span>
            </div>
            <Badge 
              variant={
                riskLevel === 'low' ? 'green' :
                riskLevel === 'medium' ? 'yellow' : 'red'
              }
            >
              {riskLevel.toUpperCase()}
            </Badge>
          </div>
        )}

        {/* Action Items */}
        {actionItems && actionItems.length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Recommended Actions:</span>
            </div>
            <ul className="space-y-1">
              {actionItems.map((action: string, index: number) => (
                <li key={index} className="text-sm text-green-800 flex items-start space-x-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Lightbulb className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Suggestions:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion: string, index: number) => (
                <Badge key={index} variant="purple" size="sm">
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getVisualizationIcon = () => {
    switch (result.type) {
      case 'chart': return BarChart3;
      case 'table': return BarChart3;
      case 'metric': return TrendingUp;
      case 'insight': return Lightbulb;
      default: return BarChart3;
    }
  };

  const Icon = getVisualizationIcon();

  return (
    <Card className="p-4 bg-white border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-blue-100 rounded">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-900 capitalize">
            {result.type} Result
          </span>
        </div>
        <Badge variant="blue" size="sm">
          {Math.round(result.confidence * 100)}% confident
        </Badge>
      </div>

      {/* Visualization Content */}
      <div className="mb-4">
        {result.type === 'chart' && renderChart()}
        {result.type === 'table' && renderTable()}
        {result.type === 'metric' && renderMetric()}
        {result.type === 'insight' && renderInsight()}
      </div>

      {/* Interactive Elements */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex space-x-2">
          <button className="text-xs text-blue-600 hover:text-blue-800">
            View Details
          </button>
          <button className="text-xs text-blue-600 hover:text-blue-800">
            Export
          </button>
          <button className="text-xs text-blue-600 hover:text-blue-800">
            Share
          </button>
        </div>
        <span className="text-xs text-gray-500">
          Generated {new Date().toLocaleTimeString()}
        </span>
      </div>
    </Card>
  );
};