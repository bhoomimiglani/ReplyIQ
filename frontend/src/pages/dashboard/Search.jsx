import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, MessageSquare, Ticket, BookOpen, Loader2, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../../lib/api';

export default function Search() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['search-conversations', debouncedQuery],
    queryFn: () => api.get('/chat/conversations', { params: { search: debouncedQuery, limit: 5 } }).then(r => r.data),
    enabled: debouncedQuery.length > 2
  });

  const { data: ticketData, isLoading: ticketLoading } = useQuery({
    queryKey: ['search-tickets', debouncedQuery],
    queryFn: () => api.get('/tickets', { params: { search: debouncedQuery, limit: 5 } }).then(r => r.data),
    enabled: debouncedQuery.length > 2
  });

  const { data: kbData, isLoading: kbLoading } = useQuery({
    queryKey: ['search-kb', debouncedQuery],
    queryFn: () => api.get('/knowledge-base', { params: { search: debouncedQuery, limit: 5 } }).then(r => r.data),
    enabled: debouncedQuery.length > 2
  });

  const isLoading = convLoading || ticketLoading || kbLoading;
  const hasResults = debouncedQuery.length > 2 && (
    (convData?.conversations?.length > 0) ||
    (ticketData?.tickets?.length > 0) ||
    (kbData?.documents?.length > 0)
  );

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <p className="text-slate-400 mt-1">Search across conversations, tickets, and knowledge base</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          className="input pl-12 py-3 text-base"
          placeholder="Search conversations, tickets, documents..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {isLoading && debouncedQuery.length > 2 && (
          <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
        )}
      </div>

      {/* Results */}
      {debouncedQuery.length > 2 && (
        <div className="space-y-6">
          {/* Conversations */}
          {convData?.conversations?.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <MessageSquare size={14} />
                Conversations ({convData.conversations.length})
              </h2>
              <div className="space-y-2">
                {convData.conversations.map(conv => (
                  <Link
                    key={conv._id}
                    to={`/dashboard/conversations/${conv._id}`}
                    className="card hover:border-slate-700 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-200 text-sm">{conv.customer?.name || 'Anonymous'}</p>
                      <p className="text-xs text-slate-500">
                        {conv.totalMessages} messages · {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${conv.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {conv.status}
                      </span>
                      <ArrowUpRight size={14} className="text-slate-500 group-hover:text-primary-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tickets */}
          {ticketData?.tickets?.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Ticket size={14} />
                Tickets ({ticketData.tickets.length})
              </h2>
              <div className="space-y-2">
                {ticketData.tickets.map(ticket => (
                  <Link
                    key={ticket._id}
                    to={`/dashboard/tickets/${ticket._id}`}
                    className="card hover:border-slate-700 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-200 text-sm">{ticket.title}</p>
                      <p className="text-xs text-slate-500">
                        {ticket.ticketNumber} · {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-yellow-500/20 text-yellow-400">{ticket.status}</span>
                      <ArrowUpRight size={14} className="text-slate-500 group-hover:text-primary-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Base */}
          {kbData?.documents?.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <BookOpen size={14} />
                Knowledge Base ({kbData.documents.length})
              </h2>
              <div className="space-y-2">
                {kbData.documents.map(doc => (
                  <Link
                    key={doc._id}
                    to="/dashboard/knowledge-base"
                    className="card hover:border-slate-700 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-200 text-sm">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {doc.type.toUpperCase()} · {doc.chunksCount} chunks · {doc.status}
                      </p>
                    </div>
                    <ArrowUpRight size={14} className="text-slate-500 group-hover:text-primary-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {!isLoading && !hasResults && (
            <div className="text-center py-12">
              <SearchIcon size={40} className="mx-auto mb-3 text-slate-600" />
              <h3 className="font-medium text-slate-300">No results found</h3>
              <p className="text-slate-500 text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {debouncedQuery.length <= 2 && (
        <div className="text-center py-16">
          <SearchIcon size={48} className="mx-auto mb-4 text-slate-700" />
          <h3 className="font-medium text-slate-400">Start typing to search</h3>
          <p className="text-slate-600 text-sm mt-1">Search across all your conversations, tickets, and documents</p>
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {['refund', 'password', 'shipping', 'billing'].map(term => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-sm transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
