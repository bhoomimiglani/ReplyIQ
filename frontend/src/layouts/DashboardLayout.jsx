import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, BookOpen, MessageSquare, Ticket, BarChart3,
  Settings, LogOut, Bot, Menu, X, Shield, Bell, Send, Loader2, User, MessageCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
  { to: '/dashboard/conversations', icon: MessageSquare, label: 'Conversations' },
  { to: '/dashboard/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

// Inline Chat Widget for Dashboard
function DashboardChat({ tenant, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm ${tenant?.settings?.botName || 'Support Assistant'}. Ask me anything based on your knowledge base!`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { token } = useAuthStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }]);
    setIsTyping(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text, customerName: 'Dashboard Test' })
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message.content,
          confidence: data.message.confidence,
          timestamp: new Date(),
          escalated: data.escalated
        }]);
      } else {
        throw new Error(data.error || 'No response');
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${e.message}. Make sure your knowledge base has content and the backend is running.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[520px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary-600 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{tenant?.settings?.botName || 'Support Assistant'}</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              <span className="text-xs text-white/80">Online</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X size={18} />
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
              <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-sm'
                  : 'bg-slate-800 text-slate-200 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.confidence != null && (
                <span className={`text-xs ${msg.confidence > 0.6 ? 'text-green-500' : msg.confidence > 0.3 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {(msg.confidence * 100).toFixed(0)}% confident
                </span>
              )}
              {msg.escalated && (
                <span className="text-xs text-orange-400">⚠ Escalated to human</span>
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

      {/* Suggested questions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {['What are your business hours?', 'How do I get a refund?', 'Tell me about your products'].map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); }}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-full border border-slate-700 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-800 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder-slate-500"
            placeholder="Ask a question..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            autoFocus
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 bg-primary-600 hover:bg-primary-700 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-colors"
          >
            {isTyping ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-1.5">Powered by SupportAI</p>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bot size={20} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-white text-sm">SupportAI</h1>
          <p className="text-xs text-slate-500 truncate">{tenant?.name || 'Dashboard'}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Shield size={18} />
            <span>Admin Panel</span>
          </NavLink>
        )}

        {/* Test Chatbot button in sidebar */}
        <button
          onClick={() => { setChatOpen(true); setSidebarOpen(false); }}
          className="sidebar-link w-full text-left bg-primary-600/10 border border-primary-500/30 text-primary-400 hover:bg-primary-600/20 mt-4"
        >
          <MessageCircle size={18} />
          <span>Test Chatbot</span>
        </button>
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 mb-2">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-slate-900 border-r border-slate-800 z-10">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-3 ml-auto">
            {tenant?.plan && (
              <span className="hidden sm:inline-flex badge bg-primary-600/20 text-primary-400 border border-primary-500/30 capitalize">
                {tenant.plan} plan
              </span>
            )}
            {/* Test Chatbot button in header */}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                chatOpen
                  ? 'bg-primary-600 text-white'
                  : 'bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 border border-primary-500/30'
              }`}
            >
              <MessageCircle size={15} />
              <span className="hidden sm:inline">Test Chatbot</span>
            </button>
            <button className="relative text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Chat Widget */}
      {chatOpen && <DashboardChat tenant={tenant} onClose={() => setChatOpen(false)} />}
    </div>
  );
}
