// orchestrator/visual-ai-helper.ts
import { Page } from '@playwright/test';
import { getLlmService } from './llm-service';
import { ILlmService } from './llms/ILlmService';

// --- Interfaces para los resultados del análisis visual (Definiciones Completas) ---

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
    const screenshotBase64 = screenshot.toString('base64');

    const prompt = `
     Analiza esta captura de pantalla y encuentra el elemento que coincida con: "${description}"
     Devuelve un JSON con la estructura definida en la interfaz VisualFindResult.`;

    // Se usa el método genérico para JSON, pasándole el tipo esperado
    const result = await this.llmService.getStructuredJsonResponse<VisualFindResult>(
      prompt,
      screenshotBase64,
    );

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
    const screenshotBase64 = screenshot.toString('base64');

    const prompt = `
     Analiza esta captura y determina si se cumple: "${expectedDescription}"
     Devuelve un JSON con la estructura definida en la interfaz VisualCompareResult.`;

    // Se usa el método genérico para JSON, pasándole el tipo esperado
    const result = await this.llmService.getStructuredJsonResponse<VisualCompareResult>(
      prompt,
      screenshotBase64,
    );

    return !!(result && result.matches && result.confidence > 0.8);
  }

  // --- El resto de la clase no tiene cambios pendientes ---
}
