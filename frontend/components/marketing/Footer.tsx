"use client"

import Link from "next/link"
import { Container } from "@/components/ui"

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm font-medium text-[--text-secondary] hover:text-white transition-colors relative group">
        {children}
        <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[--text-secondary] transition-all group-hover:w-full" />
      </Link>
    </li>
  )
}

export default function Footer() {
  return (
    <footer className="py-24 border-t border-white/5 bg-black/60 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[--primary]/50 to-transparent" />
      
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-12 lg:gap-8 border-b border-white/5 pb-20">
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-8 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[--primary] to-[--accent-violet] flex items-center justify-center font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]">N</div>
              <span className="text-2xl font-black text-white tracking-tighter font-jakarta">Neural<span className="text-[--primary]">BI</span></span>
            </Link>
            <p className="text-[--text-secondary] text-sm leading-relaxed max-w-sm font-medium">
              Autonomous Financial Intelligence for Modern Enterprises.
              Predictive cash flow, automated compliance, and real-time board reporting.
            </p>
            <div className="flex gap-4 mt-8">
              {['𝕏', 'in', 'gh'].map(icon => (
                <div key={icon} className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-sm font-bold text-[--text-secondary] hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer">
                  {icon}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-black mb-8 text-xs uppercase tracking-[0.2em] text-white">Platform</h4>
            <ul className="space-y-4">
              <FooterLink href="#">Autonomous CFO</FooterLink>
              <FooterLink href="#">Predictive Analytics</FooterLink>
              <FooterLink href="#">Statutory Intelligence</FooterLink>
              <FooterLink href="#">Enterprise Sync API</FooterLink>
              <FooterLink href="#">Security & Privacy</FooterLink>
            </ul>
          </div>
          
          <div>
            <h4 className="font-black mb-8 text-xs uppercase tracking-[0.2em] text-white">Solutions</h4>
            <ul className="space-y-4">
              <FooterLink href="#">For Finance Teams</FooterLink>
              <FooterLink href="#">For Retail Chains</FooterLink>
              <FooterLink href="#">For eCommerce</FooterLink>
              <FooterLink href="#">For SaaS</FooterLink>
              <FooterLink href="#">Investors</FooterLink>
            </ul>
          </div>

          <div>
            <h4 className="font-black mb-8 text-xs uppercase tracking-[0.2em] text-white">Resources</h4>
            <ul className="space-y-4">
              <FooterLink href="#">Documentation</FooterLink>
              <FooterLink href="#">Integration Guides</FooterLink>
              <FooterLink href="#">Blog & Insights</FooterLink>
              <FooterLink href="#">System Status</FooterLink>
              <FooterLink href="#">API Reference</FooterLink>
            </ul>
          </div>
          
          <div>
            <h4 className="font-black mb-8 text-xs uppercase tracking-[0.2em] text-white">Company</h4>
            <ul className="space-y-4">
              <FooterLink href="#">About Us</FooterLink>
              <FooterLink href="#">Careers</FooterLink>
              <FooterLink href="#">Contact Sales</FooterLink>
              <FooterLink href="#">Terms of Service</FooterLink>
              <FooterLink href="#">Privacy Policy</FooterLink>
            </ul>
          </div>
        </div>
        
        <div className="mt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[--text-muted] text-xs font-bold uppercase tracking-widest">© 2026 NeuralBI Inc. All rights reserved.</p>
          <div className="flex gap-6 items-center">
            <span className="flex items-center gap-2 text-[--text-muted] text-[10px] uppercase font-bold tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Nominal
            </span>
          </div>
        </div>
      </Container>
    </footer>
  )
}
