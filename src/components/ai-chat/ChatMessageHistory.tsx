'use client';

import React, { useState } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Plus, MessageCircle, Search, Trash2, Archive } from 'lucide-react';
import { Input } from '@/components/atoms/Input';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  threadId?: string;
}

interface ConversationThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  context: string[];
  lastActivity: string;
}

interface ChatMessageHistoryProps {
  threads: ConversationThread[];
  currentThread: ConversationThread | null;
  onThreadSelect: (thread: ConversationThread) => void;
  onNewThread: () => void;
}

export const ChatMessageHistory: React.FC<ChatMessageHistoryProps> = ({
  threads,
  currentThread,
  onThreadSelect,
  onNewThread
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());

  const filteredThreads = threads.filter(thread => 
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.messages.some(msg => 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getThreadPreview = (thread: ConversationThread) => {
    const lastMessage = thread.messages[thread.messages.length - 1];
    if (!lastMessage) return 'New conversation';
    
    const preview = lastMessage.content.length > 60 
      ? lastMessage.content.substring(0, 60) + '...'
      : lastMessage.content;
    
    return preview;
  };

  const getMessageCount = (thread: ConversationThread) => {
    return thread.messages.length;
  };

  const toggleThreadSelection = (threadId: string) => {
    const newSelection = new Set(selectedThreads);
    if (newSelection.has(threadId)) {
      newSelection.delete(threadId);
    } else {
      newSelection.add(threadId);
    }
    setSelectedThreads(newSelection);
  };

  const handleBulkAction = (action: 'archive' | 'delete') => {
    // Implement bulk actions
    console.log(`${action} threads:`, Array.from(selectedThreads));
    setSelectedThreads(new Set());
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Conversations</h3>
          <button
            onClick={onNewThread}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10 text-sm"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedThreads.size > 0 && (
        <div className="p-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedThreads.size} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('archive')}
                className="p-1 text-blue-600 hover:text-blue-800"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="p-1 text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {filteredThreads.length === 0 ? (
          <div className="p-4 text-center">
            <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'Start a new conversation to begin'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredThreads.map((thread) => {
              const isSelected = currentThread?.id === thread.id;
              const isChecked = selectedThreads.has(thread.id);
              
              return (
                <div
                  key={thread.id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-blue-100 border border-blue-200' 
                      : 'bg-white hover:bg-gray-50 border border-transparent'
                  }`}
                  onClick={() => onThreadSelect(thread)}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleThreadSelection(thread.id);
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </div>

                  {/* Thread Content */}
                  <div className="pr-6">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {thread.title}
                      </h4>
                      <Badge variant="gray" size="sm">
                        {getMessageCount(thread)}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {getThreadPreview(thread)}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatLastActivity(thread.lastActivity)}
                      </span>
                      
                      {/* Context indicators */}
                      {thread.context.length > 0 && (
                        <div className="flex space-x-1">
                          {thread.context.slice(0, 3).map((ctx, index) => (
                            <div
                              key={index}
                              className="w-2 h-2 bg-blue-400 rounded-full"
                              title={`Context: ${ctx}`}
                            />
                          ))}
                          {thread.context.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{thread.context.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{threads.length} conversations</span>
          <span>
            {threads.reduce((total, thread) => total + thread.messages.length, 0)} messages
          </span>
        </div>
      </div>
    </div>
  );
};