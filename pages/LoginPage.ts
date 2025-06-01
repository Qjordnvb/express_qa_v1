import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
    // --- PROPIEDADES ---
    // Definimos los localizadores específicos de la página de login como propiedades de la clase.
    // Son 'readonly' porque su definición no cambiará.
    // Locators
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly loginButton: Locator;

    // --- CONSTRUCTOR ---

  constructor(page: Page) {
      // Esto llama al constructor de la clase padre (BasePage) y le pasa el objeto 'page',
    // asegurando que LoginPage tenga acceso a todo lo que BasePage provee (como this.page).
      super(page);
      // Inicializamos los localizadores usando el objeto 'page' heredado.
        this.emailInput = page.locator('#input-email');
        this.passwordInput = page.locator('#input-password');
        this.loginButton = page.locator('input[value="Login"]');
    }

    async enterEmail(email: string): Promise<void> {
      await this.emailInput.fill(email);
    }

    async enterPassword(password: string): Promise<void> {
        await this.passwordInput.fill(password);
    }

    async clickLoginButton(): Promise<void> {
        await this.loginButton.click();
    }

  // Método para realizar el proceso completo de inicio de sesión.
  // Toma dos parámetros: email y password.
  // Llama a los métodos auxiliares para completar cada paso del proceso.
  async login(email: string, password: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.clickLoginButton();
  }
}
