import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Save, Loader2, Camera, Building2, Mail, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function Profile() {
  const { user, tenant, refreshUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    organization: user?.organization || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', profileForm);
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (passwordForm.newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    setSaving(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'account', label: 'Account Info', icon: Building2 }
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-slate-400 mt-1">Manage your personal account settings</p>
      </div>

      {/* Avatar section */}
      <div className="card flex items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center text-3xl font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center border-2 border-slate-900 transition-colors">
            <Camera size={13} className="text-slate-300" />
          </button>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{user?.name}</h2>
          <p className="text-slate-400 text-sm">{user?.email}</p>
          <span className="badge bg-primary-600/20 text-primary-400 border border-primary-500/30 mt-1 capitalize">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-white">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                value={profileForm.name}
                onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Organization</label>
              <input
                type="text"
                className="input"
                value={profileForm.organization}
                onChange={e => setProfileForm(p => ({ ...p, organization: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" className="input pl-9 opacity-60 cursor-not-allowed" value={user?.email} disabled />
            </div>
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed. Contact support if needed.</p>
          </div>
          <button
            onClick={handleProfileSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-white">Change Password</h2>
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              placeholder="Enter current password"
              value={passwordForm.currentPassword}
              onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              placeholder="Min. 8 characters"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              placeholder="Repeat new password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
            />
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            Change Password
          </button>
        </div>
      )}

      {/* Account Info Tab */}
      {activeTab === 'account' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-white">Account Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Account ID', value: user?._id?.slice(-8)?.toUpperCase() },
              { label: 'Role', value: user?.role },
              { label: 'Plan', value: tenant?.plan },
              { label: 'Organization', value: tenant?.name },
              { label: 'Total Conversations', value: tenant?.usage?.totalConversations ?? 0 },
              { label: 'Total Messages', value: tenant?.usage?.totalMessages ?? 0 },
              { label: 'Documents', value: tenant?.usage?.documentsCount ?? 0 },
              { label: 'Total Tickets', value: tenant?.usage?.totalTickets ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-slate-500 text-xs mb-1">{label}</p>
                <p className="text-slate-200 font-medium capitalize">{value ?? '—'}</p>
              </div>
            ))}
          </div>

          {/* Plan limits */}
          <div className="border-t border-slate-800 pt-4">
            <h3 className="font-medium text-slate-300 mb-3 text-sm">Plan Limits</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Documents</span>
                  <span>{tenant?.usage?.documentsCount ?? 0} / {tenant?.limits?.maxDocuments ?? 10}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${Math.min(((tenant?.usage?.documentsCount ?? 0) / (tenant?.limits?.maxDocuments ?? 10)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Conversations this month</span>
                  <span>{tenant?.usage?.totalConversations ?? 0} / {tenant?.limits?.maxConversationsPerMonth ?? 100}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.min(((tenant?.usage?.totalConversations ?? 0) / (tenant?.limits?.maxConversationsPerMonth ?? 100)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
