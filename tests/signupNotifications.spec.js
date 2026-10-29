
const { test, expect } = require('@playwright/test');

test('Signup with email and open notifications', async ({ page }, testInfo) => {
  test.setTimeout(90000);

  // Helper: save a screenshot only if the page is still open.
  async function saveScreenshot(name) {
    if (page.isClosed()) {
      console.log(`Cannot capture ${name}: page is already closed.`);
      return;
    }

    await page.screenshot({
      path: testInfo.outputPath(name),
      fullPage: true,
      timeout: 5000,
    }).catch(error => {
      console.log(`Screenshot ${name} failed: ${error.message}`);
    });
  }

  // Helper: find a visible and enabled element from a locator.
  async function findVisibleEnabled(locator) {
    for (let i = 0; i < await locator.count(); i++) {
      const element = locator.nth(i);

      if (
        await element.isVisible().catch(() => false) &&
        await element.isEnabled().catch(() => false)
      ) {
        return element;
      }
    }

    return null;
  }

  try {
    // STEP 1: Open homepage.
    console.log('STEP 1: Opening homepage');

    await page.goto('https://app.bankexamstoday.com/', {
      waitUntil: 'domcontentloaded',
    });

    await saveScreenshot('01-homepage.png');

    // STEP 2: Click signup.
    console.log('STEP 2: Looking for signup link');

    const signupSelectors = [
      'a.bet-account-signup',
      'a[href*="tab=signup"]',
      'a[href*="signin.html"]',
      'a:has-text("Sign up")',
      'button:has-text("Sign up")',
    ];

    let signupControl = null;

    for (const selector of signupSelectors) {
      signupControl = await findVisibleEnabled(page.locator(selector));

      if (signupControl) {
        console.log(`Signup control found: ${selector}`);
        break;
      }
    }

    if (!signupControl) {
      console.log('Visible links:', await page.locator('a:visible')
        .allTextContents().catch(() => []));

      console.log('Visible buttons:', await page.locator('button:visible')
        .allTextContents().catch(() => []));

      await saveScreenshot('02-signup-not-found.png');

      throw new Error('Signup control was not found on the homepage.');
    }

    await signupControl.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(1000);

    console.log('Signup URL:', page.url());
    await saveScreenshot('03-signup-page.png');

    // STEP 3: Select Email option if available.
    console.log('STEP 3: Checking email signup option');

    const emailOptions = [
      page.getByRole('tab', { name: /^email$/i }),
      page.getByRole('button', { name: /^email$/i }),
      page.getByText(/^email$/i),
    ];

    for (const locator of emailOptions) {
      const option = await findVisibleEnabled(locator);

      if (option) {
        await option.click();
        await page.waitForTimeout(500);
        break;
      }
    }

    // STEP 4: Fill name.
    console.log('STEP 4: Filling name');

    const firstName = await findVisibleEnabled(page.locator(
      'input[name="firstName"], input[name="first_name"], ' +
      'input[placeholder*="first name" i], input[autocomplete="given-name"]'
    ));

    if (firstName) {
      await firstName.fill('steve');

      const lastName = await findVisibleEnabled(page.locator(
        'input[name="lastName"], input[name="last_name"], ' +
        'input[placeholder*="last name" i], input[autocomplete="family-name"]'
      ));

      if (lastName) {
        await lastName.fill('Test');
      }
    } else {
      const fullName = await findVisibleEnabled(page.locator(
        'input[name="name"], input[placeholder="Name" i], ' +
        'input[placeholder="Full name" i], input[autocomplete="name"]'
      ));

      if (fullName) {
        await fullName.fill('steve');
      } else {
        console.log(
          'Visible text inputs:',
          await page.locator('input:visible').evaluateAll(inputs =>
            inputs.map(input => ({
              id: input.id,
              name: input.name,
              type: input.type,
              placeholder: input.placeholder,
              disabled: input.disabled,
            }))
          )
        );

        await saveScreenshot('04-name-field-debug.png');
        throw new Error('Could not find a visible name field.');
      }
    }

    // STEP 5: Fill email.
    console.log('STEP 5: Filling email');

    const emailInput = await findVisibleEnabled(page.locator(
      'input[type="email"], input[name="email"], input[autocomplete="email"]'
    ));

    if (!emailInput) {
      console.log(
        'Email inputs:',
        await page.locator('input[type="email"]').evaluateAll(inputs =>
          inputs.map(input => ({
            id: input.id,
            name: input.name,
            disabled: input.disabled,
            placeholder: input.placeholder,
          }))
        )
      );

      await saveScreenshot('05-email-field-debug.png');
      throw new Error('No visible, enabled email field was found.');
    }

    await emailInput.fill('steve@yopmail.com');

    // STEP 6: Fill password.
    console.log('STEP 6: Filling password');

    const passwordInput = await findVisibleEnabled(
      page.locator('input[type="password"]')
    );

    if (!passwordInput) {
      await saveScreenshot('06-password-field-debug.png');
      throw new Error('No visible, enabled password field was found.');
    }

    await passwordInput.fill('Steve@12345');
    await saveScreenshot('07-signup-form-filled.png');

    // STEP 7: Find the signup submit button.
    console.log('STEP 7: Finding signup submit button');

    const signupForm = emailInput.locator('xpath=ancestor::form[1]');

    const buttonLocators = [
      signupForm.getByRole('button', {
        name: /continue|sign up|create account|register|next/i,
      }),
      signupForm.locator('button[type="submit"]'),
      signupForm.locator('input[type="submit"]'),
      page.getByRole('button', {
        name: /continue|sign up|create account|register|next/i,
      }),
    ];

    let submitButton = null;

    for (const locator of buttonLocators) {
      submitButton = await findVisibleEnabled(locator);

      if (submitButton) {
        break;
      }
    }

    if (!submitButton) {
      console.log(
        'Visible buttons:',
        await page.locator('button:visible, input[type="submit"]:visible')
          .evaluateAll(elements => elements.map(element => ({
            text: element.innerText || element.value,
            type: element.type,
            disabled: element.disabled,
            html: element.outerHTML.slice(0, 300),
          })))
      );

      console.log(
        'Visible input fields:',
        await page.locator('input:visible').evaluateAll(inputs =>
          inputs.map(input => ({
            id: input.id,
            name: input.name,
            type: input.type,
            placeholder: input.placeholder,
          }))
        )
      );

      await saveScreenshot('08-submit-button-debug.png');
      throw new Error('Signup submit button was not found.');
    }

    console.log(
      'Submitting signup form:',
      await submitButton.innerText().catch(() => 'Submit button')
    );

    await submitButton.click();
    await page.waitForTimeout(2000);

    console.log('URL after submission:', page.url());
    await saveScreenshot('09-after-submit.png');

    // STEP 8: Cancel popup if present.
    console.log('STEP 8: Checking for Cancel popup');

    const cancelSelectors = [
      '[role="dialog"] button:has-text("Cancel")',
      'button:has-text("Cancel")',
      'a:has-text("Cancel")',
    ];

    for (const selector of cancelSelectors) {
      const cancel = await findVisibleEnabled(page.locator(selector));

      if (cancel) {
        await cancel.click();
        console.log('Popup cancelled.');
        break;
      }
    }

    await page.waitForTimeout(1000);
    console.log('Current URL:', page.url());
    await saveScreenshot('10-dashboard-or-verification.png');

    
   
    // STEP 9: Diagnose the notifications icon
    console.log('Dashboard URL:', page.url());

    const header = page.locator('header, [role="banner"], nav').first();

    if (await header.count()) {
      console.log('HEADER HTML:\n', await header.evaluate(el => el.outerHTML));
    } else {
      console.log('No standard header found. Printing page HTML excerpt:');
      console.log(
        (await page.locator('body').innerHTML()).slice(0, 15000)
      );
    }

    const clickableElements = page.locator(
      'a, button, [role="button"], [aria-label], [title]'
    );

    const count = await clickableElements.count();

    console.log('Total candidate elements:', count);

    for (let i = 0; i < Math.min(count, 100); i++) {
      const element = clickableElements.nth(i);

      const details = await element.evaluate(el => ({
        tag: el.tagName,
        text: (el.innerText || el.textContent || '').trim().slice(0, 100),
        ariaLabel: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        href: el.getAttribute('href'),
        className:
          typeof el.className === 'string' ? el.className : '',
        html: el.outerHTML.slice(0, 500)
      }));

      console.log(`Element ${i}:`, JSON.stringify(details));
    }

    await page.screenshot({
      path: testInfo.outputPath('notification-debug.png'),
      fullPage: true
    }).catch(error => {
      console.log('Screenshot could not be saved:', error.message);
    });

    console.log('Diagnostic capture completed.');
  } catch (error) {
    console.error('Signup notification test failed:', error);
    throw error;
  }
});
