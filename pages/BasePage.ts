// pages/BasePage.ts

// Importamos los tipos 'Page' y 'Locator' desde Playwright.
// 'Page' es el objeto que representa la pestaña del navegador.
// 'Locator' es un objeto que representa una forma de encontrar un elemento en la página.
import { type Page, type Locator } from '@playwright/test';

// Exportamos la clase para que pueda ser utilizada (heredada) por otras clases de página.
export class BasePage {
  // --- PROPIEDADES ---

  // Hacemos que la instancia de la página ('page') sea una propiedad de la clase.
  // Es 'readonly' porque no cambiará después de ser inicializada en el constructor.
  // Es 'protected' para que las clases que hereden de BasePage puedan acceder a ella,
  // pero no se pueda acceder desde fuera de la clase y sus subclases.
  protected readonly page: Page;

  // --- CONSTRUCTOR ---

  // El constructor se ejecuta cuando se crea una nueva instancia de la clase.
  // Acepta un objeto 'page' como argumento, que será pasado desde nuestros tests.
  constructor(page: Page) {
    // Asignamos el objeto 'page' recibido a la propiedad 'this.page' de la clase.
    this.page = page;
  }

  // --- MÉTODOS ---

  /**
   * Método para navegar a una ruta específica del sitio.
   * Utiliza la 'baseURL' que configuramos en 'playwright.config.ts'.
   * @param {string} path - La ruta a la que se desea navegar (ej. '/index.php?route=account/login')
   */
  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }
}
