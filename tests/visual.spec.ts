// tests/visual.spec.ts

import { test, expect, Page } from '@playwright/test';


test.describe('Visual Regression Tests', () => {

  test('the site logo should be visually correct', async ({ page }: { page: Page }) => {
    // 1. NAVEGACIÓN
    // Navegamos a la página principal. La ruta '/' usará la baseURL de nuestra configuración.
    await page.goto('/');
    await page.screenshot({ path: 'debug-screenshot.png' });

    // 2. LOCALIZADOR
    // Apuntamos a un elemento estable y visible, en este caso, el logo del sitio.
    const logo = page.getByAltText('Poco Electro');


    // 3. ESPERA EXPLÍCITA (¡LA LÍNEA NUEVA Y CLAVE!)
    // Le decimos a Playwright que espere a que el logo sea visible antes de continuar.
    await logo.waitFor({ state: 'visible' });

    // 4. ASERCIÓN VISUAL
    // Obtenemos el nombre del navegador actual para construir el nombre del snapshot
    const browserName = page.context().browser()?.browserType().name();
    // Pasamos el nombre completo del snapshot, incluyendo el navegador y la extensión.
    await expect(logo).toHaveScreenshot(`site-logo-${browserName}.png`);
  });

});
