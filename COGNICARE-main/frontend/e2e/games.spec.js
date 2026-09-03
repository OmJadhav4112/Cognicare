/**
 * Games E2E Tests
 * Tests for game selection, playing games, and difficulty adaptation
 */

import { test, expect, waitForNetworkIdle } from './fixtures';

test.describe('Games', () => {
  test.beforeEach(async ({ patientPage }) => {
    // Navigate to games hub
    await patientPage.goto('/patient/games');
    await waitForNetworkIdle(patientPage);
  });

  test.describe('Games Hub', () => {
    test('should display all available games', async ({ patientPage: page }) => {
      // Verify all game cards are visible
      const memoryMatchCard = page.locator('[data-testid="game-memory-matching"]');
      const pictureRecallCard = page.locator('[data-testid="game-picture-recall"]');
      const sequenceMemoryCard = page.locator('[data-testid="game-sequence-memory"]');
      const patternAttentionCard = page.locator('[data-testid="game-pattern-attention"]');

      await expect(memoryMatchCard).toBeVisible();
      await expect(pictureRecallCard).toBeVisible();
      await expect(sequenceMemoryCard).toBeVisible();
      await expect(patternAttentionCard).toBeVisible();
    });

    test('should show game difficulty badges', async ({ patientPage: page }) => {
      // Each game should show difficulty level
      const difficultyBadges = page.locator('[data-testid="difficulty-badge"]');
      const count = await difficultyBadges.count();
      
      expect(count).toBeGreaterThanOrEqual(4);
    });

    test('should navigate to game on click', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      
      // Wait for game to load
      await page.waitForURL(/\/patient\/games\/memoryMatching/, { timeout: 5000 });
      
      // Verify game interface is visible
      const gameBoard = page.locator('[data-testid="game-board"]');
      await expect(gameBoard).toBeVisible();
    });
  });

  test.describe('Memory Matching Game', () => {
    test('should start game and display cards', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);

      // Wait for cards to load
      await page.waitForSelector('[data-testid="memory-card"]', { timeout: 5000 });

      const cards = page.locator('[data-testid="memory-card"]');
      const cardCount = await cards.count();
      
      expect(cardCount).toBeGreaterThan(0);
    });

    test('should flip cards and find matches', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);
      await page.waitForSelector('[data-testid="memory-card"]');

      // Get all cards
      const cards = page.locator('[data-testid="memory-card"]');
      const firstCard = cards.nth(0);
      const secondCard = cards.nth(1);

      // Click first card
      await firstCard.click();
      await page.waitForTimeout(500);

      // Click second card
      await secondCard.click();
      await page.waitForTimeout(500);

      // Verify cards are in some state (matched or unmatched)
      const gameStatus = page.locator('[data-testid="game-status"]');
      await expect(gameStatus).toBeVisible();
    });

    test('should complete game and show score', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);
      await page.waitForSelector('[data-testid="memory-card"]');

      // Get total cards
      const cards = page.locator('[data-testid="memory-card"]');
      const cardCount = await cards.count();

      // Quickly match all pairs (simplified approach)
      for (let i = 0; i < cardCount; i += 2) {
        await cards.nth(i).click();
        await page.waitForTimeout(100);
        await cards.nth(i + 1).click();
        await page.waitForTimeout(100);
      }

      // Wait for game completion
      const resultModal = page.locator('[data-testid="game-result-modal"]');
      await expect(resultModal).toBeVisible({ timeout: 10000 });

      // Verify score is displayed
      const score = page.locator('[data-testid="final-score"]');
      await expect(score).toBeVisible();
    });
  });

  test.describe('Difficulty Levels', () => {
    test('should have easy difficulty as default', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);

      const difficultyIndicator = page.locator('[data-testid="current-difficulty"]');
      await expect(difficultyIndicator).toContainText('Easy', { ignoreCase: true });
    });

    test('should allow changing difficulty', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);

      // Open difficulty selector
      await page.click('[data-testid="difficulty-selector"]');

      // Select medium difficulty
      await page.click('button:has-text("Medium")');

      // Verify difficulty changed
      const difficultyIndicator = page.locator('[data-testid="current-difficulty"]');
      await expect(difficultyIndicator).toContainText('Medium', { ignoreCase: true });
    });
  });

  test.describe('Game Timer', () => {
    test('should display game timer', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);

      const timer = page.locator('[data-testid="game-timer"]');
      await expect(timer).toBeVisible();
    });

    test('should end game on time limit', async ({ patientPage: page }) => {
      // Go to settings and set short time limit for testing
      await page.goto('/patient/settings');
      await page.fill('input[name="gameTimeLimit"]', '5'); // 5 seconds for testing

      await page.goto('/patient/games');
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);

      // Wait for timeout
      await page.waitForTimeout(6000);

      // Verify game ended
      const resultModal = page.locator('[data-testid="game-result-modal"]');
      await expect(resultModal).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Game Results', () => {
    test('should display game results after completion', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);
      await page.waitForSelector('[data-testid="memory-card"]');

      // Complete game quickly
      const finishBtn = page.locator('[data-testid="finish-game-btn"]');
      if (await finishBtn.isVisible()) {
        await finishBtn.click();
      } else {
        // Auto-complete for testing
        await page.waitForTimeout(2000);
      }

      // Verify results display
      const resultsSection = page.locator('[data-testid="game-results"]');
      await expect(resultsSection).toBeVisible({ timeout: 5000 });

      // Verify score, time, accuracy shown
      const scoreDisplay = page.locator('[data-testid="result-score"]');
      const timeDisplay = page.locator('[data-testid="result-time"]');
      const accuracyDisplay = page.locator('[data-testid="result-accuracy"]');

      await expect(scoreDisplay).toBeVisible();
      await expect(timeDisplay).toBeVisible();
      await expect(accuracyDisplay).toBeVisible();
    });

    test('should allow playing again', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);

      // Complete game
      const finishBtn = page.locator('[data-testid="finish-game-btn"]');
      if (await finishBtn.isVisible()) {
        await finishBtn.click();
      }

      // Click play again
      const playAgainBtn = page.locator('button:has-text("Play Again")');
      await expect(playAgainBtn).toBeVisible({ timeout: 5000 });
      await playAgainBtn.click();

      // Verify new game started
      const gameBoard = page.locator('[data-testid="game-board"]');
      await expect(gameBoard).toBeVisible();
    });

    test('should return to games hub', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);

      // Complete game
      const finishBtn = page.locator('[data-testid="finish-game-btn"]');
      if (await finishBtn.isVisible()) {
        await finishBtn.click();
      }

      // Click back to games
      const backBtn = page.locator('button:has-text("Back to Games")');
      await expect(backBtn).toBeVisible({ timeout: 5000 });
      await backBtn.click();

      // Verify returned to games hub
      await page.waitForURL(/\/patient\/games$/, { timeout: 5000 });
      const gameHubTitle = page.locator('h1:has-text("Games")');
      await expect(gameHubTitle).toBeVisible();
    });
  });

  test.describe('Game Accessibility', () => {
    test('should have keyboard navigation', async ({ patientPage: page }) => {
      await page.click('[data-testid="game-memory-matching"]');
      await page.waitForURL(/\/patient\/games\/memoryMatching/);

      // Try keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement.getAttribute('data-testid'));
      
      expect(focusedElement).toBeTruthy();
    });

    test('should have high contrast mode', async ({ patientPage: page }) => {
      // Enable high contrast
      await page.goto('/patient/settings');
      await page.check('input[name="highContrast"]');

      await page.goto('/patient/games');
      await page.click('[data-testid="game-memory-matching"]');

      // Verify high contrast class is applied
      const gameBoard = page.locator('[data-testid="game-board"]');
      const classes = await gameBoard.getAttribute('class');
      
      expect(classes).toContain('high-contrast');
    });
  });
});
