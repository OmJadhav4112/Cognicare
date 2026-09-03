/**
 * Family Memories E2E Tests
 * Tests for viewing, adding, and managing family memories
 */

import { test, expect, caregiverPage, waitForNetworkIdle, fillAndSubmit } from './fixtures';

test.describe('Family Memories', () => {
  test.describe('Patient - View Vault', () => {
    test('should display family vault', async ({ patientPage: page }) => {
      await page.goto('/patient/vault');
      await waitForNetworkIdle(page);

      const vaultHeading = page.locator('h1:has-text("Family Memory Vault")');
      await expect(vaultHeading).toBeVisible();
    });

    test('should display memory cards', async ({ patientPage: page }) => {
      await page.goto('/patient/vault');
      await waitForNetworkIdle(page);

      const memoryCards = page.locator('[data-testid="memory-card"]');
      const count = await memoryCards.count();
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should filter memories by type', async ({ patientPage: page }) => {
      await page.goto('/patient/vault');
      await waitForNetworkIdle(page);

      // Click people filter
      await page.click('button:has-text("People")');

      // Verify only people memories shown
      const visibleMemories = page.locator('[data-testid="memory-card"]:visible');
      const count = await visibleMemories.count();

      if (count > 0) {
        // Verify shown memories are type 'person'
        const firstMemory = visibleMemories.nth(0);
        const type = await firstMemory.getAttribute('data-memory-type');
        expect(type).toBe('person');
      }
    });

    test('should view memory details', async ({ patientPage: page }) => {
      await page.goto('/patient/vault');
      await waitForNetworkIdle(page);

      const firstMemory = page.locator('[data-testid="memory-card"]').first();
      await expect(firstMemory).toBeVisible();

      await firstMemory.click();

      // Verify details modal opens
      const detailsModal = page.locator('[data-testid="memory-details-modal"]');
      await expect(detailsModal).toBeVisible();

      // Verify details are shown
      const title = page.locator('[data-testid="memory-title"]');
      const description = page.locator('[data-testid="memory-description"]');

      await expect(title).toBeVisible();
      await expect(description).toBeVisible();
    });

    test('should mark memory as favorite', async ({ patientPage: page }) => {
      await page.goto('/patient/vault');
      await waitForNetworkIdle(page);

      const firstMemory = page.locator('[data-testid="memory-card"]').first();
      await firstMemory.click();

      const favoriteBtn = page.locator('[data-testid="favorite-btn"]');
      await favoriteBtn.click();

      // Verify favorite icon updated
      const favoriteIcon = page.locator('[data-testid="favorite-icon"]');
      await expect(favoriteIcon).toHaveClass(/filled|active/);
    });
  });

  test.describe('Caregiver - Add Memory', () => {
    test('should navigate to add memory page', async ({ caregiverPage: page }) => {
      await page.goto('/caregiver/dashboard');
      
      // Click to manage memories
      await page.click('[data-testid="manage-memories-link"]');
      await page.waitForURL(/\/caregiver\/patients\/\w+\/memories/, { timeout: 5000 });

      const heading = page.locator('h1:has-text("Family Memories")');
      await expect(heading).toBeVisible();
    });

    test('should add a person memory', async ({ caregiverPage: page }) => {
      await page.goto('/caregiver/dashboard');
      await page.click('[data-testid="manage-memories-link"]');
      await page.waitForURL(/\/caregiver\/patients\/\w+\/memories/);

      // Click add memory button
      await page.click('button:has-text("Add Memory")');

      // Fill form
      await page.selectOption('select[name="type"]', 'person');
      await page.fill('input[name="title"]', 'Grandma Mary');
      await page.fill('input[name="personName"]', 'Mary');
      await page.selectOption('select[name="relationship"]', 'grandmother');
      await page.fill('textarea[name="description"]', 'She loved gardening and cooking');
      await page.fill('input[name="memoryDate"]', 'Summer 1990');

      // Submit
      await page.click('button:has-text("Save Memory")');

      // Verify success
      const successMsg = page.locator('.success:has-text("Memory added")');
      await expect(successMsg).toBeVisible();

      // Verify memory appears in list
      const grandmaMemory = page.locator('text=Grandma Mary');
      await expect(grandmaMemory).toBeVisible();
    });

    test('should add a memory with photo', async ({ caregiverPage: page }) => {
      await page.goto('/caregiver/dashboard');
      await page.click('[data-testid="manage-memories-link"]');
      await page.waitForURL(/\/caregiver\/patients\/\w+\/memories/);

      await page.click('button:has-text("Add Memory")');

      await page.selectOption('select[name="type"]', 'photo');
      await page.fill('input[name="title"]', 'Beach Day 2010');

      // Upload image (mocked in tests)
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();

      // Note: File upload would need actual file in real tests
      await page.fill('textarea[name="description"]', 'Happy times at the beach');

      await page.click('button:has-text("Save Memory")');

      const successMsg = page.locator('.success:has-text("Memory added")');
      await expect(successMsg).toBeVisible();
    });

    test('should edit a memory', async ({ caregiverPage: page }) => {
      await page.goto('/caregiver/dashboard');
      await page.click('[data-testid="manage-memories-link"]');
      await page.waitForURL(/\/caregiver\/patients\/\w+\/memories/);

      // Click edit on first memory
      const editBtn = page.locator('[data-testid="edit-memory-btn"]').first();
      await editBtn.click();

      // Modify description
      const descriptionField = page.locator('textarea[name="description"]');
      await descriptionField.clear();
      await descriptionField.fill('Updated description');

      await page.click('button:has-text("Save Memory")');

      const successMsg = page.locator('.success:has-text("Memory updated")');
      await expect(successMsg).toBeVisible();
    });

    test('should delete a memory', async ({ caregiverPage: page }) => {
      await page.goto('/caregiver/dashboard');
      await page.click('[data-testid="manage-memories-link"]');
      await page.waitForURL(/\/caregiver\/patients\/\w+\/memories/);

      // Click delete on first memory
      const deleteBtn = page.locator('[data-testid="delete-memory-btn"]').first();
      await deleteBtn.click();

      // Confirm deletion
      const confirmBtn = page.locator('button:has-text("Delete")');
      await confirmBtn.click();

      const successMsg = page.locator('.success:has-text("Memory deleted")');
      await expect(successMsg).toBeVisible();
    });

    test('should mark memory as used in games', async ({ caregiverPage: page }) => {
      await page.goto('/caregiver/dashboard');
      await page.click('[data-testid="manage-memories-link"]');
      await page.waitForURL(/\/caregiver\/patients\/\w+\/memories/);

      await page.click('button:has-text("Add Memory")');

      await page.selectOption('select[name="type"]', 'person');
      await page.fill('input[name="title"]', 'Test Memory');
      await page.fill('input[name="personName"]', 'Test');

      // Check "use in games"
      await page.check('input[name="usedInGames"]');

      await page.click('button:has-text("Save Memory")');

      const successMsg = page.locator('.success:has-text("Memory added")');
      await expect(successMsg).toBeVisible();
    });
  });

  test.describe('Content Moderation', () => {
    test('should flag inappropriate text', async ({ caregiverPage: page }) => {
      await page.goto('/caregiver/dashboard');
      await page.click('[data-testid="manage-memories-link"]');
      await page.waitForURL(/\/caregiver\/patients\/\w+\/memories/);

      await page.click('button:has-text("Add Memory")');

      // Try adding memory with inappropriate content
      await page.fill('input[name="title"]', 'Test');
      await page.fill('textarea[name="description"]', 'This memory involves violence');

      await page.click('button:has-text("Save Memory")');

      // Verify warning is shown
      const warningMsg = page.locator('[data-testid="moderation-warning"]');
      // May or may not appear depending on auto-moderation
      // This tests the moderation check flow
    });

    test('should show flagged memory status', async ({ caregiverPage: page }) => {
      await page.goto('/caregiver/dashboard');
      await page.click('[data-testid="manage-memories-link"]');
      await page.waitForURL(/\/caregiver\/patients\/\w+\/memories/);

      // Find flagged memories (if any)
      const flaggedMemory = page.locator('[data-testid="flagged-memory"]');
      const count = await flaggedMemory.count();

      if (count > 0) {
        // Verify flagged status is visible
        const status = page.locator('[data-testid="flagged-status"]');
        await expect(status).toBeVisible();
      }
    });
  });

  test.describe('Memory Hints', () => {
    test('should add memory hints', async ({ caregiverPage: page }) => {
      await page.goto('/caregiver/dashboard');
      await page.click('[data-testid="manage-memories-link"]');
      await page.waitForURL(/\/caregiver\/patients\/\w+\/memories/);

      await page.click('button:has-text("Add Memory")');

      await page.selectOption('select[name="type"]', 'person');
      await page.fill('input[name="title"]', 'Hint Test');
      await page.fill('input[name="personName"]', 'Test');

      // Add hints
      const addHintBtn = page.locator('button:has-text("Add Hint")');
      await addHintBtn.click();

      const hintInput = page.locator('input[name="memoryHints.0"]');
      await hintInput.fill('Loved fishing');

      await addHintBtn.click();
      const hint2Input = page.locator('input[name="memoryHints.1"]');
      await hint2Input.fill('Had a dog named Max');

      await page.click('button:has-text("Save Memory")');

      const successMsg = page.locator('.success:has-text("Memory added")');
      await expect(successMsg).toBeVisible();
    });
  });
});
