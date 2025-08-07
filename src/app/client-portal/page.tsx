import ClientPortalLayout from '@/components/client-portal/ClientPortalLayout'
import ClientDashboard from '@/components/client-portal/ClientDashboard'

export default function ClientPortalPage() {
  return (
    <ClientPortalLayout>
      <ClientDashboard />
    </ClientPortalLayout>
  )
}