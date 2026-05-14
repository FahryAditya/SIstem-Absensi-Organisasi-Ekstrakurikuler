'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { OrgBadge } from '@/components/ui/Badges'
import { formatDate } from '@/lib/utils'
import { canAccessProgramming, canAccessEnglish } from '@/lib/auth-shared'
import { Plus, Search, Pencil, Trash2, Users, Loader2, Filter, Contact } from 'lucide-react'

interface Siswa {
  id: number; nis: string | null; nama: string; kelas: string | null; ekskul: string; created_at: string
}

interface Props {
  user: { id: number; nama: string; email: string; role: string }
  defaultOrg: 'programming' | 'english' | ''
}

const PAGE_SIZE = 15

export default function SiswaClient({ user, defaultOrg }: Props) {
  const [data, setData] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [orgFilter, setOrgFilter] = useState<string>(defaultOrg)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Siswa | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Siswa | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)

  // Form state
  const [fNama, setFNama] = useState('')
  const [fNis, setFNis] = useState('')
  const [fTingkat, setFTingkat] = useState('')
  const [fJurusan, setFJurusan] = useState('')
  const [fEkskul, setFEkskul] = useState<'programming' | 'english'>('programming')

  const canProg = canAccessProgramming(user.role)
  const canEng = canAccessEnglish(user.role)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      ...(search && { search }),
      ...(orgFilter && { ekskul: orgFilter }),
    })
    const res = await fetch(`/api/siswa?${params}`)
    const json = await res.json()
    setData(json.data || [])
    setTotal(json.total || 0)
    setTotalPages(json.totalPages || 1)
    setLoading(false)
  }, [page, search, orgFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1); setSelectedIds([]) }, [search, orgFilter])
  useEffect(() => { setSelectedIds([]) }, [page])

  function openAdd() {
    setEditTarget(null)
    setFNama(''); setFNis(''); setFTingkat(''); setFJurusan('')
    setFEkskul(defaultOrg || (canProg ? 'programming' : 'english'))
    setModalOpen(true)
  }

  function openEdit(s: Siswa) {
    setEditTarget(s)
    setFNama(s.nama); setFNis(s.nis || '')
    const kls = s.kelas || ''
    const parts = kls.split(' ')
    const t = ['X', 'XI', 'XII'].includes(parts[0]) ? parts[0] : ''
    setFTingkat(t)
    setFJurusan(t ? parts.slice(1).join(' ') : kls)
    setFEkskul(s.ekskul as 'programming' | 'english')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!fNama.trim()) { toast.error('Nama wajib diisi'); return }
    setSaving(true)
    const finalKelas = `${fTingkat} ${fJurusan}`.trim()
    const body = { nama: fNama.trim(), nis: fNis.trim() || undefined, kelas: finalKelas || undefined, ekskul: fEkskul }
    const res = await fetch('/api/siswa', {
      method: editTarget ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTarget ? { id: editTarget.id, ...body } : body),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || 'Gagal menyimpan'); setSaving(false); return }
    toast.success(editTarget ? 'Data siswa diperbarui' : 'Siswa berhasil ditambahkan')
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/siswa?id=${deleteTarget.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || 'Gagal menghapus'); setDeleting(false); return }
    toast.success('Siswa dihapus')
    setDeleting(false); setDeleteTarget(null); load()
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    const res = await fetch(`/api/siswa?ids=${selectedIds.join(',')}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || 'Gagal menghapus'); setBulkDeleting(false); return }
    toast.success(`${selectedIds.length} data siswa dihapus`)
    setBulkDeleting(false); setBulkDeleteConfirmOpen(false); setSelectedIds([]); load()
  }


  const columns = [
    { key: 'no', label: 'No', render: (_: Siswa, i?: number) => <span className="text-slate-400 font-mono text-xs">{(page - 1) * PAGE_SIZE + (i ?? 0) + 1}</span> },
    { key: 'nis', label: 'NIS', render: (s: Siswa) => <span className="font-mono text-xs text-slate-500">{s.nis || '-'}</span> },
    { key: 'nama', label: 'Nama Siswa', render: (s: Siswa) => <span className="font-semibold text-slate-800">{s.nama}</span> },
    { key: 'kelas', label: 'Kelas', render: (s: Siswa) => <span className="text-slate-500 text-xs">{s.kelas || '-'}</span> },
    { key: 'ekskul', label: 'Ekskul', render: (s: Siswa) => <OrgBadge org={s.ekskul} /> },
    { key: 'created_at', label: 'Terdaftar', render: (s: Siswa) => <span className="text-slate-400 text-xs">{formatDate(s.created_at)}</span> },
    {
      key: 'actions', label: '',
      render: (s: Siswa) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(s)} className="btn-icon text-indigo-500 hover:bg-indigo-50"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => setDeleteTarget(s)} className="btn-icon text-red-400 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )
    },
  ]

  // Override render to pass index
  const columnsWithIndex = columns.map(col => ({
    ...col,
    render: col.key === 'no'
      ? (item: Siswa) => {
          const idx = data.indexOf(item)
          return <span className="text-slate-400 font-mono text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</span>
        }
      : col.render
  }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-indigo-500" />
            <h2 className="page-title">Data Siswa</h2>
            <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-100">{total} siswa</span>
          </div>
          <p className="page-sub mt-0.5">Kelola daftar siswa ekstrakurikuler</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button onClick={() => setBulkDeleteConfirmOpen(true)} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Hapus Terpilih ({selectedIds.length})
            </button>
          )}
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Tambah Siswa
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau NIS siswa..." className="input pl-10" />
        </div>
        {canProg && canEng && (
          <div className="relative sm:w-44">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} className="input pl-10 appearance-none">
              <option value="">Semua Ekskul</option>
              <option value="programming">Programming</option>
              <option value="english">English Club</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <Table
        columns={columnsWithIndex as Parameters<typeof Table>[0]['columns']}
        data={data}
        loading={loading}
        emptyMessage="Belum ada siswa terdaftar"
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        rowKey={s => (s as Siswa).id}
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={editTarget ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
        onClose={() => setModalOpen(false)}
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</> : 'Simpan'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">Nama Lengkap *</label>
            <input 
              value={fNama} 
              onChange={e => {
                const val = e.target.value
                if (val && !/^[a-zA-Z\s.']*$/.test(val)) {
                  toast.error('Nama hanya boleh berisi huruf', { id: 'nama-error' })
                  return
                }
                setFNama(val)
              }} 
              placeholder="Nama lengkap siswa (Hanya Huruf)" 
              className="input" 
              autoFocus 
            />
          </div>
          
          <div className="form-group">
            <label className="label">NIS</label>
            <div className="relative">
              <Contact className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                value={fNis} 
                onChange={e => {
                  const val = e.target.value
                  if (val && !/^\d*$/.test(val)) {
                    toast.error('NIS hanya boleh berisi angka', { id: 'nis-error' })
                    return
                  }
                  setFNis(val)
                }} 
                placeholder="Opsional (Hanya Angka)" 
                className="input pl-9 font-mono" 
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Tingkat & Kejuruan</label>
            <div className="flex gap-3">
              <select value={fTingkat} onChange={e => setFTingkat(e.target.value)} className="input sm:w-32 w-28 cursor-pointer font-medium text-slate-700">
                <option value="" disabled>Tingkat</option>
                <option value="X">Kelas X</option>
                <option value="XI">Kelas XI</option>
                <option value="XII">Kelas XII</option>
              </select>
              <select value={fJurusan} onChange={e => setFJurusan(e.target.value)} className="input flex-1 cursor-pointer font-medium text-slate-700">
                <option value="" disabled>Pilih Kejuruan...</option>
                <option value="AKL">AKL</option>
                <option value="MPLB 1">MPLB 1</option>
                <option value="MPLB 2">MPLB 2</option>
                <option value="PPLG">PPLG</option>
                <option value="DKV">DKV</option>
                <option value="TJKT">TJKT</option>
                <option value="AKC">AKC</option>
                <option value="FKK">FKK</option>
                <option value="FARMASI">FARMASI</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Ekstrakurikuler</label>
            <select value={fEkskul} onChange={e => setFEkskul(e.target.value as 'programming' | 'english')}
              disabled={!canProg || !canEng} className="input cursor-pointer font-medium text-slate-700">
              {canProg && <option value="programming">Programming</option>}
              {canEng && <option value="english">English Club</option>}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Siswa?"
        message={`Data "${deleteTarget?.nama}" dan semua riwayat absensinya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        title="Hapus Siswa Terpilih?"
        message={`Sebanyak ${selectedIds.length} data siswa dan semua riwayat absensinya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`}
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
    </div>
  )
}
