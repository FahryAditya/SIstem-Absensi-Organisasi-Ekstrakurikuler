import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccessibleOrgs } from '@/lib/auth-shared'

function getCtx(req: NextRequest) {
  return {
    userId: parseInt(req.headers.get('x-user-id') || '0'),
    userRole: req.headers.get('x-user-role') || '',
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userRole } = getCtx(req)
    const { searchParams } = new URL(req.url)
    const orgFilter = searchParams.get('org') || ''
    const searchQuery = searchParams.get('search') || ''

    const accessible = getAccessibleOrgs(userRole)
    const org = (orgFilter && accessible.includes(orgFilter)) ? orgFilter : accessible[0]

    if (!org) {
      return NextResponse.json({ data: [], totalKas: 0, orgs: [] })
    }

    let results: any[] = []
    let totalKasAll = 0

    const searchCondition = searchQuery ? { nama: { contains: searchQuery } } : {}

    if (org === 'programming' || org === 'english') {
      const siswaList = await prisma.siswa.findMany({
        where: { ekskul: org, ...searchCondition },
        include: { absensi: { select: { uang_kas: true, updated_at: true } } },
        orderBy: { nama: 'asc' }
      })

      results = siswaList.map(s => {
        let terakhir_bayar = null
        const paidAbsensi = s.absensi.filter((a: any) => a.uang_kas !== 0)
        if (paidAbsensi.length > 0) {
          const latest = paidAbsensi.reduce((a: any, b: any) => new Date(a.updated_at) > new Date(b.updated_at) ? a : b)
          terakhir_bayar = latest.updated_at.toISOString()
        }
        const total = s.absensi.reduce((sum: number, a: any) => sum + (a.uang_kas || 0), 0)
        totalKasAll += total
        return {
          id: s.id,
          nama: s.nama,
          kelas: s.kelas || '-',
          total_kas: total,
          terakhir_bayar
        }
      })
    } else if (org === 'osis') {
      const anggotaList = await prisma.anggotaOsis.findMany({
        where: searchCondition,
        include: { absensi: { select: { uang_kas: true, updated_at: true } } },
        orderBy: { nama: 'asc' }
      })

      results = anggotaList.map(a => {
        let terakhir_bayar = null
        const paidAbsensi = a.absensi.filter((ab: any) => ab.uang_kas !== 0)
        if (paidAbsensi.length > 0) {
          const latest = paidAbsensi.reduce((ab1: any, ab2: any) => new Date(ab1.updated_at) > new Date(ab2.updated_at) ? ab1 : ab2)
          terakhir_bayar = latest.updated_at.toISOString()
        }
        const total = a.absensi.reduce((sum: number, ab: any) => sum + (ab.uang_kas || 0), 0)
        totalKasAll += total
        return {
          id: a.id,
          nama: a.nama,
          kelas: a.jabatan || '-',
          total_kas: total,
          terakhir_bayar
        }
      })
    } else if (org === 'mpk') {
      const anggotaList = await prisma.anggotaMpk.findMany({
        where: searchCondition,
        include: { absensi: { select: { uang_kas: true, updated_at: true } } },
        orderBy: { nama: 'asc' }
      })

      results = anggotaList.map(a => {
        let terakhir_bayar = null
        const paidAbsensi = a.absensi.filter((ab: any) => ab.uang_kas !== 0)
        if (paidAbsensi.length > 0) {
          const latest = paidAbsensi.reduce((ab1: any, ab2: any) => new Date(ab1.updated_at) > new Date(ab2.updated_at) ? ab1 : ab2)
          terakhir_bayar = latest.updated_at.toISOString()
        }
        const total = a.absensi.reduce((sum: number, ab: any) => sum + (ab.uang_kas || 0), 0)
        totalKasAll += total
        return {
          id: a.id,
          nama: a.nama,
          kelas: a.jabatan || '-',
          total_kas: total,
          terakhir_bayar
        }
      })
    }

    return NextResponse.json({
      data: results,
      totalKas: totalKasAll,
      orgs: accessible,
      activeOrg: org
    })
  } catch (e: any) {
    console.error('[KAS ERROR]', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server saat memuat data kas' }, { status: 500 })
  }
}
