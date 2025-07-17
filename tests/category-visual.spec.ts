// tests/category-visual.spec.ts

import { test, expect, Page } from '@playwright/test';

test.describe('Category Page Visual Tests', () => {
  test('Monitors category page and first product card should be visually correct', async ({
    page,
  }: {
    page: Page;
  }) => {
    const browserNameForDebug = page.context().browser()!.browserType().name(); // Para nombres de archivo de debug

    await page.goto('/');

    const shopByCategoryButton = page.getByRole('button', { name: 'Shop by Category' });
    if (await shopByCategoryButton.isVisible({ timeout: 5000 })) {
      await shopByCategoryButton.click();
      await page.waitForTimeout(500);
    }

    const componentsLink = page.getByRole('link', { name: 'Components' });
    await componentsLink.hover();
    // Aumentamos un poco la espera para asegurar que el submenú tenga tiempo de renderizarse completamente
    await page.waitForTimeout(1000); // Aumentado a 1 segundo

    // Añadimos una espera explícita para que "Monitors" sea visible, con un timeout propio
    await page.waitForLoadState('networkidle'); // Esperamos a que la red esté inactiva
    await page.waitForLoadState('domcontentloaded'); // Esperamos a que el DOM esté cargado

    // Intentamos encontrar el enlace de Monitors de diferentes maneras
    const monitorsLink = page
      .getByRole('link', { name: 'Monitors', exact: true })
      .or(page.getByText('Monitors', { exact: true }))
      .or(page.locator('a:has-text("Monitors")'));

    await monitorsLink.waitFor({ state: 'visible', timeout: 15000 }); // Espera hasta 15 segundos
    await monitorsLink.click();

    // Esperamos a que la navegación a la página de Monitors se complete y se cargue
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');

    // Tomamos una captura de debug para ver el estado de la página de Monitors
    await page.screenshot({
      path: `debug-after-monitors-click-${browserNameForDebug}.png`,
      fullPage: true,
    });

    // Verificamos el título principal de la página de Monitors
    const monitorsPageTitle = page
      .getByRole('heading', { level: 1, name: 'Monitors' })
      .or(page.locator('h1:has-text("Monitors")')); // Añadimos un selector alternativo por si acaso

    await monitorsPageTitle.waitFor({ state: 'visible', timeout: 15000 });
    await expect(monitorsPageTitle).toHaveScreenshot(
      `monitors-page-title-${browserNameForDebug}.png`,
      { maxDiffPixelRatio: 0.03}
    );

    // Esperamos a que los productos se carguen y sean visibles
    const firstProductCard = page.locator('.product-layout.product-grid').first();
    await firstProductCard.waitFor({ state: 'visible', timeout: 15000 });
    await expect(firstProductCard).toHaveScreenshot(
      `monitors-first-product-card-${browserNameForDebug}.png`,
    );
  });
});
