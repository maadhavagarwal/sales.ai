'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    // In production: POST to backend
    console.log('Access request:', email);
  };

  return (
    <div className="min-h-screen bg-[--bg-primary] text-[--text-primary]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[--border-default] bg-[--surface-1]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-[--primary] to-[--secondary] text-sm font-bold text-white">
              NB
            </div>
            <span className="font-bold text-lg">NeuralBI</span>
          </div>
          <div className="flex gap-8 items-center">
            <a href="#features" className="transition hover:text-[--primary]">Features</a>
            <a href="#pricing" className="transition hover:text-[--primary]">Pricing</a>
            <a href="#tour" className="transition hover:text-[--primary]">Tour</a>
            <Link href="/login" className="rounded-lg bg-[--primary] px-4 py-2 transition hover:brightness-110">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="space-y-6">
          <h1 className="bg-linear-to-r from-[--primary-light] via-[--accent-cyan] to-[--secondary] bg-clip-text text-5xl font-bold leading-tight text-transparent md:text-6xl">
            Transform Your Business Data Into Strategic Advantage
          </h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-[--text-secondary]">
            NeuralBI combines AI-powered analytics with enterprise-grade financial management. 
            Integrated with Tally, Zoho, and auto-generates GST compliance reports.
          </p>
          
          <div className="flex gap-4 justify-center pt-8">
            <button className="rounded-lg bg-linear-to-r from-[--primary] to-[--primary-dark] px-8 py-3 font-semibold text-white transition hover:brightness-110">
              Start Free Trial (30 days)
            </button>
            <button className="rounded-lg border border-[--border-strong] px-8 py-3 font-semibold transition hover:bg-[--surface-2]">
              Watch Product Tour (3 min)
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-8 pt-12 text-sm text-[--text-muted]">
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
      <section id="features" className="border-y border-[--border-default] bg-[--surface-1]/40 py-20">
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
              <div key={idx} className="rounded-lg border border-[--border-default] bg-[--surface-1] p-6 transition hover:border-[--border-accent]">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-[--text-secondary]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-linear-to-r from-[--primary]/10 to-[--secondary]/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: '45%', label: 'Time Saved' },
              { number: '85%', label: 'Decision Speed' },
              { number: '200+', label: 'Active Users' },
              { number: '$2.5M', label: 'Revenue Tracked' },
            ].map((stat, idx) => (
              <div key={idx}>
                <div className="mb-2 text-3xl font-bold text-[--primary-light]">{stat.number}</div>
                <p className="text-[--text-secondary]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Tour Section */}
      <section id="tour" className="py-20">
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
            
            <div className="rounded-lg border border-[--border-default] bg-[--surface-1] p-8">
              <div className="mb-4 flex h-40 items-center justify-center rounded bg-[--surface-2] p-4 text-[--text-secondary]">
                [Live Product Preview]
              </div>
              <button className="w-full rounded-lg bg-[--primary] py-2 font-semibold text-white transition hover:brightness-110">
                Launch Guided Tour
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="border-y border-[--border-default] bg-[--surface-1]/40 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="mb-12 text-center text-[--text-secondary]">Start free, scale as you grow</p>
          
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
                    ? 'bg-linear-to-br from-[--primary]/15 to-[--secondary]/15 border-[--primary] ring-2 ring-[--primary]/25' 
                    : 'bg-[--surface-1] border-[--border-default]'
              }`}>
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-sm text-[--text-secondary]">{tier.period}</span>
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
                    : 'border border-[--border-strong] hover:bg-[--surface-2]'
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
              <div key={idx} className="rounded-lg border border-[--border-default] bg-[--surface-1] p-6">
                <div className="flex gap-2 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="mb-4 italic text-[--text-secondary]">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-[--text-secondary]">{testimonial.role}</p>
                  <p className="text-xs text-[--text-muted]">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-linear-to-r from-[--primary] to-[--secondary] py-16 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Take Your Business to the Next Level?</h2>
          <p className="mb-8 text-lg text-white/85">Join 200+ businesses already using NeuralBI</p>
          
          <form onSubmit={handleAccessRequest} className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg bg-white px-4 py-3 text-black placeholder-gray-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-black/70 px-6 py-3 font-semibold text-white transition hover:bg-black/85"
            >
              Start Free
            </button>
          </form>
          
          {submitted && (
            <p className="text-green-200 mt-4">✓ Check your email for onboarding access!</p>
          )}
          
          <p className="mt-6 text-sm text-white/80">No credit card required • 30-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[--border-default] bg-[--surface-1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-[--text-secondary]">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-[--text-secondary]">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-[--text-secondary]">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Follow</h4>
              <ul className="space-y-2 text-sm text-[--text-secondary]">
                <li><a href="#" className="hover:text-white transition">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          
          <div className="flex items-center justify-between border-t border-[--border-default] pt-8 text-sm text-[--text-muted]">
            <p>© 2026 NeuralBI. All rights reserved.</p>
            <p>Made with ❤️ in India</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
