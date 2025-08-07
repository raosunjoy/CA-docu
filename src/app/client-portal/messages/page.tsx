import ClientPortalLayout from '@/components/client-portal/ClientPortalLayout'
import ClientMessages from '@/components/client-portal/ClientMessages'

export default function ClientMessagesPage() {
  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-600">
            Communicate with your CA firm team
          </p>
        </div>
        
        <ClientMessages />
      </div>
    </ClientPortalLayout>
  )
}