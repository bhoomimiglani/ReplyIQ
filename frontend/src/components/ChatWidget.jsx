import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Minimize2, MessageSquare, User, AlertCircle, Loader2 } from 'lucide-react';

const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Embeddable Chat Widget Component
 * Can be used standalone or embedded via the widget script
 */
export default function ChatWidget({
  apiKey,
  botName = 'Support Assistant',
  welcomeMessage = 'Hello! How can I help you today?',
  primaryColor = '#6366f1',
  position = 'bottom-right',
  onClose
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => generateId());
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '' });
  const [showInfoForm, setShowInfoForm] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || isTyping) return;

    setMessages(prev => [...prev, {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    }]);
    setInput('');
    setIsTyping(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: messageText,
          sessionId,
          customerName: customerInfo.name || undefined,
          customerEmail: customerInfo.email || undefined
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
          escalated: data.escalated,
          ticket: data.ticket
        }]);
      } else {
        throw new Error('Request failed');
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble right now. Please try again or contact us directly.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const positionClass = position === 'bottom-left' ? 'left-4' : 'right-4';

  return (
    <div className={`fixed bottom-4 ${positionClass} z-[9999] flex flex-col items-end gap-3`}>
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] h-[520px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{botName}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <span className="text-xs text-white/80">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <Minimize2 size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-slate-700' : 'bg-primary-600/30'
                }`}>
                  {msg.role === 'user'
                    ? <User size={12} className="text-slate-300" />
                    : <Bot size={12} className="text-primary-400" />
                  }
                </div>
                <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-white rounded-tr-sm'
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                    }`}
                    style={msg.role === 'user' ? { background: primaryColor } : {}}
                  >
                    {msg.content}
                  </div>
                  {msg.escalated && (
                    <div className="flex items-center gap-1 text-xs text-orange-400">
                      <AlertCircle size={10} />
                      <span>Ticket #{msg.ticket?.number} created</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-primary-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={12} className="text-primary-400" />
                </div>
                <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1">
                  <div className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <div className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <div className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-800 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-transparent placeholder-slate-500"
                style={{ '--tw-ring-color': primaryColor }}
                placeholder="Type a message..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                style={{ background: primaryColor }}
              >
                {isTyping ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
              </button>
            </div>
            <p className="text-center text-xs text-slate-600 mt-2">Powered by SupportAI</p>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={{ background: primaryColor }}
      >
        {isOpen
          ? <X size={22} className="text-white" />
          : <MessageSquare size={22} className="text-white" />
        }
      </button>
    </div>
  );
}
