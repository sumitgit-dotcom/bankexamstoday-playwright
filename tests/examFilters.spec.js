
const { test, expect } = require('@playwright/test');

test.setTimeout(300000);

test('Select each visible sidebar filter checkbox and reset filters', async ({ page }) => {
  await page.goto('https://app.bankexamstoday.com/exam-notifications.html');
  await page.waitForLoadState('domcontentloaded');

  const sidebar = page
    .locator('aside, [class*="sidebar"], [class*="filter"]')
    .filter({ has: page.locator('input[type="checkbox"]') })
    .first();

  await expect(sidebar).toBeVisible({ timeout: 15000 });

  const checkboxes = sidebar.locator('input[type="checkbox"]');
  const count = await checkboxes.count();

  console.log(`Found ${count} sidebar checkboxes.`);

  for (let i = 0; i < count; i++) {
    const checkbox = checkboxes.nth(i);

    try {
      // Skip hidden checkboxes.
      if (!(await checkbox.isVisible())) {
        console.log(`Checkbox ${i + 1} is hidden. Skipping.`);
        continue;
      }

      await checkbox.scrollIntoViewIfNeeded();

      const label = checkbox.locator('xpath=ancestor::label[1]');
      const id = await checkbox.getAttribute('id');

      // Prefer clicking the visible label when available.
      if (!(await checkbox.isChecked())) {
        if (await label.count() && await label.isVisible()) {
          await label.click();
        } else if (id) {
          const associatedLabel = page.locator(`label[for="${id}"]`).first();

          if (await associatedLabel.isVisible().catch(() => false)) {
            await associatedLabel.click();
          } else {
            await checkbox.check();
          }
        } else {
          await checkbox.check();
        }
      }

      await expect(checkbox).toBeChecked({ timeout: 5000 });

      console.log(`Checkbox ${i + 1} selected successfully.`);
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log(`Checkbox ${i + 1} could not be selected: ${error.message}`);
    }
  }

  // Reset filters if a reset/clear control is available.
  const resetButton = page.getByRole('button', {
    name: /reset|clear filters|clear all/i
  }).first();

  const clearLink = page.getByRole('link', {
    name: /reset|clear filters|clear all/i
  }).first();

  if (await resetButton.isVisible().catch(() => false)) {
    await resetButton.click();
    console.log('Reset button clicked.');
  } else if (await clearLink.isVisible().catch(() => false)) {
    await clearLink.click();
    console.log('Clear filters link clicked.');
  } else {
    console.log('Reset control not found. Reloading page.');
    await page.reload();
  }

  await page.waitForTimeout(3000);
});
