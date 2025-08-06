// Background Jobs Service
// Handles recurring task generation, automation processing, and escalations

import { RecurringTaskService } from './recurring-task-service'
import { AutomationService } from './automation-service'
import { EscalationService } from './escalation-service'
import { TaskSuggestionService } from './task-suggestion-service'

export class BackgroundJobsService {
  private static isRunning = false
  private static intervalId: NodeJS.Timeout | null = null

  /**
   * Start background job processing
   */
  static start(intervalMinutes: number = 5) {
    if (this.isRunning) {
      console.log('Background jobs already running')
      return
    }

    console.log(`Starting background jobs with ${intervalMinutes} minute interval`)
    this.isRunning = true

    // Run immediately
    this.runJobs()

    // Schedule recurring execution
    this.intervalId = setInterval(() => {
      this.runJobs()
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Stop background job processing
   */
  static stop() {
    if (!this.isRunning) {
      return
    }

    console.log('Stopping background jobs')
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Run all background jobs
   */
  private static async runJobs() {
    const startTime = Date.now()
    console.log('Running background jobs...')

    try {
      // Run jobs in parallel where possible
      const results = await Promise.allSettled([
        this.generateRecurringTasks(),
        this.processAutomationTriggers(),
        this.checkDeadlineTriggers(),
        this.processEscalations(),
        this.cleanupExpiredSuggestions(),
      ])

      // Log results
      const duration = Date.now() - startTime
      console.log(`Background jobs completed in ${duration}ms`)

      results.forEach((result, index) => {
        const jobNames = [
          'generateRecurringTasks',
          'processAutomationTriggers',
          'checkDeadlineTriggers',
          'processEscalations',
          'cleanupExpiredSuggestions',
        ]

        if (result.status === 'fulfilled') {
          console.log(`✓ ${jobNames[index]}:`, result.value)
        } else {
          console.error(`✗ ${jobNames[index]}:`, result.reason)
        }
      })
    } catch (error) {
      console.error('Error running background jobs:', error)
    }
  }

  /**
   * Generate due recurring tasks
   */
  private static async generateRecurringTasks() {
    try {
      const generatedTasks = await RecurringTaskService.generateDueTasks()
      return {
        job: 'generateRecurringTasks',
        success: true,
        generated: generatedTasks.length,
        tasks: generatedTasks.map(task => ({ id: task.id, title: task.title })),
      }
    } catch (error) {
      console.error('Error generating recurring tasks:', error)
      return {
        job: 'generateRecurringTasks',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Process pending automation triggers
   */
  private static async processAutomationTriggers() {
    try {
      const results = await AutomationService.processPendingTriggers()
      return {
        job: 'processAutomationTriggers',
        success: true,
        processed: results.length,
        results: results.slice(0, 10), // Limit log output
      }
    } catch (error) {
      console.error('Error processing automation triggers:', error)
      return {
        job: 'processAutomationTriggers',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Check for deadline-based triggers
   */
  private static async checkDeadlineTriggers() {
    try {
      const triggersCreated = await AutomationService.checkDeadlineTriggers()
      return {
        job: 'checkDeadlineTriggers',
        success: true,
        triggersCreated,
      }
    } catch (error) {
      console.error('Error checking deadline triggers:', error)
      return {
        job: 'checkDeadlineTriggers',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Process task escalations
   */
  private static async processEscalations() {
    try {
      const results = await EscalationService.processEscalations()
      const totalEscalated = results.reduce((sum, result) => sum + (result.escalatedCount || 0), 0)
      const totalSkipped = results.reduce((sum, result) => sum + (result.skippedCount || 0), 0)

      return {
        job: 'processEscalations',
        success: true,
        rulesProcessed: results.length,
        totalEscalated,
        totalSkipped,
        results: results.slice(0, 5), // Limit log output
      }
    } catch (error) {
      console.error('Error processing escalations:', error)
      return {
        job: 'processEscalations',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Clean up expired suggestions
   */
  private static async cleanupExpiredSuggestions() {
    try {
      const expiredCount = await TaskSuggestionService.cleanupExpiredSuggestions()
      return {
        job: 'cleanupExpiredSuggestions',
        success: true,
        expiredCount,
      }
    } catch (error) {
      console.error('Error cleaning up expired suggestions:', error)
      return {
        job: 'cleanupExpiredSuggestions',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Run a specific job manually
   */
  static async runJob(jobName: string) {
    console.log(`Running job: ${jobName}`)

    switch (jobName) {
      case 'generateRecurringTasks':
        return this.generateRecurringTasks()
      
      case 'processAutomationTriggers':
        return this.processAutomationTriggers()
      
      case 'checkDeadlineTriggers':
        return this.checkDeadlineTriggers()
      
      case 'processEscalations':
        return this.processEscalations()
      
      case 'cleanupExpiredSuggestions':
        return this.cleanupExpiredSuggestions()
      
      default:
        throw new Error(`Unknown job: ${jobName}`)
    }
  }

  /**
   * Get job status
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.intervalId !== null,
    }
  }
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  BackgroundJobsService.start(5) // Run every 5 minutes in production
}