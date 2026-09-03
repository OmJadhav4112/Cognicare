/**
 * Authentication E2E Tests
 * Tests for user registration, login, and profile management
 */

import { test, expect, getUniqueEmail } from './fixtures';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start at landing page
    await page.goto('/');
  });

  test.describe('User Registration', () => {
    test('should register a new patient account', async ({ page }) => {
      // Click register link
      await page.click('a:has-text("Create Account")');
      await page.waitForURL('/auth/register');

      // Fill registration form
      const email = getUniqueEmail('newpatient');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');

      // Select role
      await page.selectOption('select[name="role"]', 'patient');

      // Submit form
      await page.click('button:has-text("Register")');

      // Verify redirect to dashboard
      await page.waitForURL(/\/patient\/dashboard/, { timeout: 10000 });
      
      // Verify logged in
      const heading = await page.locator('h1, h2');
      await expect(heading).toContainText('Dashboard', { timeout: 5000 });
    });

    test('should register a new caregiver account', async ({ page }) => {
      await page.click('a:has-text("Create Account")');
      await page.waitForURL('/auth/register');

      const email = getUniqueEmail('newcaregiver');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="firstName"]', 'Jane');
      await page.fill('input[name="lastName"]', 'Smith');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      await page.selectOption('select[name="role"]', 'caregiver');

      await page.click('button:has-text("Register")');
      await page.waitForURL(/\/caregiver\/dashboard/, { timeout: 10000 });
    });

    test('should reject registration with weak password', async ({ page }) => {
      await page.click('a:has-text("Create Account")');
      await page.waitForURL('/auth/register');

      await page.fill('input[name="email"]', getUniqueEmail());
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');

      // Verify error message
      const errorMsg = page.locator('.error:has-text("Password must be")');
      await expect(errorMsg).toBeVisible();
    });

    test('should reject mismatched passwords', async ({ page }) => {
      await page.click('a:has-text("Create Account")');
      await page.waitForURL('/auth/register');

      await page.fill('input[name="email"]', getUniqueEmail());
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');

      const errorMsg = page.locator('.error:has-text("Passwords do not match")');
      await expect(errorMsg).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      await page.click('a:has-text("Login")');
      await page.waitForURL('/auth/login');

      await page.fill('input[name="email"]', 'patient@example.com');
      await page.fill('input[name="password"]', 'PatientPass123!');
      await page.click('button:has-text("Login")');

      await page.waitForURL(/\/patient\/dashboard/, { timeout: 10000 });
      
      // Verify user is logged in
      const userMenu = page.locator('[data-testid="user-menu"]');
      await expect(userMenu).toBeVisible();
    });

    test('should reject login with invalid email', async ({ page }) => {
      await page.click('a:has-text("Login")');
      await page.waitForURL('/auth/login');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'AnyPassword123!');
      await page.click('button:has-text("Login")');

      const errorMsg = page.locator('.error:has-text("Invalid credentials")');
      await expect(errorMsg).toBeVisible();
    });

    test('should reject login with wrong password', async ({ page }) => {
      await page.click('a:has-text("Login")');
      await page.waitForURL('/auth/login');

      await page.fill('input[name="email"]', 'patient@example.com');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button:has-text("Login")');

      const errorMsg = page.locator('.error:has-text("Invalid credentials")');
      await expect(errorMsg).toBeVisible();
    });

    test('should remember me functionality', async ({ page, context }) => {
      await page.click('a:has-text("Login")');
      await page.waitForURL('/auth/login');

      await page.fill('input[name="email"]', 'patient@example.com');
      await page.fill('input[name="password"]', 'PatientPass123!');
      await page.check('input[name="rememberMe"]');
      await page.click('button:has-text("Login")');

      await page.waitForURL(/\/patient\/dashboard/);

      // Verify remember me cookie is set
      const cookies = await context.cookies();
      const rememberMeCookie = cookies.find(c => c.name.includes('rememberMe'));
      expect(rememberMeCookie).toBeDefined();
    });
  });

  test.describe('Session Management', () => {
    test('should logout successfully', async ({ authenticatedPage: page }) => {
      // Open user menu
      await page.click('[data-testid="user-menu"]');

      // Click logout
      await page.click('button:has-text("Logout")');

      // Verify redirect to login
      await page.waitForURL('/auth/login', { timeout: 5000 });
    });

    test('should redirect to login when accessing protected route', async ({ page }) => {
      // Try to access patient dashboard without logging in
      await page.goto('/patient/dashboard');

      // Should redirect to login
      await page.waitForURL('/auth/login', { timeout: 5000 });
    });

    test('should persist session across page reload', async ({ authenticatedPage: page }) => {
      // Reload page
      await page.reload();

      // Should still be on dashboard
      await expect(page).toHaveURL(/\/patient\/dashboard/);
      
      // Should not redirect to login
      const loginBtn = page.locator('button:has-text("Login")');
      await expect(loginBtn).not.toBeVisible();
    });
  });

  test.describe('Password Management', () => {
    test('should change password successfully', async ({ authenticatedPage: page }) => {
      // Go to settings
      await page.click('[data-testid="settings-link"]');
      await page.waitForURL(/\/settings/);

      // Click change password
      await page.click('button:has-text("Change Password")');

      // Fill form
      await page.fill('input[name="currentPassword"]', 'PatientPass123!');
      await page.fill('input[name="newPassword"]', 'NewPassword456!');
      await page.fill('input[name="confirmPassword"]', 'NewPassword456!');

      // Submit
      await page.click('button:has-text("Update Password")');

      // Verify success message
      const successMsg = page.locator('.success:has-text("Password changed successfully")');
      await expect(successMsg).toBeVisible();
    });

    test('should not change password with wrong current password', async ({ authenticatedPage: page }) => {
      await page.click('[data-testid="settings-link"]');
      await page.click('button:has-text("Change Password")');

      await page.fill('input[name="currentPassword"]', 'WrongPassword123!');
      await page.fill('input[name="newPassword"]', 'NewPassword456!');
      await page.fill('input[name="confirmPassword"]', 'NewPassword456!');

      await page.click('button:has-text("Update Password")');

      const errorMsg = page.locator('.error:has-text("Current password is incorrect")');
      await expect(errorMsg).toBeVisible();
    });
  });
});
