// pages/ProductDetailPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductDetailPage extends BasePage {
  readonly productTitle: Locator;
  readonly addToCartButton: Locator;

  // Locators para el Toast Notification
  readonly successToast: Locator; // El contenedor principal del toast
  readonly viewCartButtonInToast: Locator;
  readonly checkoutButtonInToast: Locator;

  constructor(page: Page) {
    super(page);

    this.productTitle = page.locator('h1')
      .or(page.getByRole('heading', { level: 1 }))
      .or(page.locator('.product-info h1')).first();

    // Usamos el selector que me proporcionaste para el botón Add to Cart
    // this.addToCartButton = page.locator('#entry_216842 button.button-cart');
    // O mantenemos getByRole si es más general y funciona bien
    this.addToCartButton = page.getByRole('button', { name: 'Add to Cart' });

    // Nuevo locator para el toast de éxito
    this.successToast = page.locator('div#notification-box-top div.toast.show[role="alert"]');

    // Locators para los botones dentro del toast
    this.viewCartButtonInToast = this.successToast.getByRole('link', { name: /View Cart/i });
    this.checkoutButtonInToast = this.successToast.getByRole('link', { name: /^Checkout/i }); // Usamos regex para el inicio del texto
  }

  async verifyProductTitle(expectedProductName: string): Promise<void> {
    console.log('Esperando a que el título del producto sea visible en ProductDetailPage...');
    await this.page.waitForLoadState('networkidle');
    await this.productTitle.waitFor({ state: 'visible', timeout: 30000 });
    const titleText = await this.productTitle.textContent();
    console.log('Texto del título encontrado en ProductDetailPage:', titleText);
    await expect(this.productTitle).toContainText(expectedProductName, { ignoreCase: true });
  }

  async clickAddToCart(): Promise<void> {
    const browserName = this.page.context().browser()!.browserType().name();
    console.log('Intentando encontrar y hacer clic en el botón Add to Cart...');
    await this.page.waitForLoadState('networkidle');
    await this.addToCartButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.addToCartButton.scrollIntoViewIfNeeded();
    await this.addToCartButton.hover(); // El hover puede ser útil
    await this.page.waitForTimeout(500);
    await this.addToCartButton.click();
    if (browserName === 'webkit' || 'chromium' || "firefox") {
      console.log(`[${browserName}] Tomando screenshot ANTES de esperar addToCartButton...`);
      await this.page.screenshot({ path: `debug-webkit-before-add-to-cart-wait.png`, fullPage: true });
    }
    // Esperamos a que el NUEVO toast de éxito sea visible
    console.log('Esperando el toast de notificación de éxito...');
    await this.successToast.waitFor({ state: 'visible', timeout: 15000 });
    console.log('Toast de notificación de éxito visible.');
  }

  /**
   * Verifica que el toast de notificación contenga el nombre del producto añadido.
   * @param productName El nombre del producto que se espera en el mensaje.
   */
  async verifySuccessToastContainsProduct(productName: string): Promise<void> {
    // El texto de éxito está dentro del toast
    await expect(this.successToast.locator('p'))
      .toContainText(`Success: You have added ${productName} to your shopping cart!`, { timeout: 10000 });
    console.log(`Toast de éxito verificado para el producto: ${productName}`);
  }

  /**
   * Hace clic en el botón "View Cart" dentro del toast de notificación.
   */
  async clickViewCartButtonInToast(): Promise<void> {
    await this.viewCartButtonInToast.waitFor({ state: 'visible', timeout: 10000 });
    await this.viewCartButtonInToast.click();
    console.log('Botón "View Cart" en el toast clickeado.');
  }

  /**
   * Hace clic en el botón "Checkout" dentro del toast de notificación.
   */
  async clickCheckoutButtonInToast(): Promise<void> {
    await this.checkoutButtonInToast.waitFor({ state: 'visible', timeout: 10000 });
    await this.checkoutButtonInToast.click();
    console.log('Botón "Checkout" en el toast clickeado.');
  }
}
