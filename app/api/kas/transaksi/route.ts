import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccessibleOrgs } from '@/lib/auth-shared'
import { createLog, getIp } from '@/lib/log'
import { z } from 'zod'

function getCtx(req: NextRequest) {
  return {
    userId: parseInt(req.headers.get('x-user-id') || '0'),
    userNama: req.headers.get('x-user-nama') || '',
    userRole: req.headers.get('x-user-role') || '',
  }
}

const schema = z.object({
  id_anggota: z.number().int().positive(),
  org: z.enum(['programming', 'english', 'osis', 'mpk']),
  nominal: z.number().int(), // positif untuk setor, negatif untuk tarik
  keterangan: z.string().min(1, 'Keterangan wajib diisi'),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = getCtx(req)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { id_anggota, org, nominal, keterangan } = parsed.data
    const accessible = getAccessibleOrgs(ctx.userRole)

    if (!accessible.includes(org)) {
      return NextResponse.json({ error: 'Akses ditolak untuk unit ini' }, { status: 403 })
    }

    if (nominal === 0) {
      return NextResponse.json({ error: 'Nominal tidak boleh nol' }, { status: 400 })
    }

    let namaAnggota = ''
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

    if (org === 'programming' || org === 'english') {
      const siswa = await prisma.siswa.findUnique({ where: { id: id_anggota } })
      if (!siswa || siswa.ekskul !== org) return NextResponse.json({ error: 'Siswa tidak valid' }, { status: 400 })
      namaAnggota = siswa.nama

      const existing = await prisma.absensi.findFirst({
        where: { siswa_id: id_anggota, tanggal: { gte: startOfDay, lte: endOfDay } }
      })

      if (existing) {
        await prisma.absensi.update({
          where: { id: existing.id },
          data: {
            uang_kas: existing.uang_kas + nominal,
            keterangan: existing.keterangan ? `${existing.keterangan} | ${keterangan}` : keterangan,
            updated_by: ctx.userId
          }
        })
      } else {
        await prisma.absensi.create({
          data: {
            siswa_id: id_anggota,
            tanggal: startOfDay,
            status: 'kas_saja' as any,
            uang_kas: nominal,
            keterangan: keterangan,
            created_by: ctx.userId,
          }
        })
      }
    } else if (org === 'osis') {
      const anggota = await prisma.anggotaOsis.findUnique({ where: { id: id_anggota } })
      if (!anggota) return NextResponse.json({ error: 'Anggota tidak valid' }, { status: 400 })
      namaAnggota = anggota.nama

      const existing = await prisma.absensiOrganisasi.findFirst({
        where: { organisasi_type: 'osis', anggota_osis_id: id_anggota, tanggal: { gte: startOfDay, lte: endOfDay } }
      })

      if (existing) {
        await prisma.absensiOrganisasi.update({
          where: { id: existing.id },
          data: {
            uang_kas: existing.uang_kas + nominal,
            keterangan: existing.keterangan ? `${existing.keterangan} | ${keterangan}` : keterangan,
            updated_by: ctx.userId
          }
        })
      } else {
        await prisma.absensiOrganisasi.create({
          data: {
            organisasi_type: 'osis',
            anggota_osis_id: id_anggota,
            tanggal: startOfDay,
            status: 'kas_saja' as any,
            uang_kas: nominal,
            keterangan: keterangan,
            created_by: ctx.userId,
          }
        })
      }
    } else if (org === 'mpk') {
      const anggota = await prisma.anggotaMpk.findUnique({ where: { id: id_anggota } })
      if (!anggota) return NextResponse.json({ error: 'Anggota tidak valid' }, { status: 400 })
      namaAnggota = anggota.nama

      const existing = await prisma.absensiOrganisasi.findFirst({
        where: { organisasi_type: 'mpk', anggota_mpk_id: id_anggota, tanggal: { gte: startOfDay, lte: endOfDay } }
      })

      if (existing) {
        await prisma.absensiOrganisasi.update({
          where: { id: existing.id },
          data: {
            uang_kas: existing.uang_kas + nominal,
            keterangan: existing.keterangan ? `${existing.keterangan} | ${keterangan}` : keterangan,
            updated_by: ctx.userId
          }
        })
      } else {
        await prisma.absensiOrganisasi.create({
          data: {
            organisasi_type: 'mpk',
            anggota_mpk_id: id_anggota,
            tanggal: startOfDay,
            status: 'kas_saja' as any,
            uang_kas: nominal,
            keterangan: keterangan,
            created_by: ctx.userId,
          }
        })
      }
    }

    const actionText = nominal > 0 ? 'menambahkan' : 'mengurangi'
    const absNominal = Math.abs(nominal)

    await createLog({
      userId: ctx.userId,
      userNama: ctx.userNama,
      aksi: 'CREATE',
      tabel: 'transaksi_kas',
      recordId: id_anggota.toString(),
      deskripsi: `${ctx.userNama} ${actionText} kas Rp ${absNominal.toLocaleString('id-ID')} untuk ${namaAnggota} (${org.toUpperCase()}). Ket: ${keterangan}`,
      ipAddress: getIp(req),
    })

    return NextResponse.json({ success: true, message: 'Transaksi kas berhasil disimpan' })
  } catch (e: any) {
    console.error('[KAS TRANSAKSI ERROR]', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server saat menyimpan kas' }, { status: 500 })
  }
}
