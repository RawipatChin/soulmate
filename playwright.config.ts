import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:3100', browserName: 'chromium', channel: 'chrome' },
  webServer: {
    command: 'npm run dev -- --mode browser-test --port 3100 --strictPort',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
