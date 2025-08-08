export { BaseChart, chartTheme, formatChartValue, CustomTooltip } from './BaseChart'
export { LineChart } from './LineChart'
export { BarChart } from './BarChart'
export { PieChart, DonutChart } from './PieChart'
export { KPICard } from './KPICard'

// Chart utility functions
export const generateMockData = (count: number = 12) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return Array.from({ length: count }, (_, i) => ({
    name: months[i % 12],
    value: Math.floor(Math.random() * 100) + 20,
    revenue: Math.floor(Math.random() * 50000) + 10000,
    tasks: Math.floor(Math.random() * 50) + 10,
    compliance: Math.floor(Math.random() * 30) + 70
  }))
}

export const generateKPIData = () => ({
  taskCompletion: {
    value: 87.5,
    target: 90,
    trend: 'up' as const,
    trendPercentage: 5.2,
    status: 'good' as const
  },
  revenue: {
    value: 125000,
    target: 150000,
    trend: 'up' as const,
    trendPercentage: 12.3,
    status: 'good' as const
  },
  clientSatisfaction: {
    value: 4.2,
    target: 4.5,
    trend: 'stable' as const,
    trendPercentage: 0.5,
    status: 'warning' as const
  },
  compliance: {
    value: 92,
    target: 95,
    trend: 'down' as const,
    trendPercentage: 2.1,
    status: 'warning' as const
  }
})