// pages/CartPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  readonly cartItemsTableBody: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.cartItemsTableBody = page.locator('div#content form tbody');
    // Hacemos el name más robusto, solo "Checkout", ignorando el ícono y usando regex para ser flexible.
    this.checkoutButton = page.getByRole('link', { name: /^Checkout/i }); // Empieza con Checkout, ignora mayúsculas/minúsculas
  }

  async verifyProductInCart(productName: string): Promise<void> {
    // ... (tu código actual es bueno)
    await this.cartItemsTableBody.waitFor({ state: 'visible', timeout: 15000 });
    const productRow = this.cartItemsTableBody.locator('tr').filter({ hasText: productName });
    await expect(productRow).toBeVisible({ timeout: 10000 });
    console.log(`Producto '${productName}' verificado en el carrito.`);
  }

  async clickCheckout(): Promise<void> {
    console.log('Intentando hacer clic en el botón Checkout...');
    await this.checkoutButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.checkoutButton.click();
    console.log('Botón Checkout clickeado.');
  }
}
