'use client'

import React from 'react'
import { LineChart, BarChart, PieChart, DonutChart, KPICard, generateMockData, generateKPIData } from './index'

export const ChartsDemo: React.FC = () => {
  const lineData = generateMockData(12)
  const barData = generateMockData(6)
  const pieData = [
    { name: 'Tax Services', value: 45 },
    { name: 'Audit', value: 30 },
    { name: 'Compliance', value: 15 },
    { name: 'Consultation', value: 10 }
  ]
  const kpiData = generateKPIData()

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics Charts Demo</h1>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Task Completion Rate"
            value={kpiData.taskCompletion.value}
            target={kpiData.taskCompletion.target}
            valueType="percentage"
            trend={kpiData.taskCompletion.trend}
            trendPercentage={kpiData.taskCompletion.trendPercentage}
            status={kpiData.taskCompletion.status}
            description="Percentage of tasks completed on time"
          />
          <KPICard
            title="Monthly Revenue"
            value={kpiData.revenue.value}
            target={kpiData.revenue.target}
            valueType="currency"
            trend={kpiData.revenue.trend}
            trendPercentage={kpiData.revenue.trendPercentage}
            status={kpiData.revenue.status}
            description="Total revenue generated this month"
          />
          <KPICard
            title="Client Satisfaction"
            value={kpiData.clientSatisfaction.value}
            target={kpiData.clientSatisfaction.target}
            valueType="number"
            unit="/5"
            trend={kpiData.clientSatisfaction.trend}
            trendPercentage={kpiData.clientSatisfaction.trendPercentage}
            status={kpiData.clientSatisfaction.status}
            description="Average client satisfaction rating"
          />
          <KPICard
            title="Compliance Score"
            value={kpiData.compliance.value}
            target={kpiData.compliance.target}
            valueType="percentage"
            trend={kpiData.compliance.trend}
            trendPercentage={kpiData.compliance.trendPercentage}
            status={kpiData.compliance.status}
            description="Overall compliance completion rate"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Line Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <LineChart
              data={lineData}
              xKey="name"
              yKeys={['revenue', 'tasks']}
              title="Revenue & Task Trends"
              height={300}
              valueType="number"
            />
          </div>

          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <BarChart
              data={barData}
              xKey="name"
              yKeys={['compliance']}
              title="Compliance Scores by Month"
              height={300}
              valueType="percentage"
            />
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <PieChart
              data={pieData}
              title="Service Distribution"
              height={300}
              valueType="percentage"
            />
          </div>

          {/* Donut Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <DonutChart
              data={pieData}
              title="Service Distribution (Donut)"
              height={300}
              valueType="percentage"
            />
          </div>
        </div>

        {/* Loading States Demo */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Loading States</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <LineChart
                data={[]}
                xKey="name"
                yKeys={['value']}
                title="Loading Chart"
                loading={true}
                height={200}
              />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <BarChart
                data={[]}
                xKey="name"
                yKeys={['value']}
                title="Error Chart"
                error="Failed to load data"
                height={200}
              />
            </div>
            <KPICard
              title="Loading KPI"
              value={0}
              loading={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}