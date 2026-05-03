import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Copy, RefreshCw, Check, Loader2, Code2, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function Settings() {
  const { tenant, updateTenant } = useAuthStore();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('bot');

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/users/settings').then(r => r.data)
  });

  const [settings, setSettings] = useState({
    botName: 'Support Assistant',
    welcomeMessage: 'Hello! How can I help you today?',
    tone: 'professional',
    primaryColor: '#6366f1',
    widgetPosition: 'bottom-right',
    confidenceThreshold: 0.6,
    autoEscalate: true
  });

  useEffect(() => {
    if (settingsData?.settings) {
      setSettings(prev => ({ ...prev, ...settingsData.settings }));
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/users/settings', { settings }),
    onSuccess: (data) => {
      toast.success('Settings saved');
      updateTenant({ settings: data.data.settings });
    },
    onError: () => toast.error('Failed to save settings')
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: () => api.post('/users/regenerate-api-key'),
    onSuccess: (data) => {
      toast.success('API key regenerated');
      updateTenant({ apiKey: data.data.apiKey });
      queryClient.invalidateQueries(['settings']);
    }
  });

  const copyApiKey = () => {
    const key = settingsData?.apiKey || tenant?.apiKey;
    if (key) {
      navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('API key copied');
    }
  };

  const apiKey = settingsData?.apiKey || tenant?.apiKey;
  const widgetCode = `<!-- SupportAI Widget -->
<script>
  window.SupportAIConfig = {
    apiKey: "${apiKey || 'YOUR_API_KEY'}",
    position: "${settings.widgetPosition}"
  };
</script>
<script src="https://cdn.supportai.com/widget.js" async></script>`;

  const tabs = [
    { id: 'bot', label: 'Bot Settings' },
    { id: 'widget', label: 'Widget & Embed' },
    { id: 'escalation', label: 'Escalation' }
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure your AI chatbot and integration</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bot Settings */}
      {activeTab === 'bot' && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Bot size={18} className="text-primary-400" />
            Chatbot Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Bot Name</label>
              <input
                type="text"
                className="input"
                value={settings.botName}
                onChange={e => setSettings(p => ({ ...p, botName: e.target.value }))}
                placeholder="Support Assistant"
              />
            </div>
            <div>
              <label className="label">Response Tone</label>
              <select
                className="input"
                value={settings.tone}
                onChange={e => setSettings(p => ({ ...p, tone: e.target.value }))}
              >
                <option value="formal">Formal</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Welcome Message</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={settings.welcomeMessage}
              onChange={e => setSettings(p => ({ ...p, welcomeMessage: e.target.value }))}
              placeholder="Hello! How can I help you today?"
            />
          </div>

          <div>
            <label className="label">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer"
                value={settings.primaryColor}
                onChange={e => setSettings(p => ({ ...p, primaryColor: e.target.value }))}
              />
              <input
                type="text"
                className="input w-32"
                value={settings.primaryColor}
                onChange={e => setSettings(p => ({ ...p, primaryColor: e.target.value }))}
              />
            </div>
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Settings
          </button>
        </div>
      )}

      {/* Widget & Embed */}
      {activeTab === 'widget' && (
        <div className="space-y-6">
          {/* API Key */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4">API Key</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-slate-300 truncate">
                {apiKey ? `${apiKey.substring(0, 8)}${'•'.repeat(24)}` : 'Loading...'}
              </div>
              <button onClick={copyApiKey} className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0">
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => {
                  if (confirm('Regenerate API key? The old key will stop working.')) {
                    regenerateKeyMutation.mutate();
                  }
                }}
                className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0"
                disabled={regenerateKeyMutation.isPending}
              >
                <RefreshCw size={14} className={regenerateKeyMutation.isPending ? 'animate-spin' : ''} />
                Regenerate
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Keep this key secret. Use it to authenticate your chat widget.</p>
          </div>

          {/* Widget Position */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4">Widget Position</h2>
            <div className="grid grid-cols-2 gap-3">
              {['bottom-right', 'bottom-left'].map(pos => (
                <button
                  key={pos}
                  onClick={() => setSettings(p => ({ ...p, widgetPosition: pos }))}
                  className={`p-4 rounded-xl border text-sm font-medium transition-colors ${
                    settings.widgetPosition === pos
                      ? 'border-primary-500 bg-primary-600/10 text-primary-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {pos === 'bottom-right' ? '↘ Bottom Right' : '↙ Bottom Left'}
                </button>
              ))}
            </div>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary mt-4 flex items-center gap-2 text-sm">
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
          </div>

          {/* Embed Code */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Code2 size={18} className="text-primary-400" />
              Embed Code
            </h2>
            <p className="text-sm text-slate-400 mb-3">Add this snippet to your website's HTML, just before the closing &lt;/body&gt; tag:</p>
            <div className="relative">
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">
                {widgetCode}
              </pre>
              <button
                onClick={() => { navigator.clipboard.writeText(widgetCode); toast.success('Code copied'); }}
                className="absolute top-3 right-3 btn-secondary text-xs px-2 py-1"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation */}
      {activeTab === 'escalation' && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-white">Escalation Settings</h2>

          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
            <div>
              <p className="font-medium text-slate-200">Auto-Escalate to Tickets</p>
              <p className="text-sm text-slate-400 mt-0.5">Automatically create tickets when AI confidence is low</p>
            </div>
            <button
              onClick={() => setSettings(p => ({ ...p, autoEscalate: !p.autoEscalate }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.autoEscalate ? 'bg-primary-600' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.autoEscalate ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <label className="label">Confidence Threshold</label>
            <p className="text-xs text-slate-500 mb-3">
              Escalate when AI confidence falls below {Math.round(settings.confidenceThreshold * 100)}%
            </p>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={settings.confidenceThreshold}
              onChange={e => setSettings(p => ({ ...p, confidenceThreshold: parseFloat(e.target.value) }))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10% (escalate rarely)</span>
              <span className="font-medium text-primary-400">{Math.round(settings.confidenceThreshold * 100)}%</span>
              <span>90% (escalate often)</span>
            </div>
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Settings
          </button>
        </div>
      )}
    </div>
  );
}
