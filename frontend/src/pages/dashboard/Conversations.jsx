import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquare, Search, Filter, CheckCircle2, AlertCircle, Clock, ArrowUpRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const statusConfig = {
  active: { color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  resolved: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  escalated: { color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
  abandoned: { color: 'bg-slate-700 text-slate-400', icon: MessageSquare }
};

export default function Conversations() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', page, statusFilter, search],
    queryFn: () => api.get('/chat/conversations', {
      params: { page, limit: 20, status: statusFilter || undefined, search: search || undefined }
    }).then(r => r.data),
    keepPreviousData: true
  });

  const resolveMutation = useMutation({
    mutationFn: (id) => api.put(`/chat/conversations/${id}/resolve`),
    onSuccess: () => {
      toast.success('Conversation resolved');
      queryClient.invalidateQueries(['conversations']);
    }
  });

  const conversations = data?.conversations || [];
  const pagination = data?.pagination;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Conversations</h1>
        <p className="text-slate-400 mt-1">All customer chat sessions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search by customer name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input w-full sm:w-48"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={40} className="mx-auto mb-3 text-slate-600" />
            <h3 className="font-medium text-slate-300">No conversations found</h3>
            <p className="text-slate-500 text-sm mt-1">Conversations will appear here when customers chat</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Messages</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Confidence</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Last Activity</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {conversations.map(conv => {
                    const sc = statusConfig[conv.status] || statusConfig.active;
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={conv._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-200">{conv.customer?.name || 'Anonymous'}</p>
                            {conv.customer?.email && (
                              <p className="text-xs text-slate-500">{conv.customer.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`badge ${sc.color} flex items-center gap-1 w-fit`}>
                            <StatusIcon size={11} />
                            {conv.status}
                          </span>
                          {conv.escalated && (
                            <span className="badge bg-red-500/20 text-red-400 mt-1 flex items-center gap-1 w-fit">
                              <AlertCircle size={11} /> escalated
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-sm">{conv.totalMessages}</td>
                        <td className="px-6 py-4">
                          {conv.avgConfidence > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${conv.avgConfidence > 0.7 ? 'bg-green-500' : conv.avgConfidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${conv.avgConfidence * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400">{(conv.avgConfidence * 100).toFixed(0)}%</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/dashboard/conversations/${conv._id}`}
                              className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                              title="View"
                            >
                              <ArrowUpRight size={15} />
                            </Link>
                            {conv.status === 'active' && (
                              <button
                                onClick={() => resolveMutation.mutate(conv._id)}
                                className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                                title="Resolve"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
                <p className="text-sm text-slate-400">
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">
                    Previous
                  </button>
                  <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
