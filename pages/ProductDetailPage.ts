// pages/ProductDetailPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductDetailPage extends BasePage {
  readonly productTitle: Locator;
  readonly addToCartButton: Locator;
  readonly successToast: Locator;
  readonly viewCartButtonInToast: Locator;
  readonly checkoutButtonInToast: Locator;
  readonly availabilityStatus: Locator; // <-- Asegúrate de que esta línea exista

  constructor(page: Page) {
    super(page);

    this.productTitle = page
      .locator('h1')
      .or(page.getByRole('heading', { level: 1 }))
      .or(page.locator('.product-info h1'))
      .first();

    this.addToCartButton = page.getByRole('button', { name: 'Add to Cart' });

    this.successToast = page.locator('div#notification-box-top div.toast.show[role="alert"]');
    this.viewCartButtonInToast = this.successToast.getByRole('link', { name: /View Cart/i });
    this.checkoutButtonInToast = this.successToast.getByRole('link', { name: /^Checkout/i });

    // Asegúrate de que esta línea también esté en el constructor.
    this.availabilityStatus = page.locator('li:has-text("Availability: In Stock")');
  }

  async verifyProductTitle(expectedProductName: string): Promise<void> {
    console.log('Esperando a que el título del producto sea visible en ProductDetailPage...');
    await this.page.waitForLoadState('networkidle');
    await this.productTitle.waitFor({ state: 'visible', timeout: 30000 });
    const titleText = await this.productTitle.textContent();
    console.log('Texto del título encontrado en ProductDetailPage:', titleText);
    await expect(this.productTitle).toContainText(expectedProductName, { ignoreCase: true });
  }

  /**
   * NUEVO MÉTODO: Verifica que el producto se muestre como "In Stock" en la página.
   * Actúa como una precondición antes de intentar añadir al carrito.
   */
  async verifyProductIsInStock(): Promise<void> {
    console.log('Verificando que el producto esté en stock en la página de detalle...');
    try {
      // Esperamos que el elemento de disponibilidad "In Stock" sea visible.
      await this.availabilityStatus.waitFor({ state: 'visible', timeout: 10000 });
      console.log('Confirmado: El producto está "In Stock".');
    } catch (error) {
      // Si no lo encontramos, tomamos una captura para depurar y lanzamos un error claro.
      await this.page.screenshot({ path: 'debug-out-of-stock.png', fullPage: true });
      throw new Error(
        'Fallo de precondición: El producto NO está "In Stock" en la página de detalle.',
      );
    }
  }

  async clickAddToCart(): Promise<void> {
    const browserName = this.page.context().browser()!.browserType().name();
    console.log('Intentando encontrar y hacer clic en el botón Add to Cart...');
    await this.page.waitForLoadState('networkidle');
    await this.addToCartButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.addToCartButton.scrollIntoViewIfNeeded();
    await this.addToCartButton.hover();
    await this.page.waitForTimeout(500);
    await this.addToCartButton.click();
    if (browserName === 'webkit' || browserName === 'chromium' || browserName === 'firefox') {
      console.log(`[${browserName}] Tomando screenshot ANTES de esperar el toast...`);
      await this.page.screenshot({
        path: `debug-${browserName}-before-toast-wait.png`,
        fullPage: true,
      });
    }
    console.log('Esperando el toast de notificación de éxito...');
    await this.successToast.waitFor({ state: 'visible', timeout: 15000 });
    console.log('Toast de notificación de éxito visible.');
  }

  async verifySuccessToastContainsProduct(productName: string): Promise<void> {
    await expect(this.successToast.locator('p')).toContainText(
      `Success: You have added ${productName} to your shopping cart!`,
      { timeout: 10000 },
    );
    console.log(`Toast de éxito verificado para el producto: ${productName}`);
  }

  async clickCheckoutButtonInToast(): Promise<void> {
    await this.checkoutButtonInToast.waitFor({ state: 'visible', timeout: 10000 });
    await this.checkoutButtonInToast.click();
    console.log('Botón "Checkout" en el toast clickeado.');
  }
}
