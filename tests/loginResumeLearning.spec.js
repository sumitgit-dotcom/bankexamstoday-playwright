
const { test, expect } = require('@playwright/test');

test('Login and resume Banking and Financial Awareness learning', async ({ page }) => {
  test.setTimeout(90000);

 
  // STEP 1: Open login page
  await page.goto(
    'https://app.bankexamstoday.com/signin.html?tab=login&next=dashboard.html',
    { waitUntil: 'domcontentloaded' }
  );

  await page.waitForTimeout(1500);

  // STEP 2: Switch from mobile login to email login
  const emailOption = page.getByRole('button', {
    name: 'Email',
    exact: true
  });

  await expect(emailOption).toBeVisible({ timeout: 15000 });
  await emailOption.click();

  console.log('Clicked Email option.');

  // STEP 3: Inspect the form after clicking Email
  await page.waitForTimeout(1000);

  console.log('URL after clicking Email:', page.url());
  console.log(
    'Visible page text after clicking Email:',
    (await page.locator('body').innerText()).slice(0, 5000)
  );

  console.log(
    'Input details after clicking Email:',
    JSON.stringify(
      await page.locator('input').evaluateAll(elements =>
        elements.map(el => ({
          type: el.type,
          id: el.id,
          name: el.name,
          placeholder: el.placeholder,
          visible: !!(
            el.offsetWidth ||
            el.offsetHeight ||
            el.getClientRects().length
          ),
          disabled: el.disabled
        }))
      ),
      null,
      2
    )
  );

  await page.screenshot({
    path: test.info().outputPath('email-login-form.png'),
    fullPage: true
  });

  // STEP 4: Find the visible email field
  const emailField = page.locator(
    'input[type="email"]:visible, ' +
    'input[name*="email" i]:visible, ' +
    'input[placeholder*="email" i]:visible'
  ).first();

  if (!(await emailField.isVisible().catch(() => false))) {
    throw new Error(
      'Email option was clicked, but no visible email input appeared. Inspect email-login-form.png and the input details.'
    );
  }

  await emailField.fill('steve@yopmail.com');

  // Stop here until we confirm the email form's actual fields and behavior.
  console.log('Email field located and filled successfully.');


  // STEP 5: Click the login/continue button
  const submitCandidates = page.locator(
    'button:visible, input[type="submit"]:visible'
  );

  let submitButton = null;

  for (let i = 0; i < await submitCandidates.count(); i++) {
    const candidate = submitCandidates.nth(i);

    const text = (
      await candidate.innerText().catch(() => '')
    ).trim();

    if (
      await candidate.isEnabled().catch(() => false) &&
      /^(log in|login|sign in|continue|submit)$/i.test(text)
    ) {
      submitButton = candidate;
      break;
    }
  }

  if (!submitButton) {
    console.log(
      'Visible buttons:',
      await page.locator('button:visible').allTextContents()
    );

    throw new Error('Could not identify the email login submit button.');
  }

  await submitButton.click();

  
  // STEP 6: Wait for the login result
  await page.waitForTimeout(3000);

  console.log('URL after login:', page.url());
  console.log('Page title:', await page.title());

  // STEP 7: Check the visible page content
  const visibleText = await page.locator('body').innerText()
    .catch(() => 'Could not read page text');

  console.log('PAGE TEXT AFTER LOGIN:\n', visibleText.slice(0, 10000));

  // Check for visible login/verification fields
  const visibleInputs = await page.locator('input').evaluateAll(elements =>
    elements
      .filter(el =>
        !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
      )
      .map(el => ({
        type: el.type,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder
      }))
  );

  console.log('VISIBLE INPUTS AFTER LOGIN:', JSON.stringify(visibleInputs, null, 2));

  // Save the page state for debugging
  await page.screenshot({
    path: test.info().outputPath('after-login-debug.png'),
    fullPage: true
  }).catch(() => {});

  // STEP 8: Verify dashboard content
  const dashboardIndicators = [
    page.getByText(/my subjects/i).first(),
    page.getByText(/banking and financial awareness/i).first(),
    page.getByText(/dashboard/i).first()
  ];

  let dashboardFound = false;

  for (const indicator of dashboardIndicators) {
    if (await indicator.isVisible().catch(() => false)) {
      dashboardFound = true;
      break;
    }
  }

  if (!dashboardFound) {
    throw new Error(
      'Dashboard was not detected after login. Review PAGE TEXT AFTER LOGIN, VISIBLE INPUTS AFTER LOGIN, and after-login-debug.png. Login may require verification or may have failed.'
    );
  }

  console.log('Dashboard content detected.');

  // STEP 9: Find My Subjects, if present
  const mySubjects = page.getByText(/my subjects/i).first();

  if (await mySubjects.isVisible().catch(() => false)) {
    console.log('My Subjects section found.');
  }

  // STEP 10: Open Banking and Financial Awareness
  const subject = page.getByText(
    /banking and financial awareness/i
  ).first();

  await expect(
    subject,
    'Banking and Financial Awareness should be visible on the dashboard'
  ).toBeVisible({ timeout: 20000 });

  await subject.click();

  console.log('Clicked Banking and Financial Awareness.');

  // STEP 11: Click Resume Learning
  const resumeLearning = page.getByText(/resume learning/i).first();

  await expect(
    resumeLearning,
    'Resume Learning should be visible'
  ).toBeVisible({ timeout: 20000 });

  await resumeLearning.click();

  await page.waitForTimeout(2000);

  console.log('URL after Resume Learning:', page.url());

  await page.screenshot({
    path: test.info().outputPath('resume-learning-result.png'),
    fullPage: true
  }).catch(() => {});

  console.log('Resume Learning flow completed.');
});
