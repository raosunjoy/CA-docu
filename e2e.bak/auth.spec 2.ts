import { test, expect } from '@playwright/test'
import { TestHelpers } from './utils/test-helpers'

test.describe('Authentication', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should display login page', async ({ page }) => {
    await page.goto('/auth/login')
    await helpers.expectPageTitle('Login - Zetra Platform')
    await helpers.expectElementVisible('[data-testid="login-form"]')
    await helpers.expectElementVisible('[data-testid="email-input"]')
    await helpers.expectElementVisible('[data-testid="password-input"]')
    await helpers.expectElementVisible('[data-testid="login-button"]')
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/auth/login')
    await page.click('[data-testid="login-button"]')
    
    await helpers.expectElementVisible('[data-testid="email-error"]')
    await helpers.expectElementVisible('[data-testid="password-error"]')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')
    
    await helpers.waitForToast('Invalid credentials')
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await helpers.login()
    await helpers.expectPageTitle('Dashboard - Zetra Platform')
    await helpers.expectElementVisible('[data-testid="dashboard"]')
  })

  test('should logout successfully', async ({ page }) => {
    await helpers.login()
    await helpers.logout()
    await helpers.expectPageTitle('Login - Zetra Platform')
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('/auth/login')
    await helpers.expectElementVisible('[data-testid="login-form"]')
  })

  test('should check accessibility on login page', async ({ page }) => {
    await page.goto('/auth/login')
    await helpers.checkAccessibility()
  })
})