import MobileClientLayout from '@/components/client-portal/mobile/MobileClientLayout'
import MobileClientDashboard from '@/components/client-portal/mobile/MobileClientDashboard'

export default function MobileClientPortalPage() {
  return (
    <MobileClientLayout>
      <MobileClientDashboard />
    </MobileClientLayout>
  )
}