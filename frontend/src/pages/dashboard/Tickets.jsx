import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Ticket, Search, ArrowUpRight, Loader2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../../lib/api';

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

export default function Tickets() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', page, statusFilter, priorityFilter, search],
    queryFn: () => api.get('/tickets', {
      params: { page, limit: 20, status: statusFilter || undefined, priority: priorityFilter || undefined, search: search || undefined }
    }).then(r => r.data),
    keepPreviousData: true
  });

  const tickets = data?.tickets || [];
  const pagination = data?.pagination;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
          <p className="text-slate-400 mt-1">Escalated conversations requiring human attention</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search tickets..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-full sm:w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select className="input w-full sm:w-40" value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}>
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Tickets */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <Ticket size={40} className="mx-auto mb-3 text-slate-600" />
            <h3 className="font-medium text-slate-300">No tickets found</h3>
            <p className="text-slate-500 text-sm mt-1">Tickets are created when AI confidence is low</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Ticket</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Priority</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Created</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tickets.map(ticket => (
                    <tr key={ticket._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-200 text-sm">{ticket.title.substring(0, 60)}{ticket.title.length > 60 ? '...' : ''}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ticket.ticketNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-300">{ticket.customer?.name || 'Anonymous'}</p>
                        {ticket.customer?.email && <p className="text-xs text-slate-500">{ticket.customer.email}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${statusColors[ticket.status] || 'bg-slate-700 text-slate-400'}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${priorityColors[ticket.priority] || 'bg-slate-700 text-slate-400'}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 capitalize">
                        {ticket.category?.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/dashboard/tickets/${ticket._id}`}
                          className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors inline-flex"
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
                <p className="text-sm text-slate-400">
                  {pagination.total} total tickets
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
