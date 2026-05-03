'use client'

import { useState, useEffect } from 'react'
import { Wallet, Search, Filter, Loader2, Plus, Minus, X } from 'lucide-react'
import toast from 'react-hot-toast'
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

  // Transaction Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<KasData | null>(null)
  const [txType, setTxType] = useState<'setor' | 'tarik'>('setor')
  const [txNominal, setTxNominal] = useState('')
  const [txKet, setTxKet] = useState('')
  const [txLoading, setTxLoading] = useState(false)

  const fetchData = () => {
    let url = `/api/kas?search=${encodeURIComponent(search)}`
    if (activeOrg) url += `&org=${activeOrg}`

    setLoading(true)
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
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [search, activeOrg])

  function openModal(item: KasData, type: 'setor' | 'tarik') {
    setSelectedItem(item)
    setTxType(type)
    setTxNominal('')
    setTxKet('')
    setModalOpen(true)
  }

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem || !txNominal) return
    
    let nominalInt = parseInt(txNominal.replace(/\D/g, ''))
    if (isNaN(nominalInt) || nominalInt <= 0) return toast.error('Nominal tidak valid')
    
    if (txType === 'tarik') {
      nominalInt = -Math.abs(nominalInt)
      if (!txKet) return toast.error('Keterangan wajib diisi saat menarik/mengurangi kas')
    }

    setTxLoading(true)
    try {
      const res = await fetch('/api/kas/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_anggota: selectedItem.id,
          org: activeOrg,
          nominal: nominalInt,
          keterangan: txKet || 'Setor uang kas'
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      
      toast.success(json.message || 'Transaksi berhasil')
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    }
    setTxLoading(false)
  }

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
                <th className="w-12">No</th>
                <th className="min-w-[200px]">Nama Anggota</th>
                <th className="min-w-[120px]">Unit / Kelas</th>
                <th className="text-right min-w-[120px]">Total Kas</th>
                <th className="w-40 text-center">Aksi (Manual)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="h-32 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data kas...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="h-32 text-center text-slate-400">
                    Belum ada data anggota atau pembayaran kas.
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-medium text-slate-500">{idx + 1}</td>
                    <td className="font-bold text-slate-800 whitespace-nowrap">{item.nama}</td>
                    <td className="text-slate-500">{item.kelas}</td>
                    <td className="text-right font-mono font-bold text-emerald-600 bg-emerald-50/30">
                      {formatCurrency(item.total_kas)}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openModal(item, 'setor')} className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg tooltip-trigger" title="Setor / Tambah Kas">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => openModal(item, 'tarik')} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg tooltip-trigger" title="Tarik / Kurangi Kas">
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Transaksi */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm slide-up">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className={`p-4 border-b flex items-center justify-between text-white ${txType === 'setor' ? 'bg-green-600' : 'bg-red-600'}`}>
              <h3 className="font-bold flex items-center gap-2">
                {txType === 'setor' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                {txType === 'setor' ? 'Setor Kas Manual' : 'Tarik / Kurangi Kas'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleTransaction} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border text-sm">
                <div className="text-slate-500">Anggota</div>
                <div className="font-bold text-slate-800 text-base">{selectedItem.nama}</div>
              </div>

              <div className="form-group">
                <label className="label">Nominal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input 
                    type="text" 
                    value={txNominal} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '')
                      setTxNominal(val ? parseInt(val).toLocaleString('id-ID') : '')
                    }}
                    className="input pl-10 font-mono font-bold text-lg" 
                    placeholder="10.000" 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Keterangan {txType === 'tarik' && <span className="text-red-500">*</span>}</label>
                <input 
                  type="text" 
                  value={txKet} 
                  onChange={e => setTxKet(e.target.value)} 
                  className="input" 
                  placeholder={txType === 'setor' ? 'Misal: Pembayaran tunggakan bulan lalu' : 'Misal: Untuk beli spidol'} 
                  required={txType === 'tarik'}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center py-2.5">Batal</button>
                <button type="submit" disabled={txLoading} className={`btn flex-1 justify-center py-2.5 text-white ${txType === 'setor' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {txLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
