import { Link } from 'react-router-dom';
import { Bot, Zap, Shield, BarChart3, MessageSquare, BookOpen, ArrowRight, Check, Star } from 'lucide-react';

const features = [
  { icon: Bot, title: 'AI-Powered Responses', desc: 'GPT-4 powered chatbot that understands context and delivers accurate, human-like answers.' },
  { icon: BookOpen, title: 'Knowledge Base Ingestion', desc: 'Upload PDFs, paste text, or scrape URLs. Your knowledge base powers every response.' },
  { icon: Zap, title: 'Real-Time Chat', desc: 'WebSocket-powered instant responses with typing indicators and conversation memory.' },
  { icon: Shield, title: 'Smart Escalation', desc: 'Low-confidence queries automatically create support tickets for human agents.' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track conversations, resolution rates, confidence scores, and team performance.' },
  { icon: MessageSquare, title: 'Multi-Tenant SaaS', desc: 'Isolated data per business. Each tenant gets their own knowledge base and chatbot.' },
];

const plans = [
  { name: 'Free', price: '$0', features: ['100 conversations/mo', '10 documents', '1 agent', 'Basic analytics'], cta: 'Get Started' },
  { name: 'Pro', price: '$49', features: ['5,000 conversations/mo', '100 documents', '5 agents', 'Advanced analytics', 'Custom branding', 'Priority support'], cta: 'Start Free Trial', popular: true },
  { name: 'Enterprise', price: 'Custom', features: ['Unlimited conversations', 'Unlimited documents', 'Unlimited agents', 'Custom integrations', 'SLA guarantee', 'Dedicated support'], cta: 'Contact Sales' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg">SupportAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-purple-900/20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-500/30 rounded-full px-4 py-1.5 text-sm text-primary-400 mb-6">
            <Zap size={14} />
            <span>AI-Powered Customer Support Automation</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Automate Support with{' '}
            <span className="text-gradient">Intelligent AI</span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your knowledge base, deploy an AI chatbot in minutes, and let it handle 80% of customer queries automatically — with smart escalation for the rest.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-base px-8 py-3 flex items-center justify-center gap-2">
              Start Free — No Credit Card
              <ArrowRight size={18} />
            </Link>
            <Link to="/demo" className="btn-secondary text-base px-8 py-3 flex items-center justify-center gap-2">
              <MessageSquare size={18} />
              Try Live Demo
            </Link>
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-slate-500">
            {['Free forever plan', 'No setup required', 'GDPR compliant'].map(item => (
              <div key={item} className="flex items-center gap-1.5">
                <Check size={14} className="text-green-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need to automate support</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              A complete platform from knowledge ingestion to AI responses to human escalation.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card hover:border-slate-700 transition-colors group">
                <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-600/30 transition-colors">
                  <Icon size={20} className="text-primary-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-400 text-lg">Start free, scale as you grow.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(({ name, price, features, cta, popular }) => (
              <div key={name} className={`card relative ${popular ? 'border-primary-500 ring-1 ring-primary-500/50' : ''}`}>
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-1">{name}</h3>
                  <div className="text-3xl font-bold text-white">{price}
                    {price !== 'Custom' && <span className="text-sm font-normal text-slate-400">/month</span>}
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check size={14} className="text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    popular ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to automate your support?</h2>
          <p className="text-slate-400 text-lg mb-8">
            Join hundreds of businesses using SupportAI to reduce support workload by up to 80%.
          </p>
          <Link to="/register" className="btn-primary text-base px-10 py-3 inline-flex items-center gap-2">
            Get Started Free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm">SupportAI</span>
          </div>
          <p className="text-slate-500 text-sm">© 2024 SupportAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
