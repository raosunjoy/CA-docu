'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceInputOutputProps {
  onTranscript: (transcript: string) => void;
  isEnabled: boolean;
}

export const VoiceInputOutput: React.FC<VoiceInputOutputProps> = ({
  onTranscript,
  isEnabled
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check for browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const speechSynthesis = window.speechSynthesis;
      
      if (SpeechRecognition && speechSynthesis) {
        setIsSupported(true);
        synthRef.current = speechSynthesis;
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
        };
        
        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          setTranscript(finalTranscript || interimTranscript);
          
          if (finalTranscript) {
            onTranscript(finalTranscript);
            setTranscript('');
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current || !audioEnabled) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Auto-speak AI responses when voice mode is enabled
  useEffect(() => {
    if (isEnabled && audioEnabled) {
      // This would be triggered by parent component when AI responds
      // For now, we'll just expose the speakText function
    }
  }, [isEnabled, audioEnabled]);

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
        <div className="text-center">
          <MicOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Voice input is not supported in your browser
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Try using Chrome, Safari, or Edge for voice features
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Voice Controls */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`p-4 rounded-full transition-all duration-200 ${
            isListening
              ? 'bg-red-100 text-red-600 animate-pulse'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          }`}
        >
          {isListening ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
        
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`p-3 rounded-full transition-colors ${
            audioEnabled
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {audioEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
        
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="p-3 rounded-full bg-orange-100 text-orange-600 animate-pulse"
          >
            <VolumeX className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-center space-x-2">
        {isListening && (
          <Badge variant="red" className="animate-pulse">
            Listening...
          </Badge>
        )}
        {isSpeaking && (
          <Badge variant="orange" className="animate-pulse">
            Speaking...
          </Badge>
        )}
        {!isListening && !isSpeaking && (
          <Badge variant="gray">
            {audioEnabled ? 'Voice Ready' : 'Audio Disabled'}
          </Badge>
        )}
      </div>

      {/* Live Transcript */}
      {transcript && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-medium">You said:</span> {transcript}
          </p>
        </div>
      )}

      {/* Voice Instructions */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600">
          {isListening 
            ? 'Speak now... I\'m listening!' 
            : 'Click the microphone to start voice input'
          }
        </p>
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
          <span>• Clear speech works best</span>
          <span>• Pause briefly when finished</span>
          <span>• Audio responses: {audioEnabled ? 'ON' : 'OFF'}</span>
        </div>
      </div>

      {/* Voice Visualization */}
      {isListening && (
        <div className="flex items-center justify-center space-x-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-blue-400 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.5s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};