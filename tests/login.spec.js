
const { test, expect } = require('@playwright/test');

test('Login from Bank Exams Today homepage', async ({ page, browserName }) => {
  test.setTimeout(60000);

  console.log(`Running login test on: ${browserName}`);

  // Step 1: Open the homepage
  await page.goto('https://www.bankexamstoday.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Step 2: Find and click the Sign in link
  // Inspect the actual homepage if this selector needs adjustment.
  const signInLink = page.getByRole('link', {
    name: /sign in|login|log in/i
  }).first();

  await expect(signInLink).toBeVisible({ timeout: 20000 });

  await Promise.all([
    page.waitForURL(/signin\.html/, { timeout: 30000 }),
    signInLink.click()
  ]);

  console.log('Login page opened:', page.url());

  // Step 3: Enter login credentials
  // Replace these placeholders with a valid test account.
  await page.getByPlaceholder('you@example.com').first()
    .fill('jacob@yopmail.com');

  await page.getByPlaceholder('Enter your password')
    .fill('Test@12345');

  // Step 4: Click the Sign in button
  await page.getByRole('button', {
  name: 'Sign in',
  exact: true
}).click();

  // Step 5: Log the result for debugging
  console.log(`Login button clicked on ${browserName}`);
});