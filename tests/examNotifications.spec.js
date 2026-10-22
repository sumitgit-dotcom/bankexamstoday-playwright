
const { test, expect } = require('@playwright/test');

test('Load all Banking exams and open their PDFs', async ({
  page,
  context
}) => {
  test.setTimeout(300000);

  const notificationsUrl =
    'https://app.bankexamstoday.com/exam-notifications.html';

  // Step 1: Open the Exam Notifications page
  await page.goto(notificationsUrl, {
    waitUntil: 'domcontentloaded'
  });

  console.log('Opened:', page.url());

  // Step 2: Select Banking from Exam Category
  const bankingOption = page.getByText('Banking', {
    exact: true
  }).first();

  await expect(bankingOption).toBeVisible({ timeout: 20000 });
  await bankingOption.click();

  await page.waitForTimeout(1500);

  // Step 3: Keep clicking Load More until all exams are displayed
  let clickCount = 0;

  while (clickCount < 100) {
    const loadMoreButton = page.getByRole('button', {
      name: /load more/i
    }).first();

    // Stop when Load More is no longer visible or enabled
    const isVisible = await loadMoreButton
      .isVisible()
      .catch(() => false);

    if (!isVisible) {
      console.log('Load More button is no longer visible.');
      break;
    }

    const isEnabled = await loadMoreButton
      .isEnabled()
      .catch(() => false);

    if (!isEnabled) {
      console.log('Load More button is disabled.');
      break;
    }

    const previousExamCount = await page.locator(
      'a[href$=".pdf"], a[href*=".pdf?"]'
    ).count();

    await loadMoreButton.click();
    clickCount++;

    console.log(`Clicked Load More: ${clickCount}`);

    // Wait for the additional results to appear
    await expect(async () => {
      const currentCount = await page.locator(
        'a[href$=".pdf"], a[href*=".pdf?"]'
      ).count();

      const buttonStillVisible = await loadMoreButton
        .isVisible()
        .catch(() => false);

      expect(
        currentCount > previousExamCount || !buttonStillVisible
      ).toBeTruthy();
    }).toPass({ timeout: 10000 }).catch(() => {
      console.log('No new direct PDF links detected after this click.');
    });

    await page.waitForTimeout(500);
  }

  // Step 4: Collect all unique PDF links after loading results
  const pdfUrls = await page.locator('a[href]').evaluateAll(links => {
    return [...new Set(
      links
        .map(link => link.href)
        .filter(url => /\.pdf(?:[?#].*)?$/i.test(url))
    )];
  });

  console.log(`Total PDF links found: ${pdfUrls.length}`);
  console.log('PDF URLs:', pdfUrls);

  expect(
    pdfUrls.length,
    'No PDF links found after loading all exam notifications.'
  ).toBeGreaterThan(0);

  // Step 5: Open every PDF in its own tab
  const pdfPages = [];

  for (let i = 0; i < pdfUrls.length; i++) {
    const pdfPage = await context.newPage();

    await pdfPage.goto(pdfUrls[i], {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    pdfPages.push(pdfPage);

    console.log(`Opened PDF ${i + 1}/${pdfUrls.length}: ${pdfUrls[i]}`);
  }

  // Step 6: Verify all PDF tabs opened
  expect(pdfPages).toHaveLength(pdfUrls.length);

  console.log(
    `SUCCESS: Opened ${pdfPages.length} exam notification PDFs.`
  );
});
