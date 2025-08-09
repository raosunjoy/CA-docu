'use client'

import React from 'react'
import { ChartsDemo } from '../../components/charts/ChartsDemo'

export default function AnalyticsDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Demo</h1>
          <p className="text-gray-600">Interactive charts and visualizations showcase</p>
        </div>
        <ChartsDemo />
      </div>
    </div>
  )
}