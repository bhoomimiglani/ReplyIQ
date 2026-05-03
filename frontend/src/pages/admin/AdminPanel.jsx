import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, Building2, Loader2, Search, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('stats');
  const [userSearch, setUserSearch] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data.stats)
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', userSearch],
    queryFn: () => api.get('/admin/users', { params: { search: userSearch || undefined, limit: 50 } }).then(r => r.data),
    enabled: activeTab === 'users'
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['admin-tenants', tenantSearch],
    queryFn: () => api.get('/admin/tenants', { params: { search: tenantSearch || undefined, limit: 50 } }).then(r => r.data),
    enabled: activeTab === 'tenants'
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/admin/users/${id}`, { isActive }),
    onSuccess: () => { toast.success('User updated'); queryClient.invalidateQueries(['admin-users']); }
  });

  const toggleTenantMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/admin/tenants/${id}`, { isActive }),
    onSuccess: () => { toast.success('Tenant updated'); queryClient.invalidateQueries(['admin-tenants']); }
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, plan }) => api.put(`/admin/tenants/${id}`, { plan }),
    onSuccess: () => { toast.success('Plan updated'); queryClient.invalidateQueries(['admin-tenants']); }
  });

  const tabs = [
    { id: 'stats', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'tenants', label: 'Tenants' }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm">Platform management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, color: 'text-primary-400' },
            { label: 'Total Tenants', value: stats.totalTenants, color: 'text-blue-400' },
            { label: 'Active Tenants', value: stats.activeTenants, color: 'text-green-400' },
            { label: 'Total Conversations', value: stats.totalConversations, color: 'text-purple-400' },
            { label: 'Total Tickets', value: stats.totalTickets, color: 'text-yellow-400' },
            { label: 'Total Documents', value: stats.totalDocuments, color: 'text-orange-400' }
          ].map(({ label, value, color }) => (
            <div key={label} className="card">
              <div className={`text-3xl font-bold ${color} mb-1`}>{value ?? '—'}</div>
              <div className="text-sm text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" className="input pl-9" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          </div>
          <div className="card p-0 overflow-hidden">
            {usersLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">User</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Role</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Tenant</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Joined</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {usersData?.users?.map(user => (
                      <tr key={user._id} className="hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-200 text-sm">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`badge ${user.role === 'admin' ? 'bg-red-500/20 text-red-400' : user.role === 'business' ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-700 text-slate-400'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{user.tenantId?.name || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`badge ${user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleUserMutation.mutate({ id: user._id, isActive: !user.isActive })}
                            className={`p-1.5 rounded-lg transition-colors ${user.isActive ? 'text-slate-400 hover:text-red-400 hover:bg-red-400/10' : 'text-slate-400 hover:text-green-400 hover:bg-green-400/10'}`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <X size={15} /> : <Check size={15} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tenants */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" className="input pl-9" placeholder="Search tenants..." value={tenantSearch} onChange={e => setTenantSearch(e.target.value)} />
          </div>
          <div className="card p-0 overflow-hidden">
            {tenantsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Organization</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Owner</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Plan</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Created</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tenantsData?.tenants?.map(tenant => (
                      <tr key={tenant._id} className="hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-200 text-sm">{tenant.name}</p>
                          <p className="text-xs text-slate-500">{tenant.slug}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{tenant.owner?.name || '—'}</td>
                        <td className="px-6 py-4">
                          <select
                            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1"
                            value={tenant.plan}
                            onChange={e => updatePlanMutation.mutate({ id: tenant._id, plan: e.target.value })}
                          >
                            <option value="free">Free</option>
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`badge ${tenant.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {tenant.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleTenantMutation.mutate({ id: tenant._id, isActive: !tenant.isActive })}
                            className={`p-1.5 rounded-lg transition-colors ${tenant.isActive ? 'text-slate-400 hover:text-red-400 hover:bg-red-400/10' : 'text-slate-400 hover:text-green-400 hover:bg-green-400/10'}`}
                          >
                            {tenant.isActive ? <X size={15} /> : <Check size={15} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
