import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Mail, Shield, Trash2, Loader2, X, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../store/authStore';

function InviteModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'agent' });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const handleInvite = async () => {
    if (!form.name || !form.email) return toast.error('Name and email required');
    setSaving(true);
    try {
      const { data } = await api.post('/users/invite', form);
      setResult(data);
      queryClient.invalidateQueries(['team']);
      toast.success('Team member invited!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Invite failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Invite Team Member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <div>
                <label className="label">Full Name</label>
                <input type="text" className="input" placeholder="John Doe" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email Address</label>
                <input type="email" className="input" placeholder="john@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="agent">Support Agent</option>
                  <option value="business">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleInvite} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                  Send Invite
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-400 font-medium text-sm mb-1">✅ Team member created!</p>
                <p className="text-slate-400 text-xs">Share these credentials with {result.user?.name}:</p>
              </div>
              <div className="space-y-2">
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="text-slate-200 text-sm font-mono">{result.user?.email}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Temporary Password</p>
                  <div className="flex items-center justify-between">
                    <p className="text-slate-200 text-sm font-mono">{result.tempPassword}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(result.tempPassword); toast.success('Copied!'); }}
                      className="text-slate-400 hover:text-white"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">Ask them to change their password after first login.</p>
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Team() {
  const [showInvite, setShowInvite] = useState(false);
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/users/team').then(r => r.data)
  });

  const members = data?.users || [];

  const roleColors = {
    business: 'bg-primary-500/20 text-primary-400',
    agent: 'bg-green-500/20 text-green-400',
    admin: 'bg-red-500/20 text-red-400'
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-slate-400 mt-1">Manage your support team members</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Invite Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-white">{members.length}</div>
          <div className="text-xs text-slate-400 mt-1">Total Members</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-400">{members.filter(m => m.isActive).length}</div>
          <div className="text-xs text-slate-400 mt-1">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary-400">{members.filter(m => m.role === 'agent').length}</div>
          <div className="text-xs text-slate-400 mt-1">Agents</div>
        </div>
      </div>

      {/* Members list */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto mb-3 text-slate-600" />
            <h3 className="font-medium text-slate-300">No team members yet</h3>
            <p className="text-slate-500 text-sm mt-1">Invite agents to help handle escalated tickets</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {members.map(member => (
              <div key={member._id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors">
                <div className="w-10 h-10 bg-primary-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-400 font-bold text-sm">
                    {member.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-200">{member.name}</p>
                    {member._id === user?._id && (
                      <span className="badge bg-slate-700 text-slate-400 text-xs">You</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{member.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${roleColors[member.role] || 'bg-slate-700 text-slate-400'} capitalize`}>
                    {member.role}
                  </span>
                  <span className={`badge ${member.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {member.lastLogin
                      ? `Last seen ${formatDistanceToNow(new Date(member.lastLogin), { addSuffix: true })}`
                      : 'Never logged in'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
