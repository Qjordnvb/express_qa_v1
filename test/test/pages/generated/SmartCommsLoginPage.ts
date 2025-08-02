// pages/generated/SmartCommsLoginPage.ts
// Archivo generado automáticamente. No editar manualmente.
// Generador Inteligente v2.3 - Proactivo y Estable

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class SmartCommsLoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Espera a que login Ab Inbev Button sea visible
   */
  async waitForLoginAbInbevButtonVisible(timeout: number = 10000): Promise<void> {
    const locators = [
      this.page.getByRole('button', {"name":"Ingresa por Ab-Inbev"}),
      this.page.getByText('Ingresa por Ab-Inbev')
    ];
    const element = await this.findSmartly(locators, 'login Ab Inbev Button');
    await element.waitFor({ state: 'visible', timeout });
    console.log('login Ab Inbev Button es visible');
  }

  /**
   * Hace clic en login Ab Inbev Button
   */
  async clickLoginAbInbevButton(): Promise<void> {
    const locators = [
      this.page.getByRole('button', {"name":"Ingresa por Ab-Inbev"}),
      this.page.getByText('Ingresa por Ab-Inbev')
    ];
    const element = await this.findSmartly(locators, 'login Ab Inbev Button');
    
    await element.waitFor({ state: 'visible', timeout: 5000 });
    try {
      await element.click();
    } catch (error) {
      console.log(`Primer intento de clic falló en login Ab Inbev Button, reintentando...`);
      await element.click({ force: true });
    }
    
    console.log(`Clic realizado en login Ab Inbev Button`);
  }
}
