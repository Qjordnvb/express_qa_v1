// pages/generated/PortalLoginPage.ts
// Archivo generado automáticamente. No editar manualmente.
// Generador Inteligente v2.3 - Proactivo y Estable

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class PortalLoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Espera a que login Ab Corporate Button sea visible
   */
  async waitForLoginCorporateButtonVisible(timeout: number = 10000): Promise<void> {
    const locators = [
      this.page.getByRole('button', {"name":"Ingresa por Corporate"}),
      this.page.locator(`button:has-text('Ingresa por Corporate')`)
    ];
    const element = await this.findSmartly(locators, 'login Ab Corporate Button');
    await element.waitFor({ state: 'visible', timeout });
    console.log('login Ab Corporate Button es visible');
  }

  /**
   * Hace clic en login Ab Corporate Button
   */
  async clickLoginCorporateButton(): Promise<void> {
    const locators = [
      this.page.getByRole('button', {"name":"Ingresa por Corporate"}),
      this.page.locator(`button:has-text('Ingresa por Corporate')`)
    ];
    const element = await this.findSmartly(locators, 'login Ab Corporate Button');
    
    try {
      await element.click();
    } catch (error) {
      console.log(`Primer intento de clic falló en login Ab Corporate Button, reintentando...`);
      await element.click({ force: true });
    }
    
    console.log(`Clic realizado en login Ab Corporate Button`);
  }
}
