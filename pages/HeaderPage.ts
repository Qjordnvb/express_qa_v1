// pages/HeaderPage.ts
import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HeaderPage extends BasePage {
  private readonly searchInputLocators: Locator[];
  private readonly searchButtonLocators: Locator[];

  constructor(page: Page) {
    super(page);

    // Creamos arrays de Locators, combinando las mejores prácticas.
    this.searchInputLocators = [
      this.page.getByRole('textbox', { name: 'Search For Products' }), // El original y más robusto.
      this.page.locator("input[name='search']"), // Un selector de respaldo.
    ];

    this.searchButtonLocators = [
      this.page.getByRole('button', { name: 'Search' }), // El original y más robusto.
      this.page.locator('#search button'), // Un selector de respaldo.
    ];
  }

  async searchProduct(productName: string): Promise<void> {
    // La lógica aquí no cambia, pero ahora pasa una lista de Locators a nuestro método mejorado.
    const searchInput = await this.findSmartly(this.searchInputLocators, 'Barra de Búsqueda');
    const searchButton = await this.findSmartly(this.searchButtonLocators, 'Botón de Búsqueda');

    await searchInput.click();
    await searchInput.fill(productName);
    await searchButton.click();
  }
}
