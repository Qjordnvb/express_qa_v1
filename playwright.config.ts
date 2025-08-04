

 // playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, './.env') });

export default defineConfig({
  testDir: './tests',
  snapshotPathTemplate: 'snapshots/{testFileName}/{arg}.png',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */


  timeout: 60 * 1000, // 60 segundos para el timeout general de la prueba

  expect: {
    timeout: 10 * 1000, // 10 segundos para las aserciones de expect
  },

  // --- ESTA ES LA CONFIGURACIÓN CLAVE ---
  // Generamos un reporte HTML (para ti) y un reporte JSON (para el agente).
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],

  use: {
    baseURL: 'https://ecommerce-playground.lambdatest.io',

    // 'on-first-retry' creará un trace.zip en el primer reintento de una prueba fallida.
    // Este archivo contiene DOM snapshots, logs de consola y peticiones de red.
    trace: 'on-first-retry',
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  },

  projects: [
    { name: 'chromium', use: {
      ...devices['Desktop Chrome'],
      // CAMBIO 4: Añadir más propiedades para reducir la detección de bots.
      javaScriptEnabled: true,
      hasTouch: false,
      isMobile: false,
      deviceScaleFactor: 1,
      acceptDownloads: true,
      bypassCSP: true,
      // CAMBIO 5: Iniciar en modo no-headless para parecer más humano (opcional, pero recomendado).
      launchOptions: {
        headless: false,
      },
    } },
    {
      name: 'firefox', use: {
        ...devices['Desktop Firefox'],
      javaScriptEnabled: true,
      hasTouch: false,
      isMobile: false,
      deviceScaleFactor: 1,
      acceptDownloads: true,
      bypassCSP: true,
      // CAMBIO 5: Iniciar en modo no-headless para parecer más humano (opcional, pero recomendado).
      launchOptions: {
        headless: false,
      }, } },
    { name: 'webkit', use: { ...devices['Desktop Safari'],
      javaScriptEnabled: true,
      hasTouch: false,
      isMobile: false,
      deviceScaleFactor: 1,
      acceptDownloads: true,
      bypassCSP: true,
      // CAMBIO 5: Iniciar en modo no-headless para parecer más humano (opcional, pero recomendado).
      launchOptions: {
        headless: false,
      },} },
  ],
});
