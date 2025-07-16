// orchestrator/visual-ai-helper.ts
import { Page } from '@playwright/test';
import { getLlmService } from './llm-service';
import { ILlmService } from './llms/ILlmService';

// --- Interfaces para los resultados del análisis visual ---

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualFindResult {
  found: boolean;
  boundingBox: BoundingBox;
  suggestedSelectors: string[];
  confidence: number;
  elementType: string;
  attributes: {
    text?: string;
    placeholder?: string;
    ariaLabel?: string;
  };
}

export interface VisualCompareResult {
  matches: boolean;
  confidence: number;
  explanation: string;
  differences: string[];
}

export interface UIChange {
  type: 'added' | 'removed' | 'modified';
  element: string;
  impact: 'high' | 'medium' | 'low';
}

export interface UIChangeResult {
  isFirstRun?: boolean;
  screenshot?: Buffer;
  hasSignificantChanges?: boolean;
  changes?: UIChange[];
  recommendation?: 'continue' | 'revisar' | 'actualizar';
}

export class VisualAIHelper {
  private llmService: ILlmService = getLlmService();
  private visualCache = new Map<string, VisualFindResult>();

  constructor(private page: Page) {}

  /**
   * Encuentra un elemento usando descripción visual cuando los selectores fallan
   */
  async findElementVisually(description: string): Promise<VisualFindResult | null> {
    console.log(`👁️ Buscando visualmente: "${description}"`);

    const cacheKey = `${this.page.url()}-${description}`;
    if (this.visualCache.has(cacheKey)) {
      return this.visualCache.get(cacheKey) || null;
    }

    const screenshot = await this.page.screenshot({ fullPage: true });

    const prompt = `
    Analiza esta captura de pantalla y encuentra el elemento que coincida con: "${description}"
    Devuelve un JSON con la estructura definida.`;

    // La IA debería devolver algo que coincida con VisualFindResult
    const result = (await this.llmService.getTestAssetsFromIA(
      [prompt],
      screenshot.toString('base64'),
    )) as unknown as VisualFindResult;

    if (result && result.found) {
      this.visualCache.set(cacheKey, result);
      return result;
    }

    return null;
  }

  /**
   * Compara visualmente dos estados de la página
   */
  async compareVisualStates(expectedDescription: string): Promise<boolean> {
    const screenshot = await this.page.screenshot();

    const prompt = `
    Analiza esta captura y determina si se cumple: "${expectedDescription}"
    Devuelve un JSON con la estructura definida.`;

    const result = (await this.llmService.getTestAssetsFromIA(
      [prompt],
      screenshot.toString('base64'),
    )) as unknown as VisualCompareResult;

    return result && result.matches && result.confidence > 0.8;
  }

  /**
   * Detecta cambios inesperados en la UI
   */
  async detectUIChanges(baselineScreenshot?: Buffer): Promise<UIChangeResult> {
    const currentScreenshot = await this.page.screenshot();

    if (!baselineScreenshot) {
      return {
        isFirstRun: true,
        screenshot: currentScreenshot,
      };
    }

    const prompt = `
    Compara estas dos capturas de pantalla e identifica cambios significativos.
    Devuelve un JSON con la estructura definida.`;

    const result = (await this.llmService.getTestAssetsFromIA(
      [prompt],
      currentScreenshot.toString('base64'),
    )) as unknown as UIChangeResult;

    return result;
  }

  /**
   * Crea un selector desde coordenadas
   */
  private async createSelectorFromBoundingBox(box: BoundingBox): Promise<string> {
    const elementHandle = await this.page.evaluateHandle(({ x, y }) => {
      return document.elementFromPoint(x + 10, y + 10);
    }, box);

    const element = elementHandle.asElement();
    if (element) {
      const selector = await this.page.evaluate((el) => {
        if (el.getAttribute('data-testid')) {
          return `[data-testid="${el.getAttribute('data-testid')}"]`;
        }
        if (el.id) {
          return `#${el.id}`;
        }
        if (el.className && typeof el.className === 'string' && el.textContent) {
          return `.${el.className.split(' ')[0]}:has-text("${el.textContent.trim()}")`;
        }
        return null;
      }, element);

      if (selector) return selector;
    }

    // Fallback a XPath si no se puede generar un selector más robusto
    const textContent = await element?.textContent();
    return `xpath=//*[contains(text(), "${textContent || ''}")]`;
  }
}
