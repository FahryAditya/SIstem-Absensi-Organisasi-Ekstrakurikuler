'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/auth-shared'
import {
  LayoutDashboard, Users, ClipboardList, Building2, UserCog,
  Download, ScrollText, GraduationCap, X, ChevronRight, Wallet, HandCoins, Database
} from 'lucide-react'

interface SidebarProps {
  user: { id: number; nama: string; email: string; role: string }
  mobileOpen?: boolean
  onClose?: () => void
}

function getNavItems(role: string) {
  const items = [
    { section: 'Utama', links: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/kas', label: 'Buku Kas', icon: Wallet },
      { href: '/pengeluaran', label: 'Pengeluaran Kas', icon: HandCoins },
    ]},
  ]

  const ekskulLinks = []
  const orgLinks = []

  if (role === 'administrator' || role === 'admin_programming' || role === 'admin_english') {
    if (role === 'administrator' || role === 'admin_programming') {
      ekskulLinks.push({ href: '/siswa?org=programming', label: 'Siswa Programming', icon: Users })
      ekskulLinks.push({ href: '/absensi?org=programming', label: 'Absensi Programming', icon: ClipboardList })
    }
    if (role === 'administrator' || role === 'admin_english') {
      ekskulLinks.push({ href: '/siswa?org=english', label: 'Siswa English', icon: Users })
      ekskulLinks.push({ href: '/absensi?org=english', label: 'Absensi English', icon: ClipboardList })
    }
    items.push({ section: 'Ekstrakurikuler', links: ekskulLinks })
  }

  if (role === 'administrator' || role === 'admin_osis_mpk') {
    orgLinks.push({ href: '/organisasi?org=osis', label: 'OSIS', icon: Building2 })
    orgLinks.push({ href: '/organisasi?org=mpk', label: 'MPK', icon: Building2 })
    items.push({ section: 'Organisasi', links: orgLinks })
  }

  const toolLinks = [
    { href: '/export', label: 'Export Data', icon: Download },
  ]

  if (role === 'administrator') {
    toolLinks.unshift({ href: '/admin', label: 'Kelola User', icon: UserCog })
    toolLinks.push({ href: '/log', label: 'Log Aktivitas', icon: ScrollText })
    toolLinks.push({ href: '/api/admin/backup', label: 'Backup SQL', icon: Database, target: '_blank' } as any)
  }

  items.push({ section: 'Tools', links: toolLinks })
  return items
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    administrator: 'bg-amber-50 border-amber-200 text-amber-700',
    admin_programming: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    admin_english: 'bg-blue-50 border-blue-200 text-blue-700',
    admin_osis_mpk: 'bg-violet-50 border-violet-200 text-violet-700',
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${colors[role] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {ROLE_LABELS[role] || role}
    </div>
  )
}

export default function Sidebar({ user, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItems(user.role)

  const isActive = (href: string) => {
    const base = href.split('?')[0]
    return pathname.startsWith(base)
  }

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-black text-slate-800 tracking-tight">Sistem Ekstrakurikuler Sekolah</div>
            <div className="text-[10px] text-slate-400 font-medium">v1.5</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden btn-icon">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Role badge */}
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <RoleBadge role={user.role} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navItems.map(section => (
          <div key={section.section} className="mb-1">
            <div className="nav-section">{section.section}</div>
            {section.links.map(link => {
              const Icon = link.icon
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  target={(link as any).target}
                  className={cn('nav-link', active && 'nav-link-active')}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate text-[13px]">{link.label}</span>
                  {active && <ChevronRight className="w-3 h-3 opacity-40" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {user.role === 'administrator' ? (
            <img src="https://uploads.onecompiler.io/43k3cj6jv/44n5t3sn5/WhatsApp%20Image%202026-05-03%20at%2011.12.38.jpeg" alt="Admin Profile" className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm border border-slate-200" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
              {user.nama.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 truncate">{user.nama}</div>
            <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-200 h-screen sticky top-0 shadow-sm">
        {content}
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="relative w-64 bg-white h-full shadow-2xl slide-up">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}
