"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button, Container } from "@/components/ui"

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-bold text-[--text-secondary] hover:text-white transition-colors relative group tracking-wide"
    >
      {children}
      <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-gradient-to-r from-[--primary] to-[--accent-violet] transition-all duration-300 group-hover:w-full" />
    </Link>
  )
}

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
      <Container>
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[--primary] to-[--accent-violet] flex items-center justify-center font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all">
              N
            </div>
            <span className="text-2xl font-black tracking-tighter text-white font-jakarta">
              Neural<span className="text-[--primary]">BI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <NavItem href="#platform">Platform</NavItem>
            <NavItem href="#solutions">Solutions</NavItem>
            <NavItem href="#customers">Customers</NavItem>
            <NavItem href="#pricing">Pricing</NavItem>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hidden sm:block text-sm font-bold text-[--text-secondary] hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard">
              <Button variant="pro" size="sm" className="shadow-[0_0_20px_rgba(99,102,241,0.2)]">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </Container>
    </nav>
  )
}
