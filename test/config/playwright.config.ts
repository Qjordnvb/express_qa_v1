import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default defineConfig({
  testDir: '../tests',
  snapshotPathTemplate: '../snapshots/{testFileName}/{arg}.png',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Timeout configuration */
  timeout: 60 * 1000, // 60 seconds for test timeout
  
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },

  /* Reporters - HTML for humans, JSON for AI analysis */
  reporter: [
    ['html', { outputFolder: '../test-results/html-report' }],
    ['json', { outputFile: '../test-results/test-results.json' }]
  ],

  use: {
    /* Base URL - configure for your target application */
    baseURL: process.env.BASE_URL || 'https://www.google.com',
    
    /* Stable browser configuration */
    headless: true, // ✅ Stable for CI/CD
    viewport: { width: 1920, height: 1080 },
    
    /* Security and reliability settings */
    ignoreHTTPSErrors: true,
    
    /* User agent to avoid bot detection */
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    
    /* Tracing for debugging */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Multi-browser testing */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Stable configuration
        javaScriptEnabled: true,
        hasTouch: false,
        isMobile: false,
        deviceScaleFactor: 1,
        acceptDownloads: true,
      }
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        javaScriptEnabled: true,
        hasTouch: false,
        isMobile: false,
        deviceScaleFactor: 1,
        acceptDownloads: true,
      }
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        javaScriptEnabled: true,
        hasTouch: false,
        isMobile: false,
        deviceScaleFactor: 1,
        acceptDownloads: true,
      }
    },
  ],
});