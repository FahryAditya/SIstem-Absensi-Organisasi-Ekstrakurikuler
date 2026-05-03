import { getServerUser } from '@/lib/server-utils'
import DashboardLayout from '@/components/layout/DashboardLayout'
import KasClient from './KasClient'

export const metadata = {
  title: 'Buku Kas - Sistem Ekstrakurikuler',
}

export default async function KasPage() {
  const user = await getServerUser()

  return (
    <DashboardLayout user={user} pageTitle="Buku Kas">
      <KasClient user={user} />
    </DashboardLayout>
  )
}
