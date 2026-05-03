'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

interface DashboardLayoutProps {
  user: { id: number; nama: string; email: string; role: string }
  pageTitle: string
  children: React.ReactNode
}

export default function DashboardLayout({ user, pageTitle, children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const themeClass = user.role === 'administrator' ? 'theme-admin' : ''

  return (
    <div className={`flex h-screen overflow-hidden bg-slate-50 ${themeClass}`}>
      <Sidebar user={user} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar user={user} pageTitle={pageTitle} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
