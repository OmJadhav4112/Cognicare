/**
 * Playwright Fixtures
 * Shared test utilities and setup
 */

import { test as base, expect } from '@playwright/test';

/**
 * Custom fixture: authenticated user
 * Logs in a user and provides authentication token
 */
export const test = base.extend({
  // Create authenticated context
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/auth/login');

    // Fill credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');

    // Click login button
    await page.click('button:has-text("Login")');

    // Wait for navigation to dashboard
    await page.waitForURL(/\/(patient|caregiver)\/dashboard/);

    // Provide page to test
    await use(page);
  },

  // Patient context
  patientPage: async ({ page }, use) => {
    // Login as patient
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'patient@example.com');
    await page.fill('input[name="password"]', 'PatientPass123!');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/patient\/dashboard/);
    await use(page);
  },

  // Caregiver context
  caregiverPage: async ({ page }, use) => {
    // Login as caregiver
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'caregiver@example.com');
    await page.fill('input[name="password"]', 'CaregiverPass123!');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/caregiver\/dashboard/);
    await use(page);
  },
});

export { expect };

/**
 * Helper: wait for network idle
 */
export async function waitForNetworkIdle(page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Helper: create unique email for testing
 */
export function getUniqueEmail(prefix = 'test') {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}@example.com`;
}

/**
 * Helper: fill form and submit
 */
export async function fillAndSubmit(page, formData, submitButtonText = 'Submit') {
  for (const [fieldName, value] of Object.entries(formData)) {
    const selector = `input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`;
    const field = await page.$(selector);
    
    if (field) {
      const tagName = await field.evaluate(el => el.tagName);
      if (tagName === 'SELECT') {
        await page.selectOption(selector, value);
      } else {
        await page.fill(selector, value);
      }
    }
  }
  
  await page.click(`button:has-text("${submitButtonText}")`);
}

/**
 * Helper: verify toast notification
 */
export async function verifyToast(page, message, type = 'success') {
  const toastSelector = `.toast.${type}:has-text("${message}")`;
  await page.waitForSelector(toastSelector, { timeout: 5000 });
  await page.waitForTimeout(1000); // Let animation complete
  await page.waitForSelector(toastSelector, { state: 'hidden', timeout: 10000 });
}

/**
 * Helper: intercept API call
 */
export async function interceptApiCall(page, pattern, mockResponse) {
  await page.route(pattern, (route) => {
    route.abort('blockedbyclient');
  });
  
  // Or mock response
  await page.route(pattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });
}

/**
 * Helper: check accessibility
 */
export async function checkAccessibility(page) {
  const violations = [];
  
  // Check for common a11y issues
  const hasAltText = await page.locator('img:not([alt])').count();
  if (hasAltText > 0) violations.push('Images without alt text');
  
  const hasLabels = await page.locator('input:not([aria-label]):not([id])').count();
  if (hasLabels > 0) violations.push('Inputs without labels');
  
  return violations;
}
