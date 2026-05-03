import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bot, User, AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../lib/api';

export default function ConversationDetail() {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.get(`/chat/conversations/${id}`).then(r => r.data.conversation)
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-400">
        Conversation not found
      </div>
    );
  }

  const conv = data;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard/conversations" className="text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">
            Conversation with {conv.customer?.name || 'Anonymous'}
          </h1>
          <p className="text-slate-400 text-sm">
            Session: {conv.sessionId?.substring(0, 8)}... · {conv.totalMessages} messages
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {conv.escalated && (
            <span className="badge bg-red-500/20 text-red-400 flex items-center gap-1">
              <AlertCircle size={12} /> Escalated
            </span>
          )}
          {conv.ticketId && (
            <Link
              to={`/dashboard/tickets/${conv.ticketId._id}`}
              className="badge bg-yellow-500/20 text-yellow-400 flex items-center gap-1 hover:bg-yellow-500/30"
            >
              <ExternalLink size={12} /> Ticket #{conv.ticketId.ticketNumber}
            </Link>
          )}
          <span className={`badge ${
            conv.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
            conv.status === 'escalated' ? 'bg-red-500/20 text-red-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {conv.status}
          </span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="card">
        <h2 className="font-medium text-slate-300 mb-3 text-sm">Customer Info</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Name</p>
            <p className="text-slate-200">{conv.customer?.name || 'Anonymous'}</p>
          </div>
          <div>
            <p className="text-slate-500">Email</p>
            <p className="text-slate-200">{conv.customer?.email || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Channel</p>
            <p className="text-slate-200 capitalize">{conv.channel}</p>
          </div>
          <div>
            <p className="text-slate-500">Avg Confidence</p>
            <p className="text-slate-200">{conv.avgConfidence ? `${(conv.avgConfidence * 100).toFixed(0)}%` : '—'}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Conversation</h2>
        </div>
        <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
          {conv.messages?.filter(m => m.role !== 'system').map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-slate-700' : 'bg-primary-600/30'
              }`}>
                {msg.role === 'user' ? <User size={14} className="text-slate-300" /> : <Bot size={14} className="text-primary-400" />}
              </div>
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
                  {msg.confidence != null && (
                    <span className={`${msg.confidence > 0.6 ? 'text-green-500' : msg.confidence > 0.3 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {(msg.confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                  {msg.responseTime && (
                    <span>{msg.responseTime}ms</span>
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {msg.sources.map((src, si) => (
                      <span key={si} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                        📄 {src.title?.substring(0, 30)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
