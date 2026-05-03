'use client'

import { useState, useEffect } from 'react'
import { Wallet, Search, Filter, Loader2 } from 'lucide-react'
import { formatCurrency, ORG_LABELS, OrgType } from '@/lib/utils'

interface KasData {
  id: number
  nama: string
  kelas: string
  total_kas: number
}

interface Props {
  user: { id: number; nama: string; email: string; role: string }
}

export default function KasClient({ user }: Props) {
  const [data, setData] = useState<KasData[]>([])
  const [totalKas, setTotalKas] = useState(0)
  const [orgs, setOrgs] = useState<string[]>([])
  const [activeOrg, setActiveOrg] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let url = `/api/kas?search=${encodeURIComponent(search)}`
    if (activeOrg) url += `&org=${activeOrg}`

    setLoading(true)
    const timeoutId = setTimeout(() => {
      fetch(url)
        .then(res => res.json())
        .then(json => {
          setData(json.data || [])
          setTotalKas(json.totalKas || 0)
          setOrgs(json.orgs || [])
          if (!activeOrg && json.activeOrg) setActiveOrg(json.activeOrg)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search, activeOrg])

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2.5">
          <Wallet className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Buku Kas</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">Laporan rekapitulasi pembayaran uang kas anggota secara keseluruhan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Card */}
        <div className="card p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white md:col-span-1 shadow-md">
          <div className="flex items-center gap-2 text-amber-100 mb-2">
            <Wallet className="w-5 h-5" />
            <h2 className="text-sm font-bold">Total Kas {activeOrg ? ORG_LABELS[activeOrg as OrgType] : ''}</h2>
          </div>
          <div className="text-3xl font-black font-mono">
            {formatCurrency(totalKas)}
          </div>
          <div className="text-xs text-amber-100 mt-2 opacity-80">
            Total dari seluruh anggota {activeOrg ? ORG_LABELS[activeOrg as OrgType] : ''}
          </div>
        </div>

        {/* Filters */}
        <div className="card p-5 md:col-span-2 flex flex-col justify-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama anggota..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
            {orgs.length > 1 && (
              <div className="relative w-full sm:w-48 flex-shrink-0">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={activeOrg}
                  onChange={e => setActiveOrg(e.target.value)}
                  className="input pl-9 appearance-none"
                >
                  {orgs.map(o => (
                    <option key={o} value={o}>{ORG_LABELS[o as OrgType]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-16">No</th>
                <th>Nama Anggota</th>
                <th>Unit / Kelas</th>
                <th className="text-right">Total Bayar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="h-32 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data kas...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="h-32 text-center text-slate-400">
                    Belum ada data anggota atau pembayaran kas.
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-medium text-slate-500">{idx + 1}</td>
                    <td className="font-bold text-slate-800">{item.nama}</td>
                    <td className="text-slate-500">{item.kelas}</td>
                    <td className="text-right font-mono font-bold text-emerald-600 bg-emerald-50/30">
                      {formatCurrency(item.total_kas)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
