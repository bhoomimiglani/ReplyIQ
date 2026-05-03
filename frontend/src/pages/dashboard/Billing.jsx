import { Check, Zap, Crown, Building2, ArrowUpRight, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for trying out SupportAI',
    color: 'border-slate-700',
    features: [
      '100 conversations/month',
      '10 knowledge base documents',
      '1 team member',
      'Basic analytics',
      'Email support',
    ],
    limits: { conversations: 100, documents: 10, agents: 1 }
  },
  {
    name: 'Starter',
    price: '$19',
    period: '/month',
    description: 'For small businesses getting started',
    color: 'border-blue-500',
    popular: false,
    features: [
      '1,000 conversations/month',
      '50 knowledge base documents',
      '3 team members',
      'Advanced analytics',
      'Custom bot name',
      'Priority email support',
    ],
    limits: { conversations: 1000, documents: 50, agents: 3 }
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For growing businesses',
    color: 'border-primary-500',
    popular: true,
    features: [
      '5,000 conversations/month',
      '100 knowledge base documents',
      '5 team members',
      'Full analytics suite',
      'Custom branding',
      'Webhook integrations',
      'Priority support',
    ],
    limits: { conversations: 5000, documents: 100, agents: 5 }
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    color: 'border-purple-500',
    features: [
      'Unlimited conversations',
      'Unlimited documents',
      'Unlimited team members',
      'Custom integrations',
      'SLA guarantee',
      'Dedicated account manager',
      'On-premise option',
    ],
    limits: {}
  }
];

export default function Billing() {
  const { tenant } = useAuthStore();
  const currentPlan = tenant?.plan || 'free';

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
        <p className="text-slate-400 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current plan summary */}
      <div className="card border-primary-500/30 bg-primary-600/5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">Current Plan</p>
            <h2 className="text-2xl font-bold text-white capitalize">{currentPlan}</h2>
            <p className="text-slate-400 text-sm mt-1">
              {currentPlan === 'free' ? 'Free forever' : 'Billed monthly'}
            </p>
          </div>
          <span className="badge bg-primary-600/20 text-primary-400 border border-primary-500/30 capitalize text-sm px-3 py-1">
            {currentPlan}
          </span>
        </div>

        {/* Usage bars */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Conversations', used: tenant?.usage?.totalConversations ?? 0, max: tenant?.limits?.maxConversationsPerMonth ?? 100 },
            { label: 'Documents', used: tenant?.usage?.documentsCount ?? 0, max: tenant?.limits?.maxDocuments ?? 10 },
            { label: 'Team Members', used: 1, max: tenant?.limits?.maxAgents ?? 1 }
          ].map(({ label, used, max }) => {
            const pct = Math.min((used / max) * 100, 100);
            return (
              <div key={label}>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>{label}</span>
                  <span>{used} / {max}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-primary-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plans grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={`card relative border ${plan.color} ${plan.popular ? 'ring-1 ring-primary-500/50' : ''} flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-4">
                <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                <p className="text-slate-500 text-xs mt-0.5">{plan.description}</p>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {currentPlan === plan.name.toLowerCase() ? (
                <div className="w-full text-center py-2 rounded-lg bg-slate-700 text-slate-400 text-sm font-medium">
                  Current Plan
                </div>
              ) : plan.name === 'Enterprise' ? (
                <button className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                  Contact Sales <ArrowUpRight size={14} />
                </button>
              ) : (
                <button className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  plan.popular
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}>
                  Upgrade to {plan.name}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment method placeholder */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-primary-400" />
          Payment Method
        </h2>
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="w-10 h-7 bg-slate-600 rounded flex items-center justify-center">
            <CreditCard size={16} className="text-slate-400" />
          </div>
          <div>
            <p className="text-slate-300 text-sm">No payment method added</p>
            <p className="text-slate-500 text-xs">Add a card to upgrade your plan</p>
          </div>
          <button className="btn-primary text-sm ml-auto">Add Card</button>
        </div>
      </div>

      {/* Invoice history placeholder */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Invoice History</h2>
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No invoices yet</p>
          <p className="text-xs mt-1">Invoices will appear here after your first payment</p>
        </div>
      </div>
    </div>
  );
}
