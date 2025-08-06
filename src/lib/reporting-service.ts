import { prisma } from './prisma'
import { AnalyticsEngine } from './analytics-engine'
import { DashboardService } from './dashboard-service'
import type { 
  ReportTemplate, 
  ReportSchedule, 
  GeneratedReport, 
  DashboardExportConfig,
  UserRole 
} from '../types'

export class ReportingService {
  // Report Template Management
  static async createReportTemplate(
    organizationId: string,
    userId: string,
    templateData: Omit<ReportTemplate, 'id' | 'createdAt' | 'createdBy'>
  ): Promise<ReportTemplate> {
    try {
      const template = await prisma.reportTemplate.create({
        data: {
          organizationId,
          createdBy: userId,
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          reportType: templateData.reportType,
          config: templateData.config,
          schedule: templateData.schedule,
          recipients: templateData.recipients,
          isActive: templateData.isActive
        }
      })

      return this.formatReportTemplate(template)
    } catch (error) {
      console.error('Error creating report template:', error)
      throw new Error('Failed to create report template')
    }
  }

  static async getReportTemplates(
    organizationId: string,
    category?: string,
    reportType?: string
  ): Promise<ReportTemplate[]> {
    try {
      const templates = await prisma.reportTemplate.findMany({
        where: {
          organizationId,
          ...(category && { category }),
          ...(reportType && { reportType })
        },
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' }
        ]
      })

      return templates.map(this.formatReportTemplate)
    } catch (error) {
      console.error('Error getting report templates:', error)
      throw new Error('Failed to get report templates')
    }
  }

  // Automated Report Generation
  static async generateReport(
    organizationId: string,
    templateId: string,
    userId: string,
    parameters: Record<string, any> = {}
  ): Promise<GeneratedReport> {
    try {
      const template = await prisma.reportTemplate.findUnique({
        where: { id: templateId, organizationId }
      })

      if (!template) {
        throw new Error('Report template not found')
      }

      // Create report generation record
      const report = await prisma.generatedReport.create({
        data: {
          templateId,
          organizationId,
          generatedBy: userId,
          name: `${template.name} - ${new Date().toLocaleDateString()}`,
          format: parameters.format || 'pdf',
          parameters,
          status: 'generating'
        }
      })

      // Generate report content based on type
      try {
        const reportData = await this.generateReportData(
          template.reportType,
          template.config,
          parameters,
          organizationId,
          userId
        )

        const filePath = await this.exportReport(
          reportData,
          parameters.format || 'pdf',
          report.id
        )

        const fileSize = await this.getFileSize(filePath)

        // Update report with success
        const updatedReport = await prisma.generatedReport.update({
          where: { id: report.id },
          data: {
            status: 'completed',
            filePath,
            fileSize,
            completedAt: new Date()
          }
        })

        return this.formatGeneratedReport(updatedReport)
      } catch (error) {
        // Update report with error
        await prisma.generatedReport.update({
          where: { id: report.id },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Report generation failed',
            completedAt: new Date()
          }
        })
        throw error
      }
    } catch (error) {
      console.error('Error generating report:', error)
      throw new Error('Failed to generate report')
    }
  }

  // Dashboard Export
  static async exportDashboard(
    organizationId: string,
    userId: string,
    userRole: UserRole,
    exportConfig: DashboardExportConfig
  ): Promise<GeneratedReport> {
    try {
      // Get dashboard data
      const dashboardData = await DashboardService.getDashboardMetrics(
        organizationId,
        userId,
        userRole,
        {
          dateRange: exportConfig.dateRange
        }
      )

      // Get widget data for specified widgets
      const widgetData: Record<string, any> = {}
      for (const widgetId of exportConfig.widgets) {
        try {
          widgetData[widgetId] = await this.getWidgetExportData(
            widgetId,
            organizationId,
            userId,
            userRole,
            exportConfig.dateRange
          )
        } catch (error) {
          console.error(`Error getting data for widget ${widgetId}:`, error)
          widgetData[widgetId] = null
        }
      }

      // Create export data structure
      const exportData = {
        title: exportConfig.title || 'Dashboard Export',
        description: exportConfig.description,
        generatedAt: new Date(),
        dateRange: exportConfig.dateRange,
        metrics: dashboardData,
        widgets: widgetData,
        includeData: exportConfig.includeData,
        includeCharts: exportConfig.includeCharts
      }

      // Generate export file
      const filePath = await this.exportDashboard(
        exportData,
        exportConfig.format,
        `dashboard-${userId}-${Date.now()}`
      )

      const fileSize = await this.getFileSize(filePath)

      // Create report record
      const report = await prisma.generatedReport.create({
        data: {
          organizationId,
          generatedBy: userId,
          name: exportConfig.title || 'Dashboard Export',
          format: exportConfig.format,
          filePath,
          fileSize,
          parameters: exportConfig,
          status: 'completed',
          completedAt: new Date()
        }
      })

      return this.formatGeneratedReport(report)
    } catch (error) {
      console.error('Error exporting dashboard:', error)
      throw new Error('Failed to export dashboard')
    }
  }

  // CA-specific Report Templates
  static async getCAReportTemplates(organizationId: string): Promise<ReportTemplate[]> {
    const caTemplates = [
      {
        name: 'GST Return Summary',
        description: 'Monthly GST return filing summary with compliance status',
        category: 'compliance',
        reportType: 'compliance',
        config: {
          reportSubtype: 'gst_return',
          includeTables: ['gst_filings', 'compliance_status'],
          includeCharts: ['monthly_gst_trend', 'compliance_score'],
          filters: ['date_range', 'client_id']
        }
      },
      {
        name: 'Audit Progress Report',
        description: 'Comprehensive audit progress and findings report',
        category: 'audit',
        reportType: 'analytics',
        config: {
          reportSubtype: 'audit_progress',
          includeTables: ['audit_tasks', 'findings', 'recommendations'],
          includeCharts: ['progress_timeline', 'findings_by_category'],
          filters: ['audit_id', 'date_range', 'auditor']
        }
      },
      {
        name: 'Client Engagement Summary',
        description: 'Client engagement metrics and satisfaction report',
        category: 'client',
        reportType: 'analytics',
        config: {
          reportSubtype: 'client_engagement',
          includeTables: ['engagements', 'client_feedback', 'billing'],
          includeCharts: ['engagement_timeline', 'satisfaction_scores'],
          filters: ['client_id', 'date_range', 'engagement_type']
        }
      },
      {
        name: 'Team Productivity Report',
        description: 'Team performance and productivity analytics',
        category: 'performance',
        reportType: 'analytics',
        config: {
          reportSubtype: 'team_productivity',
          includeTables: ['time_entries', 'task_completion', 'utilization'],
          includeCharts: ['productivity_trends', 'utilization_rates'],
          filters: ['team_id', 'date_range', 'user_id']
        }
      },
      {
        name: 'Financial Performance Dashboard',
        description: 'Financial KPIs and revenue analysis',
        category: 'financial',
        reportType: 'dashboard',
        config: {
          reportSubtype: 'financial_performance',
          includeTables: ['revenue', 'expenses', 'profitability'],
          includeCharts: ['revenue_trend', 'profit_margins', 'client_profitability'],
          filters: ['date_range', 'service_type']
        }
      }
    ]

    // Create templates if they don't exist
    const existingTemplates = await this.getReportTemplates(organizationId)
    const existingNames = existingTemplates.map(t => t.name)

    const newTemplates = []
    for (const template of caTemplates) {
      if (!existingNames.includes(template.name)) {
        const created = await this.createReportTemplate(
          organizationId,
          'system',
          {
            ...template,
            isActive: true,
            recipients: []
          }
        )
        newTemplates.push(created)
      }
    }

    return [...existingTemplates, ...newTemplates]
  }

  // Report Scheduling
  static async scheduleReport(
    templateId: string,
    schedule: ReportSchedule,
    recipients: string[]
  ): Promise<void> {
    try {
      await prisma.reportTemplate.update({
        where: { id: templateId },
        data: {
          schedule,
          recipients,
          isActive: true
        }
      })

      // Set up cron job or background task for scheduled generation
      this.setupReportSchedule(templateId, schedule)
    } catch (error) {
      console.error('Error scheduling report:', error)
      throw new Error('Failed to schedule report')
    }
  }

  // Report Sharing and Distribution
  static async shareReport(
    reportId: string,
    recipients: string[],
    message?: string
  ): Promise<void> {
    try {
      const report = await prisma.generatedReport.findUnique({
        where: { id: reportId }
      })

      if (!report) {
        throw new Error('Report not found')
      }

      // Send report to recipients (email, notification, etc.)
      await this.distributeReport(report, recipients, message)

      // Log sharing activity
      await prisma.auditLog.create({
        data: {
          organizationId: report.organizationId,
          userId: report.generatedBy,
          action: 'REPORT_SHARED',
          resourceType: 'report',
          resourceId: reportId,
          details: `Report shared with ${recipients.length} recipients`,
          metadata: { recipients, message }
        }
      })
    } catch (error) {
      console.error('Error sharing report:', error)
      throw new Error('Failed to share report')
    }
  }

  // Report Audit Trail and Version Control
  static async getReportHistory(
    organizationId: string,
    templateId?: string,
    userId?: string,
    limit: number = 50
  ): Promise<GeneratedReport[]> {
    try {
      const reports = await prisma.generatedReport.findMany({
        where: {
          organizationId,
          ...(templateId && { templateId }),
          ...(userId && { generatedBy: userId })
        },
        orderBy: { generatedAt: 'desc' },
        take: limit
      })

      return reports.map(this.formatGeneratedReport)
    } catch (error) {
      console.error('Error getting report history:', error)
      throw new Error('Failed to get report history')
    }
  }

  // Private helper methods
  private static async generateReportData(
    reportType: string,
    config: any,
    parameters: Record<string, any>,
    organizationId: string,
    userId: string
  ): Promise<any> {
    switch (reportType) {
      case 'dashboard':
        return await this.generateDashboardReportData(config, parameters, organizationId, userId)
      case 'analytics':
        return await this.generateAnalyticsReportData(config, parameters, organizationId, userId)
      case 'compliance':
        return await this.generateComplianceReportData(config, parameters, organizationId, userId)
      case 'financial':
        return await this.generateFinancialReportData(config, parameters, organizationId, userId)
      default:
        throw new Error(`Unknown report type: ${reportType}`)
    }
  }

  private static async generateDashboardReportData(
    config: any,
    parameters: Record<string, any>,
    organizationId: string,
    userId: string
  ): Promise<any> {
    // Generate dashboard report data
    const metrics = await DashboardService.getDashboardMetrics(
      organizationId,
      userId,
      parameters.role || 'ASSOCIATE',
      {
        dateRange: parameters.dateRange
      }
    )

    return {
      type: 'dashboard',
      metrics,
      config,
      parameters
    }
  }

  private static async generateAnalyticsReportData(
    config: any,
    parameters: Record<string, any>,
    organizationId: string,
    userId: string
  ): Promise<any> {
    // Generate analytics report data
    const analytics = await AnalyticsEngine.getPerformanceAnalytics(
      organizationId,
      userId,
      parameters.role,
      parameters.period || 'month',
      parameters.startDate,
      parameters.endDate
    )

    return {
      type: 'analytics',
      analytics,
      config,
      parameters
    }
  }

  private static async generateComplianceReportData(
    config: any,
    parameters: Record<string, any>,
    organizationId: string,
    userId: string
  ): Promise<any> {
    // Generate compliance report data
    const compliance = await AnalyticsEngine.getComplianceMetrics(
      organizationId,
      parameters.role
    )

    return {
      type: 'compliance',
      compliance,
      config,
      parameters
    }
  }

  private static async generateFinancialReportData(
    config: any,
    parameters: Record<string, any>,
    organizationId: string,
    userId: string
  ): Promise<any> {
    // Generate financial report data (mock implementation)
    return {
      type: 'financial',
      revenue: 1000000,
      expenses: 600000,
      profit: 400000,
      config,
      parameters
    }
  }

  private static async exportReport(
    data: any,
    format: 'pdf' | 'excel' | 'csv',
    reportId: string
  ): Promise<string> {
    // Mock implementation - would integrate with actual export libraries
    const fileName = `report-${reportId}.${format}`
    const filePath = `/reports/${fileName}`
    
    // Here you would use libraries like:
    // - PDF: puppeteer, jsPDF, or pdfkit
    // - Excel: exceljs or xlsx
    // - CSV: csv-writer or built-in JSON to CSV conversion
    
    return filePath
  }

  private static async exportDashboard(
    data: any,
    format: 'pdf' | 'excel' | 'csv' | 'png',
    fileName: string
  ): Promise<string> {
    // Mock implementation for dashboard export
    const filePath = `/exports/${fileName}.${format}`
    return filePath
  }

  private static async getWidgetExportData(
    widgetId: string,
    organizationId: string,
    userId: string,
    userRole: UserRole,
    dateRange?: [Date, Date]
  ): Promise<any> {
    // Mock implementation - would get actual widget data
    return {
      widgetId,
      data: {},
      exportedAt: new Date()
    }
  }

  private static async getFileSize(filePath: string): Promise<number> {
    // Mock implementation - would get actual file size
    return Math.floor(Math.random() * 1000000) + 100000 // Random size between 100KB and 1MB
  }

  private static setupReportSchedule(templateId: string, schedule: ReportSchedule): void {
    // Mock implementation - would set up actual cron job or background task
    console.log(`Setting up schedule for template ${templateId}:`, schedule)
  }

  private static async distributeReport(
    report: any,
    recipients: string[],
    message?: string
  ): Promise<void> {
    // Mock implementation - would send actual emails/notifications
    console.log(`Distributing report ${report.id} to ${recipients.length} recipients`)
  }

  private static formatReportTemplate(template: any): ReportTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      reportType: template.reportType,
      config: template.config,
      schedule: template.schedule,
      recipients: template.recipients,
      isActive: template.isActive,
      createdBy: template.createdBy,
      createdAt: template.createdAt
    }
  }

  private static formatGeneratedReport(report: any): GeneratedReport {
    return {
      id: report.id,
      templateId: report.templateId,
      name: report.name,
      format: report.format,
      filePath: report.filePath,
      fileSize: report.fileSize,
      generatedAt: report.generatedAt,
      generatedBy: report.generatedBy,
      parameters: report.parameters,
      status: report.status,
      error: report.error
    }
  }
}