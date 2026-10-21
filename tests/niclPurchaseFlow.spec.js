const { test, expect } = require('@playwright/test');

test('Open both NICL results and proceed to course payment', async ({
  page,
  context
}) => {
  
  await page.goto('https://app.bankexamstoday.com/', {
    waitUntil: 'domcontentloaded'
  });

    await page.getByRole('link', { name: /^courses$/i }).first().click();

      await page.waitForURL(/courses\.html/, { timeout: 15000 });

       const searchBox = page.getByPlaceholder(/search course titles/i);
         await expect(searchBox).toBeVisible();

           await searchBox.fill('NICL');

             const resultLinks = page.locator('a[href*="course.html?slug=nicl-"]');
              await expect(resultLinks.first()).toBeVisible();
              const courseUrls = await resultLinks.evaluateAll(links => {
    return [...new Set(
      links.map(link => link.href)
        .filter(url => url.includes('course.html?slug=nicl-'))
    )];
  });

    expect(courseUrls.length).toBeGreaterThanOrEqual(2);
      console.log('Opening both NICL search results:', courseUrls.slice(0, 2));
      const [firstTab, secondTab] = await Promise.all(
    courseUrls.slice(0, 2).map(async url => {
      const newTab = await context.newPage();
      await newTab.goto(url, { waitUntil: 'domcontentloaded' });
      return newTab;
    })
  );

   console.log('First tab:', firstTab.url());

    console.log('Second tab:', secondTab.url());

     await firstTab.bringToFront();

     const assistantCourse = courseUrls.find(url =>
    /nicl-assist(?:ant|nat)-officer-course-2026/i.test(url)
  );

   expect(
    assistantCourse,
    'NICL Assistant Officer Course 2026 was not found in the search results'
  ).toBeTruthy();

  if (firstTab.url() !== assistantCourse) {
    await firstTab.goto(assistantCourse, {
      waitUntil: 'domcontentloaded'
    });
  }

    await expect(
    firstTab.getByRole('heading', {
      name: /NICL Assistant Officer Course 2026/i
    })
  ).toBeVisible();

   await firstTab.getByRole('link', {
    name: /buy full course/i
  }).click();

   await firstTab.waitForLoadState('domcontentloaded').catch(() => {});

    let checkoutPage = firstTab;

      if (!/cart|checkout|payment/i.test(firstTab.url())) {
    const checkoutLink = firstTab.getByRole('link', {
      name: /cart|checkout|buy full course/i
    }).first();

    if (await checkoutLink.isVisible().catch(() => false)) {
      await checkoutLink.click();
    }
  }


    console.log('Checkout URL:', checkoutPage.url());

     const emailInput = checkoutPage.locator(
    'input[type="email"], input[name*="email" i], input[placeholder*="email" i]'
  ).first();

   await expect(emailInput).toBeVisible({ timeout: 15000 });

    await emailInput.fill('jacob@yopmail.com');

     const payButton = checkoutPage.getByRole('button', {
    name: /^pay\b/i
  }).first();

   await expect(payButton).toBeVisible();
  await expect(payButton).toBeEnabled();

   console.log('Email entered. Pay button is visible and enabled.');
});