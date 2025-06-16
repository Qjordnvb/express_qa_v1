// orchestrator/visual-ai-helper.ts
import { Page } from '@playwright/test';
import { getLlmService } from './llm-service';

export class VisualAIHelper {
  private llmService = getLlmService();
  private visualCache = new Map<string, any>();

  constructor(private page: Page) {}

  /**
   * Encuentra un elemento usando descripción visual cuando los selectores fallan
   */
  async findElementVisually(description: string): Promise<any> {
    console.log(`👁️ Buscando visualmente: "${description}"`);

    // Verificar cache
    const cacheKey = `${this.page.url()}-${description}`;
    if (this.visualCache.has(cacheKey)) {
      return this.visualCache.get(cacheKey);
    }

    // Tomar screenshot
    const screenshot = await this.page.screenshot({ fullPage: true });

    // Pedir a la IA que encuentre el elemento
    const prompt = `
    Analiza esta captura de pantalla y encuentra el elemento que coincida con: "${description}"

    Devuelve un JSON con:
    {
      "found": true/false,
      "boundingBox": { "x": 0, "y": 0, "width": 0, "height": 0 },
      "suggestedSelectors": ["selector1", "selector2"],
      "confidence": 0.0-1.0,
      "elementType": "button/input/link/text/image",
      "attributes": { "text": "", "placeholder": "", "ariaLabel": "" }
    }
    `;

    const result = await this.llmService.getTestAssetsFromIA(
      prompt,
      screenshot.toString('base64')
    );

    if (result.found) {
      // Crear un selector basado en la posición
      const selector = await this.createSelectorFromBoundingBox(result.boundingBox);
      this.visualCache.set(cacheKey, { selector, metadata: result });
      return selector;
    }

    throw new Error(`No se pudo encontrar visualmente: ${description}`);
  }

  /**
   * Compara visualmente dos estados de la página
   */
  async compareVisualStates(expectedDescription: string): Promise<boolean> {
    const screenshot = await this.page.screenshot();

    const prompt = `
    Analiza esta captura y determina si se cumple: "${expectedDescription}"

    Devuelve:
    {
      "matches": true/false,
      "confidence": 0.0-1.0,
      "explanation": "explicación de lo que ves",
      "differences": ["diferencia1", "diferencia2"]
    }
    `;

    const result = await this.llmService.getTestAssetsFromIA(
      prompt,
      screenshot.toString('base64')
    );

    return result.matches && result.confidence > 0.8;
  }

  /**
   * Detecta cambios inesperados en la UI
   */
  async detectUIChanges(baselineScreenshot?: Buffer): Promise<any> {
    const currentScreenshot = await this.page.screenshot();

    if (!baselineScreenshot) {
      // Primera ejecución, guardar como baseline
      return {
        isFirstRun: true,
        screenshot: currentScreenshot
      };
    }

    const prompt = `
    Compara estas dos capturas de pantalla e identifica cambios significativos.

    Reporta:
    {
      "hasSignificantChanges": true/false,
      "changes": [
        {
          "type": "added/removed/modified",
          "element": "descripción del elemento",
          "impact": "high/medium/low"
        }
      ],
      "recommendation": "continuar/revisar/actualizar"
    }
    `;

    const result = await this.llmService.getTestAssetsFromIA(
      prompt,
      currentScreenshot.toString('base64')
    );

    return result;
  }

  /**
   * Crea un selector desde coordenadas
   */
  private async createSelectorFromBoundingBox(box: any): Promise<string> {
    // Encontrar el elemento en esas coordenadas
    const element = await this.page.evaluateHandle(({ x, y }) => {
      return document.elementFromPoint(x + 10, y + 10);
    }, box);

    if (element) {
      // Intentar obtener un selector único
      const selector = await this.page.evaluate(el => {
        if (!el) return null;

        // Priorizar data-testid
        if (el.getAttribute('data-testid')) {
          return `[data-testid="${el.getAttribute('data-testid')}"]`;
        }

        // ID único
        if (el.id) {
          return `#${el.id}`;
        }

        // Clase + texto
        if (el.className && el.textContent) {
          return `.${el.className.split(' ')[0]}:has-text("${el.textContent.trim()}")`;
        }

        return null;
      }, element);

      return selector || `xpath=//*[contains(text(), "${box.text || ''}")]`;
    }

    throw new Error('No se pudo crear selector desde coordenadas');
  }
}
