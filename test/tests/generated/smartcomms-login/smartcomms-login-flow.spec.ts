// tests/generated/smartcomms-login-flow.spec.ts
  // Historia de usuario: SmartComms Login Flow
  import { test, expect, type Page } from '@playwright/test';
  import { SmartCommsLoginPage } from '../../../pages/generated/SmartCommsLoginPage';
import { SmartCommsEmailAndPasswordPage } from '../../../pages/generated/SmartCommsEmailAndPasswordPage';
import { SmartCommsDashboardPage } from '../../../pages/generated/SmartCommsDashboardPage';
  import * as fs from 'fs';
  import * as path from 'path';
  test.describe('SmartComms Login Flow', () => {
    // 1. DECLARAMOS las variables del Page Object aquí, fuera del test.
    let smartCommsLoginPage: SmartCommsLoginPage;
  let smartCommsEmailAndPasswordPage: SmartCommsEmailAndPasswordPage;
  let smartCommsDashboardPage: SmartCommsDashboardPage;
    // 2. Usamos beforeEach. Playwright garantiza que este bloque se ejecuta
    // de forma AISLADA para CADA prueba y CADA worker en paralelo.
    test.beforeEach(async ({ page }) => {
      // 3. INICIALIZAMOS las variables aquí, asegurando un entorno limpio para cada test.
      smartCommsLoginPage = new SmartCommsLoginPage(page);
    smartCommsEmailAndPasswordPage = new SmartCommsEmailAndPasswordPage(page);
    smartCommsDashboardPage = new SmartCommsDashboardPage(page);
    });
    test('Flujo completo de la historia de usuario', async ({ page }) => {
      try {
        // La configuración se aplica DENTRO de cada test para asegurar el aislamiento
        await page.setViewportSize({ width: 1920, height: 1080 });
        page.setDefaultTimeout(30000);
        // === INICIO DEL FLUJO DE PRUEBA ===
  // Paso 1: navigate en la página SmartCommsLoginPage
await smartCommsLoginPage.navigate("/login");
// Paso 2: clickLoginAbInbevButton en la página SmartCommsLoginPage
await smartCommsLoginPage.clickLoginAbInbevButton();
// Paso 3: fillEmailInput en la página SmartCommsEmailAndPasswordPage
await smartCommsEmailAndPasswordPage.fillEmailInput("example@example.com");
// Paso 4: fillPasswordInput en la página SmartCommsEmailAndPasswordPage
await smartCommsEmailAndPasswordPage.fillPasswordInput("xxxxxxxxxxxxx***$");
// Paso 5: clickSubmitButton en la página SmartCommsEmailAndPasswordPage
await smartCommsEmailAndPasswordPage.clickSubmitButton();
// Paso 6: waitForDashboardTitleVisible en la página SmartCommsDashboardPage
await smartCommsDashboardPage.waitForDashboardTitleVisible();
    await expect(page.locator('body')).toContainText("Dashboard");
        // === FIN DEL FLUJO DE PRUEBA ===
        console.log(':white_check_mark: Test "SmartComms Login Flow" ejecutado con éxito!');
      } catch (error) {
        console.error(':x: Fallo detectado en el flujo de prueba:', error);
        if (error instanceof Error) {
          const failureDir = path.resolve(__dirname, '../../../test-results/failures');
          if (!fs.existsSync(failureDir)) fs.mkdirSync(failureDir, { recursive: true });
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const safeTestName = test.info().title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const baseFilePath = path.join(failureDir, `${safeTestName}_${timestamp}`);
          const screenshotPath = `${baseFilePath}_screenshot.png`;
          try {
              await page.screenshot({ path: screenshotPath, fullPage: true });
              console.log(`[DEBUG] Captura de pantalla de fallo guardada en: ${screenshotPath}`);
          } catch (screenError) {
              console.warn(`[WARN] No se pudo tomar la captura de pantalla: ${screenError}`);
          }
        }
        throw error;
      }
    });
  });
