// pages/generated/SmartCommsDashboardPage.ts
// Archivo generado automáticamente. No editar manualmente.
// Generador Inteligente v2.3 - Proactivo y Estable

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class SmartCommsDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Espera a que dashboard Title sea visible
   */
  async waitForDashboardTitleVisible(timeout: number = 10000): Promise<void> {
    const locators = [
      this.page.getByText('Dashboard')
    ];
    const element = await this.findSmartly(locators, 'dashboard Title');
    await element.waitFor({ state: 'visible', timeout });
    console.log('dashboard Title es visible');
  }

  /**
   * Obtiene el texto de dashboard Title
   */
  async getDashboardTitleText(): Promise<string> {
    const locators = [
      this.page.getByText('Dashboard')
    ];
    const element = await this.findSmartly(locators, 'dashboard Title');
    const text = await element.textContent();
    return text || '';
  }

  /**
   * Verifica que dashboard Title contenga el texto esperado
   */
  async assertDashboardTitleText(expectedText: string): Promise<void> {
    const locators = [
      this.page.getByText('Dashboard')
    ];
    const element = await this.findSmartly(locators, 'dashboard Title');
    await expect(element).toContainText(expectedText);
    console.log(`dashboard Title contiene el texto esperado: "${expectedText}"`);
  }

  /**
   * Verifica si dashboard Title está visible
   */
  async isDashboardTitleVisible(): Promise<boolean> {
    try {
    const locators = [
      this.page.getByText('Dashboard')
    ];
      const element = await this.findSmartly(locators, 'dashboard Title');
      return await element.isVisible();
    } catch {
      return false;
    }
  }
}
