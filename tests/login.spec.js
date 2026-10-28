
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'test-data', 'loginData.csv');

function readLoginData(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Login CSV file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '')
    .trim();

  const lines = content.split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error('The CSV must contain a header and at least one data row.');
  }

  const headers = lines[0].split(',').map(value => value.trim());
  const required = ['email', 'password', 'expectedResult'];

  for (const header of required) {
    if (!headers.includes(header)) {
      throw new Error(`Missing CSV column: ${header}`);
    }
  }

  return lines.slice(1)
    .filter(line => line.trim() !== '')
    .map(line => {
      // This simple parser supports ordinary CSV values without commas.
      const values = line.split(',');
      const row = {};

      headers.forEach((header, index) => {
        row[header] = (values[index] || '').trim();
      });

      return row;
    });
}

const loginData = readLoginData(csvPath);

for (const [index, data] of loginData.entries()) {
  test(`Login CSV test ${index + 1}: ${data.expectedResult}`, async ({ page }) => {
    test.skip(
      !data.email ||
      !data.password ||
      data.email.endsWith('@example.com') ||
      data.password.startsWith('REPLACE_'),
      'Replace the sample CSV credentials before running this test.'
    );

    await page.goto(
      'https://app.bankexamstoday.com/signin.html?tab=login&next=dashboard.html'
    );

    const email = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name*="email" i]'
    ).first();

    const password = page.locator(
      'input[type="password"], input[placeholder*="password" i], input[name*="password" i]'
    ).first();

    await expect(email).toBeVisible();
    await expect(password).toBeVisible();

    await email.fill(data.email);
    await password.fill(data.password);

    const loginButton = page.getByRole('button', {
      name: /^log in$/i
    });

    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Wait for the application's response after submitting the form.
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    if (data.expectedResult.toLowerCase() === 'success') {
      // Adjust this assertion if the application uses a different
      // successful-login URL or confirmation element.
      await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });
    } else {
      // Invalid-login UI varies; confirm that the login page remains
      // available rather than assuming a particular error message.
      await expect(page.locator('input[type="password"]')).toBeVisible({
        timeout: 10000
      });
    }

    await page.screenshot({
      path: path.join(
        test.info().outputDir,
        `login-${index + 1}.png`
      ),
      fullPage: true
    });
  });
}
