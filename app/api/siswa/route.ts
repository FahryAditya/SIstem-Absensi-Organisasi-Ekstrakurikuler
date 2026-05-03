import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLog, getIp } from '@/lib/log'
import { canAccessEnglish, canAccessProgramming, getAccessibleOrgs } from '@/lib/auth'
import { z } from 'zod'

function getCtx(req: NextRequest) {
  return {
    userId: parseInt(req.headers.get('x-user-id') || '0'),
    userNama: req.headers.get('x-user-nama') || '',
    userRole: req.headers.get('x-user-role') || '',
  }
}

const schema = z.object({
  nis: z.string().nullable().optional(),
  nama: z.string().min(1, 'Nama wajib diisi'),
  kelas: z.string().nullable().optional(),
  ekskul: z.enum(['programming', 'english']),
})

export async function GET(req: NextRequest) {
  const { userRole } = getCtx(req)
  const { searchParams } = new URL(req.url)
  const ekskul = searchParams.get('ekskul') as 'programming' | 'english' | null
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')

  // Role check
  const accessible = getAccessibleOrgs(userRole).filter(o => o === 'programming' || o === 'english')
  let ekskulFilter: ('programming' | 'english')[] = accessible as ('programming' | 'english')[]
  if (ekskul && accessible.includes(ekskul)) ekskulFilter = [ekskul]

  const where = {
    ekskul: { in: ekskulFilter },
    ...(search ? { nama: { contains: search } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.siswa.findMany({
      where,
      orderBy: [{ ekskul: 'asc' }, { nama: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.siswa.count({ where }),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const ctx = getCtx(req)
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { ekskul } = parsed.data
  if (ekskul === 'programming' && !canAccessProgramming(ctx.userRole))
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  if (ekskul === 'english' && !canAccessEnglish(ctx.userRole))
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const siswa = await prisma.siswa.create({
    data: { ...parsed.data, created_by: ctx.userId }
  })

  await createLog({
    userId: ctx.userId, userNama: ctx.userNama, aksi: 'CREATE',
    tabel: 'siswa', recordId: siswa.id,
    deskripsi: `${ctx.userNama} menambahkan siswa "${siswa.nama}" ke ${ekskul}`,
    dataBaru: { ...parsed.data },
    ipAddress: getIp(req),
  })

  return NextResponse.json({ data: siswa }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const ctx = getCtx(req)
  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const existing = await prisma.siswa.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })

  if (existing.ekskul === 'programming' && !canAccessProgramming(ctx.userRole))
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  if (existing.ekskul === 'english' && !canAccessEnglish(ctx.userRole))
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  const parsed = schema.safeParse({ ...existing, ...rest })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const updated = await prisma.siswa.update({ where: { id }, data: parsed.data })

  await createLog({
    userId: ctx.userId, userNama: ctx.userNama, aksi: 'UPDATE',
    tabel: 'siswa', recordId: id,
    deskripsi: `${ctx.userNama} mengubah data siswa "${updated.nama}"`,
    dataLama: { nama: existing.nama, kelas: existing.kelas, nis: existing.nis },
    dataBaru: { nama: updated.nama, kelas: updated.kelas, nis: updated.nis },
    ipAddress: getIp(req),
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest) {
  const ctx = getCtx(req)
  const { searchParams } = new URL(req.url)
  const idStr = searchParams.get('id')
  const idsStr = searchParams.get('ids')
  
  let idsToDelete: number[] = []
  
  if (idStr) {
    const id = parseInt(idStr)
    if (id) idsToDelete.push(id)
  } else if (idsStr) {
    idsToDelete = idsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
  }

  if (idsToDelete.length === 0) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const existingRecords = await prisma.siswa.findMany({ where: { id: { in: idsToDelete } } })
  if (existingRecords.length === 0) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })

  for (const existing of existingRecords) {
    if (existing.ekskul === 'programming' && !canAccessProgramming(ctx.userRole))
      return NextResponse.json({ error: `Akses ditolak untuk data ${existing.nama}` }, { status: 403 })
    if (existing.ekskul === 'english' && !canAccessEnglish(ctx.userRole))
      return NextResponse.json({ error: `Akses ditolak untuk data ${existing.nama}` }, { status: 403 })
  }

  await prisma.siswa.deleteMany({ where: { id: { in: idsToDelete } } })

  if (idsToDelete.length === 1) {
    const existing = existingRecords[0]
    await createLog({
      userId: ctx.userId, userNama: ctx.userNama, aksi: 'DELETE',
      tabel: 'siswa', recordId: existing.id,
      deskripsi: `${ctx.userNama} menghapus siswa "${existing.nama}" dari ${existing.ekskul}`,
      dataLama: { nama: existing.nama, ekskul: existing.ekskul },
      ipAddress: getIp(req),
    })
  } else {
    await createLog({
      userId: ctx.userId, userNama: ctx.userNama, aksi: 'DELETE',
      tabel: 'siswa', recordId: 0,
      deskripsi: `${ctx.userNama} menghapus ${idsToDelete.length} data siswa sekaligus`,
      dataLama: { count: idsToDelete.length, ids: idsToDelete },
      ipAddress: getIp(req),
    })
  }

  return NextResponse.json({ success: true })
}
