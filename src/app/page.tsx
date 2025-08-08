import { Metadata } from 'next'
import WorkingLandingPage from '@/components/landing/WorkingLandingPage'

export const metadata: Metadata = {
  title: 'Zetra - Modern CA Platform',
  description: 'Streamline your practice with Zetra\'s intelligent CA platform. Automate compliance, manage clients, and grow your firm with confidence.',
}

export default function Home() {
  return <WorkingLandingPage />
}
