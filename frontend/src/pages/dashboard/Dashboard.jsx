import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Ticket, BookOpen, TrendingUp, ArrowUpRight,
  Bot, Zap, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, sub, color = 'primary', trend }) => (
  <div className="card hover:border-slate-700 transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-600/20`}>
        <Icon size={20} className={`text-${color}-400`} />
      </div>
      {trend && (
        <span className="text-xs text-green-400 flex items-center gap-0.5">
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
    <div className="text-sm text-slate-400">{label}</div>
    {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
  </div>
);

const statusColors = {
  active: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-green-500/20 text-green-400',
  escalated: 'bg-red-500/20 text-red-400',
  open: 'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
};

export default function Dashboard() {
  const { user, tenant } = useAuthStore();

  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get('/analytics/overview').then(r => r.data.overview)
  });

  const { data: activity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => api.get('/analytics/recent-activity').then(r => r.data)
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1">Here's what's happening with your support today.</p>
        </div>
        <Link to="/dashboard/knowledge-base" className="btn-primary text-sm flex items-center gap-2">
          <BookOpen size={16} />
          Add Content
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Conversations (30d)"
          value={overview?.totalConversations ?? '—'}
          sub={`${overview?.activeConversations ?? 0} active now`}
          color="primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolution Rate"
          value={overview ? `${overview.resolutionRate}%` : '—'}
          sub="Last 30 days"
          color="green"
        />
        <StatCard
          icon={Ticket}
          label="Open Tickets"
          value={overview?.openTickets ?? '—'}
          sub={`${overview?.totalTickets ?? 0} total`}
          color="yellow"
        />
        <StatCard
          icon={Bot}
          label="AI Confidence"
          value={overview ? `${overview.avgConfidence}%` : '—'}
          sub="Average score"
          color="purple"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-xl font-bold text-white">{overview?.escalationRate ?? '—'}%</div>
          <div className="text-xs text-slate-400 mt-1">Escalation Rate</div>
        </div>
        <div className="card text-center">
          <div className="text-xl font-bold text-white">{overview?.processedDocuments ?? '—'}</div>
          <div className="text-xs text-slate-400 mt-1">KB Documents</div>
        </div>
        <div className="card text-center">
          <div className="text-xl font-bold text-white">{overview?.resolvedConversations ?? '—'}</div>
          <div className="text-xs text-slate-400 mt-1">Resolved (30d)</div>
        </div>
        <div className="card text-center">
          <div className="text-xl font-bold text-white">{overview?.resolvedTickets ?? '—'}</div>
          <div className="text-xs text-slate-400 mt-1">Tickets Resolved</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Conversations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare size={16} className="text-primary-400" />
              Recent Conversations
            </h2>
            <Link to="/dashboard/conversations" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {activity?.recentConversations?.length > 0 ? (
              activity.recentConversations.map(conv => (
                <Link
                  key={conv._id}
                  to={`/dashboard/conversations/${conv._id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {conv.customer?.name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {conv.totalMessages} messages · {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`badge ${statusColors[conv.status] || 'bg-slate-700 text-slate-400'} ml-2 flex-shrink-0`}>
                    {conv.status}
                  </span>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Add content to your knowledge base to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Ticket size={16} className="text-yellow-400" />
              Recent Tickets
            </h2>
            <Link to="/dashboard/tickets" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {activity?.recentTickets?.length > 0 ? (
              activity.recentTickets.map(ticket => (
                <Link
                  key={ticket._id}
                  to={`/dashboard/tickets/${ticket._id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{ticket.title}</p>
                    <p className="text-xs text-slate-500">
                      {ticket.ticketNumber} · {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className={`badge ${
                      ticket.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                      ticket.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Ticket size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No tickets yet</p>
                <p className="text-xs mt-1">Tickets are created when AI needs human help</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Setup Guide */}
      {!overview?.processedDocuments && (
        <div className="card border-primary-500/30 bg-primary-600/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap size={20} className="text-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Get started in 3 steps</h3>
              <div className="space-y-2 mt-3">
                {[
                  { step: '1', text: 'Add content to your knowledge base (PDFs, URLs, FAQs)', link: '/dashboard/knowledge-base' },
                  { step: '2', text: 'Customize your chatbot name, tone, and appearance', link: '/dashboard/settings' },
                  { step: '3', text: 'Embed the widget on your website using your API key', link: '/dashboard/settings' },
                ].map(({ step, text, link }) => (
                  <Link key={step} to={link} className="flex items-center gap-3 text-sm text-slate-300 hover:text-white group">
                    <span className="w-6 h-6 bg-primary-600/30 rounded-full flex items-center justify-center text-xs font-bold text-primary-400 flex-shrink-0">
                      {step}
                    </span>
                    <span>{text}</span>
                    <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
