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
}
