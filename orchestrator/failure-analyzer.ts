// orchestrator/failure-analyzer.ts
import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from '@playwright/test'; // <-- CONEXIÓN
import { VisualAIHelper } from './visual-ai-helper'; // <-- CONEXIÓN

export interface FailureAnalysis {
  testName: string;
  failureType: 'selector' | 'timing' | 'validation' | 'navigation' | 'unknown';
  failedStep: string;
  errorMessage: string;
  suggestedFixes: SuggestedFix[];
}

export interface SuggestedFix {
  type: 'selector' | 'wait' | 'assertion' | 'retry';
  description: string;
  code?: string;
  confidence: number;
}

// Interfaz para el resultado de la ejecución, que ahora puede ser el reporte de Playwright
export interface TestExecutionResult {
  playwrightReport?: string; // El reporte JSON como string
  rawError?: Error; // El objeto de error crudo como fallback
}

// Tipos para la estructura de los assets generados por la IA
export interface Locator {
  name: string;
  elementType: string;
  selectors: { type: string; value: string }[];
}

export interface PageObjectAsset {
  name: string;
  locators: Locator[];
}

export interface AIAsserts {
  pageObject: PageObjectAsset;
}

export class FailureAnalyzer {
  private failureHistory: Map<string, FailureAnalysis[]> = new Map();

  async analyzeFailure(
    testPath: string,
    rawResult: string,
    aiAssetsPath: string,
    pageUrl: string,
  ): Promise<FailureAnalysis> {
    console.log('🔍 Analizando fallo de prueba...');
    const analysis: FailureAnalysis = {
      testName: path.basename(testPath),
      failureType: 'unknown',
      failedStep: 'Unknown step',
      errorMessage: rawResult,
      suggestedFixes: [],
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const report: any = JSON.parse(rawResult);
      const testResult = report.suites?.[0]?.suites?.[0]?.specs?.[0]?.tests?.[0]?.results?.[0];
      if (testResult && testResult.error) {
        analysis.errorMessage = testResult.error.message;
        const stack = testResult.error.stack || '';
        analysis.failedStep = this.extractFailedStep(stack, testPath);
        analysis.failureType = this.categorizeFailure(analysis.errorMessage);
      }
    } catch (e) {
      /* Se queda con el error crudo */
    }

    // <-- MEJORA CLAVE: Re-clasificación inteligente del error -->
    const stdout = rawResult;
    if (stdout.includes('Selector encontró') && stdout.includes('elementos para')) {
      console.log(
        "⚠️ Detectada ambigüedad en el selector. Re-clasificando el fallo como 'selector'.",
      );
      analysis.failureType = 'selector';
    }

    const aiAssets: AIAsserts = JSON.parse(fs.readFileSync(aiAssetsPath, 'utf8'));
    // Pasamos la URL al generador de sugerencias
    analysis.suggestedFixes = await this.generateSuggestedFixes(
      analysis.failureType,
      analysis.errorMessage,
      analysis.failedStep,
      aiAssets,
      pageUrl,
    );
    return analysis;
  }

  private categorizeFailure(errorMessage: string): FailureAnalysis['failureType'] {
    const lowerError = errorMessage.toLowerCase();
    if (lowerError.includes('outside of the viewport')) return 'timing'; // Sigue siendo útil para el diagnóstico inicial
    if (lowerError.includes('timeout') || lowerError.includes('waiting for')) return 'timing';
    if (lowerError.includes('locator') || lowerError.includes('selector')) return 'selector';
    if (lowerError.includes('expect') || lowerError.includes('assertion')) return 'validation';
    return 'unknown';
  }

  // <-- MEJORA: Extracción de paso mucho más precisa desde el stack trace -->
  private extractFailedStep(errorStack: string, testFilePath: string): string {
    if (!errorStack) return 'Unknown step';

    // Busca la línea que invoca un método del PageObject desde el archivo de prueba
    const testFileName = path.basename(testFilePath);
    const regex = new RegExp(`at .*/${testFileName}:d+:d+`);
    const stackLines = errorStack.split('\n');
    const testLineIndex = stackLines.findIndex((line) => regex.test(line));

    if (testLineIndex > 0) {
      // La línea anterior en el stack trace suele ser la llamada dentro del POM
      const pomLine = stackLines[testLineIndex - 1];
      const match = pomLine.match(/at \w+\.(\w+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Fallback si el patrón anterior no funciona
    const fallbackMatch = errorStack.match(/await \w+\.(\w+)\(/);
    if (fallbackMatch && fallbackMatch[1]) {
      return fallbackMatch[1];
    }

    return 'Unknown step';
  }

  private async generateSuggestedFixes(
    failureType: FailureAnalysis['failureType'],
    errorMessage: string,
    failedStep: string,
    aiAssets: AIAsserts,
    pageUrl: string,
  ): Promise<SuggestedFix[]> {
    if (failureType === 'selector') {
      const locatorNameMatch = failedStep.match(/^(?:click|fill|waitFor|assert)(\w+)/i);
      if (locatorNameMatch && locatorNameMatch[1]) {
        const elementName =
          locatorNameMatch[1].charAt(0).toLowerCase() + locatorNameMatch[1].slice(1);
        const locatorData = aiAssets.pageObject.locators.find(
          (loc: Locator) => loc.name === elementName,
        );
        if (locatorData && locatorData.selectors.length > 1) {
          return [
            {
              type: 'selector',
              description: `El selector principal es ambiguo. Intentar usar el siguiente selector de la lista: '${JSON.stringify(locatorData.selectors[1])}'`,
              code: JSON.stringify({ reorder: true }),
              confidence: 0.98,
            },
          ];
        }
      }
    }

    console.log('👁️ El selector falló. Intentando análisis visual como último recurso...');
    try {
      const browser = await chromium.launch();
      const page: Page = await browser.newPage();
      await page.goto(pageUrl, { waitUntil: 'networkidle' });
      const visualHelper = new VisualAIHelper(page);

      const elementNameMatch = failedStep.match(/^(?:click|fill|waitFor|assert)(\w+)/i);
      if (elementNameMatch && elementNameMatch[1]) {
        const elementName = elementNameMatch[1];
        const locatorInfo = aiAssets.pageObject.locators.find(
          (l: Locator) => l.name.toLowerCase() === elementName.toLowerCase(),
        );
        const description = locatorInfo
          ? `el ${locatorInfo.elementType} llamado ${elementName}`
          : `el elemento de la acción ${elementName}`;

        const visualResult = await visualHelper.findElementVisually(description);

        if (
          visualResult &&
          visualResult.found &&
          visualResult.confidence > 0.8 &&
          visualResult.suggestedSelectors.length > 0
        ) {
          console.log(`✅ Visual AI encontró una posible corrección para "${elementName}"`);
          await browser.close();
          return [
            {
              type: 'selector',
              description: `Visual AI sugiere un nuevo selector basado en el análisis de la imagen.`,
              code: JSON.stringify({ newSelector: visualResult.suggestedSelectors[0] }),
              confidence: 0.9,
            },
          ];
        }
      }
      await browser.close();
    } catch (e) {
      console.error('❌ El análisis con Visual AI falló:', e);
    }

    return [{ type: 'retry', description: 'Reintentar la prueba.', confidence: 0.3 }];
  }

  async applyFixes(analysis: FailureAnalysis, aiAssetsPath: string): Promise<boolean> {
    console.log('🔧 Evaluando posibles correcciones automáticas...');

    // Busca la primera sugerencia de tipo 'selector' con alta confianza.
    const fix = analysis.suggestedFixes.find(
      (f: SuggestedFix) => f.confidence > 0.9 && f.type === 'selector',
    );

    if (!fix || !fix.code) {
      console.log(
        '⚠️ No se encontraron correcciones de selector con suficiente confianza para aplicar.',
      );
      return false;
    }

    // Identifica el elemento a reparar a partir del nombre del paso fallido (ej. "clickLoginButton" -> "loginButton")
    const locatorNameMatch = analysis.failedStep.match(
      /^(?:click|fill|waitFor|assert|check|select|clear|get|is)(\w+)/i,
    );
    if (!locatorNameMatch) {
      console.log(
        `⚠️ No se pudo extraer el nombre del elemento desde el paso: "${analysis.failedStep}"`,
      );
      return false;
    }

    const elementName = locatorNameMatch[1].charAt(0).toLowerCase() + locatorNameMatch[1].slice(1);
    const aiAssets: AIAsserts = JSON.parse(fs.readFileSync(aiAssetsPath, 'utf8'));
    const locatorToFix = aiAssets.pageObject.locators.find((loc: Locator) => loc.name === elementName);

    if (!locatorToFix) {
      console.log(`⚠️ No se pudo encontrar el locator llamado "${elementName}" en los assets.`);
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fixAction: any = JSON.parse(fix.code);

    // ESTRATEGIA 1: Reordenar selectores si el primario fue ambiguo.
    if (fixAction.reorder === true && locatorToFix.selectors.length > 1) {
      console.log(
        `📌 Aplicando auto-reparación [REORDENAR] para "${elementName}": Promoviendo el segundo selector.`,
      );

      // Mueve el primer selector (el que falló) al final de la lista.
      const failingSelector = locatorToFix.selectors.shift();
      if (failingSelector) {
        locatorToFix.selectors.push(failingSelector);
      }

      fs.writeFileSync(aiAssetsPath, JSON.stringify(aiAssets, null, 2));
      console.log(
        `✅ Archivo de assets actualizado. El nuevo selector primario es: ${JSON.stringify(locatorToFix.selectors[0])}`,
      );
      return true;
    }

    // ESTRATEGIA 2: Añadir un nuevo selector, probablemente del análisis visual.
    if (fixAction.newSelector) {
      console.log(
        `📌 Aplicando auto-reparación [VISUAL/NUEVO] para "${elementName}": Añadiendo nuevo selector.`,
      );
      const newSelector = fixAction.newSelector;

      // Evitar añadir un selector que ya existe.
      const selectorExists = locatorToFix.selectors.some(
        (s: { type: string; value: string }) => s.type === newSelector.type && s.value === newSelector.value,
      );

      if (!selectorExists) {
        // Añade el nuevo selector al principio, dándole máxima prioridad.
        locatorToFix.selectors.unshift(newSelector);
        fs.writeFileSync(aiAssetsPath, JSON.stringify(aiAssets, null, 2));
        console.log(
          `✅ Archivo de assets actualizado. Se añadió un nuevo selector de alta prioridad: ${JSON.stringify(newSelector)}`,
        );
        return true;
      } else {
        console.log(`⚠️ El selector sugerido ya existía en la lista.`);
        return false;
      }
    }

    console.log('⚠️ La acción de corrección sugerida no es reconocida.');
    return false;
  }
}
