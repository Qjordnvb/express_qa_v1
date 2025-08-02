// tests/generated/portal-login-flow.spec.ts
  // Historia de usuario: Portal Login Flow
  import { test, expect, type Page } from '@playwright/test';
  import { PortalLoginPage } from '../../../pages/generated/PortalLoginPage';
import { MicrosoftLoginPage } from '../../../pages/generated/MicrosoftLoginPage';
import { PortalDashboardPage } from '../../../pages/generated/PortalDashboardPage';
  import * as fs from 'fs';
  import * as path from 'path';
  test.describe('Portal Login Flow', () => {
    // 1. DECLARAMOS las variables del Page Object aquí, fuera del test.
    let portalLoginPage: PortalLoginPage;
  let microsoftLoginPage: MicrosoftLoginPage;
  let portalDashboardPage: PortalDashboardPage;
    // 2. Usamos beforeEach. Playwright garantiza que este bloque se ejecuta
    // de forma AISLADA para CADA prueba y CADA worker en paralelo.
    test.beforeEach(async ({ page }) => {
      // 3. INICIALIZAMOS las variables aquí, asegurando un entorno limpio para cada test.
      portalLoginPage = new PortalLoginPage(page);
    microsoftLoginPage = new MicrosoftLoginPage(page);
    portalDashboardPage = new PortalDashboardPage(page);
    });
    test('Flujo completo de la historia de usuario', async ({ page }) => {
      try {
        // La configuración se aplica DENTRO de cada test para asegurar el aislamiento
        await page.setViewportSize({ width: 1920, height: 1080 });
        page.setDefaultTimeout(30000);
        // === INICIO DEL FLUJO DE PRUEBA ===
  // Paso 1: navigate en la página PortalLoginPage
await portalLoginPage.navigate("/login");
// Paso 2: clickLoginCorporateButton en la página PortalLoginPage
await portalLoginPage.clickLoginCorporateButton();
// Paso 3: fillEmailInput en la página MicrosoftLoginPage
await microsoftLoginPage.fillEmailInput("example@example.com");
// Paso 4: fillPasswordInput en la página MicrosoftLoginPage
await microsoftLoginPage.fillPasswordInput("xxxxxxxxxxxxx***$");
// Paso 5: clickSubmitButton en la página MicrosoftLoginPage
await microsoftLoginPage.clickSubmitButton();
    await expect(page.locator('body')).toContainText("Dashboard");
        // === FIN DEL FLUJO DE PRUEBA ===
        console.log(':white_check_mark: Test "Portal Login Flow" ejecutado con éxito!');
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
