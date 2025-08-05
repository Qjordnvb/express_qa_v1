// pages/BasePage.ts
import { type Page, type Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// --- Interfaces para el Logging y Debugging ---

interface ActionLog {
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}

interface AttemptLog {
  index: number;
  selector: string;
  count?: number;
  success?: boolean;
  error?: string;
}

export class BasePage {
  private actionLog: ActionLog[] = [];

  constructor(protected page: Page) {}

  /**
   * Navega a una ruta específica
   */
  async navigate(path: string): Promise<void> {
    this.log('navigate', { path });
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Encuentra un elemento de forma inteligente probando múltiples selectores
   */
  async findSmartly(locators: Locator[], description: string): Promise<Locator> {
    const startTime = Date.now();
    const attempts: AttemptLog[] = [];

    for (let i = 0; i < locators.length; i++) {
      const locator = locators[i];
      const startTime = Date.now(); // Movido aquí para medir cada intento individualmente

      try {
        // Primero, esperamos a que al menos un elemento que coincida sea visible.
        // Usamos waitFor para darle al elemento la oportunidad de aparecer.
        await locator.first().waitFor({ state: 'visible', timeout: 5000 }); // Un timeout corto para cada intento.

        // Si la línea anterior no lanzó un error, significa que el elemento es visible.
        const firstElement = locator.first();
        const duration = Date.now() - startTime;

        // Log del éxito
        this.log('findElement', {
          description,
          // Usamos locator.toString() para obtener una representación del selector.
          selector: locator.toString(),
          selectorIndex: i,
          duration,
          found: true,
        });

        // Devolvemos el elemento encontrado y salimos del bucle.
        return firstElement;

      } catch (e) {
        // Si waitFor falla (el elemento no es visible en el tiempo asignado),
        // lo registramos y continuamos con el siguiente selector.
        attempts.push({
          index: i,
          selector: locator.toString(),
          success: false,
          error: 'Elemento no encontrado o no visible en 5s',
        });
      }
    }


    // Si ningún selector funcionó, guardar información de debug
    this.log('findElementFailed', {
      description,
      attempts,
      duration: Date.now() - startTime,
    });

    // Intentar esperar por el primero
    console.log(`🔄 Ningún selector inmediato funcionó para ${description}. Esperando...`);
    try {
      await locators[0].waitFor({ state: 'visible', timeout: 5000 });
      return locators[0];
    } catch (e) {
      // Guardar información detallada del fallo
      await this.saveDebugInfo(description, attempts);
      throw new Error(
        `No se pudo encontrar el elemento: ${description}. Probados ${locators.length} selectores.`,
      );
    }
  }

  /**
   * Guarda información de debug cuando falla un elemento
   */
  private async saveDebugInfo(description: string, attempts: AttemptLog[]): Promise<void> {
    const debugDir = 'test-results/debug';
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const debugFile = path.join(debugDir, `${description}-${timestamp}.json`);

    const debugInfo = {
      description,
      timestamp: new Date().toISOString(),
      url: this.page.url(),
      attempts,
      actionLog: this.actionLog,
      // Capturar el HTML actual para análisis
      htmlSnippet: await this.page.evaluate(() => {
        const body = document.body;
        return body ? body.innerHTML.substring(0, 1000) : 'No body found';
      }),
    };

    fs.writeFileSync(debugFile, JSON.stringify(debugInfo, null, 2));
    console.log(`💾 Debug info guardada en: ${debugFile}`);
  }

  /**
   * Registra todas las acciones para debugging
   */
  private log(action: string, details: Record<string, unknown>): void {
    this.actionLog.push({
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Espera a que la página esté lista
   */
  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Toma una captura de pantalla para debugging
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Maneja popups o modales que puedan aparecer
   */
  async handlePopups(): Promise<void> {
    const popupSelectors = [
      '[aria-label="Close"]',
      'button:has-text("Close")',
      'button:has-text("Accept")',
      'button:has-text("OK")',
      'button:has-text("Aceptar")',
      '.close-button',
      '[class*="close"]',
      '[class*="dismiss"]',
    ];

    for (const selector of popupSelectors) {
      try {
        const popup = this.page.locator(selector).first();
        if (await popup.isVisible()) {
          await popup.click();
          await this.page.waitForTimeout(500);
          console.log(`✅ Popup cerrado usando: ${selector}`);
          this.log('popupClosed', { selector });
          break;
        }
      } catch (e) {
        // Continuar si no se encuentra
      }
    }
  }

  /**
   * Obtiene el log de acciones para análisis
   */
  getActionLog(): ActionLog[] {
    return this.actionLog;
  }

  /**
   * Espera a que la URL contenga el texto especificado
   */
  async waitForUrl(expectedUrlPart: string, timeout: number = 15000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const currentUrl = this.page.url();
      if (currentUrl.includes(expectedUrlPart)) {
        console.log(`URL válida encontrada: ${currentUrl}`);
        this.log('waitForUrl', { expectedUrlPart, currentUrl, success: true });
        return;
      }
      await this.page.waitForTimeout(1000);
    }
    
    const finalUrl = this.page.url();
    this.log('waitForUrl', { expectedUrlPart, finalUrl, success: false });
    throw new Error(`Timeout esperando URL con '${expectedUrlPart}'. URL actual: ${finalUrl}`);
  }

  /**
   * Valida que al menos un selector funcione para cada elemento dado
   */
  public static async validateAllSelectors(
    page: Page,
    elements: { description: string; locators: Locator[] }[],
  ): Promise<void> {
    for (const { description, locators } of elements) {
      let found = false;
      for (const locator of locators) {
        if ((await locator.count()) > 0) {
          found = true;
          break;
        }
      }
      if (!found) {
        console.warn(`❌ Ningún selector funcionó para: ${description}`);
      } else {
        console.log(`✅ Al menos un selector funcionó para: ${description}`);
      }
    }
  }
}
