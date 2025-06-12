// pages/LoginPage.ts
// Archivo generado automáticamente por 'npm run orchestrate'
import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Acción resiliente generada para 'emailInput'.
   * Usa findSmartly para intentar con múltiples selectores.
   */
  async fillEmailInput(text: string): Promise<void> {
    const locators = [
        this.page.getByLabel('E-Mail Address')
      ];
    const element = await this.findSmartly(locators, 'email Input');
    await element.fill(text);
  }
  /**
   * Acción resiliente generada para 'passwordInput'.
   * Usa findSmartly para intentar con múltiples selectores.
   */
  async fillPasswordInput(text: string): Promise<void> {
    const locators = [
        this.page.getByLabel('Password')
      ];
    const element = await this.findSmartly(locators, 'password Input');
    await element.fill(text);
  }
  /**
   * Acción resiliente generada para 'loginButton'.
   * Usa findSmartly para intentar con múltiples selectores.
   */
  async clickLoginButton(): Promise<void> {
    const locators = [
        this.page.getByRole('button', {"name":"Login"})
      ];
    const element = await this.findSmartly(locators, 'login Button');
    await element.click();
  }
}
