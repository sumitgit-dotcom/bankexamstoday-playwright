
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('BOB Digital Banking Course - Inspect checkout and capture payment popup', async ({
  page,
  context,
  browserName
}) => {
  test.setTimeout(120000);

  const courseUrl =
    'https://app.bankexamstoday.com/course.html?slug=bob-digital-banking-course-2026';

  const email = 'jacob@yopmail.com';

  const resultsDir = path.join(process.cwd(), 'test-results');
  fs.mkdirSync(resultsDir, { recursive: true });

  console.log(`Running BOB course test on ${browserName}`);

  // STEP 1: Open the homepage
  await page.goto('https://www.bankexamstoday.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  console.log('Homepage opened:', page.url());

  // STEP 2: Try to find the course link on the homepage
  const courseLink = page.locator(
    'a[href*="bob-digital-banking-course-2026"]'
  ).first();

  if (
    await courseLink.count() > 0 &&
    await courseLink.isVisible().catch(() => false)
  ) {
    await courseLink.scrollIntoViewIfNeeded();
    await courseLink.click();
  } else {
    console.log('Course link not found on homepage; opening course URL.');
    await page.goto(courseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
  }

  await expect(page).toHaveURL(
    /bob-digital-banking-course-2026/,
    { timeout: 30000 }
  );

  await page.waitForLoadState('domcontentloaded');

  console.log('Course page opened:', page.url());

  // STEP 3: Find and click Buy Full Course
  const buyLink = page.getByRole('link', {
    name: 'Buy Full Course',
    exact: true
  }).first();

  await expect(buyLink).toBeVisible({ timeout: 30000 });
  await buyLink.scrollIntoViewIfNeeded();

  console.log('Buy Full Course href:', await buyLink.getAttribute('href'));

  // Watch for a new tab during navigation
  const cartPopupPromise = context.waitForEvent('page', {
    timeout: 5000
  }).catch(() => null);

  await buyLink.click();

  const cartPopup = await cartPopupPromise;

  if (cartPopup) {
    await cartPopup.waitForLoadState('domcontentloaded').catch(() => {});
    console.log('A new checkout tab opened:', cartPopup.url());
  }

  // Use the checkout tab if one opened; otherwise continue in the same tab
  const checkoutPage = cartPopup || page;

  await checkoutPage.waitForLoadState('domcontentloaded').catch(() => {});
  await checkoutPage.waitForTimeout(2000);

  console.log('Checkout URL:', checkoutPage.url());
  console.log('Checkout title:', await checkoutPage.title());

  // STEP 4: Capture checkout page before interacting with payment
  await checkoutPage.screenshot({
    path: path.join(resultsDir, `bob-checkout-${browserName}.png`),
    fullPage: true
  });

  // STEP 5: Inspect all input fields
  const inputs = await checkoutPage.locator('input').evaluateAll(elements =>
    elements.map(el => ({
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      value: el.type === 'password' ? '[hidden]' : el.value,
      visible: !!(el.offsetWidth || el.offsetHeight)
    }))
  );

  console.log('INPUT FIELDS:', JSON.stringify(inputs, null, 2));

  // STEP 6: Inspect all buttons
  const buttons = await checkoutPage.locator('button').evaluateAll(elements =>
    elements.map(el => ({
      text: el.innerText.trim(),
      ariaLabel: el.getAttribute('aria-label'),
      type: el.type,
      visible: !!(el.offsetWidth || el.offsetHeight),
      disabled: el.disabled
    }))
  );

  console.log('BUTTONS:', JSON.stringify(buttons, null, 2));

  // STEP 7: Inspect all links
  const links = await checkoutPage.locator('a').evaluateAll(elements =>
    elements.map(el => ({
      text: el.innerText.trim(),
      href: el.href,
      visible: !!(el.offsetWidth || el.offsetHeight)
    }))
  );

  console.log('LINKS:', JSON.stringify(links, null, 2));

  // STEP 8: Inspect iframes
  const frames = await checkoutPage.locator('iframe').evaluateAll(elements =>
    elements.map(el => ({
      title: el.title,
      src: el.src
    }))
  );

  console.log('IFRAMES:', JSON.stringify(frames, null, 2));

  // STEP 9: Try to locate the email field using common selectors
  const emailInput = checkoutPage.locator(
    'input[type="email"], ' +
    'input[placeholder*="email" i], ' +
    'input[name*="email" i], ' +
    'input[id*="email" i], ' +
    'input[autocomplete="email"]'
  ).first();

  if (
    await emailInput.count() > 0 &&
    await emailInput.isVisible().catch(() => false)
  ) {
    await emailInput.fill(email);
    console.log('Entered checkout email:', email);
  } else {
    console.log(
      'Email input not identified. Review INPUT FIELDS and the checkout screenshot.'
    );
  }

  // STEP 10: Capture the current checkout state
  await checkoutPage.screenshot({
    path: path.join(resultsDir, `bob-checkout-debug-${browserName}.png`),
    fullPage: true
  });

  // STEP 11: Inspect payment-related controls without clicking them yet
  const paymentControls = await checkoutPage.locator(
    'button, a, input[type="submit"], input[type="button"]'
  ).evaluateAll(elements =>
    elements
      .map(el => ({
        tag: el.tagName,
        text: (el.innerText || el.value || '').trim(),
        ariaLabel: el.getAttribute('aria-label'),
        href: el.href || '',
        visible: !!(el.offsetWidth || el.offsetHeight),
        disabled: 'disabled' in el ? el.disabled : false
      }))
      .filter(el =>
        /pay|payment|checkout|continue|proceed|purchase|order|place|confirm/i
          .test(`${el.text} ${el.ariaLabel} ${el.href}`)
      )
  );

  console.log(
    'PAYMENT-RELATED CONTROLS:',
    JSON.stringify(paymentControls, null, 2)
  );

  // STEP 12: Check for an already-open payment popup or dialog
  const dialog = checkoutPage.getByRole('dialog').first();
  const dialogVisible = await dialog.isVisible().catch(() => false);

  const paymentFrames = checkoutPage.locator(
    'iframe[src*="payment" i], ' +
    'iframe[src*="checkout" i], ' +
    'iframe[src*="razorpay" i], ' +
    'iframe[src*="pay" i]'
  );

  const paymentFrameVisible =
    await paymentFrames.first().isVisible().catch(() => false);

  if (dialogVisible || paymentFrameVisible) {
    await checkoutPage.screenshot({
      path: path.join(resultsDir, `bob-payment-popup-${browserName}.png`),
      fullPage: true
    });

    console.log('Payment interface detected and screenshot captured.');
  } else {
    console.log(
      'No payment popup detected yet. Checkout diagnostics and screenshots saved.'
    );
    console.log(
      'The test stopped before submitting any payment. Use the diagnostic output to identify the next action.'
    );
  }
});
