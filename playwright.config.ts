import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'https://gestsilo-seven.vercel.app',
    headless: true,
    screenshot: 'on',
    video: 'off',
  },
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
});
