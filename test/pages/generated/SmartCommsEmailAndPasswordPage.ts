// pages/generated/SmartCommsEmailAndPasswordPage.ts
// Archivo generado automáticamente. No editar manualmente.
// Generador Inteligente v2.3 - Proactivo y Estable

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class SmartCommsEmailAndPasswordPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Espera a que email Input sea visible
   */
  async waitForEmailInputVisible(timeout: number = 10000): Promise<void> {
    const locators = [
      this.page.getByPlaceholder('Correo electrónico'),
      this.page.locator(`input[type='email']`)
    ];
    const element = await this.findSmartly(locators, 'email Input');
    await element.waitFor({ state: 'visible', timeout });
    console.log('email Input es visible');
  }

  /**
   * Llena email Input con el texto proporcionado
   */
  async fillEmailInput(text: string): Promise<void> {
    const locators = [
      this.page.getByPlaceholder('Correo electrónico'),
      this.page.locator(`input[type='email']`)
    ];
    const element = await this.findSmartly(locators, 'email Input');
    
    await element.clear();
    await element.fill(text);
    
    console.log(`email Input llenado con: "${text}"`);
  }

  /**
   * Espera a que password Input sea visible
   */
  async waitForPasswordInputVisible(timeout: number = 10000): Promise<void> {
    const locators = [
      this.page.getByPlaceholder('Contraseña'),
      this.page.locator(`input[type='password']`)
    ];
    const element = await this.findSmartly(locators, 'password Input');
    await element.waitFor({ state: 'visible', timeout });
    console.log('password Input es visible');
  }

  /**
   * Llena password Input con el texto proporcionado
   */
  async fillPasswordInput(text: string): Promise<void> {
    const locators = [
      this.page.getByPlaceholder('Contraseña'),
      this.page.locator(`input[type='password']`)
    ];
    const element = await this.findSmartly(locators, 'password Input');
    
    await element.clear();
    await element.fill(text);
    
    console.log(`password Input llenado con: "${text}"`);
  }

  /**
   * Espera a que submit Button sea visible
   */
  async waitForSubmitButtonVisible(timeout: number = 10000): Promise<void> {
    const locators = [
      this.page.getByRole('button', {"name":"Iniciar sesión"}),
      this.page.locator(`button:has-text('Iniciar sesión')`)
    ];
    const element = await this.findSmartly(locators, 'submit Button');
    await element.waitFor({ state: 'visible', timeout });
    console.log('submit Button es visible');
  }

  /**
   * Hace clic en submit Button
   */
  async clickSubmitButton(): Promise<void> {
    const locators = [
      this.page.getByRole('button', {"name":"Iniciar sesión"}),
      this.page.locator(`button:has-text('Iniciar sesión')`)
    ];
    const element = await this.findSmartly(locators, 'submit Button');
    
    try {
      await element.click();
    } catch (error) {
      console.log(`Primer intento de clic falló en submit Button, reintentando...`);
      await element.click({ force: true });
    }
    
    console.log(`Clic realizado en submit Button`);
  }
}
