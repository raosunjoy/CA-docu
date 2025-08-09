'use client';

import React, { useState } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { 
  Clock, 
  Search, 
  Star, 
  StarOff, 
  Trash2, 
  RotateCcw,
  Filter,
  BarChart3,
  TrendingUp,
  Lightbulb
} from 'lucide-react';

interface QueryHistory {
  id: string;
  query: string;
  timestamp: string;
  resultType: string;
  saved: boolean;
}

interface QueryHistoryManagerProps {
  history: QueryHistory[];
  onQuerySelect: (query: string) => void;
  onSaveQuery: (queryId: string) => void;
}

export const QueryHistoryManager: React.FC<QueryHistoryManagerProps> = ({
  history,
  onQuerySelect,
  onSaveQuery
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'saved' | 'recent'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'type'>('recent');

  const filteredHistory = history
    .filter(item => {
      const matchesSearch = item.query.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = 
        filterType === 'all' || 
        (filterType === 'saved' && item.saved) ||
        (filterType === 'recent' && new Date(item.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000));
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'alphabetical':
          return a.query.localeCompare(b.query);
        case 'type':
          return a.resultType.localeCompare(b.resultType);
        default:
          return 0;
      }
    });

  const getResultTypeIcon = (type: string) => {
    switch (type) {
      case 'chart': return BarChart3;
      case 'table': return BarChart3;
      case 'metric': return TrendingUp;
      case 'insight': return Lightbulb;
      default: return BarChart3;
    }
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'chart': return 'blue';
      case 'table': return 'green';
      case 'metric': return 'purple';
      case 'insight': return 'yellow';
      default: return 'gray';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const savedCount = history.filter(item => item.saved).length;
  const recentCount = history.filter(item => 
    new Date(item.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;

  return (
    <Card className="p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Query History</h3>
        <Badge variant="gray" size="sm">
          {history.length}
        </Badge>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="pl-10 text-sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {[
              { value: 'all', label: 'All', count: history.length },
              { value: 'saved', label: 'Saved', count: savedCount },
              { value: 'recent', label: 'Recent', count: recentCount }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value as any)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filterType === filter.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="recent">Recent</option>
            <option value="alphabetical">A-Z</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {searchQuery || filterType !== 'all' 
                ? 'No queries match your filters' 
                : 'No query history yet'
              }
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const ResultIcon = getResultTypeIcon(item.resultType);
            const resultColor = getResultTypeColor(item.resultType);
            
            return (
              <div
                key={item.id}
                className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <button
                    onClick={() => onQuerySelect(item.query)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
                      {item.query}
                    </p>
                  </button>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => onSaveQuery(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {item.saved ? (
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      ) : (
                        <StarOff className="w-3 h-3 text-gray-400 hover:text-yellow-500" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={resultColor as any} size="sm">
                      <ResultIcon className="w-3 h-3 mr-1" />
                      {item.resultType}
                    </Badge>
                    {item.saved && (
                      <Badge variant="yellow" size="sm">
                        Saved
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(item.timestamp)}
                    </span>
                    <button
                      onClick={() => onQuerySelect(item.query)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <RotateCcw className="w-3 h-3 text-gray-400 hover:text-blue-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Stats */}
      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 bg-blue-50 rounded">
              <p className="text-lg font-bold text-blue-900">{savedCount}</p>
              <p className="text-xs text-blue-700">Saved</p>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <p className="text-lg font-bold text-green-900">{recentCount}</p>
              <p className="text-xs text-green-700">Recent</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-2">Quick Actions:</p>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onQuerySelect('Show me my saved queries')}
            className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 transition-colors"
          >
            View Saved
          </button>
          <button
            onClick={() => onQuerySelect('Export my query history')}
            className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
          >
            Export History
          </button>
        </div>
      </div>
    </Card>
  );
};