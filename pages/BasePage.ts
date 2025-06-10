// pages/BasePage.ts

import { type Page, type Locator } from '@playwright/test';

export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Intenta localizar un elemento probando una lista de diferentes Locators en orden.
   * Devuelve el primer localizador que encuentra un elemento visible.
   * @param {Locator[]} locators - Un array de objetos Locator para probar.
   * @param {string} description - Una descripción del elemento para los mensajes de error.
   * @returns {Promise<Locator>} Una promesa que se resuelve con el primer localizador válido encontrado.
   * @throws {Error} Si ningún localizador encuentra un elemento visible.
   */
  async findSmartly(locators: Locator[], description: string): Promise<Locator> {
    for (const locator of locators) {
      try {
        await locator.waitFor({ state: 'visible', timeout: 2000 });
        console.log(`Elemento '${description}' encontrado.`);
        return locator;
      } catch (error) {
        // Silenciosamente intenta con el siguiente localizador.
      }
    }
    // Si el bucle termina, es porque ningún localizador funcionó.
    throw new Error(`No se pudo encontrar el elemento '${description}' con ninguna de las opciones de localizador proporcionadas.`);
  }
}
