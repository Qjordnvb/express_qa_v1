// orchestrator/failure-analyzer.ts
import * as fs from 'fs';
import * as path from 'path';

interface FailureAnalysis {
  testName: string;
  failureType: 'selector' | 'timing' | 'validation' | 'navigation' | 'unknown';
  failedStep: string;
  errorMessage: string;
  suggestedFixes: SuggestedFix[];
}

interface SuggestedFix {
  type: 'selector' | 'wait' | 'assertion' | 'retry';
  description: string;
  code?: string;
  confidence: number;
}

// Interfaz para el resultado de la ejecución, que ahora puede ser el reporte de Playwright
interface TestExecutionResult {
  playwrightReport?: string; // El reporte JSON como string
  rawError?: any; // El objeto de error crudo como fallback
}


export class FailureAnalyzer {
  private failureHistory: Map<string, FailureAnalysis[]> = new Map();

  async analyzeFailure(
    testPath: string,
    rawResult: string, // <-- MEJORA: Recibe el string del stdout o error crudo
    aiAssetsPath: string
  ): Promise<FailureAnalysis> {
    console.log('🔍 Analizando fallo de prueba...');

    let errorMessage = 'Error desconocido';
    let failedStep = 'Unknown step';
    let failureType: FailureAnalysis['failureType'] = 'unknown';

    // <-- MEJORA: Lógica inteligente para parsear el reporte JSON de Playwright -->
    try {
      const report = JSON.parse(rawResult);
      // Navegamos la estructura del reporte JSON para encontrar el error
      const testResult = report.suites?.[0]?.suites?.[0]?.specs?.[0]?.tests?.[0]?.results?.[0];
      if (testResult && testResult.error) {
        errorMessage = testResult.error.message;
        const stack = testResult.error.stack || '';
        failedStep = this.extractFailedStep(stack);
        failureType = this.categorizeFailure(errorMessage);
        console.log(`✅ Análisis exitoso del reporte de Playwright. Fallo en: ${failedStep}`);
      } else {
          console.warn('El reporte JSON no contenía un error claro. Se usará el error crudo.');
          errorMessage = rawResult;
          failedStep = this.extractFailedStep(rawResult);
          failureType = this.categorizeFailure(rawResult);
      }
    } catch (e) {
      // Si no es un JSON, es un error crudo. Lo usamos directamente.
      console.warn('No se pudo parsear el resultado como JSON. Analizando como texto de error crudo.');
      errorMessage = rawResult;
      failedStep = this.extractFailedStep(rawResult);
      failureType = this.categorizeFailure(rawResult);
    }

    const aiAssets = JSON.parse(fs.readFileSync(aiAssetsPath, 'utf8'));
    const suggestedFixes = await this.generateSuggestedFixes(failureType, errorMessage, failedStep, aiAssets);

    const analysis: FailureAnalysis = {
      testName: path.basename(testPath),
      failureType,
      failedStep,
      errorMessage,
      suggestedFixes,
    };

    this.addToHistory(testPath, analysis);
    return analysis;
  }

  private categorizeFailure(errorMessage: string): FailureAnalysis['failureType'] {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes('timeout') || lowerError.includes('waiting for')) {
      return 'timing';
    }
    if (lowerError.includes('locator') || lowerError.includes('selector') || lowerError.includes('element not found')) {
      return 'selector';
    }
    if (lowerError.includes('expect') || lowerError.includes('assertion')) {
      return 'validation';
    }
    if (lowerError.includes('navigation') || lowerError.includes('goto')) {
      return 'navigation';
    }

    return 'unknown';
  }

  // <-- MEJORA: Extracción de paso mucho más precisa desde el stack trace -->
  private extractFailedStep(errorStack: string): string {
    if (!errorStack) return 'Unknown step';
    // Busca patrones como: at LoginPage.fillEmailInput (/path/to/project/pages/generated/LoginPage.ts:45:21)
    const match = errorStack.match(/at \w+\.(\w+)\s/);
    if (match && match[1]) {
      return match[1];
    }
    return 'Unknown step';
  }

  private async generateSuggestedFixes(
    failureType: FailureAnalysis['failureType'],
    errorMessage: string,
    failedStep: string,
    aiAssets: any
  ): Promise<SuggestedFix[]> {
    let fixes: SuggestedFix[] = [];
    const lowerErrorMessage = errorMessage.toLowerCase();

    // <-- MEJORA: Añadir lógica específica para errores de 'timing' y 'viewport' -->
    if (failureType === 'timing' && lowerErrorMessage.includes('outside of the viewport')) {
        fixes.push({
            type: 'wait',
            description: `El elemento no estaba visible. Añadir scrollIntoViewIfNeeded() antes de la acción.`,
            confidence: 0.95
        });
    } else if (failureType === 'timing') {
        fixes.push({
            type: 'wait',
            description: `Aumentar el timeout o añadir una espera explícita (ej. waitForLoadState).`,
            confidence: 0.8
        });
    }
    // <-- FIN DE LA MEJORA -->

    if (failureType === 'selector') {
      const relatedLocator = aiAssets.pageObject.locators.find((loc: any) =>
        failedStep.toLowerCase().includes(loc.name.toLowerCase())
      );
      if (relatedLocator) {
          fixes.push({
              type: 'selector',
              description: `Sugerir un selector alternativo para '${relatedLocator.name}' usando data-testid`,
              code: JSON.stringify({ type: "locator", value: `[data-testid='${relatedLocator.name}-test']` }),
              confidence: 0.85
          });
      }
    }

    // Fallback genérico
    if (fixes.length === 0) {
      fixes.push({
        type: 'retry',
        description: 'Reintentar la prueba para descartar un fallo intermitente.',
        confidence: 0.3
      });
    }

    return fixes.sort((a, b) => b.confidence - a.confidence);
  }

  async applyFixes(
    analysis: FailureAnalysis,
    aiAssetsPath: string,
    threshold: number = 0.8
  ): Promise<boolean> {
    console.log('🔧 Evaluando posibles correcciones automáticas...');
    const highConfidenceFix = analysis.suggestedFixes.find(
      (fix) => fix.confidence >= threshold && fix.type === 'selector' && fix.code
    );
    if (!highConfidenceFix) {
      console.log('⚠️ No se encontraron correcciones de selector con suficiente confianza para aplicar.');
      return false;
    }
    const aiAssets = JSON.parse(fs.readFileSync(aiAssetsPath, 'utf8'));
    let modified = false;
    const locatorNameToFix = analysis.failedStep.replace(/^(click|fill|waitFor|assert)/i, '');
    const locatorToFix = aiAssets.pageObject.locators.find((loc: any) =>
      loc.name.toLowerCase() === locatorNameToFix.charAt(0).toLowerCase() + locatorNameToFix.slice(1).toLowerCase()
    );

    if (locatorToFix) {
      console.log(`📌 Aplicando corrección para el elemento "${locatorToFix.name}": ${highConfidenceFix.description}`);
      try {
        const newSelector = JSON.parse(highConfidenceFix.code!);
        const selectorExists = locatorToFix.selectors.some((s: any) => s.type === newSelector.type && s.value === newSelector.value);
        if (!selectorExists) {
          locatorToFix.selectors.unshift(newSelector);
          modified = true;
        } else {
          console.log(`El selector sugerido ya existe para "${locatorToFix.name}". No se realizarán cambios.`);
        }
      } catch (e) {
        console.error("Error al parsear o aplicar la sugerencia de código del selector:", e);
        return false;
      }
    }
    if (modified) {
      fs.writeFileSync(aiAssetsPath, JSON.stringify(aiAssets, null, 2));
      console.log(`✅ Archivo de assets (${path.basename(aiAssetsPath)}) actualizado con nuevo selector.`);
    }
    return modified;
  }

  private addToHistory(testPath: string, analysis: FailureAnalysis): void {
    if (!this.failureHistory.has(testPath)) {
      this.failureHistory.set(testPath, []);
    }
    this.failureHistory.get(testPath)!.push(analysis);

    // Persistencia (opcional, pero recomendada para el futuro)
    const historyDir = path.resolve(__dirname, `../knowledge-base`);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    const historyPath = path.join(historyDir, '.failure-analysis-log.json');
    const allHistory = Object.fromEntries(this.failureHistory.entries());
    fs.writeFileSync(historyPath, JSON.stringify(allHistory, null, 2));
  }
}
