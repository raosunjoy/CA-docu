import { Page, expect } from '@playwright/test'

export class TestHelpers {
  constructor(private page: Page) {}

  // Authentication helpers
  async login(email = 'test@example.com', password = 'password123') {
    await this.page.goto('/auth/login')
    await this.page.fill('[data-testid="email-input"]', email)
    await this.page.fill('[data-testid="password-input"]', password)
    await this.page.click('[data-testid="login-button"]')
    await this.page.waitForURL('/dashboard')
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="logout-button"]')
    await this.page.waitForURL('/auth/login')
  }

  // Navigation helpers
  async navigateToTasks() {
    await this.page.click('[data-testid="nav-tasks"]')
    await this.page.waitForURL('/tasks')
  }

  async navigateToDocuments() {
    await this.page.click('[data-testid="nav-documents"]')
    await this.page.waitForURL('/documents')
  }

  // Task helpers
  async createTask(title: string, description?: string) {
    await this.page.click('[data-testid="create-task-button"]')
    await this.page.fill('[data-testid="task-title-input"]', title)
    if (description) {
      await this.page.fill('[data-testid="task-description-input"]', description)
    }
    await this.page.click('[data-testid="save-task-button"]')
    await expect(this.page.locator(`text=${title}`)).toBeVisible()
  }

  async updateTaskStatus(taskTitle: string, status: string) {
    const taskCard = this.page.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`)
    await taskCard.click()
    await this.page.selectOption('[data-testid="task-status-select"]', status)
    await this.page.click('[data-testid="save-task-button"]')
  }

  // Document helpers
  async uploadDocument(filePath: string, fileName: string) {
    await this.page.click('[data-testid="upload-document-button"]')
    await this.page.setInputFiles('[data-testid="file-input"]', filePath)
    await expect(this.page.locator(`text=${fileName}`)).toBeVisible()
  }

  // Wait helpers
  async waitForLoadingToFinish() {
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden' })
  }

  async waitForToast(message: string) {
    await expect(this.page.locator(`[data-testid="toast"]:has-text("${message}")`)).toBeVisible()
  }

  // Assertion helpers
  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(title)
  }

  async expectElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible()
  }

  async expectElementHidden(selector: string) {
    await expect(this.page.locator(selector)).toBeHidden()
  }

  async expectElementText(selector: string, text: string) {
    await expect(this.page.locator(selector)).toHaveText(text)
  }

  // Performance helpers
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now()
    await this.page.waitForLoadState('networkidle')
    return Date.now() - startTime
  }

  async checkAccessibility() {
    // Basic accessibility checks
    const missingAltImages = await this.page.locator('img:not([alt])').count()
    expect(missingAltImages).toBe(0)

    const missingLabels = await this.page.locator('input:not([aria-label]):not([aria-labelledby])').count()
    expect(missingLabels).toBe(0)
  }
}