// pages/SearchResultsPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SearchResultsPage extends BasePage {
  readonly productGridContainer: Locator;
  readonly inStockCheckboxInput: Locator; // Cambiado a label para asegurar clickeabilidad
  readonly inStockFilterLabelToClick: Locator;


  constructor(page: Page) {
    super(page);

    // Contenedor general de la cuadrícula de productos
    this.productGridContainer = page.locator('.product-layout.product-grid').first().locator('..');
    this.inStockFilterLabelToClick = page.locator('label.custom-control-label[for="mz-fss-0--1"]');
    // Selector para la etiqueta "In Stock (X)" del filtro.
    // Buscamos un label que contenga "In Stock" seguido de un número entre paréntesis.
    this.inStockCheckboxInput= page.locator('#mz-fss-0--1');
  }

  /**
   * Aplica el filtro "In Stock" en la página de resultados de búsqueda.
   */
  async applyInStockFilter(): Promise<void> {
    console.log('Aplicando filtro "In stock"...');

    // Esperamos a que el LABEL sea visible
    await this.inStockFilterLabelToClick.waitFor({ state: 'visible', timeout: 15000 });

    // Verificamos el estado del INPUT asociado antes de hacer clic en el LABEL
    if (!await this.inStockCheckboxInput.isChecked()) {
        console.log('Label "In Stock" no está activo (checkbox no marcado). Haciendo clic en el label...');
        await this.inStockFilterLabelToClick.click();
    } else {
        console.log('Label "In Stock" ya está activo (checkbox marcado).');
    }

    await this.page.waitForTimeout(2000);
    // Considera esperar a que la red esté inactiva o que un elemento específico se actualice
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('Filtro "In stock" aplicado/verificado.');
  }

  /**
   * Selecciona un producto de la cuadrícula por su nombre.
   * El nombre debe ser lo suficientemente único como para que .first() tome el correcto si hay múltiples matches parciales.
   * @param productName Parte del nombre del producto a seleccionar.
   */
  async selectProductByName(productName: string): Promise<void> {
    // Esperamos a que el contenedor de la cuadrícula esté visible primero
    await this.productGridContainer.waitFor({ state: 'visible', timeout: 20000 });

    // Usamos tu selector robusto. El nombre del producto en el sitio a veces tiene el nombre repetido.
    // Ej: "MacBook Air MacBook Air". Usaremos una expresión regular que maneje esto.
    // Construimos la RegExp para que busque productName, opcionalmente seguido de un espacio y el mismo productName.
    const productNamePattern = new RegExp(`${productName}( ${productName})?`, 'i');
    const productLink = this.page.locator('.product-layout .caption h4 a').filter({ hasText: productNamePattern }).first();

    console.log(`Seleccionando producto con nombre que coincida con: '${productName}'`);
    await productLink.waitFor({ state: 'visible', timeout: 15000 });
    await productLink.click();
    console.log(`Producto '${productName}' seleccionado.`);
  }

  // Mantenemos getDisplayedProductsCount por si es útil
  async getDisplayedProductsCount(): Promise<number> {
    await this.productGridContainer.waitFor({ state: 'visible', timeout: 15000 });
    return this.page.locator('.product-layout.product-grid .product-thumb').count();
  }
}
