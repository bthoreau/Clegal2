import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, TrendingUp, Lightbulb, Wallet } from 'lucide-react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Initial welcome sequence
  useEffect(() => {
    const welcomeSequence = async () => {
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessages([{
        type: 'assistant',
        content: "Welcome to CryptoLegal! I'm Max, your dedicated crypto tax and finance assistant."
      }]);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: "How can I assist you today?"
      }]);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: "You can ask me anything about crypto taxes, or explore these topics:",
        suggestions: true
      }]);
      setIsTyping(false);
    };

    welcomeSequence();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestions = [
    "What crypto activities are taxable?",
    "How do I minimize my crypto taxes?",
    "Explain DeFi tax implications",
    "Help me get started"
  ];

  const handleSendMessage = async (content) => {
    if (!content.trim()) return;

    // Add user message
    setMessages(prev => [...prev, {
      type: 'user',
      content: content
    }]);
    setInputValue('');

    // Show typing indicator
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-10) // Send last 10 messages for context
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      setMessages(prev => [...prev, {
        type: 'assistant',
        content: data.response
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Please try again."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${
            message.type === 'user' ? 'justify-end' : 'justify-start'
          }`}>
            <div className={`max-w-[80%] p-4 rounded-lg ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white shadow-sm'
            }`}>
              <div>{message.content}</div>
              {message.suggestions && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(suggestion)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-900 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center space-x-2 p-4 bg-white rounded-lg shadow-sm w-16">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-white">
        <div className="max-w-4xl mx-auto flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything about crypto taxes..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
