'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { RoleBadge } from '@/components/ui/Badges'
import { formatDateTime } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/auth-shared'
import { UserCog, Plus, Pencil, Trash2, Loader2, Shield, Mail, User, Lock, Eye, EyeOff, AlertTriangle, Database } from 'lucide-react'

interface UserData { id: number; nama: string; email: string; role: string; created_at: string }
interface Props { user: { id: number; nama: string; email: string; role: string } }

export default function AdminClient({ user }: Props) {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [fNama, setFNama] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fPassword, setFPassword] = useState('')
  const [fRole, setFRole] = useState<string>('admin_programming')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    const json = await res.json()
    setUsers(json.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditTarget(null); setFNama(''); setFEmail(''); setFPassword(''); setFRole('admin_programming')
    setShowPass(false); setModalOpen(true)
  }

  function openEdit(u: UserData) {
    setEditTarget(u); setFNama(u.nama); setFEmail(u.email); setFPassword(''); setFRole(u.role)
    setShowPass(false); setModalOpen(true)
  }

  async function handleSave() {
    if (!fNama.trim() || !fEmail.trim()) { toast.error('Nama dan email wajib diisi'); return }
    if (!editTarget && !fPassword) { toast.error('Password wajib diisi untuk user baru'); return }
    if (fPassword && fPassword.length < 6) { toast.error('Password minimal 6 karakter'); return }
    setSaving(true)

    const body: Record<string, unknown> = { nama: fNama.trim(), email: fEmail.trim(), role: fRole }
    if (fPassword) body.password = fPassword
    if (editTarget) body.id = editTarget.id

    const res = await fetch('/api/users', {
      method: editTarget ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || 'Gagal menyimpan'); setSaving(false); return }
    toast.success(editTarget ? 'User diperbarui' : 'User berhasil dibuat')
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || 'Gagal menghapus'); setDeleting(false); return }
    toast.success('User dihapus')
    setDeleting(false); setDeleteTarget(null); load()
  }

  // Stats by role
  const roleCount = (role: string) => users.filter(u => u.role === role).length

  const columns = [
    { key: 'nama', label: 'Nama', render: (u: UserData) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-black flex-shrink-0">
          {u.nama.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-sm">{u.nama}</div>
          {u.id === user.id && <span className="text-[10px] text-indigo-500 font-bold">● Anda</span>}
        </div>
      </div>
    )},
    { key: 'email', label: 'Email', render: (u: UserData) => <span className="text-xs text-slate-500 font-mono">{u.email}</span> },
    { key: 'password', label: 'Password', render: (u: UserData & { password?: string }) => (
      <span className="text-xs text-slate-500 font-mono">
        {u.password?.startsWith('$2') ? '(Teracak)' : (u.password || '-')}
      </span>
    )},
    { key: 'role', label: 'Role', render: (u: UserData) => <RoleBadge role={u.role} /> },
    { key: 'created_at', label: 'Dibuat', render: (u: UserData) => <span className="text-xs text-slate-400">{formatDateTime(u.created_at)}</span> },
    { key: 'actions', label: '', render: (u: UserData) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(u)} className="btn-icon text-indigo-400 hover:bg-indigo-50"><Pencil className="w-3.5 h-3.5" /></button>
        {u.id !== user.id && (
          <button onClick={() => setDeleteTarget(u)} className="btn-icon text-red-400 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
        )}
      </div>
    )},
  ]

  const roleGroups = [
    { role: 'administrator', label: 'Administrator', color: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
    { role: 'admin_programming', label: 'Admin Programming', color: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
    { role: 'admin_english', label: 'Admin English', color: 'bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
    { role: 'admin_osis_mpk', label: 'Admin OSIS & MPK', color: 'bg-violet-50 border-violet-200', dot: 'bg-violet-400' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div className="flex-1">
          <div className="flex items-center gap-2.5"><UserCog className="w-5 h-5 text-indigo-500" /><h2 className="page-title">Kelola User & Admin</h2></div>
          <p className="page-sub mt-0.5">Buat, edit, dan hapus akun pengguna sistem</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.open('/api/admin/backup', '_blank')} className="btn-secondary">
            <span className="flex items-center gap-2 text-indigo-600 font-semibold">
              <Database className="w-4 h-4" />
              Backup SQL
            </span>
          </button>
          <button onClick={() => window.open('/api/export?tipe=admin', '_blank')} className="btn-secondary">
            <span className="flex items-center gap-2 text-indigo-600 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Export XLS
            </span>
          </button>
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />Tambah User</button>
        </div>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {roleGroups.map(rg => (
          <div key={rg.role} className={`card p-4 border ${rg.color}`}>
            <div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full ${rg.dot}`}/><span className="text-xs font-bold text-slate-600">{rg.label}</span></div>
            <div className="text-2xl font-black text-slate-800 font-mono">{roleCount(rg.role)}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Table columns={columns} data={users} loading={loading} emptyMessage="Belum ada user" rowKey={(u: UserData) => u.id} />

      {/* Modal */}
      <Modal open={modalOpen} title={editTarget ? 'Edit User' : 'Tambah User Baru'} onClose={() => setModalOpen(false)} size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin"/>Menyimpan...</> : 'Simpan'}
            </button>
          </div>
        }>
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">Nama Lengkap *</label>
            <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input value={fNama} onChange={e => setFNama(e.target.value)} placeholder="Nama lengkap" className="input pl-10" autoFocus /></div>
          </div>
          <div className="form-group">
            <label className="label">Email *</label>
            <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="email@domain.com" className="input pl-10" /></div>
          </div>
          <div className="form-group">
            <label className="label">{editTarget ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}</label>
            <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input type={showPass ? 'text' : 'password'} value={fPassword} onChange={e => setFPassword(e.target.value)}
                placeholder={editTarget ? '(biarkan kosong)' : 'Min. 6 karakter'} className="input pl-10 pr-10" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Role / Hak Akses *</label>
            <select value={fRole} onChange={e => setFRole(e.target.value)} className="input">
              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex gap-2.5 text-xs text-amber-700">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5"/>
            <div><strong>Hak Akses:</strong><br/>
              <span className="text-emerald-700">Programming</span> → hanya data Programming<br/>
              <span className="text-blue-700">English</span> → hanya data English Club<br/>
              <span className="text-violet-700">OSIS & MPK</span> → hanya data OSIS & MPK<br/>
              <span className="text-amber-700">Administrator</span> → semua data + log aktivitas
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Hapus User?"
        message={`Akun "${deleteTarget?.nama}" (${ROLE_LABELS[deleteTarget?.role || ''] || deleteTarget?.role}) akan dihapus permanen.`}
        loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
