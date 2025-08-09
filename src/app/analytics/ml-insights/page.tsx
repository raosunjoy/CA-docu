'use client'

import React from 'react'
import { MLInsightsDashboard } from '@/components/analytics'

export default function MLInsightsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MLInsightsDashboard 
          customizable={true}
          className="space-y-6"
        />
      </div>
    </div>
  )
}