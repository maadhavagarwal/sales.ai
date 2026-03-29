"use client"

import Link from "next/link"
import { Button, Container } from "@/components/ui"
import { ArrowRight } from "lucide-react"

function NavItem({
  href,
  children,
  dark,
}: {
  href: string
  children: React.ReactNode
  dark?: boolean
}) {
  return (
    <Link
      href={href}
      className={`text-[13px] font-semibold transition-colors relative group ${
        dark
          ? "text-zinc-400 hover:text-white"
          : "text-[--text-secondary] hover:text-[--text-primary]"
      }`}
    >
      {children}
      <span
        className={`absolute -bottom-1 left-0 w-0 h-[2px] rounded-full transition-all duration-300 group-hover:w-full ${
          dark ? "bg-indigo-400" : "bg-[--primary]"
        }`}
      />
    </Link>
  )
}

export default function Navbar({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark"

  return (
    <nav
      className={`fixed top-0 w-full z-50 border-b backdrop-blur-2xl ${
        dark ? "border-white/10 bg-zinc-950/75" : "border-[--border-subtle] bg-[--surface-1]/80"
      }`}
    >
      <Container>
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[--gradient-primary] flex items-center justify-center font-bold text-white shadow-[0_4px_16px_rgba(var(--primary-rgb),0.30)] group-hover:shadow-[0_8px_24px_rgba(var(--primary-rgb),0.40)] transition-all group-hover:scale-105">
              N
            </div>
            <span
              className={`text-xl font-extrabold tracking-tighter ${dark ? "text-white" : "text-[--text-primary]"}`}
            >
              Neural<span className="text-[--primary]">BI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <NavItem href="#platform" dark={dark}>
              Platform
            </NavItem>
            <NavItem href="#solutions" dark={dark}>
              Solutions
            </NavItem>
            <NavItem href="#customers" dark={dark}>
              Customers
            </NavItem>
            <NavItem href="#pricing" dark={dark}>
              Pricing
            </NavItem>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className={`hidden sm:block text-[13px] font-semibold transition-colors ${
                dark ? "text-zinc-400 hover:text-white" : "text-[--text-secondary] hover:text-[--text-primary]"
              }`}
            >
              Sign In
            </Link>
            <Link href="/register">
              <Button variant="pro" size="sm" className="text-[13px] font-semibold px-5">
                Start Free
                <ArrowRight size={14} className="ml-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </nav>
  )
}
