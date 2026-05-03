import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccessibleOrgs } from '@/lib/auth-shared'
import { ORG_LABELS, STATUS_LABELS, formatDate, formatCurrency } from '@/lib/utils'
import * as XLSX from 'xlsx'

function getCtx(req: NextRequest) {
  return {
    userId: parseInt(req.headers.get('x-user-id') || '0'),
    userRole: req.headers.get('x-user-role') || '',
  }
}

export async function GET(req: NextRequest) {
  const { userRole } = getCtx(req)
  const { searchParams } = new URL(req.url)
  const tipe = searchParams.get('tipe') || 'absensi'
  const org = searchParams.get('org') || ''
  const startDate = searchParams.get('start') || ''
  const endDate = searchParams.get('end') || ''

  const wb = XLSX.utils.book_new()
  const accessible = getAccessibleOrgs(userRole)
  const filter = org && accessible.includes(org) ? [org] : accessible

  if (tipe === 'siswa') {
    for (const o of filter) {
      if (o === 'programming' || o === 'english') {
        const data = await prisma.siswa.findMany({
          where: { ekskul: o },
          orderBy: { nama: 'asc' }
        })
        const rows = data.map((s, i) => ({
          'No': i + 1, 'NIS': s.nis || '-', 'Nama': s.nama, 'Kelas': s.kelas || '-', 'Ekstrakurikuler': ORG_LABELS[s.ekskul as keyof typeof ORG_LABELS], 'Tanggal Daftar': formatDate(s.created_at),
        }))
        const ws = XLSX.utils.json_to_sheet(rows, { header: ['No', 'NIS', 'Nama', 'Kelas', 'Ekstrakurikuler', 'Tanggal Daftar'] })
        ws['!cols'] = [5,12,30,12,18,16].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, ws, ORG_LABELS[o as keyof typeof ORG_LABELS])
      } else {
        const data = o === 'osis' 
          ? await prisma.anggotaOsis.findMany({ orderBy: { nama: 'asc' } })
          : await prisma.anggotaMpk.findMany({ orderBy: { nama: 'asc' } })
        const rows = data.map((a, i) => ({
          'No': i + 1, 'NIS': a.nis || '-', 'Nama': a.nama, 'Kelas': a.kelas || '-', 'Jabatan': a.jabatan || '-',
        }))
        const ws = XLSX.utils.json_to_sheet(rows, { header: ['No', 'NIS', 'Nama', 'Kelas', 'Jabatan'] })
        ws['!cols'] = [5,12,28,12,20].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, ws, o.toUpperCase())
      }
    }

  } else if (tipe === 'absensi_ekskul' || tipe === 'absensi_organisasi') {
    for (const o of filter) {
      if (o === 'programming' || o === 'english') {
        const data = await prisma.absensi.findMany({
          where: { siswa: { ekskul: o }, ...(startDate && endDate ? { tanggal: { gte: new Date(startDate), lte: new Date(endDate) } } : {}) },
          include: { siswa: true, creator: { select: { nama: true } } },
          orderBy: [{ tanggal: 'desc' }, { siswa: { nama: 'asc' } }]
        })
        const rows = data.map((a, i) => ({
          'No': i + 1, 'Nama': a.siswa.nama, 'Kelas': a.siswa.kelas || '-', 'Ekskul': ORG_LABELS[a.siswa.ekskul as keyof typeof ORG_LABELS], 'Tanggal': formatDate(a.tanggal), 'Status': STATUS_LABELS[a.status], 'Uang Kas': a.uang_kas, 'Keterangan': a.keterangan || '-', 'Di-input oleh': a.creator.nama,
        }))
        const ws = XLSX.utils.json_to_sheet(rows, { header: ['No', 'Nama', 'Kelas', 'Ekskul', 'Tanggal', 'Status', 'Uang Kas', 'Keterangan', 'Di-input oleh'] })
        ws['!cols'] = [5,28,10,16,14,14,12,20,20].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, ws, ORG_LABELS[o as keyof typeof ORG_LABELS])
      } else {
        const data = await prisma.absensiOrganisasi.findMany({
          where: { organisasi_type: o as any, ...(startDate && endDate ? { tanggal: { gte: new Date(startDate), lte: new Date(endDate) } } : {}) },
          include: { anggota_osis: true, anggota_mpk: true },
          orderBy: { tanggal: 'desc' }
        })
        const rows = data.map((a, i) => {
          const anggota = o === 'osis' ? a.anggota_osis : a.anggota_mpk
          return { 'No': i + 1, 'Nama': anggota?.nama || '-', 'Jabatan': anggota?.jabatan || '-', 'Tanggal': formatDate(a.tanggal), 'Status': STATUS_LABELS[a.status], 'Uang Kas': a.uang_kas, 'Keterangan': a.keterangan || '-' }
        })
        const ws = XLSX.utils.json_to_sheet(rows, { header: ['No', 'Nama', 'Jabatan', 'Tanggal', 'Status', 'Uang Kas', 'Keterangan'] })
        ws['!cols'] = [5,28,20,14,14,12,20].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, ws, o.toUpperCase())
      }
    }

  } else if (tipe === 'rekap_siswa') {
    for (const o of filter) {
      if (o === 'programming' || o === 'english') {
        const siswaList = await prisma.siswa.findMany({ where: { ekskul: o }, orderBy: { nama: 'asc' } })
        const ids = siswaList.map(s => s.id)
        const absAll = await prisma.absensi.findMany({ where: { siswa_id: { in: ids }, ...(startDate && endDate ? { tanggal: { gte: new Date(startDate), lte: new Date(endDate) } } : {}) } })
        const rows = siswaList.map((s, i) => {
          const abs = absAll.filter(a => a.siswa_id === s.id)
          const absMeetings = abs.filter(a => a.status !== ('kas_saja' as any))
          const hadir = absMeetings.filter(a => a.status === 'hadir').length
          return {
            'No': i + 1, 'Nama': s.nama, 'Kelas': s.kelas || '-', 'Ekskul': ORG_LABELS[s.ekskul as keyof typeof ORG_LABELS], 'Total Pertemuan': absMeetings.length, 'Hadir': hadir, 'Tidak Hadir': absMeetings.filter(a => a.status === 'tidak_hadir').length, 'Izin': absMeetings.filter(a => a.status === 'izin').length, 'Sakit': absMeetings.filter(a => a.status === 'sakit').length, '% Kehadiran': absMeetings.length ? `${Math.round(hadir/absMeetings.length*100)}%` : '0%', 'Total Kas': abs.reduce((s, a) => s + (a.uang_kas || 0), 0),
          }
        })
        const ws = XLSX.utils.json_to_sheet(rows, { header: ['No', 'Nama', 'Kelas', 'Ekskul', 'Total Pertemuan', 'Hadir', 'Tidak Hadir', 'Izin', 'Sakit', '% Kehadiran', 'Total Kas'] })
        ws['!cols'] = [5,28,10,16,14,10,12,10,10,12,12].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, ws, ORG_LABELS[o as keyof typeof ORG_LABELS])
      } else {
        const anggotaList = o === 'osis' ? await prisma.anggotaOsis.findMany({ orderBy: { nama: 'asc' } }) : await prisma.anggotaMpk.findMany({ orderBy: { nama: 'asc' } })
        const ids = anggotaList.map(a => a.id)
        const absAll = await prisma.absensiOrganisasi.findMany({ where: { organisasi_type: o as any, ...(o === 'osis' ? { anggota_osis_id: { in: ids } } : { anggota_mpk_id: { in: ids } }), ...(startDate && endDate ? { tanggal: { gte: new Date(startDate), lte: new Date(endDate) } } : {}) } })
        const rows = anggotaList.map((a, i) => {
          const abs = absAll.filter(x => o === 'osis' ? x.anggota_osis_id === a.id : x.anggota_mpk_id === a.id)
          const absMeetings = abs.filter(x => x.status !== ('kas_saja' as any))
          const hadir = absMeetings.filter(x => x.status === 'hadir').length
          return {
            'No': i + 1, 'Nama': a.nama, 'Jabatan': a.jabatan || '-', 'Total Pertemuan': absMeetings.length, 'Hadir': hadir, 'Tidak Hadir': absMeetings.filter(x => x.status === 'tidak_hadir').length, 'Izin': absMeetings.filter(x => x.status === 'izin').length, 'Sakit': absMeetings.filter(x => x.status === 'sakit').length, '% Kehadiran': absMeetings.length ? `${Math.round(hadir/absMeetings.length*100)}%` : '0%', 'Total Kas': abs.reduce((s, x) => s + (x.uang_kas || 0), 0),
          }
        })
        const ws = XLSX.utils.json_to_sheet(rows, { header: ['No', 'Nama', 'Jabatan', 'Total Pertemuan', 'Hadir', 'Tidak Hadir', 'Izin', 'Sakit', '% Kehadiran', 'Total Kas'] })
        ws['!cols'] = [5,28,20,14,10,12,10,10,12,12].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, ws, o.toUpperCase())
      }
    }
  }

  // Final check: if no sheets were added, add a default one
  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tidak ada data yang tersedia untuk filter ini']]), 'Info')
  }

  const output = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const filename = `export_${tipe}_${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(output, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
}
