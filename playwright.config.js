const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: true,
  reporter: 'html',

  use: {
    headless: false,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    navigationTimeout: 45000,
  },

  projects: [
    {
      name: 'Chromium',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
    {
      name: 'Firefox',
      use: { ...devices['Desktop Firefox'], browserName: 'firefox' },
    },
    {
      name: 'WebKit',
      use: { ...devices['Desktop Safari'], browserName: 'webkit' },
    },
  ],
});
