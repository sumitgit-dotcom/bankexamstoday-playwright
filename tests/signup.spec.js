
const { test, expect } = require('@playwright/test');

test('Sign up from Bank Exams Today homepage', async ({ page, browserName }) => {
  test.setTimeout(60000);

  console.log(`Running on: ${browserName}`);

  // Step 1: Open homepage
  await page.goto('https://www.bankexamstoday.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Step 2: Locate the correct Sign up link
  const signupLink = page.locator('a.bet-account-signup');

  await expect(signupLink).toBeVisible({ timeout: 20000 });

  console.log('Signup URL:', await signupLink.getAttribute('href'));

  // Step 3: Click Sign up and wait for navigation
  await Promise.all([
    page.waitForURL(/signin\.html\?tab=signup/, { timeout: 30000 }),
    signupLink.click()
  ]);

  // Step 4: Verify signup page
  await expect(page).toHaveURL(/signin\.html\?tab=signup/);

  console.log('Signup page opened:', page.url());

  // Step 5: Fill first name and last name
  await page.getByPlaceholder('Rahul').fill('Test');
  await page.getByPlaceholder('Jain').fill('Automation');

  // Step 6: Fill signup email (second matching email field)
  const emailFields = page.getByPlaceholder('you@example.com');

  await emailFields.nth(1).fill(
    `test.${Date.now()}.${browserName}@example.com`
  );

  // Step 7: Fill password and confirmation
  await page.getByPlaceholder('Create a password')
    .fill('TestPass@12345');

  await page.getByPlaceholder('Re-enter password')
    .fill('TestPass@12345');

  // Step 8: Select the signup checkbox
  await page.locator('input[type="checkbox"]').nth(1).check();

  // Step 9: Click Create Account
  await page.getByRole('button', {
    name: /create account/i
  }).click();

  console.log(`Create Account clicked on ${browserName}`);
});