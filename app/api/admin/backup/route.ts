import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

function escapeSqlValue(value: any): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) {
    // Format date to MySQL DATETIME format YYYY-MM-DD HH:MM:SS
    const pad = (n: number) => (n < 10 ? '0' + n : n)
    const y = value.getUTCFullYear()
    const m = pad(value.getUTCMonth() + 1)
    const d = pad(value.getUTCDate())
    const h = pad(value.getUTCHours())
    const min = pad(value.getUTCMinutes())
    const s = pad(value.getUTCSeconds())
    return `'${y}-${m}-${d} ${h}:${min}:${s}'`
  }
  if (typeof value === 'object') {
    // For JSON fields
    value = JSON.stringify(value)
  }
  // Escape string for SQL
  const escapedStr = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
  return `'${escapedStr}'`
}

function generateInsertQuery(tableName: string, rows: any[]): string {
  if (!rows || rows.length === 0) return ''

  const columns = Object.keys(rows[0])
  const columnsStr = columns.map(c => `\`${c}\``).join(', ')

  let sql = `INSERT INTO \`${tableName}\` (${columnsStr}) VALUES\n`

  const valuesStrs = rows.map(row => {
    const rowValues = columns.map(c => escapeSqlValue(row[c]))
    return `  (${rowValues.join(', ')})`
  })

  sql += valuesStrs.join(',\n') + ';\n\n'
  return sql
}

export async function GET() {
  try {
    const reqHeaders = headers()
    const userRole = reqHeaders.get('x-user-role')

    if (userRole !== 'administrator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch all data
    const [
      users,
      siswa,
      anggotaOsis,
      anggotaMpk,
      absensi,
      absensiOrganisasi,
      pengeluaranKas,
      logAktivitas
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.siswa.findMany(),
      prisma.anggotaOsis.findMany(),
      prisma.anggotaMpk.findMany(),
      prisma.absensi.findMany(),
      prisma.absensiOrganisasi.findMany(),
      prisma.pengeluaranKas.findMany(),
      prisma.logAktivitas.findMany()
    ])

    let sqlDump = `-- Database Backup (Format SQL)\n`
    sqlDump += `-- Dibuat pada: ${new Date().toISOString()}\n\n`

    sqlDump += `-- Tabel: users\n`
    sqlDump += generateInsertQuery('users', users)

    sqlDump += `-- Tabel: siswa\n`
    sqlDump += generateInsertQuery('siswa', siswa)

    sqlDump += `-- Tabel: anggota_osis\n`
    sqlDump += generateInsertQuery('anggota_osis', anggotaOsis)

    sqlDump += `-- Tabel: anggota_mpk\n`
    sqlDump += generateInsertQuery('anggota_mpk', anggotaMpk)

    sqlDump += `-- Tabel: absensi\n`
    sqlDump += generateInsertQuery('absensi', absensi)

    sqlDump += `-- Tabel: absensi_organisasi\n`
    sqlDump += generateInsertQuery('absensi_organisasi', absensiOrganisasi)

    sqlDump += `-- Tabel: pengeluaran_kas\n`
    sqlDump += generateInsertQuery('pengeluaran_kas', pengeluaranKas)

    sqlDump += `-- Tabel: log_aktivitas\n`
    sqlDump += generateInsertQuery('log_aktivitas', logAktivitas)

    const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const fileName = `backup-ekskul-${dateStr}.sql`

    return new NextResponse(sqlDump, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'Failed to generate backup' }, { status: 500 })
  }
}
