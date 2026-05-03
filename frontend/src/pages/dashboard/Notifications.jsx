import { useState } from 'react';
import { Bell, CheckCheck, Ticket, MessageSquare, AlertCircle, Info, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Mock notifications - in production these come from backend
const mockNotifications = [
  {
    id: 1,
    type: 'ticket',
    title: 'New ticket created',
    message: 'A new support ticket TKT-00001 was created from an escalated conversation.',
    time: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    icon: Ticket,
    color: 'text-yellow-400 bg-yellow-400/10'
  },
  {
    id: 2,
    type: 'conversation',
    title: 'High volume alert',
    message: 'You have received 10 new conversations in the last hour.',
    time: new Date(Date.now() - 30 * 60 * 1000),
    read: false,
    icon: MessageSquare,
    color: 'text-blue-400 bg-blue-400/10'
  },
  {
    id: 3,
    type: 'alert',
    title: 'Low AI confidence detected',
    message: 'Multiple queries had confidence below 40%. Consider adding more content to your knowledge base.',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: true,
    icon: AlertCircle,
    color: 'text-orange-400 bg-orange-400/10'
  },
  {
    id: 4,
    type: 'info',
    title: 'Knowledge base processed',
    message: 'Your document "Acme Corp FAQs" has been successfully processed and is ready.',
    time: new Date(Date.now() - 3 * 60 * 60 * 1000),
    read: true,
    icon: Info,
    color: 'text-green-400 bg-green-400/10'
  },
  {
    id: 5,
    type: 'ticket',
    title: 'Ticket resolved',
    message: 'Support ticket TKT-00002 has been marked as resolved.',
    time: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: true,
    icon: Ticket,
    color: 'text-green-400 bg-green-400/10'
  }
];

export default function Notifications() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'tickets') return n.type === 'ticket';
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="badge bg-primary-600 text-white text-xs px-2 py-0.5">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-slate-400 mt-1">Stay updated on your support activity</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-2">
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'tickets', label: 'Tickets' }
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === id
                ? 'bg-primary-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Bell size={40} className="mx-auto mb-3 text-slate-600" />
            <h3 className="font-medium text-slate-300">No notifications</h3>
            <p className="text-slate-500 text-sm mt-1">You're all caught up!</p>
          </div>
        ) : (
          filtered.map(notif => {
            const Icon = notif.icon;
            return (
              <div
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`card cursor-pointer hover:border-slate-700 transition-all ${
                  !notif.read ? 'border-primary-500/30 bg-primary-600/5' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-medium text-sm ${!notif.read ? 'text-white' : 'text-slate-300'}`}>
                          {notif.title}
                          {!notif.read && (
                            <span className="ml-2 w-2 h-2 bg-primary-500 rounded-full inline-block" />
                          )}
                        </p>
                        <p className="text-slate-400 text-sm mt-0.5 leading-relaxed">{notif.message}</p>
                        <p className="text-slate-600 text-xs mt-1">
                          {formatDistanceToNow(notif.time, { addSuffix: true })}
                        </p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteNotification(notif.id); }}
                        className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Notification preferences */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Notification Preferences</h2>
        <div className="space-y-3">
          {[
            { label: 'New ticket created', desc: 'When AI escalates a conversation', enabled: true },
            { label: 'Ticket resolved', desc: 'When a ticket is marked resolved', enabled: true },
            { label: 'Low AI confidence', desc: 'When AI confidence drops below threshold', enabled: true },
            { label: 'High conversation volume', desc: 'When volume spikes significantly', enabled: false },
            { label: 'Knowledge base processed', desc: 'When documents finish processing', enabled: true },
          ].map(({ label, desc, enabled }) => (
            <div key={label} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <button
                className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-primary-600' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
