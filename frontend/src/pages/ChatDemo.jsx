import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, ArrowLeft, Loader2, User, AlertCircle } from 'lucide-react';

// Browser-native UUID generation
const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

const DEMO_SESSION_ID = generateId();

export default function ChatDemo() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm a demo of SupportAI. I don't have a knowledge base connected in this demo, but in a real deployment I'd answer questions based on your uploaded documents. Try asking me something!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId] = useState(() => DEMO_SESSION_ID);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Try to connect to socket for real-time demo
    // Falls back to REST API if socket unavailable
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Demo mode - no API key, will use demo tenant if available
        },
        body: JSON.stringify({
          message: input.trim(),
          sessionId,
          customerName: 'Demo User'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message.content,
          confidence: data.message.confidence,
          sources: data.message.sources,
          timestamp: new Date(),
          escalated: data.escalated
        }]);
      } else {
        // Fallback demo response
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "This is a demo response. In a real deployment, I'd search your knowledge base and provide accurate answers. Connect your knowledge base to see AI-powered responses!",
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting to the server. Make sure the backend is running on port 5000.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "What are your business hours?",
    "How do I reset my password?",
    "What's your refund policy?",
    "How can I contact support?"
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 py-4 flex items-center gap-4">
        <Link to="/" className="text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm">SupportAI Demo</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-400">Online</span>
            </div>
          </div>
        </div>
        <div className="ml-auto">
          <Link to="/register" className="btn-primary text-sm">
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 message-enter ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-slate-700' : 'bg-primary-600/30'
              }`}>
                {msg.role === 'user'
                  ? <User size={14} className="text-slate-300" />
                  : <Bot size={14} className="text-primary-400" />
                }
              </div>
              <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {msg.confidence != null && (
                    <span className={msg.confidence > 0.6 ? 'text-green-500' : msg.confidence > 0.3 ? 'text-yellow-500' : 'text-red-500'}>
                      {(msg.confidence * 100).toFixed(0)}% confident
                    </span>
                  )}
                  {msg.escalated && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <AlertCircle size={10} /> Escalated to human
                    </span>
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.sources.map((src, si) => (
                      <span key={si} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                        📄 {src.title?.substring(0, 25)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-primary-400" />
              </div>
              <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <div className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
                <div className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
                <div className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {messages.length === 1 && (
          <div className="mt-6">
            <p className="text-xs text-slate-500 mb-3 text-center">Try asking:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            ref={inputRef}
            className="input flex-1 resize-none min-h-[44px] max-h-[120px] py-2.5"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="btn-primary px-4 flex-shrink-0 flex items-center justify-center"
          >
            {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">
          Powered by SupportAI · <Link to="/register" className="text-primary-500 hover:text-primary-400">Add to your website</Link>
        </p>
      </div>
    </div>
  );
}
