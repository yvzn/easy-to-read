import { test, expect } from '@playwright/test';

const APP_URL = '/fr/app/';

/**
 * Mock response body from the simplification API.
 * The app.js extracts text from <version-2>…</version-2> to display as the simplified output.
 * The keyword "prénom" from the original input is preserved in the simplified text.
 * The response is in French to verify the automatic translation feature.
 */
const MOCK_API_RESPONSE = [
  '<observation-1>Le texte parle d\'une personne.</observation-1>',
  '<version-1>Jean est quelqu\'un. Il vient de France. Son prénom est connu.</version-1>',
  '<observation-2>Affinement de la version simplifiée.</observation-2>',
  '<version-2>Jean est une personne. Il vient de France. Son prénom est Jean.</version-2>',
].join('\n');

test.describe('App page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the simplification API endpoint
    await page.route('**/api/simplified**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: MOCK_API_RESPONSE,
      });
    });

    // Mock secondary endpoints to avoid noise in tests
    await page.route('**/api/interaction**', async (route) => {
      await route.fulfill({ status: 200, body: '' });
    });
    await page.route('**/api/carbon-footprint**', async (route) => {
      await route.fulfill({ status: 200, body: '' });
    });
    await page.route('**/api/feedback**', async (route) => {
      await route.fulfill({ status: 200, body: '' });
    });

    await page.goto(APP_URL);
  });

  test.describe('Happy path', () => {
    test('displays a simplified version containing the keyword from the original text', async ({ page }) => {
      const inputText =
        "Mon prénom est Jean et je souhaite comprendre ce document administratif complexe.";

      await page.fill('#userText', inputText);
      await page.check('#translation');
      await page.click('#simplify-btn');

      const output = page.locator('#simplified-version .formatted-output');
      await expect(output).toBeVisible();
      await expect(output).not.toBeEmpty();

      // The keyword "prénom" from the original text must appear in the output
      await expect(output).toContainText('prénom');
    });

    test('shows the simplified text in French when automatic translation is ticked', async ({ page }) => {
      const inputText =
        "Mon prénom est Jean et je souhaite comprendre ce document administratif complexe.";

      await page.fill('#userText', inputText);
      await page.check('#translation');
      await page.click('#simplify-btn');

      const output = page.locator('#simplified-version .formatted-output');
      await expect(output).toBeVisible();

      // The mock response is in French; check for French words present in the mock
      await expect(output).toContainText('France');
      await expect(output).toContainText('Jean');
    });

    test('hides the form and shows the simplified version section after submission', async ({ page }) => {
      await page.fill('#userText', 'Mon prénom est Jean.');
      await page.click('#simplify-btn');

      await expect(page.locator('#simplify-form')).not.toBeVisible();
      await expect(page.locator('#simplified-version')).toBeVisible();
    });

    test('shows the original text section after simplification completes', async ({ page }) => {
      const inputText = 'Mon prénom est Jean.';
      await page.fill('#userText', inputText);
      await page.click('#simplify-btn');

      const originalText = page.locator('#original-text');
      await expect(originalText).toBeVisible();
      await expect(originalText.locator('.formatted-output')).toContainText(inputText);
    });
  });

  test.describe('Feedback dialog', () => {
    test.beforeEach(async ({ page }) => {
      // Submit the form to reach the state where feedback buttons appear
      await page.fill('#userText', 'Mon prénom est Jean.');
      await page.click('#simplify-btn');

      // Wait for the feedback buttons to become visible after the response is complete
      await expect(page.locator('#user-feedback')).toBeVisible({ timeout: 10_000 });
    });

    test('shows feedback buttons after simplification', async ({ page }) => {
      await expect(page.locator('#user-feedback .feedback-btn[data-feedback-score="1"]')).toBeVisible();
      await expect(page.locator('#user-feedback .feedback-btn[data-feedback-score="-1"]')).toBeVisible();
    });

    test('opens the feedback dialog when a feedback button is clicked', async ({ page }) => {
      await page.click('#user-feedback .feedback-btn[data-feedback-score="1"]');

      const dialog = page.locator('#feedback-dialog');
      await expect(dialog).toBeVisible();
    });

    test('closes the feedback dialog when the close button is clicked', async ({ page }) => {
      await page.click('#user-feedback .feedback-btn[data-feedback-score="1"]');

      const dialog = page.locator('#feedback-dialog');
      await expect(dialog).toBeVisible();

      await page.click('#feedback-close-btn');
      await expect(dialog).not.toBeVisible();
    });

    test('submits feedback and shows a success message', async ({ page }) => {
      await page.click('#user-feedback .feedback-btn[data-feedback-score="1"]');

      const dialog = page.locator('#feedback-dialog');
      await expect(dialog).toBeVisible();

      await page.fill('#feedback-comment', 'Très clair, merci !');
      await page.click('#feedback-send-btn');

      // The success status message should appear after a successful submission
      await expect(dialog.locator('.feedback-status p:nth-child(3)')).toBeVisible();
    });
  });
});
