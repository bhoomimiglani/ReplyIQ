import { useState } from 'react';
import { Code2, Globe, Webhook, Copy, Check, ExternalLink, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export default function Integrations() {
  const { tenant } = useAuthStore();
  const [copied, setCopied] = useState('');

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(''), 2000);
  };

  const apiKey = tenant?.apiKey || 'YOUR_API_KEY';
  const baseUrl = window.location.origin;

  const embedCode = `<!-- SupportAI Chat Widget -->
<script>
  window.SupportAIConfig = {
    apiKey: "${apiKey}",
    position: "bottom-right",
    primaryColor: "${tenant?.settings?.primaryColor || '#6366f1'}"
  };
</script>
<script src="${baseUrl}/widget.js" async></script>`;

  const reactCode = `import { ChatWidget } from 'supportai-react';

export default function App() {
  return (
    <div>
      <ChatWidget
        apiKey="${apiKey}"
        position="bottom-right"
        primaryColor="${tenant?.settings?.primaryColor || '#6366f1'}"
      />
    </div>
  );
}`;

  const curlExample = `curl -X POST ${baseUrl}/api/chat/message \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "message": "What are your business hours?",
    "sessionId": "user-123",
    "customerName": "John Doe"
  }'`;

  const webhookExample = `{
  "event": "conversation.escalated",
  "tenantId": "${tenant?._id || 'tenant-id'}",
  "data": {
    "conversationId": "conv-id",
    "ticketId": "ticket-id",
    "ticketNumber": "TKT-00001",
    "customer": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "reason": "Low AI confidence: 35%"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}`;

  const integrations = [
    { name: 'Slack', desc: 'Get ticket notifications in Slack', icon: '💬', status: 'coming_soon' },
    { name: 'Zapier', desc: 'Connect with 5000+ apps', icon: '⚡', status: 'coming_soon' },
    { name: 'HubSpot', desc: 'Sync contacts and tickets', icon: '🔶', status: 'coming_soon' },
    { name: 'Zendesk', desc: 'Import/export tickets', icon: '🎫', status: 'coming_soon' },
    { name: 'Intercom', desc: 'Migrate conversations', icon: '💭', status: 'coming_soon' },
    { name: 'WhatsApp', desc: 'Chat via WhatsApp Business', icon: '📱', status: 'coming_soon' },
  ];

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-slate-400 mt-1">Connect SupportAI with your existing tools</p>
      </div>

      {/* Embed Widget */}
      <div className="card">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <Globe size={18} className="text-primary-400" />
          Website Widget
        </h2>
        <p className="text-slate-400 text-sm mb-4">Add the chat widget to any website with one snippet</p>
        <div className="relative">
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">
            {embedCode}
          </pre>
          <button
            onClick={() => copy(embedCode, 'embed')}
            className="absolute top-3 right-3 btn-secondary text-xs px-2 py-1 flex items-center gap-1"
          >
            {copied === 'embed' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied === 'embed' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* React SDK */}
      <div className="card">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <Code2 size={18} className="text-blue-400" />
          React Component
        </h2>
        <p className="text-slate-400 text-sm mb-4">Use the React component in your React/Next.js app</p>
        <div className="relative">
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">
            {reactCode}
          </pre>
          <button
            onClick={() => copy(reactCode, 'react')}
            className="absolute top-3 right-3 btn-secondary text-xs px-2 py-1 flex items-center gap-1"
          >
            {copied === 'react' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied === 'react' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* REST API */}
      <div className="card">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <Zap size={18} className="text-yellow-400" />
          REST API
        </h2>
        <p className="text-slate-400 text-sm mb-4">Send messages programmatically via our REST API</p>
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-2">Your API Key:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 truncate">
              {apiKey}
            </code>
            <button onClick={() => copy(apiKey, 'key')} className="btn-secondary text-xs px-2 py-1.5 flex items-center gap-1 flex-shrink-0">
              {copied === 'key' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              Copy
            </button>
          </div>
        </div>
        <div className="relative">
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">
            {curlExample}
          </pre>
          <button
            onClick={() => copy(curlExample, 'curl')}
            className="absolute top-3 right-3 btn-secondary text-xs px-2 py-1 flex items-center gap-1"
          >
            {copied === 'curl' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied === 'curl' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Webhooks */}
      <div className="card">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <Webhook size={18} className="text-purple-400" />
          Webhooks
        </h2>
        <p className="text-slate-400 text-sm mb-4">Receive real-time events when tickets are created or conversations escalate</p>
        <div className="mb-4">
          <label className="label">Webhook URL</label>
          <div className="flex gap-2">
            <input type="url" className="input flex-1" placeholder="https://your-server.com/webhook" />
            <button className="btn-primary text-sm px-4">Save</button>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-2">Example payload:</p>
          <div className="relative">
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">
              {webhookExample}
            </pre>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-400 mb-2">Available events:</p>
          <div className="flex flex-wrap gap-2">
            {['conversation.created', 'conversation.escalated', 'conversation.resolved', 'ticket.created', 'ticket.updated', 'ticket.resolved'].map(e => (
              <span key={e} className="badge bg-slate-800 text-slate-400 font-mono text-xs">{e}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Third-party integrations */}
      <div>
        <h2 className="font-semibold text-white mb-4">Third-Party Integrations</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {integrations.map(({ name, desc, icon, status }) => (
            <div key={name} className="card hover:border-slate-700 transition-colors">
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="font-medium text-white text-sm">{name}</h3>
              <p className="text-slate-500 text-xs mt-0.5 mb-3">{desc}</p>
              <span className="badge bg-slate-700 text-slate-400 text-xs">Coming Soon</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
