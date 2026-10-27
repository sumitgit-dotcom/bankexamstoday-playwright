
const { test, expect } = require('@playwright/test');

test('Navigate to IBPS SO Law Officer Course and watch a new class', async ({
  page,
  browserName
}) => {
  test.setTimeout(120000);

  console.log(`Running course navigation test on: ${browserName}`);

  // STEP 1: Open the homepage
  await page.goto('https://www.bankexamstoday.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  console.log('Homepage opened:', page.url());

  // STEP 2: Find and click View All Courses
  const viewAllCourses = page.getByRole('link', {
    name: /view all courses/i
  }).first();

  await expect(viewAllCourses).toBeVisible({ timeout: 30000 });
  await viewAllCourses.scrollIntoViewIfNeeded();

  await Promise.all([
    page.waitForURL(url => !url.href.includes('bankexamstoday.com/') ||
      url.href.includes('course'), { timeout: 15000 }).catch(() => {}),
    viewAllCourses.click()
  ]);

  console.log('After View All Courses click:', page.url());

  // STEP 3: Open the requested course page
  await page.goto(
    'https://app.bankexamstoday.com/course.html?slug=ibps-so-law-officer-course-2026',
    {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    }
  );

  await page.waitForTimeout(3000);

  console.log('Course page URL:', page.url());
  console.log('Course page title:', await page.title());

  // STEP 4: Scroll through the course page to load dynamic content
  await page.evaluate(async () => {
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < 6; i++) {
      window.scrollBy(0, Math.max(400, window.innerHeight * 0.7));
      await pause(400);
    }

    window.scrollTo(0, 0);
  });

  await page.waitForTimeout(1500);

  // STEP 5: Print relevant visible page text
  const bodyText = await page.locator('body').innerText().catch(() => '');

  console.log('----- RELEVANT PAGE TEXT -----');
  console.log(
    bodyText
      .split('\n')
      .map(line => line.trim())
      .filter(line =>
        /watch|video|class|lesson|lecture|play|login|sign in|enroll|course/i.test(line)
      )
      .join('\n')
  );
  console.log('----- END PAGE TEXT -----');

  // STEP 6: Inspect buttons, links, and clickable elements
  const clickableElements = page.locator(
    'button, a, [role="button"], [onclick], input[type="button"], input[type="submit"]'
  );

  const elementCount = await clickableElements.count();
  console.log(`Total potential clickable elements: ${elementCount}`);

  const candidates = [];

  for (let i = 0; i < elementCount; i++) {
    const element = clickableElements.nth(i);

    const details = await element.evaluate(el => ({
      tag: el.tagName,
      text: (el.innerText || el.value || '').trim(),
      ariaLabel: el.getAttribute('aria-label'),
      title: el.getAttribute('title'),
      href: el.getAttribute('href'),
      id: el.id,
      className: typeof el.className === 'string' ? el.className : '',
      visible: !!(el.getClientRects().length) &&
        getComputedStyle(el).visibility !== 'hidden' &&
        getComputedStyle(el).display !== 'none'
    }));

    if (
      /watch|new class|video|lesson|lecture|play/i.test(
        `${details.text} ${details.ariaLabel || ''} ${details.title || ''} ${details.href || ''} ${details.id} ${details.className}`
      )
    ) {
      console.log(`Candidate ${candidates.length + 1}:`, details);

      candidates.push({
        locator: element,
        details
      });
    }
  }

  // STEP 7: Inspect video players, iframes, and watch-related elements
  const mediaElements = page.locator(
    'video, iframe, [id*="watch" i], [class*="watch" i], ' +
    '[id*="video" i], [class*="video" i], [class*="lesson" i], ' +
    '[data-testid*="video" i]'
  );

  const mediaCount = await mediaElements.count();

  console.log(`Potential video/media elements: ${mediaCount}`);

  for (let i = 0; i < Math.min(mediaCount, 30); i++) {
    const details = await mediaElements.nth(i).evaluate(el => ({
      tag: el.tagName,
      id: el.id,
      className: typeof el.className === 'string' ? el.className : '',
      title: el.getAttribute('title'),
      ariaLabel: el.getAttribute('aria-label'),
      src: el.getAttribute('src'),
      visible: !!(el.getClientRects().length)
    }));

    console.log(`Media ${i + 1}:`, details);
  }

  // STEP 8: Print iframe URLs
  console.log(
    'Page frames:',
    page.frames().map(frame => frame.url())
  );

  // STEP 9: Click a matching Watch element if one is found
  const watchCandidate = candidates.find(candidate =>
    /watch|new class|video/i.test(
      `${candidate.details.text} ${candidate.details.ariaLabel || ''} ${candidate.details.title || ''}`
    )
  );

  if (watchCandidate) {
    const element = watchCandidate.locator;

    await element.scrollIntoViewIfNeeded();
    await expect(element).toBeVisible({ timeout: 15000 });
    await element.click({ timeout: 15000 });

    console.log('Clicked matching Watch/Video element.');

    await page.waitForTimeout(2000);

    console.log('URL after click:', page.url());
    console.log('Page title after click:', await page.title());
  } else {
    console.log(
      'WATCH ELEMENT NOT IDENTIFIED. Review the diagnostic output above.'
    );

    // Save a screenshot for debugging
    await page.screenshot({
      path: 'test-results/course-page-diagnostic.png',
      fullPage: true
    });

    throw new Error(
      'Could not identify the Watch a New Class / Watch Video element. ' +
      'Review the page text, candidate elements, media elements, and frames.'
    );
  }
});
