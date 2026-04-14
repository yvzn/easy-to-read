import { test, expect } from '@playwright/test';

[
	{
		language: 'French',
		url: 'https://facilealire.fr/fr/app/',
		keywords: ['Mulligan', 'miroir']
	}, {
		language: 'English',
		url: 'https://easyread.me/en/app/',
		keywords: ['Mulligan', 'mirror']
	}
].forEach(({ language, url, keywords }) => {
	test(`Happy path in ${language}`, async ({ page }) => {
		await page.goto(url);

		// displays a simplified version containing the keyword from the original text'
		const inputText =
			"Stately, plump Buck Mulligan came from the stairhead, bearing a bowl of lather on which a mirror and a razor lay crossed. A yellow dressinggown, ungirdled, was sustained gently behind him on the mild morning air. He held the bowl aloft and intoned: —Introibo ad altare Dei.";

		await page.fill('#userText', inputText);
		await page.check('#translation');
		await page.click('#simplify-btn');

		const output = page.locator('#simplified-version .formatted-output');
		await expect(output).toBeVisible();
		await expect(output).not.toBeEmpty({ timeout: 120_000 });

		// The keyword "Mulligan" from the original text must appear in the output
		await expect(output).toContainText(keywords[0], { ignoreCase: true });

		// shows the simplified text in French when automatic translation is ticked
		await expect(output).toContainText(keywords[1], { ignoreCase: true });

		// hides the form and shows the simplified version section after submission
		await expect(page.locator('#simplify-form')).not.toBeVisible();
		await expect(page.locator('#simplified-version')).toBeVisible();

		// shows the original text section after simplification completes
		const originalText = page.locator('#original-text');
		await expect(originalText).toBeVisible();
		await expect(originalText.locator('.formatted-output')).toContainText(inputText);
	});
});
