const { test, expect } = require('@playwright/test');

test('Open Bank Exams Today homepage', async ({ page, browserName }) => {
  console.log('Browser:', browserName);

  const response = await page.goto('https://www.bankexamstoday.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(400);

  await expect(page).toHaveTitle(/.+/);

  console.log('Homepage URL:', page.url());
  console.log('Homepage title:', await page.title());
});
