"use client"

import Link from "next/link"
import { Container } from "@/components/ui"
import { Github, Twitter, Linkedin, Heart } from "lucide-react"

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-[13px] font-medium text-[--text-muted] hover:text-[--text-primary] transition-colors">
        {children}
      </Link>
    </li>
  )
}

export default function Footer() {
  return (
    <footer className="py-16 sm:py-20 border-t border-[--border-subtle] bg-[--surface-1]/50 relative overflow-hidden">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 lg:gap-8 border-b border-[--border-subtle] pb-14">
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-6 group">
              <div className="w-9 h-9 rounded-xl bg-[--gradient-primary] flex items-center justify-center font-bold text-white shadow-[0_4px_16px_rgba(var(--primary-rgb),0.25)]">N</div>
              <span className="text-xl font-extrabold text-[--text-primary] tracking-tighter">Neural<span className="text-[--primary]">BI</span></span>
            </Link>
            <p className="text-[--text-muted] text-[13px] leading-relaxed max-w-sm font-medium">
              Autonomous Financial Intelligence for Modern Enterprises.
              Predictive cash flow, automated compliance, and real-time board reporting.
            </p>
            <div className="flex gap-2.5 mt-6">
              {[
                { icon: <Twitter size={15} />, label: "Twitter" },
                { icon: <Linkedin size={15} />, label: "LinkedIn" },
                { icon: <Github size={15} />, label: "GitHub" },
              ].map(social => (
                <div key={social.label} className="w-9 h-9 rounded-xl bg-[--surface-2] border border-[--border-subtle] flex items-center justify-center text-[--text-muted] hover:text-[--text-primary] hover:bg-[--surface-3] hover:border-[--border-default] transition-all cursor-pointer">
                  {social.icon}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-5 text-[11px] uppercase tracking-[0.15em] text-[--text-primary]">Platform</h4>
            <ul className="space-y-3">
              <FooterLink href="#">Autonomous CFO</FooterLink>
              <FooterLink href="#">Predictive Analytics</FooterLink>
              <FooterLink href="#">Statutory Intelligence</FooterLink>
              <FooterLink href="#">Enterprise Sync API</FooterLink>
              <FooterLink href="#">Security & Privacy</FooterLink>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-5 text-[11px] uppercase tracking-[0.15em] text-[--text-primary]">Solutions</h4>
            <ul className="space-y-3">
              <FooterLink href="#">For Finance Teams</FooterLink>
              <FooterLink href="#">For Retail Chains</FooterLink>
              <FooterLink href="#">For eCommerce</FooterLink>
              <FooterLink href="#">For SaaS</FooterLink>
              <FooterLink href="#">Investors</FooterLink>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-5 text-[11px] uppercase tracking-[0.15em] text-[--text-primary]">Resources</h4>
            <ul className="space-y-3">
              <FooterLink href="#">Documentation</FooterLink>
              <FooterLink href="#">Integration Guides</FooterLink>
              <FooterLink href="#">Blog & Insights</FooterLink>
              <FooterLink href="#">System Status</FooterLink>
              <FooterLink href="#">API Reference</FooterLink>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-5 text-[11px] uppercase tracking-[0.15em] text-[--text-primary]">Company</h4>
            <ul className="space-y-3">
              <FooterLink href="#">About Us</FooterLink>
              <FooterLink href="#">Careers</FooterLink>
              <FooterLink href="#">Contact Sales</FooterLink>
              <FooterLink href="#">Terms of Service</FooterLink>
              <FooterLink href="#">Privacy Policy</FooterLink>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-5">
          <p className="text-[--text-dim] text-[12px] font-medium flex items-center gap-1.5">
            © 2026 NeuralBI Inc. Built with <Heart size={12} className="text-[--accent-rose]" /> in India.
          </p>
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-2 text-[--text-muted] text-[11px] font-medium bg-[--surface-2]/60 px-3 py-1.5 rounded-full border border-[--border-subtle]">
              <div className="w-1.5 h-1.5 rounded-full bg-[--accent-emerald] animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </Container>
    </footer>
  )
}
