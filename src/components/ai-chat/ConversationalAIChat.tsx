'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Send, Mic, MicOff, Bot, User, BarChart3, TrendingUp, FileText } from 'lucide-react';
import { VoiceInputOutput } from './VoiceInputOutput';
import { ChatMessageHistory } from './ChatMessageHistory';
import { AnalyticsVisualizationInChat } from './AnalyticsVisualizationInChat';
import { useWebSocket } from '@/hooks/useWebSocket';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  threadId?: string;
  analytics?: AnalyticsData;
  suggestions?: string[];
}

interface AnalyticsData {
  type: 'chart' | 'metric' | 'insight';
  data: any;
  title: string;
}

interface ConversationThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  context: string[];
  lastActivity: string;
}

export const ConversationalAIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [currentThread, setCurrentThread] = useState<ConversationThread | null>(null);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { socket } = useWebSocket('/api/ai-chat/ws');

  useEffect(() => {
    if (socket) {
      socket.on('ai-response', handleAIResponse);
      socket.on('typing-indicator', setIsTyping);
      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));

      return () => {
        socket.off('ai-response');
        socket.off('typing-indicator');
        socket.off('connect');
        socket.off('disconnect');
      };
    }
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with welcome message
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'ai',
        content: "Hello! I'm your AI assistant for analytics and business intelligence. I can help you analyze data, create visualizations, and provide insights. What would you like to explore today?",
        timestamp: new Date().toISOString(),
        suggestions: [
          "Show me revenue trends",
          "Analyze client performance",
          "Create a compliance report",
          "What are the key insights for this month?"
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAIResponse = (response: {
    message: string;
    analytics?: AnalyticsData;
    suggestions?: string[];
    threadId?: string;
  }) => {
    const aiMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: response.message,
      timestamp: new Date().toISOString(),
      threadId: response.threadId,
      analytics: response.analytics,
      suggestions: response.suggestions
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !socket) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      threadId: currentThread?.id
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsTyping(true);

    // Send to AI service
    socket.emit('user-message', {
      message: content.trim(),
      threadId: currentThread?.id,
      context: messages.slice(-5) // Send last 5 messages for context
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(currentInput);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentInput(suggestion);
    inputRef.current?.focus();
  };

  const handleVoiceInput = (transcript: string) => {
    if (transcript) {
      sendMessage(transcript);
    }
  };

  const createNewThread = () => {
    const newThread: ConversationThread = {
      id: Date.now().toString(),
      title: `Conversation ${threads.length + 1}`,
      messages: [],
      context: [],
      lastActivity: new Date().toISOString()
    };
    
    setThreads(prev => [newThread, ...prev]);
    setCurrentThread(newThread);
    setMessages([]);
  };

  const switchThread = (thread: ConversationThread) => {
    setCurrentThread(thread);
    setMessages(thread.messages);
  };

  return (
    <div className="flex h-full max-h-screen">
      {/* Thread Sidebar - Hidden on mobile */}
      <div className="hidden lg:block w-64 border-r border-gray-200 bg-gray-50">
        <ChatMessageHistory 
          threads={threads}
          currentThread={currentThread}
          onThreadSelect={switchThread}
          onNewThread={createNewThread}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">AI Analytics Assistant</h2>
                <div className="flex items-center space-x-2">
                  <Badge variant={isConnected ? 'green' : 'red'} size="sm">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                  {isTyping && (
                    <Badge variant="blue" size="sm" className="animate-pulse">
                      AI is typing...
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Voice Toggle */}
            <button
              onClick={() => setIsVoiceMode(!isVoiceMode)}
              className={`p-2 rounded-lg transition-colors ${
                isVoiceMode 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isVoiceMode ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <div className="flex items-start space-x-3">
                  {message.type === 'ai' && (
                    <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <Card className={`p-4 ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-200'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {/* Analytics Visualization */}
                      {message.analytics && (
                        <div className="mt-3">
                          <AnalyticsVisualizationInChat data={message.analytics} />
                        </div>
                      )}
                      
                      {/* Suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-gray-500 font-medium">Suggested follow-ups:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                    
                    <p className="text-xs text-gray-500 mt-1 px-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  {message.type === 'user' && (
                    <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <Card className="p-4 bg-white border border-gray-200">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </Card>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          {isVoiceMode ? (
            <VoiceInputOutput 
              onTranscript={handleVoiceInput}
              isEnabled={isVoiceMode}
            />
          ) : (
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <Input
                  ref={inputRef}
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your analytics, create reports, or get insights..."
                  className="resize-none"
                  disabled={!isConnected}
                />
              </div>
              <button
                onClick={() => sendMessage(currentInput)}
                disabled={!currentInput.trim() || !isConnected}
                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex space-x-2">
              <button
                onClick={() => handleSuggestionClick("Show me today's key metrics")}
                className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                <BarChart3 className="w-3 h-3" />
                <span>Metrics</span>
              </button>
              <button
                onClick={() => handleSuggestionClick("Analyze revenue trends")}
                className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                <TrendingUp className="w-3 h-3" />
                <span>Trends</span>
              </button>
              <button
                onClick={() => handleSuggestionClick("Generate compliance report")}
                className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                <FileText className="w-3 h-3" />
                <span>Reports</span>
              </button>
            </div>
            
            <div className="text-xs text-gray-500">
              Press Enter to send • Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};