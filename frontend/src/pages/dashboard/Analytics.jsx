import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, Loader2 } from 'lucide-react';
import api from '../../lib/api';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const StatCard = ({ label, value, sub, color = 'text-white' }) => (
  <div className="card">
    <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
    <div className="text-sm text-slate-400">{label}</div>
    {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
  </div>
);

export default function Analytics() {
  const [period, setPeriod] = useState('30');

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview', period],
    queryFn: () => api.get('/analytics/overview', { params: { period } }).then(r => r.data.overview)
  });

  const { data: chartData } = useQuery({
    queryKey: ['conversations-chart', period],
    queryFn: () => api.get('/analytics/conversations-over-time', { params: { period } }).then(r => r.data.data)
  });

  const { data: ticketStats } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: () => api.get('/analytics/ticket-stats').then(r => r.data)
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 mt-1">Performance metrics and insights</p>
        </div>
        <select
          className="input w-40"
          value={period}
          onChange={e => setPeriod(e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {overviewLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-primary-400" />
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Conversations" value={overview?.totalConversations ?? '—'} />
            <StatCard label="Resolution Rate" value={`${overview?.resolutionRate ?? 0}%`} color="text-green-400" />
            <StatCard label="Escalation Rate" value={`${overview?.escalationRate ?? 0}%`} color="text-red-400" />
            <StatCard label="Avg AI Confidence" value={`${overview?.avgConfidence ?? 0}%`} color="text-primary-400" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Tickets" value={overview?.totalTickets ?? '—'} />
            <StatCard label="Open Tickets" value={overview?.openTickets ?? '—'} color="text-yellow-400" />
            <StatCard label="Resolved Tickets" value={overview?.resolvedTickets ?? '—'} color="text-green-400" />
            <StatCard label="KB Documents" value={overview?.processedDocuments ?? '—'} color="text-purple-400" />
          </div>

          {/* Conversations Over Time */}
          {chartData && chartData.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-white mb-6">Conversations Over Time</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={false} name="Total" />
                  <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={false} name="Resolved" />
                  <Line type="monotone" dataKey="escalated" stroke="#ef4444" strokeWidth={2} dot={false} name="Escalated" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ticket Charts */}
          {ticketStats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* By Status */}
              <div className="card">
                <h2 className="font-semibold text-white mb-4">Tickets by Status</h2>
                {ticketStats.byStatus?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={ticketStats.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {ticketStats.byStatus.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-slate-500 text-sm text-center py-8">No data</p>}
              </div>

              {/* By Priority */}
              <div className="card">
                <h2 className="font-semibold text-white mb-4">Tickets by Priority</h2>
                {ticketStats.byPriority?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={ticketStats.byPriority}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-slate-500 text-sm text-center py-8">No data</p>}
              </div>

              {/* By Category */}
              <div className="card">
                <h2 className="font-semibold text-white mb-4">Tickets by Category</h2>
                {ticketStats.byCategory?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={ticketStats.byCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-slate-500 text-sm text-center py-8">No data</p>}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!chartData?.length && !ticketStats?.byStatus?.length && (
            <div className="card text-center py-16">
              <BarChart3 size={40} className="mx-auto mb-3 text-slate-600" />
              <h3 className="font-medium text-slate-300">No analytics data yet</h3>
              <p className="text-slate-500 text-sm mt-1">Data will appear here once customers start chatting</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
