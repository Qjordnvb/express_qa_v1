// pages/HeaderPage.ts
import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage'; // Asumiendo que tenemos BasePage para el método navigate si fuera necesario

export class HeaderPage extends BasePage { // Heredamos de BasePage
  // Locators específicos del encabezado
  readonly searchInput: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    super(page); // Llama al constructor de BasePage

    // Inicializamos los locators
    this.searchInput = page.getByRole('textbox', { name: 'Search For Products' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
  }

  // Métodos de acción
  async searchProduct(productName: string): Promise<void> {
    await this.searchInput.click(); // A veces es necesario hacer clic primero
    await this.searchInput.fill(productName);
    await this.searchButton.click();
  }
}
