// pages/BasePage.ts
import { type Page, type Locator } from '@playwright/test';

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Smart locator finder with fallback strategies
   */
  async findSmartly(locators: Locator[], elementName: string): Promise<Locator> {
    for (const locator of locators) {
      try {
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        return locator;
      } catch (error) {
        // Continue to next locator
      }
    }
    
    // If no locator works, return the first one and let it fail with a better error
    return locators[0];
  }
}