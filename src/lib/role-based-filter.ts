import type { User } from '@/types'

// Role hierarchy for data access control
export const ROLE_HIERARCHY = {
  PARTNER: 4,
  MANAGER: 3,
  ASSOCIATE: 2,
  INTERN: 1,
  CLIENT: 0
} as const

export type Role = keyof typeof ROLE_HIERARCHY

// Data access permissions for each role
export interface DataAccessPermissions {
  canViewFinancials: boolean
  canViewAllTeamData: boolean
  canViewClientData: boolean
  canViewComplianceData: boolean
  canViewPersonalData: boolean
  canExportData: boolean
  canModifyDashboard: boolean
  restrictToOwnClients: boolean
  restrictToOwnTasks: boolean
  maxDataRetention: number // in days
}

/**
 * Get data access permissions for a specific role
 */
export const getRolePermissions = (role: Role): DataAccessPermissions => {
  switch (role) {
    case 'PARTNER':
      return {
        canViewFinancials: true,
        canViewAllTeamData: true,
        canViewClientData: true,
        canViewComplianceData: true,
        canViewPersonalData: true,
        canExportData: true,
        canModifyDashboard: true,
        restrictToOwnClients: false,
        restrictToOwnTasks: false,
        maxDataRetention: 365 * 3 // 3 years
      }

    case 'MANAGER':
      return {
        canViewFinancials: true,
        canViewAllTeamData: true,
        canViewClientData: true,
        canViewComplianceData: true,
        canViewPersonalData: true,
        canExportData: true,
        canModifyDashboard: true,
        restrictToOwnClients: false,
        restrictToOwnTasks: false,
        maxDataRetention: 365 * 2 // 2 years
      }

    case 'ASSOCIATE':
      return {
        canViewFinancials: false,
        canViewAllTeamData: false,
        canViewClientData: true,
        canViewComplianceData: true,
        canViewPersonalData: true,
        canExportData: true,
        canModifyDashboard: true,
        restrictToOwnClients: true,
        restrictToOwnTasks: true,
        maxDataRetention: 365 // 1 year
      }

    case 'INTERN':
      return {
        canViewFinancials: false,
        canViewAllTeamData: false,
        canViewClientData: false,
        canViewComplianceData: false,
        canViewPersonalData: true,
        canExportData: false,
        canModifyDashboard: false,
        restrictToOwnClients: true,
        restrictToOwnTasks: true,
        maxDataRetention: 90 // 3 months
      }

    case 'CLIENT':
      return {
        canViewFinancials: false,
        canViewAllTeamData: false,
        canViewClientData: false,
        canViewComplianceData: false,
        canViewPersonalData: true,
        canExportData: false,
        canModifyDashboard: false,
        restrictToOwnClients: true,
        restrictToOwnTasks: true,
        maxDataRetention: 30 // 1 month
      }

    default:
      // Default to most restrictive permissions
      return getRolePermissions('INTERN')
  }
}

/**
 * Check if a role has higher or equal access level than another
 */
export const hasRoleAccess = (userRole: Role, requiredRole: Role): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Filter dashboard widgets based on user role
 */
export const filterWidgetsByRole = (
  widgets: string[],
  userRole: Role
): string[] => {
  const permissions = getRolePermissions(userRole)
  
  return widgets.filter(widgetId => {
    switch (widgetId) {
      case 'financial_metrics':
        return permissions.canViewFinancials

      case 'team_performance':
        return permissions.canViewAllTeamData

      case 'client_engagement':
        return permissions.canViewClientData

      case 'compliance_status':
        return permissions.canViewComplianceData

      case 'task_overview':
      case 'workload_analytics':
        return permissions.canViewPersonalData

      default:
        // Allow unknown widgets for Partners and Managers, restrict for others
        return hasRoleAccess(userRole, 'MANAGER')
    }
  })
}

/**
 * Filter analytics data based on user role and ownership
 */
export const filterAnalyticsData = (
  data: any,
  userRole: Role,
  userId: string,
  organizationId: string
): any => {
  const permissions = getRolePermissions(userRole)

  // If user has full access, return data as-is
  if (hasRoleAccess(userRole, 'MANAGER')) {
    return data
  }

  // Apply role-based filtering
  const filteredData = { ...data }

  // Filter financial data
  if (!permissions.canViewFinancials) {
    delete filteredData.financial
    delete filteredData.revenue
    delete filteredData.profitability
  }

  // Filter team data
  if (!permissions.canViewAllTeamData) {
    if (filteredData.team) {
      filteredData.team = {
        ...filteredData.team,
        // Only show user's own performance data
        members: filteredData.team.members?.filter((member: any) => member.id === userId) || [],
        // Remove sensitive team metrics
        utilizationByMember: undefined,
        performanceComparison: undefined
      }
    }
  }

  // Filter client data
  if (!permissions.canViewClientData) {
    delete filteredData.client
    delete filteredData.clientEngagement
  } else if (permissions.restrictToOwnClients) {
    if (filteredData.client) {
      filteredData.client = {
        ...filteredData.client,
        // Filter to only clients assigned to this user
        clients: filteredData.client.clients?.filter((client: any) => 
          client.assignedTo === userId || client.ownerId === userId
        ) || []
      }
    }
  }

  // Filter compliance data
  if (!permissions.canViewComplianceData) {
    delete filteredData.compliance
  }

  // Filter task data
  if (permissions.restrictToOwnTasks) {
    if (filteredData.productivity) {
      filteredData.productivity = {
        ...filteredData.productivity,
        // Only show user's own tasks
        tasks: filteredData.productivity.tasks?.filter((task: any) => 
          task.assigneeId === userId || task.createdBy === userId
        ) || [],
        // Remove team-wide productivity metrics
        teamProductivity: undefined,
        departmentMetrics: undefined
      }
    }
  }

  return filteredData
}

/**
 * Filter time series data based on role data retention limits
 */
export const filterTimeSeriesData = (
  data: any[],
  userRole: Role,
  currentDate: Date = new Date()
): any[] => {
  const permissions = getRolePermissions(userRole)
  const cutoffDate = new Date(currentDate.getTime() - permissions.maxDataRetention * 24 * 60 * 60 * 1000)

  return data.filter(point => {
    const pointDate = new Date(point.timestamp || point.date)
    return pointDate >= cutoffDate
  })
}

/**
 * Generate role-based dashboard subscription filters
 */
export const generateDashboardFilters = (
  userRole: Role,
  userId: string,
  organizationId: string,
  additionalFilters?: Record<string, any>
): Record<string, any> => {
  const permissions = getRolePermissions(userRole)
  const filters: Record<string, any> = {
    organizationId,
    ...additionalFilters
  }

  // Add role-based restrictions
  if (permissions.restrictToOwnTasks) {
    filters.assigneeId = userId
  }

  if (permissions.restrictToOwnClients) {
    filters.clientOwnerId = userId
  }

  // Add data retention filter
  const maxDate = new Date()
  const minDate = new Date(maxDate.getTime() - permissions.maxDataRetention * 24 * 60 * 60 * 1000)
  filters.dateRange = {
    start: minDate.toISOString(),
    end: maxDate.toISOString()
  }

  // Add role hierarchy filter for sensitive data
  if (!permissions.canViewFinancials) {
    filters.excludeFinancials = true
  }

  if (!permissions.canViewAllTeamData) {
    filters.restrictTeamData = true
    filters.teamMemberId = userId
  }

  return filters
}

/**
 * Sanitize widget data for specific role
 */
export const sanitizeWidgetData = (
  widgetId: string,
  data: any,
  userRole: Role,
  userId: string
): any => {
  const permissions = getRolePermissions(userRole)

  switch (widgetId) {
    case 'financial_metrics':
      if (!permissions.canViewFinancials) {
        return {
          error: 'Access denied: Financial data requires Manager+ role',
          chartData: [],
          summary: {}
        }
      }
      break

    case 'team_performance':
      if (!permissions.canViewAllTeamData) {
        // Filter to only user's own performance data
        return {
          ...data,
          chartData: data.chartData?.filter((point: any) => point.userId === userId) || [],
          summary: {
            ...data.summary,
            teamComparison: undefined,
            departmentRanking: undefined
          }
        }
      }
      break

    case 'client_engagement':
      if (!permissions.canViewClientData) {
        return {
          error: 'Access denied: Client data requires Associate+ role',
          chartData: [],
          summary: {}
        }
      }
      if (permissions.restrictToOwnClients) {
        return {
          ...data,
          chartData: data.chartData?.filter((point: any) => point.clientOwnerId === userId) || [],
          summary: {
            ...data.summary,
            totalClients: data.chartData?.filter((point: any) => point.clientOwnerId === userId).length || 0
          }
        }
      }
      break

    case 'compliance_status':
      if (!permissions.canViewComplianceData) {
        return {
          error: 'Access denied: Compliance data requires Associate+ role',
          chartData: [],
          summary: {}
        }
      }
      break

    case 'task_overview':
    case 'workload_analytics':
      if (permissions.restrictToOwnTasks) {
        return {
          ...data,
          chartData: data.chartData?.filter((point: any) => 
            point.assigneeId === userId || point.createdBy === userId
          ) || [],
          summary: {
            ...data.summary,
            teamTasks: undefined,
            departmentWorkload: undefined
          }
        }
      }
      break
  }

  return data
}

/**
 * Check if user can export specific widget data
 */
export const canExportWidget = (
  widgetId: string,
  userRole: Role,
  exportFormat: 'csv' | 'excel' | 'pdf'
): boolean => {
  const permissions = getRolePermissions(userRole)

  // Check general export permission
  if (!permissions.canExportData) {
    return false
  }

  // Check widget-specific export permissions
  switch (widgetId) {
    case 'financial_metrics':
      return permissions.canViewFinancials && hasRoleAccess(userRole, 'MANAGER')
    
    case 'team_performance':
      return permissions.canViewAllTeamData || exportFormat === 'csv'
    
    case 'client_engagement':
      return permissions.canViewClientData
    
    case 'compliance_status':
      return permissions.canViewComplianceData && hasRoleAccess(userRole, 'ASSOCIATE')
    
    default:
      return true
  }
}

/**
 * Get available dashboard themes based on role
 */
export const getAvailableThemes = (userRole: Role): string[] => {
  const baseThemes = ['light', 'dark', 'auto']
  
  if (hasRoleAccess(userRole, 'MANAGER')) {
    return [...baseThemes, 'executive', 'presentation']
  }
  
  if (hasRoleAccess(userRole, 'ASSOCIATE')) {
    return [...baseThemes, 'professional']
  }
  
  return baseThemes
}

/**
 * Role-based error messages
 */
export const getRoleErrorMessage = (
  action: string,
  userRole: Role,
  requiredRole?: Role
): string => {
  const roleNames = {
    PARTNER: 'Partner',
    MANAGER: 'Manager',
    ASSOCIATE: 'Associate',
    INTERN: 'Intern',
    CLIENT: 'Client'
  }

  if (requiredRole) {
    return `Access denied: ${action} requires ${roleNames[requiredRole]}+ role. Your current role: ${roleNames[userRole]}.`
  }

  return `Access denied: Your current role (${roleNames[userRole]}) does not have permission for ${action}.`
}