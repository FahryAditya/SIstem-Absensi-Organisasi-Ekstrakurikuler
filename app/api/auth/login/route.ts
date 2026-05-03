import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, setSessionCookie } from '@/lib/auth'
import { createLog, getIp } from '@/lib/log'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { nama, email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Email tidak ditemukan' }, { status: 401 })
    }

    // Verifikasi nama (case-insensitive)
    const namaMatch = user.nama.toLowerCase().trim() === nama.toLowerCase().trim()
    if (!namaMatch) {
      return NextResponse.json({ error: 'Nama tidak sesuai dengan akun ini' }, { status: 401 })
    }

    // Verifikasi password (mendukung hash bcrypt lama dan plain text baru)
    let passwordMatch = false
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      passwordMatch = await bcrypt.compare(password, user.password)
    } else {
      passwordMatch = password === user.password
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    // Create JWT
    const sessionUser = { id: user.id, nama: user.nama, email: user.email, role: user.role }
    const token = await signToken(sessionUser)

    // Create log
    await createLog({
      userId: user.id,
      userNama: user.nama,
      aksi: 'LOGIN',
      tabel: 'users',
      recordId: user.id,
      deskripsi: `${user.nama} berhasil login`,
      ipAddress: getIp(req),
    })

    // Set cookie
    const response = NextResponse.json({ success: true, user: sessionUser })
    response.cookies.set('ekskul_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    return response
  } catch (e) {
    console.error('[LOGIN ERROR]', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
