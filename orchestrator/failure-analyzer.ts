// orchestrator/failure-analyzer.ts
import * as fs from 'fs';
import * as path from 'path';
import { AIResponse, LocatorDefinition as Locator, Selector } from './types/types';

export type SuggestedFix =
  | { type: 'selector'; description: string; code?: string; confidence: number }
  | { type: 'wait'; description: string; code?: string; confidence: number }
  | { type: 'assertion'; description: string; code?: string; confidence: number }
  | { type: 'retry'; description: string; code?: string; confidence: number }
  | {
      type: 'selector_repair';
      description: string;
      elementName: string;
      originalSelector: string;
      newSelector: string;
      repaired: boolean;
    };

export interface FailureAnalysis {
  testName: string;
  failureType: 'selector' | 'timing' | 'validation' | 'navigation' | 'unknown';
  failedStep: string;
  errorMessage: string;
  suggestedFixes: SuggestedFix[];
}

export interface AIAsserts extends AIResponse {}

export class FailureAnalyzer {
  public async analyzeFailure(
    testPath: string,
    rawResult: string,
    aiAssetsPath: string,
    pageUrl: string,
  ): Promise<FailureAnalysis> {
    const analysis: FailureAnalysis = {
      testName: path.basename(testPath),
      failureType: 'unknown',
      failedStep: 'Unknown step',
      errorMessage: rawResult,
      suggestedFixes: [],
    };

    try {
      const report: any = JSON.parse(rawResult);
      const testResult = report.suites?.[0]?.suites?.[0]?.specs?.[0]?.tests?.[0]?.results?.[0];
      if (testResult && testResult.error) {
        analysis.errorMessage = testResult.error.message;
        analysis.failedStep = this.extractFailedStep(testResult.error.stack || '', testPath);
        analysis.failureType = this.categorizeFailure(analysis.errorMessage);
      }
    } catch (e) {
      analysis.failureType = this.categorizeFailure(analysis.errorMessage);
      analysis.failedStep = this.extractFailedStep(rawResult, testPath);
    }

    const aiAssets: AIResponse = JSON.parse(fs.readFileSync(aiAssetsPath, 'utf8'));


    analysis.suggestedFixes = await this.generateSuggestedFixes(
        analysis.failureType,
        analysis.errorMessage,
        analysis.failedStep,
        aiAssets,
        pageUrl
    );

    return analysis;
  }

  private categorizeFailure(errorMessage: string): FailureAnalysis['failureType'] {
    const lowerError = errorMessage.toLowerCase();
    if (lowerError.includes('outside of the viewport')) return 'timing';
    if (lowerError.includes('timeout') || lowerError.includes('waiting for')) return 'timing';
    if (lowerError.includes('locator') || lowerError.includes('selector')) return 'selector';
    if (lowerError.includes('expect') || lowerError.includes('assertion')) return 'validation';
    return 'unknown';
  }

  private extractFailedStep(errorStack: string, testFilePath: string): string {
    if (!errorStack) return 'Unknown step';

    const testFileName = path.basename(testFilePath);
    const regex = new RegExp(`at .*/${testFileName}:\\d+:\\d+`);
    const stackLines = errorStack.split('\n');
    const testLineIndex = stackLines.findIndex((line) => regex.test(line));

    if (testLineIndex > 0) {
      const pomLine = stackLines[testLineIndex - 1];
      const match = pomLine.match(/at \w+\.(\w+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

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
    aiAssets: AIResponse,
    pageUrl: string,
  ): Promise<SuggestedFix[]> {
    if (failureType === 'selector') {
      const locatorNameMatch = failedStep.match(/^(?:click|fill|waitFor|assert)(\w+)/i);
      if (locatorNameMatch && locatorNameMatch[1]) {
        const elementName =
          locatorNameMatch[1].charAt(0).toLowerCase() + locatorNameMatch[1].slice(1);

        const allLocators = [aiAssets.pageObject, ...(aiAssets.additionalPageObjects || [])].flatMap(p => p.locators);
        const locatorData = allLocators.find(
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
    return [{ type: 'retry', description: 'Reintentar la prueba.', confidence: 0.3 }];
  }

  public async applyFixes(analysis: FailureAnalysis, aiAssetsPath: string): Promise<boolean> {
    console.log('🔧 Evaluando posibles correcciones automáticas...');
    const fix = analysis.suggestedFixes.find(
      (f): f is Extract<SuggestedFix, {type: 'selector'}> => 'confidence' in f && f.type === 'selector' && f.confidence > 0.9
    );

    if (!fix || !fix.code) {
      console.log('⚠️ No se encontraron correcciones de selector con suficiente confianza para aplicar.');
      return false;
    }

    const locatorNameMatch = analysis.failedStep.match(/^(?:click|fill|waitFor|assert|check|select|clear|get|is)(\w+)/i);
    if (!locatorNameMatch) return false;

    const elementName = locatorNameMatch[1].charAt(0).toLowerCase() + locatorNameMatch[1].slice(1);
    const aiAssets: AIResponse = JSON.parse(fs.readFileSync(aiAssetsPath, 'utf8'));

    const allPageObjects = [aiAssets.pageObject, ...(aiAssets.additionalPageObjects || [])];
    let locatorToFix: Locator | undefined;
    for (const po of allPageObjects) {
        locatorToFix = po.locators.find(loc => loc.name === elementName);
        if (locatorToFix) break;
    }

    if (!locatorToFix) return false;

    const fixAction: any = JSON.parse(fix.code);

    if (fixAction.reorder === true && locatorToFix.selectors.length > 1) {
      const originalSelector = locatorToFix.selectors[0];
      const failingSelector = locatorToFix.selectors.shift();
      if (failingSelector) locatorToFix.selectors.push(failingSelector);
      const newSelector = locatorToFix.selectors[0];

      const repairInfo: SuggestedFix = {
        type: 'selector_repair',
        description: `Se reordenó el selector para priorizar uno que probablemente funcione.`,
        elementName: elementName,
        originalSelector: JSON.stringify(originalSelector),
        newSelector: JSON.stringify(newSelector),
        repaired: true,
      };
      analysis.suggestedFixes.push(repairInfo);

      fs.writeFileSync(aiAssetsPath, JSON.stringify(aiAssets, null, 2));
      console.log(`✅ Reparación aplicada para el elemento "${elementName}".`);
      return true;
    }

    return false;
  }
}
