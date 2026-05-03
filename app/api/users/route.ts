import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLog, getIp } from '@/lib/log'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

function getCtx(req: NextRequest) {
  return {
    userId: parseInt(req.headers.get('x-user-id') || '0'),
    userNama: req.headers.get('x-user-nama') || '',
    userRole: req.headers.get('x-user-role') || '',
  }
}

function requireAdmin(role: string) {
  return role === 'administrator'
}

export async function GET(req: NextRequest) {
  const { userRole } = getCtx(req)
  if (!requireAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: { id: true, nama: true, email: true, role: true, password: true, created_at: true },
    orderBy: { created_at: 'asc' }
  })
  return NextResponse.json({ data: users })
}

const createSchema = z.object({
  nama: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['administrator', 'admin_programming', 'admin_english', 'admin_osis_mpk']),
})

export async function POST(req: NextRequest) {
  const ctx = getCtx(req)
  if (!requireAdmin(ctx.userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 400 })

  const user = await prisma.user.create({
    data: { ...parsed.data, password: parsed.data.password },
    select: { id: true, nama: true, email: true, role: true }
  })

  await createLog({
    userId: ctx.userId, userNama: ctx.userNama, aksi: 'CREATE',
    tabel: 'users', recordId: user.id,
    deskripsi: `${ctx.userNama} membuat akun baru untuk "${user.nama}" dengan role ${user.role}`,
    dataBaru: { nama: user.nama, email: user.email, role: user.role },
    ipAddress: getIp(req),
  })

  return NextResponse.json({ data: user }, { status: 201 })
}

const updateSchema = z.object({
  id: z.number(),
  nama: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['administrator', 'admin_programming', 'admin_english', 'admin_osis_mpk']).optional(),
})

export async function PUT(req: NextRequest) {
  const ctx = getCtx(req)
  if (!requireAdmin(ctx.userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { id, password, ...rest } = parsed.data
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, nama: true, role: true } })
  if (!existing) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const updateData: Record<string, unknown> = { ...rest }
  if (password) updateData.password = password

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, nama: true, email: true, role: true }
  })

  await createLog({
    userId: ctx.userId, userNama: ctx.userNama, aksi: 'UPDATE',
    tabel: 'users', recordId: id,
    deskripsi: `${ctx.userNama} mengubah data user "${existing.nama}"${password ? ' (termasuk password)' : ''}`,
    dataLama: { nama: existing.nama, role: existing.role },
    dataBaru: { nama: updated.nama, role: updated.role },
    ipAddress: getIp(req),
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest) {
  const ctx = getCtx(req)
  if (!requireAdmin(ctx.userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get('id') || '0')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (id === ctx.userId) return NextResponse.json({ error: 'Tidak bisa hapus akun sendiri' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { id }, select: { nama: true, role: true } })
  if (!existing) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  await prisma.user.delete({ where: { id } })

  await createLog({
    userId: ctx.userId, userNama: ctx.userNama, aksi: 'DELETE',
    tabel: 'users', recordId: id,
    deskripsi: `${ctx.userNama} menghapus akun "${existing.nama}" (${existing.role})`,
    dataLama: { nama: existing.nama, role: existing.role },
    ipAddress: getIp(req),
  })

  return NextResponse.json({ success: true })
}
