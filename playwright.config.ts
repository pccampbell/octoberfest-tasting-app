import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 12000 },
  use: { baseURL: 'http://127.0.0.1:8091', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/test-server.mjs',
    url: 'http://127.0.0.1:8091/api/health',
    reuseExistingServer: false,
    timeout: 90000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
