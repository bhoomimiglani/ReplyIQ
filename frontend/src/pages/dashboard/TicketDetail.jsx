import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, User, ExternalLink } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const priorityColors = {
  low: 'bg-slate-700 text-slate-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400'
};

const statusColors = {
  open: 'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  waiting: 'bg-purple-500/20 text-purple-400',
  resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-slate-700 text-slate-400'
};

export default function TicketDetail() {
  const { id } = useParams();
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const queryClient = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`).then(r => r.data.ticket)
  });

  const updateMutation = useMutation({
    mutationFn: (updates) => api.put(`/tickets/${id}`, updates),
    onSuccess: () => {
      toast.success('Ticket updated');
      queryClient.invalidateQueries(['ticket', id]);
      queryClient.invalidateQueries(['tickets']);
    }
  });

  const commentMutation = useMutation({
    mutationFn: (data) => api.post(`/tickets/${id}/comments`, data),
    onSuccess: () => {
      toast.success('Comment added');
      setComment('');
      queryClient.invalidateQueries(['ticket', id]);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary-400" />
      </div>
    );
  }

  if (!ticket) {
    return <div className="p-6 text-slate-400">Ticket not found</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/dashboard/tickets" className="text-slate-400 hover:text-white mt-1">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm text-slate-500">{ticket.ticketNumber}</span>
            <span className={`badge ${statusColors[ticket.status] || 'bg-slate-700 text-slate-400'}`}>
              {ticket.status.replace('_', ' ')}
            </span>
            <span className={`badge ${priorityColors[ticket.priority] || 'bg-slate-700 text-slate-400'}`}>
              {ticket.priority}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <h2 className="font-medium text-slate-300 mb-3 text-sm uppercase tracking-wider">Description</h2>
            <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
          </div>

          {/* Comments */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4">
              Comments ({ticket.comments?.length || 0})
            </h2>

            <div className="space-y-4 mb-6">
              {ticket.comments?.length === 0 && (
                <p className="text-slate-500 text-sm">No comments yet. Add the first one below.</p>
              )}
              {ticket.comments?.map((c, idx) => (
                <div key={idx} className={`flex gap-3 ${c.isInternal ? 'opacity-80' : ''}`}>
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">
                        {c.authorName || 'Agent'}
                      </span>
                      {c.isInternal && (
                        <span className="badge bg-slate-700 text-slate-400 text-xs">Internal</span>
                      )}
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(c.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add comment form */}
            <div className="border-t border-slate-800 pt-4">
              <textarea
                className="input min-h-[100px] resize-none mb-3"
                placeholder="Add a comment or internal note..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={e => setIsInternal(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800"
                  />
                  Internal note (not visible to customer)
                </label>
                <button
                  onClick={() => commentMutation.mutate({ content: comment, isInternal })}
                  disabled={!comment.trim() || commentMutation.isPending}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {commentMutation.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Send size={14} />
                  }
                  Add Comment
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="card">
            <h2 className="font-medium text-slate-300 mb-3 text-sm uppercase tracking-wider">Actions</h2>
            <div className="space-y-3">
              <div>
                <label className="label text-xs">Status</label>
                <select
                  className="input text-sm"
                  value={ticket.status}
                  onChange={e => updateMutation.mutate({ status: e.target.value })}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting">Waiting on Customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Priority</label>
                <select
                  className="input text-sm"
                  value={ticket.priority}
                  onChange={e => updateMutation.mutate({ priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Category</label>
                <select
                  className="input text-sm"
                  value={ticket.category}
                  onChange={e => updateMutation.mutate({ category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="bug">Bug</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="card">
            <h2 className="font-medium text-slate-300 mb-3 text-sm uppercase tracking-wider">Details</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Customer</p>
                <p className="text-slate-200">{ticket.customer?.name || 'Anonymous'}</p>
                {ticket.customer?.email && (
                  <p className="text-slate-400 text-xs">{ticket.customer.email}</p>
                )}
              </div>
              {ticket.aiConfidence != null && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">AI Confidence at Escalation</p>
                  <p className="text-slate-200">{(ticket.aiConfidence * 100).toFixed(0)}%</p>
                </div>
              )}
              {ticket.escalationReason && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Escalation Reason</p>
                  <p className="text-slate-200 text-xs">{ticket.escalationReason}</p>
                </div>
              )}
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Created</p>
                <p className="text-slate-200">{format(new Date(ticket.createdAt), 'MMM d, yyyy HH:mm')}</p>
              </div>
              {ticket.firstResponseAt && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">First Response</p>
                  <p className="text-slate-200">{format(new Date(ticket.firstResponseAt), 'MMM d, yyyy HH:mm')}</p>
                </div>
              )}
              {ticket.resolvedAt && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Resolved</p>
                  <p className="text-slate-200">{format(new Date(ticket.resolvedAt), 'MMM d, yyyy HH:mm')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Linked Conversation */}
          {ticket.conversationId && (
            <div className="card">
              <h2 className="font-medium text-slate-300 mb-3 text-sm uppercase tracking-wider">
                Linked Conversation
              </h2>
              <Link
                to={`/dashboard/conversations/${ticket.conversationId._id || ticket.conversationId}`}
                className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                <ExternalLink size={14} />
                View full conversation
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
