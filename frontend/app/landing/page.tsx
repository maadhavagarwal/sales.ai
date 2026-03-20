'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    // In production: POST to backend
    console.log('Demo request:', email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center font-bold text-sm">
              NB
            </div>
            <span className="font-bold text-lg">NeuralBI</span>
          </div>
          <div className="flex gap-8 items-center">
            <a href="#features" className="hover:text-blue-400 transition">Features</a>
            <a href="#pricing" className="hover:text-blue-400 transition">Pricing</a>
            <a href="#demo" className="hover:text-blue-400 transition">Demo</a>
            <Link href="/login" className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Transform Your Business Data Into Strategic Advantage
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            NeuralBI combines AI-powered analytics with enterprise-grade financial management. 
            Integrated with Tally, Zoho, and auto-generates GST compliance reports.
          </p>
          
          <div className="flex gap-4 justify-center pt-8">
            <button className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition">
              Start Free Trial (30 days)
            </button>
            <button className="border border-slate-500 px-8 py-3 rounded-lg font-semibold hover:bg-slate-800 transition">
              Watch Demo (3 min)
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex justify-center gap-8 pt-12 text-sm text-slate-400 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Used by 200+ SMBs
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 99.9% Uptime
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span> GDPR Compliant
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span> ISO 27001 (pending)
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-slate-800/50 py-20 border-y border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose NeuralBI?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🤖',
                title: 'AI-Powered Insights',
                desc: 'Automatic anomaly detection, demand forecasting, and trend analysis',
              },
              {
                icon: '📊',
                title: 'Real-time Dashboard',
                desc: 'Live KPIs updating every 30 seconds with interactive visualizations',
              },
              {
                icon: '🔄',
                title: 'Tally Integration',
                desc: 'Seamless bidirectional sync with native Tally Prime API support',
              },
              {
                icon: '💰',
                title: 'GST Compliance',
                desc: 'Auto-generates GSTR1, e-invoices with IRN & QR codes',
              },
              {
                icon: '📁',
                title: 'Multi-Silo Data',
                desc: 'Unified view across Finance, Inventory, HR, and Operations',
              },
              {
                icon: '🔒',
                title: 'Enterprise Security',
                desc: 'JWT auth, role-based access, audit trails, end-to-end encryption',
              },
            ].map((feature, idx) => (
              <div key={idx} className="p-6 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-blue-500 transition">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: '45%', label: 'Time Saved' },
              { number: '85%', label: 'Decision Speed' },
              { number: '200+', label: 'Active Users' },
              { number: '$2.5M', label: 'Revenue Tracked' },
            ].map((stat, idx) => (
              <div key={idx}>
                <div className="text-3xl font-bold text-blue-400 mb-2">{stat.number}</div>
                <p className="text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">See It In Action</h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6">Instant Data Intelligence</h3>
              <ul className="space-y-4">
                {[
                  'Upload invoices, inventory, customers in one click',
                  'AI auto-categorizes and validates data in seconds',
                  'Generate business insights in plain English',
                  'See revenue, margins, and trends in real-time',
                  'Sync with Tally with bidirectional updates',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-8 border border-slate-600">
              <div className="bg-slate-800 rounded p-4 mb-4 h-40 flex items-center justify-center text-slate-400">
                [Live Demo Preview]
              </div>
              <button className="w-full bg-blue-600 py-2 rounded-lg hover:bg-blue-700 transition">
                Launch Live Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-slate-800/50 py-20 border-y border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-slate-400 mb-12">Start free, scale as you grow</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Startup',
                price: '₹99',
                period: '/month',
                features: ['Up to 1,000 records', 'Basic analytics', 'Email support', 'Single user'],
              },
              {
                name: 'Professional',
                price: '₹499',
                period: '/month',
                features: ['Up to 50K records', 'AI insights', 'Tally sync', '5 team members', 'Priority support'],
                highlighted: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: 'contact sales',
                features: ['Unlimited records', 'Custom integrations', 'Dedicated support', 'White-label option', 'SLA guarantee'],
              },
            ].map((tier, idx) => (
              <div key={idx} className={`p-8 rounded-lg border transition ${
                tier.highlighted 
                  ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500 ring-2 ring-blue-500/30' 
                  : 'bg-slate-700/50 border-slate-600'
              }`}>
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-slate-400 text-sm">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-2 text-sm">
                      <span className="text-green-400">✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-2 rounded-lg transition ${
                  tier.highlighted
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'border border-slate-500 hover:bg-slate-800'
                }`}>
                  {tier.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">Trusted by Businesses</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Rajesh Kumar',
                role: 'Founder, TechStart Pvt Ltd',
                quote: 'NeuralBI reduced our month-end closing from 5 days to 4 hours. Amazing tool!',
                company: 'Tech Manufacturing',
              },
              {
                name: 'Priya Singh',
                role: 'CFO, Growth Ventures',
                quote: 'The AI insights caught a ₹50L inventory overstock. Best investment ever.',
                company: 'E-Commerce Platform',
              },
              {
                name: 'Arun Patel',
                role: 'Chartered Accountant',
                quote: 'My clients love the automatic GST/TDS compliance. Saving 20 hours/month.',
                company: 'Finance Consulting',
              },
            ].map((testimonial, idx) => (
              <div key={idx} className="p-6 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex gap-2 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-slate-300 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-slate-400">{testimonial.role}</p>
                  <p className="text-xs text-slate-500">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Take Your Business to the Next Level?</h2>
          <p className="text-lg text-blue-100 mb-8">Join 200+ businesses already using NeuralBI</p>
          
          <form onSubmit={handleDemo} className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white text-black placeholder-gray-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 px-6 py-3 rounded-lg font-semibold transition"
            >
              Start Free
            </button>
          </form>
          
          {submitted && (
            <p className="text-green-200 mt-4">✓ Check your email for demo access!</p>
          )}
          
          <p className="text-sm text-blue-100 mt-6">No credit card required • 30-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Follow</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700 pt-8 flex justify-between items-center text-sm text-slate-500">
            <p>© 2026 NeuralBI. All rights reserved.</p>
            <p>Made with ❤️ in India</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
