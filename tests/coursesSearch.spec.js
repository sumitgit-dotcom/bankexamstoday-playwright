
const { test, expect } = require('@playwright/test');

test('Search IBPS PO courses in the Courses tab', async ({ page }) => {
  // Step 1: Open Bank Exams Today
  await page.goto('https://www.bankexamstoday.com/', {
    waitUntil: 'domcontentloaded'
  });

  console.log('Homepage opened:', page.url());

  // Step 2: Find the Courses link
  const coursesLink = page.getByRole('link', {
    name: /courses/i
  }).first();

  await expect(coursesLink).toBeVisible();

  // Step 3: Click Courses without assuming a new tab
  await coursesLink.click();

  // Wait for any navigation to finish
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  console.log('URL after clicking Courses:', page.url());

  // Step 4: Locate a search field
  const searchBox = page.locator(
    'input[type="search"], input[placeholder*="Search" i], input[name="q"]'
  ).first();

  await expect(searchBox).toBeVisible({ timeout: 15000 });

  // Step 5: Search for IBPS PO
  await searchBox.fill('IBPS PO');
  await searchBox.press('Enter');

  await page.waitForLoadState('domcontentloaded').catch(() => {});

  console.log('Search results URL:', page.url());

  // Step 6: Capture the results for debugging
  await expect(page.locator('body')).toContainText(/IBPS|PO/i);
});
