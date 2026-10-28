
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const HOME_URL = 'https://app.bankexamstoday.com/';

const TARGET_COURSE =
  'SBI AVP Wealth + Bank of Baroda Wealth Executive 2026';

const TARGET_TERMS = [
  'sbi avp wealth',
  'bank of baroda wealth executive',
];

const RESULTS_DIR = path.join(process.cwd(), 'test-results');

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function normalize(value = '') {
  return value
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTargetCourse(text, href = '') {
  const combined = normalize(`${text} ${href}`);

  return (
    combined.includes('sbi avp wealth') &&
    combined.includes('bank of baroda wealth executive')
  );
}

function isCourseLink(link) {
  const value = normalize(`${link.text} ${link.href}`);

  return (
    /course|bundle|batch|program|programme/.test(value) ||
    /course\.html|course-detail|course-details|bundle/.test(link.href)
  );
}

async function getVisibleLinks(page) {
  return page.locator('a:visible').evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      text: (anchor.innerText || anchor.textContent || '')
        .replace(/\s+/g, ' ')
        .trim(),
      href: anchor.href || '',
      ariaLabel: anchor.getAttribute('aria-label') || '',
      target: anchor.getAttribute('target') || '',
    }))
  );
}

async function printDiagnostics(page, testInfo, label) {
  console.log(`\n========== ${label} ==========`);

  console.log('CURRENT URL:', page.url());
  console.log('PAGE TITLE:', await page.title());

  const bodyText = await page.locator('body').innerText()
    .catch(() => 'Could not read page text');

  console.log('\n========== VISIBLE PAGE TEXT ==========');
  console.log(bodyText.slice(0, 20000));

  const links = await getVisibleLinks(page).catch(() => []);

  console.log('\n========== ALL VISIBLE LINKS ==========');
  console.log(JSON.stringify(links, null, 2));

  const targetElements = await page
    .locator('body *')
    .evaluateAll((elements) => {
      const seen = new Set();

      return elements
        .filter((element) => {
          const text = (element.innerText || element.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

          const matches =
            text.includes('sbi avp wealth') ||
            text.includes('bank of baroda wealth executive');

          // Avoid returning huge parent containers and duplicate text.
          if (!matches || text.length > 400 || text.length < 5) {
            return false;
          }

          const key = `${element.tagName}|${text}`;

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);
          return true;
        })
        .slice(0, 40)
        .map((element) => ({
          tag: element.tagName,
          text: (element.innerText || element.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 400),
          href: element.closest('a')?.href || '',
          role: element.getAttribute('role') || '',
          className:
            typeof element.className === 'string'
              ? element.className
              : '',
        }));
    })
    .catch(() => []);

  console.log('\n========== TARGET-RELATED ELEMENTS ==========');
  console.log(JSON.stringify(targetElements, null, 2));

  const screenshotPath = testInfo.outputPath(`${label}.png`);

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: 'disabled',
  }).catch((error) => {
    console.log('Screenshot error:', error.message);
  });

  console.log('Screenshot saved:', screenshotPath);

  await testInfo.attach(`${label}-screenshot`, {
    path: screenshotPath,
    contentType: 'image/png',
  }).catch(() => {});

  return { bodyText, links, targetElements };
}

async function findSearchInput(page) {
  const candidates = [
    page.getByPlaceholder(/search course titles/i),
    page.getByPlaceholder(/search courses/i),
    page.getByPlaceholder(/search/i),
    page.locator('input[type="search"]'),
    page.locator('input[name*="search" i]'),
    page.locator('input[id*="search" i]'),
    page.locator('input[placeholder*="course" i]'),
    page.locator('input[type="text"]'),
  ];

  for (const candidate of candidates) {
    const count = await candidate.count().catch(() => 0);

    for (let index = 0; index < count; index++) {
      const input = candidate.nth(index);

      if (await input.isVisible().catch(() => false)) {
        return input;
      }
    }
  }

  return null;
}

async function openLinkInNewTab(context, sourcePage, linkInfo) {
  const newTab = await context.newPage();

  try {
    await newTab.goto(linkInfo.href, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await newTab.waitForLoadState('load', { timeout: 10000 })
      .catch(() => {});

    console.log(
      `Opened result in new tab: ${linkInfo.text || '(no link text)'} | ${newTab.url()}`
    );

    return newTab;
  } catch (error) {
    console.log(
      `Could not open result: ${linkInfo.href} | ${error.message}`
    );

    await newTab.close().catch(() => {});
    return null;
  }
}

test(
  'Search interview courses, open five results, and capture checkout payment interface',
  async ({ page, context, browserName }, testInfo) => {
    test.setTimeout(120000);

    const openedTabs = [];

    // STEP 1: Open the homepage.
    await page.goto(HOME_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.waitForLoadState('load', { timeout: 15000 })
      .catch(() => {});

    await expect(page.locator('body')).toBeVisible();

    console.log('STEP 1: Homepage opened:', page.url());

    // STEP 2: Click Courses in the header.
    const coursesCandidates = [
      page.getByRole('link', { name: /^courses$/i }),
      page.getByText(/^courses$/i),
    ];

    let coursesClicked = false;

    for (const candidate of coursesCandidates) {
      const count = await candidate.count().catch(() => 0);

      for (let index = 0; index < count; index++) {
        const item = candidate.nth(index);

        if (await item.isVisible().catch(() => false)) {
          await item.click({ timeout: 10000 }).catch(() => {});
          coursesClicked = true;
          break;
        }
      }

      if (coursesClicked) break;
    }

    if (!coursesClicked) {
      console.log(
        'Courses navigation was not found or could not be clicked. Continuing to inspect the current page.'
      );
    }

    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
      .catch(() => {});

    await page.waitForTimeout(1500);

    console.log('STEP 2: Current page:', page.url());

    // STEP 3: Search for interview courses.
    const searchInput = await findSearchInput(page);

    if (searchInput) {
      await searchInput.fill('interview');
      await searchInput.press('Enter').catch(() => {});

      await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
        .catch(() => {});

      await page.waitForTimeout(2000);

      console.log('STEP 3: Search submitted for "interview".');
    } else {
      console.log(
        'Search input not found. Saving diagnostics to identify the correct search selector.'
      );

      await printDiagnostics(
        page,
        testInfo,
        `interview-search-no-input-${browserName}`
      );

      throw new Error(
        'Search input was not found. Review the attached screenshot and diagnostic output.'
      );
    }

    // STEP 4: Scroll to allow lazy-loaded search results to appear.
    for (let index = 0; index < 5; index++) {
      await page.evaluate(() => {
        window.scrollBy(0, Math.max(window.innerHeight * 0.8, 500));
      });

      await page.waitForTimeout(500);
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    // STEP 5: Inspect the search results and identify the requested course.
    const diagnostics = await printDiagnostics(
      page,
      testInfo,
      `interview-search-debug-${browserName}`
    );

    let links = diagnostics.links;

    const targetLink = links.find((link) =>
      isTargetCourse(`${link.text} ${link.ariaLabel}`, link.href)
    );

    if (!targetLink) {
      const targetElement = diagnostics.targetElements.find((element) =>
        isTargetCourse(element.text, element.href)
      );

      if (targetElement?.href) {
        links = [
          ...links,
          {
            text: targetElement.text,
            href: targetElement.href,
            ariaLabel: '',
            target: '',
          },
        ];
      }
    }

    const finalTargetLink = links.find((link) =>
      isTargetCourse(`${link.text} ${link.ariaLabel}`, link.href)
    );

    if (!finalTargetLink) {
      throw new Error(
        `Could not identify "${TARGET_COURSE}" in the loaded page. ` +
        'Review the attached search screenshot, VISIBLE PAGE TEXT, ALL VISIBLE LINKS, ' +
        'and TARGET-RELATED ELEMENTS in the test output.'
      );
    }

    console.log('Target course identified:', finalTargetLink);

    // STEP 6: Open the target result and four other unique results in new tabs.
    // Keep the original search page open.
    const uniqueLinks = [];
    const seenHrefs = new Set();

    // Open the requested course first.
    uniqueLinks.push(finalTargetLink);
    seenHrefs.add(finalTargetLink.href);

    // Then choose four other unique course/bundle results.
    for (const link of links) {
      if (uniqueLinks.length >= 5) break;
      if (!link.href || seenHrefs.has(link.href)) continue;
      if (!/^https?:/i.test(link.href)) continue;
      if (!isCourseLink(link)) continue;

      seenHrefs.add(link.href);
      uniqueLinks.push(link);
    }

    // If fewer than five course links were identified, use other unique
    // visible search-result links, without duplicating the target.
    for (const link of links) {
      if (uniqueLinks.length >= 5) break;
      if (!link.href || seenHrefs.has(link.href)) continue;
      if (!/^https?:/i.test(link.href)) continue;
      if (new URL(link.href).origin !== new URL(HOME_URL).origin) continue;

      seenHrefs.add(link.href);
      uniqueLinks.push(link);
    }

    if (uniqueLinks.length < 5) {
      console.log(
        `Only ${uniqueLinks.length} unique result links were found; continuing with the available links.`
      );
    }

    for (const link of uniqueLinks) {
      const tab = await openLinkInNewTab(context, page, link);

      if (tab) {
        openedTabs.push({
          tab,
          link,
        });
      }
    }

    console.log(`STEP 6: Opened ${openedTabs.length} result tab(s).`);

    // STEP 7: Return to the requested course tab.
    const targetEntry = openedTabs.find((entry) =>
      isTargetCourse(
        `${entry.link.text} ${entry.link.ariaLabel}`,
        entry.link.href
      )
    );

    if (!targetEntry) {
      throw new Error(
        'The requested course could not be opened in a new tab.'
      );
    }

    const coursePage = targetEntry.tab;
    await coursePage.bringToFront();

    console.log('STEP 7: Target course page:', coursePage.url());

    await printDiagnostics(
      coursePage,
      testInfo,
      `target-course-page-${browserName}`
    );

    // STEP 8: Click Buy Bundle.
    const buyBundleCandidates = [
      coursePage.getByRole('button', { name: /buy bundle/i }),
      coursePage.getByRole('link', { name: /buy bundle/i }),
      coursePage.getByText(/buy bundle/i),
    ];

    let buyBundleClicked = false;

    for (const candidate of buyBundleCandidates) {
      const count = await candidate.count().catch(() => 0);

      for (let index = 0; index < count; index++) {
        const item = candidate.nth(index);

        if (await item.isVisible().catch(() => false)) {
          await item.scrollIntoViewIfNeeded().catch(() => {});
          await item.click({ timeout: 10000 }).catch(() => {});
          buyBundleClicked = true;
          break;
        }
      }

      if (buyBundleClicked) break;
    }

    if (!buyBundleClicked) {
      await printDiagnostics(
        coursePage,
        testInfo,
        `buy-bundle-not-found-${browserName}`
      );

      throw new Error(
        'Buy Bundle was not found or could not be clicked. Review the target-course screenshot and links.'
      );
    }

    await coursePage.waitForTimeout(1500);

    console.log('STEP 8: Buy Bundle clicked.');

    // STEP 9: Identify the cart/checkout page.
    let checkoutPage = coursePage;

    const possiblePages = context.pages();

    for (const candidatePage of possiblePages) {
      const currentUrl = candidatePage.url().toLowerCase();

      if (
        candidatePage !== page &&
        (
          currentUrl.includes('cart') ||
          currentUrl.includes('checkout') ||
          currentUrl.includes('payment')
        )
      ) {
        checkoutPage = candidatePage;
        break;
      }
    }

    await checkoutPage.bringToFront();

    await checkoutPage.waitForLoadState('domcontentloaded', {
      timeout: 10000,
    }).catch(() => {});

    await printDiagnostics(
      checkoutPage,
      testInfo,
      `checkout-page-${browserName}`
    );

    // STEP 10: Enter the requested email address.
    const emailCandidates = [
      checkoutPage.locator('input[type="email"]'),
      checkoutPage.locator('input[name*="email" i]'),
      checkoutPage.locator('input[id*="email" i]'),
      checkoutPage.locator('input[placeholder*="email" i]'),
      checkoutPage.locator('input[autocomplete="email"]'),
    ];

    let emailInput = null;

    for (const candidate of emailCandidates) {
      const count = await candidate.count().catch(() => 0);

      for (let index = 0; index < count; index++) {
        const input = candidate.nth(index);

        if (await input.isVisible().catch(() => false)) {
          emailInput = input;
          break;
        }
      }

      if (emailInput) break;
    }

    if (!emailInput) {
      await printDiagnostics(
        checkoutPage,
        testInfo,
        `checkout-email-not-found-${browserName}`
      );

      throw new Error(
        'Email input was not found on the checkout page. Review the checkout screenshot and diagnostic output.'
      );
    }

    await emailInput.fill('james@yopmail.com');

    console.log('STEP 10: Checkout email entered.');

    // STEP 11: Click Pay/Proceed to Payment.
    // Do not enter card details or confirm a real transaction.
    const payCandidates = [
      checkoutPage.getByRole('button', {
        name: /pay|proceed to pay|make payment|continue to payment/i,
      }),
      checkoutPage.getByRole('link', {
        name: /pay|proceed to pay|make payment|continue to payment/i,
      }),
      checkoutPage.getByText(
        /proceed to pay|make payment|continue to payment/i
      ),
    ];

    let payClicked = false;

    for (const candidate of payCandidates) {
      const count = await candidate.count().catch(() => 0);

      for (let index = 0; index < count; index++) {
        const item = candidate.nth(index);

        if (await item.isVisible().catch(() => false)) {
          await item.scrollIntoViewIfNeeded().catch(() => {});
          await item.click({ timeout: 10000 }).catch(() => {});
          payClicked = true;
          break;
        }
      }

      if (payClicked) break;
    }

    if (!payClicked) {
      await printDiagnostics(
        checkoutPage,
        testInfo,
        `pay-button-not-found-${browserName}`
      );

      throw new Error(
        'Pay/Proceed to Payment was not found or could not be clicked. Review the checkout screenshot and diagnostic output.'
      );
    }

    await checkoutPage.waitForLoadState('domcontentloaded', {
      timeout: 10000,
    }).catch(() => {});

    await checkoutPage.waitForTimeout(2500);

    // STEP 12: Capture the payment interface.
    const paymentScreenshot = testInfo.outputPath(
      `interview-payment-interface-${browserName}.png`
    );

    await checkoutPage.screenshot({
      path: paymentScreenshot,
      fullPage: true,
      animations: 'disabled',
    });

    await testInfo.attach('Payment interface screenshot', {
      path: paymentScreenshot,
      contentType: 'image/png',
    });

    console.log('STEP 12: Payment interface screenshot saved:', paymentScreenshot);
    console.log('Final URL:', checkoutPage.url());
    console.log(
      'Payment interface captured. No payment credentials were entered and no payment confirmation was submitted.'
    );

    // The original search page remains open, along with the result tabs.
    await page.bringToFront();
  }
);
