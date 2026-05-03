'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { formatDate, ORG_LABELS, OrgType } from '@/lib/utils'
import { getAccessibleOrgs, canAccessOsis, canAccessMpk, canAccessProgramming, canAccessEnglish } from '@/lib/auth-shared'
import { Download, FileSpreadsheet, CheckCircle, Loader2, Calendar, Filter, Info } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'

interface Props {
  user: { id: number; nama: string; email: string; role: string }
}

type ExportType = 'siswa' | 'absensi_ekskul' | 'rekap_siswa' | 'absensi_organisasi'

interface ExportOption {
  value: ExportType
  label: string
  desc: string
  icon: string
  needsDate: boolean
  needsOrg: boolean
  orgTypes: ('programming' | 'english' | 'osis' | 'mpk')[]
}

export default function ExportClient({ user }: Props) {
  const orgs = getAccessibleOrgs(user.role)
  const [exportType, setExportType] = useState<ExportType>('absensi_ekskul')
  const [orgFilter, setOrgFilter] = useState<string>('')
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  const ekskulOrgs = orgs.filter(o => ['programming', 'english'].includes(o))
  const orgOrgs = orgs.filter(o => ['osis', 'mpk'].includes(o))

  const exportOptions: ExportOption[] = [
    {
      value: 'absensi_ekskul' as ExportType,
      label: 'Laporan Absensi',
      desc: 'Riwayat absensi lengkap (Ekskul / OSIS / MPK)',
      icon: '📋',
      needsDate: true,
      needsOrg: orgs.length > 1,
      orgTypes: orgs as any[],
    },
    {
      value: 'rekap_siswa' as ExportType,
      label: 'Rekap Kehadiran',
      desc: 'Ringkasan kehadiran & kas per individu',
      icon: '📊',
      needsDate: true,
      needsOrg: orgs.length > 1,
      orgTypes: orgs as any[],
    },
    {
      value: 'siswa' as ExportType,
      label: 'Data Anggota / Siswa',
      desc: 'Daftar semua anggota unit yang terdaftar',
      icon: '👥',
      needsDate: false,
      needsOrg: orgs.length > 1,
      orgTypes: orgs as any[],
    },
  ]

  const currentOption = exportOptions.find(o => o.value === exportType) ?? exportOptions[0]

  async function handleExport() {
    if (!currentOption) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        tipe: exportType,
        ...(orgFilter && { org: orgFilter }),
        ...(currentOption.needsDate && startDate && { start: startDate }),
        ...(currentOption.needsDate && endDate && { end: endDate }),
      })
      const res = await fetch(`/api/export?${params}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error || 'Export gagal')
        setLoading(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('content-disposition') || ''
      const fname = cd.match(/filename="(.+)"/)?.[1] ?? `export_${exportType}_${format(new Date(), 'yyyyMMdd')}.xlsx`
      a.download = fname
      a.click()
      URL.revokeObjectURL(url)
      toast.success('File Excel berhasil diunduh! 📥')
    } catch {
      toast.error('Terjadi kesalahan saat export')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
          <h2 className="page-title">Export Data ke Excel</h2>
        </div>
        <p className="page-sub mt-0.5">Download laporan dalam format .xlsx untuk keperluan arsip atau analisis</p>
      </div>

      {/* Step 1: Jenis Export */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">1</span>
          <h3 className="text-sm font-bold text-slate-700">Pilih Jenis Export</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exportOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setExportType(opt.value); setOrgFilter('') }}
              className={`p-4 rounded-xl border text-left transition-all ${
                exportType === opt.value
                  ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="text-2xl mb-2">{opt.icon}</div>
              <div className="text-sm font-bold text-slate-800">{opt.label}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{opt.desc}</div>
              {exportType === opt.value && (
                <CheckCircle className="w-4 h-4 text-indigo-500 mt-2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Filter */}
      {currentOption && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">2</span>
            <h3 className="text-sm font-bold text-slate-700">Atur Filter</h3>
          </div>

          {/* Org filter */}
          {currentOption.needsOrg && currentOption.orgTypes.length > 0 && (
            <div className="form-group">
              <label className="label">
                <Filter className="w-3 h-3 inline mr-1" />
                {['osis', 'mpk', 'programming', 'english'].every(o => currentOption.orgTypes.includes(o as any)) ? 'Unit / Organisasi' : 'Ekstrakurikuler'}
              </label>
              <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} className="input">
                <option value="">Semua</option>
                {currentOption.orgTypes.map(o => (
                  <option key={o} value={o}>{ORG_LABELS[o as OrgType]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          {currentOption.needsDate && (
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Tanggal Mulai
                </label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
              </div>
              <div className="form-group">
                <label className="label">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Tanggal Akhir
                </label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
              </div>
            </div>
          )}

          {/* Preview info */}
          {currentOption.needsDate && startDate && endDate && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Mengexport data {currentOption.needsOrg && orgFilter ? ORG_LABELS[orgFilter as OrgType] : 'semua'} dari{' '}
                <strong>{formatDate(startDate)}</strong> sampai <strong>{formatDate(endDate)}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Download */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">3</span>
          <h3 className="text-sm font-bold text-slate-700">Download File</h3>
        </div>

        <button
          onClick={handleExport}
          disabled={loading || !currentOption}
          className="btn-primary w-full justify-center py-3 text-base"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" />Menyiapkan file Excel...</>
            : <><Download className="w-5 h-5" />Download Excel (.xlsx)</>
          }
        </button>

        <div className="mt-4 space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Format Microsoft Excel (.xlsx)</div>
          <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Data sesuai hak akses role Anda</div>
          <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Tersedia sheet Ringkasan untuk absensi ekskul</div>
          <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Siap cetak / kirim ke kepala sekolah</div>
        </div>
      </div>
    </div>
  )
}
