'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Blocks,
  BrainCircuit,
  Building2,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  LineChart,
  Quote,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';
import { Container } from '@/components/ui';

const showcaseFeatures = [
  {
    icon: BrainCircuit,
    title: 'AI revenue intelligence',
    desc: 'Anomaly detection, cash-flow foresight, and plain-language actions your team can run today.',
    accent: 'from-[--primary]/15 to-[--accent-violet]/10',
  },
  {
    icon: Blocks,
    title: 'Unified operating stack',
    desc: 'Finance, GST, expenses, CRM, and segments converge behind one command layer.',
    accent: 'from-[--accent-cyan]/12 to-[--primary]/10',
  },
  {
    icon: ShieldCheck,
    title: 'Audit-grade governance',
    desc: 'RBAC, evidence trails, backup drills, and launch gates built for regulated scale.',
    accent: 'from-[--accent-emerald]/12 to-[--accent-cyan]/8',
  },
];

const statCards = [
  { value: '9.2×', label: 'Faster insight cycles' },
  { value: '99.9%', label: 'Target uptime SLO' },
  { value: '200+', label: 'Live workspaces' },
  { value: '₹12Cr+', label: 'Tracked decisions' },
];

const trustLabels = ['Finance ops', 'RevOps', 'CFO office', 'Compliance', 'Retail scale-ups'];

const pricingTiers = [
  {
    name: 'Startup',
    price: '₹99',
    meta: '/ month',
    features: ['Core dashboards', 'Basic analytics', '1 workspace'],
  },
  {
    name: 'Professional',
    price: '₹499',
    meta: '/ month',
    featured: true,
    features: ['AI insights', 'GST workflows', '5 seats', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    meta: 'talk to sales',
    features: ['Unlimited modules', 'Advanced governance', 'Dedicated onboarding'],
  },
];

const faqItems = [
  {
    q: 'Does NeuralBI replace our ERP?',
    a: 'No — it orchestrates intelligence across finance, GST, CRM, and operations. Keep your ledger; add a decisive layer on top.',
  },
  {
    q: 'How does Indian compliance fit in?',
    a: 'GST workflows, expense intelligence, and audit-minded controls are first-class — not an afterthought bolt-on.',
  },
  {
    q: 'Can we try without a long implementation?',
    a: 'Yes. Register, sync workspace data, and your command center populates with charts and signals in minutes.',
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3200);
  };

  return (
    <div className="min-h-screen bg-[--background] text-[--text-primary] overflow-x-hidden">
      <style jsx global>{`
        @keyframes landing-shimmer {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }
        @keyframes landing-float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(1.5deg);
          }
        }
        .landing-hero-mesh {
          background:
            radial-gradient(ellipse 80% 60% at 10% 20%, rgba(var(--primary-rgb), 0.14), transparent 55%),
            radial-gradient(ellipse 70% 50% at 90% 10%, rgba(124, 58, 237, 0.1), transparent 50%),
            radial-gradient(ellipse 60% 40% at 70% 85%, rgba(6, 182, 212, 0.08), transparent 45%),
            var(--background);
        }
        .landing-grid-bg {
          background-image:
            linear-gradient(rgba(26, 22, 20, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26, 22, 20, 0.04) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
        }
        .landing-shine {
          background: linear-gradient(
            105deg,
            transparent 0%,
            rgba(255, 255, 255, 0.45) 45%,
            transparent 65%
          );
          background-size: 200% 100%;
          animation: landing-shimmer 8s ease infinite;
        }
      `}</style>

      <Navbar tone="dark" />

      {/* Hero — aligns visually with in-app dark command center */}
      <section className="relative min-h-[calc(100vh-4rem)] pt-28 pb-20 sm:pb-28 bg-zinc-950 text-zinc-100 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 20% 0%, rgba(79,109,245,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 20%, rgba(124,58,237,0.22), transparent 45%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(6,182,212,0.12), transparent 40%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
          aria-hidden
        />
        <Container size="xl" className="relative">
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-14 lg:gap-12">
            <div className="flex-1 flex flex-col justify-center max-w-2xl lg:max-w-none lg:w-[52%]">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-indigo-300" aria-hidden />
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-200">
                  Enterprise AI command layer
                </span>
              </div>

              <h1 className="mt-7 font-['Space_Grotesk',system-ui,sans-serif] text-[2.5rem] font-bold leading-[1.02] tracking-tight text-white sm:text-5xl md:text-[3.5rem]">
                The board doesn&apos;t need
                <span className="block mt-1 bg-gradient-to-r from-indigo-200 via-white to-cyan-200 bg-clip-text text-transparent">
                  another quiet dashboard.
                </span>
              </h1>

              <p className="mt-7 text-lg leading-relaxed text-zinc-400 md:text-xl md:leading-relaxed max-w-xl">
                NeuralBI builds a living command center: KPIs, charts, GST intelligence, and AI narrative in one
                place — so your team sees the story under the numbers.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-[--gradient-primary] px-7 py-4 text-sm font-bold text-white shadow-[0_24px_48px_-20px_rgba(79,109,245,0.85)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-7 py-4 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  Open command center
                  <ArrowUpRight className="h-4 w-4 opacity-80" />
                </Link>
              </div>

              <ul className="mt-10 flex flex-col gap-3 text-sm font-medium sm:flex-row sm:flex-wrap sm:gap-x-8">
                {['GST & expense intelligence', 'RBAC + audit posture', 'Workspace sync → dashboard'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-zinc-400">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex-1 lg:w-[48%] flex items-center">
              <div
                className="pointer-events-none absolute -right-4 -top-10 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl"
                style={{ animation: 'landing-float 10s ease-in-out infinite' }}
                aria-hidden
              />
              <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/70 p-px shadow-2xl shadow-black/50 backdrop-blur-xl">
                <div className="landing-shine pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay" aria-hidden />
                <div className="relative rounded-[1.9rem] bg-zinc-950/90 p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/90" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                      </div>
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                        command center / live
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 ring-1 ring-emerald-500/30">
                      Synced
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
                    {statCards.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 transition-transform hover:-translate-y-0.5"
                      >
                        <div className="font-['Space_Grotesk',system-ui,sans-serif] text-2xl font-bold tracking-tight text-white sm:text-3xl">
                          {stat.value}
                        </div>
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/90 to-zinc-800/50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-white">Launch readiness</div>
                      <div className="inline-flex items-center gap-1 text-xs font-bold uppercase text-emerald-400">
                        <BadgeCheck className="h-4 w-4" />
                        Go
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full w-[92%] rounded-full bg-[--gradient-primary]" />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                      Charts, anomaly checks, and liquidity blocks appear below KPIs after sync.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5">
                    <LineChart className="h-8 w-8 shrink-0 text-indigo-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-zinc-200">Narrative insight</p>
                      <p className="truncate text-[11px] text-zinc-500">
                        Margin drift flagged — open the AI tab for the playbook.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Trust strip */}
      <section className="border-y border-[--border-subtle] bg-[--surface-1]/60 py-6 backdrop-blur-sm">
        <Container size="xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[--text-muted] sm:text-left">
              Built for teams who ship under scrutiny
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              {trustLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[--border-subtle] bg-[--surface-2]/80 px-3 py-1.5 text-xs font-semibold text-[--text-secondary]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Platform */}
      <section id="platform" className="scroll-mt-24 py-20 md:py-28">
        <Container size="xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[--text-muted]">Platform</p>
              <h2 className="mt-2 font-['Space_Grotesk',system-ui,sans-serif] text-3xl font-bold tracking-tight text-[--text-primary] md:text-4xl">
                Serious infrastructure.
                <span className="text-[--text-secondary]"> Fast iteration.</span>
              </h2>
            </div>
            <div className="hidden items-center gap-2 text-sm font-semibold text-[--text-muted] md:inline-flex">
              <Building2 className="h-4 w-4" />
              Enterprise-first posture
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
            {showcaseFeatures.map((feature) => (
              <article
                key={feature.title}
                className={`group relative overflow-hidden rounded-3xl border border-[--border-default] bg-gradient-to-br ${feature.accent} p-6 shadow-[--shadow-sm] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[--shadow-md]`}
              >
                <div className="rounded-2xl bg-[--surface-1]/90 p-3 w-fit shadow-[--shadow-xs] ring-1 ring-[--border-subtle]">
                  <feature.icon className="h-7 w-7 text-[--primary]" />
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight capitalize">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[--text-secondary]">{feature.desc}</p>
                <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-[--primary]/10 blur-2xl transition-opacity group-hover:opacity-100" />
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* Solutions */}
      <section id="solutions" className="scroll-mt-24 border-y border-[--border-subtle] bg-[--surface-2]/40 py-20 md:py-28">
        <Container size="xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
            <div className="relative overflow-hidden rounded-[2rem] border border-[--border-default] bg-[--surface-1] p-8 shadow-[--shadow-md] md:p-10">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[--primary]">
                <ChartNoAxesCombined className="h-4 w-4" />
                Narrative layer
              </div>
              <h3 className="mt-4 font-['Space_Grotesk',system-ui,sans-serif] text-2xl font-bold leading-tight tracking-tight text-[--text-primary] md:text-3xl">
                From raw tables to board-ready decisions in one loop.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[--text-secondary] md:text-base">
                Upload spreadsheets, sync sources, and let the stack surface what matters: risk, momentum,
                and the next best move — without losing the audit trail.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[--text-secondary]">
                {[
                  'Copilot-grade explanations on top of your numbers',
                  'Forecast and anomaly views tuned for operators',
                  'Workspace modules that share one identity model',
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[--accent-emerald]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2rem] border-2 border-[--border-strong] bg-[--surface-1] p-8 md:p-10">
              <h4 className="font-['Space_Grotesk',system-ui,sans-serif] text-xl font-bold">Differentiators judges notice</h4>
              <ul className="mt-5 space-y-4 text-sm text-[--text-secondary]">
                {[
                  'Full billing lifecycle with entitlement sync and tax invoices',
                  'Security governance with hardened auth flows and audit trail',
                  'Operations command center with queues, runbooks, and launch review',
                  'Lineage and model context for explainable outputs',
                ].map((item) => (
                  <li key={item} className="flex gap-3 border-l-2 border-[--primary]/30 pl-4">
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[--primary] hover:underline"
              >
                Sign in to explore
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Customers */}
      <section id="customers" className="scroll-mt-24 py-20 md:py-24">
        <Container size="xl">
          <div className="mx-auto max-w-3xl text-center">
            <Quote className="mx-auto h-8 w-8 text-[--primary]/40" />
            <blockquote className="mt-4 font-['Space_Grotesk',system-ui,sans-serif] text-xl font-semibold leading-snug text-[--text-primary] md:text-2xl">
              We stopped exporting five spreadsheets before every leadership sync. NeuralBI became the one
              place we argue about strategy — not formatting.
            </blockquote>
            <p className="mt-4 text-sm font-bold text-[--text-muted]">Finance lead · multi-branch retail</p>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="scroll-mt-24 border-t border-[--border-subtle] bg-[--surface-2]/30 py-16 md:py-24">
        <Container size="md">
          <h2 className="text-center font-['Space_Grotesk',system-ui,sans-serif] text-2xl font-bold text-[--text-primary] md:text-3xl">
            Questions, answered
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-[--text-secondary]">
            Straight facts for teams evaluating a serious intelligence stack.
          </p>
          <div className="mt-10 space-y-3">
            {faqItems.map((item, i) => (
              <div
                key={item.q}
                className="rounded-2xl border border-[--border-default] bg-[--surface-1] shadow-[--shadow-xs] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-bold text-[--text-primary] text-sm md:text-base">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[--text-muted] transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="border-t border-[--border-subtle] px-5 py-4 text-sm text-[--text-secondary] leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 border-t border-[--border-subtle] bg-[--surface-1]/50 py-20 md:py-28">
        <Container size="xl">
          <h2 className="text-center font-['Space_Grotesk',system-ui,sans-serif] text-3xl font-bold tracking-tight text-[--text-primary] md:text-4xl">
            Pricing that tracks your execution speed
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[--text-secondary]">
            Start lean, graduate when governance and seat count demand it.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-3xl border p-6 shadow-[--shadow-sm] transition-all hover:shadow-[--shadow-md] md:p-8 ${
                  tier.featured
                    ? 'border-[--border-accent] bg-[--surface-1] ring-2 ring-[--primary]/15'
                    : 'border-[--border-default] bg-[--surface-1]/90'
                }`}
              >
                {tier.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[--gradient-primary] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-md">
                    Most chosen
                  </span>
                )}
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-[--text-muted]">{tier.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-['Space_Grotesk',system-ui,sans-serif] text-4xl font-bold">{tier.price}</span>
                </div>
                <div className="text-xs text-[--text-muted]">{tier.meta}</div>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-[--text-secondary]">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[--accent-emerald]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.name === 'Enterprise' ? '/login' : '/register'}
                  className={`mt-8 block w-full rounded-2xl py-3 text-center text-sm font-bold transition-colors ${
                    tier.featured
                      ? 'bg-[--gradient-primary] text-white shadow-[0_16px_32px_-20px_rgba(var(--primary-rgb),0.9)]'
                      : 'border-2 border-[--border-strong] bg-transparent text-[--text-primary] hover:bg-[--surface-2]'
                  }`}
                >
                  {tier.name === 'Enterprise' ? 'Contact sales' : 'Get started'}
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="relative py-16 md:py-20">
        <div className="absolute inset-0 bg-[--gradient-primary] opacity-[0.97]" aria-hidden />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.06%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-40" aria-hidden />
        <Container size="md" className="relative text-center">
          <h2 className="font-['Space_Grotesk',system-ui,sans-serif] text-3xl font-bold leading-tight text-white md:text-4xl">
            Ready for a product that looks as decisive as it runs?
          </h2>
          <p className="mt-3 text-sm text-white/85 md:text-base">
            Request access — we&apos;ll route you through a guided setup in minutes.
          </p>
          <form onSubmit={handleAccessRequest} className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-12 flex-1 rounded-2xl border-0 px-4 py-3 text-[--text-primary] shadow-lg placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/50"
              required
            />
            <button
              type="submit"
              className="min-h-12 rounded-2xl bg-[--text-primary] px-8 py-3 text-sm font-bold text-[--surface-1] transition-colors hover:bg-[--surface-2] hover:text-[--text-primary]"
            >
              Request invite
            </button>
          </form>
          {submitted && (
            <p className="mt-4 text-sm font-medium text-emerald-100">Request received — check your inbox.</p>
          )}
        </Container>
      </section>

      <Footer />
    </div>
  );
}
