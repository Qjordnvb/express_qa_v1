// orchestrator/learning-system.ts
import { promises as fs } from 'fs';
import * as path from 'path';
import { AIResponse, LocatorDefinition, Selector } from './types/types';
import { FailureAnalysis, SuggestedFix } from './failure-analyzer';
import { MemoryService, MemoryRecord } from './services/MemoryService';

// --- Interfaces para la base de conocimiento local (selectors.json) ---
interface LearnedSelector {
  url: string;
  elementDescription: string;
  workingSelectors: string[];
  failedSelectors: string[];
  lastUpdated: Date;
  successRate: number;
}

export class LearningSystem {
  private knowledgeBasePath = path.resolve(__dirname, '../knowledge-base');
  private selectorsDB: Map<string, LearnedSelector> = new Map();
  private memoryService: MemoryService;

  constructor() {
    this.loadKnowledge();
    this.memoryService = new MemoryService();
    console.log('📚 Sistema de Aprendizaje inicializado.');
  }

  /**
   * Mejora los assets de la IA con conocimiento previo de los selectores que funcionan.
   */
  public enhanceAIAssets(aiAssets: AIResponse, pageUrl: string): AIResponse {
    console.log('✨ Mejorando assets con conocimiento previo...');
    const enhanced: AIResponse = JSON.parse(JSON.stringify(aiAssets));
    const allPageObjects = [enhanced.pageObject, ...(enhanced.additionalPageObjects || [])];

    for (const po of allPageObjects) {
      for (const locator of po.locators) {
        const key = `${pageUrl}-${locator.name}`;
        const knowledge = this.selectorsDB.get(key);

        if (knowledge && knowledge.workingSelectors.length > 0) {
          const knownGoodSelectors = knowledge.workingSelectors.map((s) => this.stringToSelector(s));
          const knownBadSelectors = new Set(knowledge.failedSelectors);

          const candidateSelectors = locator.selectors.filter(
            (s: Selector) => !knownBadSelectors.has(this.selectorToString(s)),
          );

          // Prioriza los selectores que han funcionado anteriormente
          const finalSelectors = [...knownGoodSelectors, ...candidateSelectors];

          // Elimina duplicados y limita a 5 selectores para no sobrecargar
          locator.selectors = [...new Map(finalSelectors.map((item) => [this.selectorToString(item), item])).values()].slice(0, 5);
        }
      }
    }
    return enhanced;
  }

  /**
   * Aprende de una ejecución de prueba exitosa, registrando los selectores que funcionaron.
   * Si el éxito fue resultado de una reparación, lo guarda en la memoria vectorial.
   */
  public async learnFromSuccess(
    testName: string,
    aiAssets: AIResponse,
    pageUrl: string,
    analysis?: FailureAnalysis
  ): Promise<void> {
    console.log('🧠 Aprendiendo de ejecución exitosa...');
    let memoryRecord: MemoryRecord;

    if (analysis) {
      // Caso 1: El éxito vino después de una reparación
      const successfulFix = analysis.suggestedFixes.find(
        (fix): fix is Extract<SuggestedFix, { type: 'selector_repair' }> =>
          fix.type === 'selector_repair' && fix.repaired
      );

      if (successfulFix) {
        console.log('...registrando reparación exitosa en la memoria vectorial.');
        memoryRecord = {
          testName: testName,
          failureContext: analysis.errorMessage, // Guardamos el error original
          repairedSelector: {
            originalSelector: successfulFix.originalSelector,
            newSelector: successfulFix.newSelector,
            elementName: successfulFix.elementName,
          },
          url: pageUrl,
        };
        await this.memoryService.saveSuccessfulRepair(memoryRecord);
      }
    } else {
      // Caso 2: El éxito fue en el primer intento (NUEVA LÓGICA)
      console.log('...registrando éxito simple en la memoria vectorial.');
      memoryRecord = {
        testName: testName,
        failureContext: 'Ejecución exitosa en el primer intento.', // Contexto genérico de éxito
        repairedSelector: {
          elementName: 'N/A',
          originalSelector: 'N/A',
          newSelector: 'N/A',
        },
        url: pageUrl,
      };
      await this.memoryService.saveSuccessfulRepair(memoryRecord);
    }

    await this.saveKnowledge();
  }

  /**
   * Aprende de un fallo, registrando los selectores que no funcionaron.
   */
  public async learnFromFailure(
    aiAssets: AIResponse,
    pageUrl: string,
  ): Promise<void> {
    console.log('🧠 Registrando fallo en la base de conocimiento local...');
    this.updateSelectorsDB(aiAssets, pageUrl, false);
    await this.saveKnowledge();
  }

  // --- Métodos Privados ---

  private updateSelectorsDB(aiAssets: AIResponse, pageUrl: string, success: boolean): void {
    const allPageObjects = [aiAssets.pageObject, ...(aiAssets.additionalPageObjects || [])];

    for (const po of allPageObjects) {
        for (const locator of po.locators) {
            if (locator.selectors.length === 0) continue;

            const key = `${pageUrl}-${locator.name}`;
            const entry = this.selectorsDB.get(key) || this.createNewEntry(pageUrl, locator.name);
            const primarySelector = this.selectorToString(locator.selectors[0]);

            if (success) {
                if (!entry.workingSelectors.includes(primarySelector)) {
                    entry.workingSelectors.unshift(primarySelector);
                }
                const failIndex = entry.failedSelectors.indexOf(primarySelector);
                if (failIndex > -1) entry.failedSelectors.splice(failIndex, 1);
            } else {
                if (!entry.failedSelectors.includes(primarySelector)) {
                    entry.failedSelectors.push(primarySelector);
                }
            }
            entry.successRate = this.calculateSuccessRate(entry);
            entry.lastUpdated = new Date();
            this.selectorsDB.set(key, entry);
        }
    }
  }

  private createNewEntry(url: string, elementName: string): LearnedSelector {
    return {
        url,
        elementDescription: elementName,
        workingSelectors: [],
        failedSelectors: [],
        lastUpdated: new Date(),
        successRate: 100,
    };
  }

  private selectorToString(selector: Selector): string {
    const options = selector.options ? JSON.stringify(selector.options) : '';
    return `${selector.type}:${selector.value}${options}`;
  }

  private stringToSelector(str: string): Selector {
    const [type, ...valueParts] = str.split(/:(.*)/s);
    const valueAndOptions = valueParts[0] || '';
    try {
        const parsed = JSON.parse(valueAndOptions);
        if (typeof parsed === 'object' && parsed !== null && 'value' in parsed) {
            return { type, value: parsed.value, options: parsed.options };
        }
    } catch (e) { /* No es un objeto JSON */ }
    return { type, value: valueAndOptions };
  }

  private calculateSuccessRate(entry: LearnedSelector): number {
    const total = entry.workingSelectors.length + entry.failedSelectors.length;
    return total > 0 ? Math.round((entry.workingSelectors.length / total) * 100) : 100;
  }

  private async loadKnowledge(): Promise<void> {
    const selectorsPath = path.join(this.knowledgeBasePath, 'selectors.json');
    try {
      await fs.access(selectorsPath);
      const data = await fs.readFile(selectorsPath, 'utf8');
      this.selectorsDB = new Map(Object.entries(JSON.parse(data)));
    } catch (error) {
      console.log('No se pudo cargar la base de conocimiento local, iniciando desde cero.');
      this.selectorsDB = new Map();
    }
  }

  private async saveKnowledge(): Promise<void> {
    try {
      await fs.mkdir(this.knowledgeBasePath, { recursive: true });
      const selectorsObj = Object.fromEntries(this.selectorsDB);
      await fs.writeFile(
        path.join(this.knowledgeBasePath, 'selectors.json'),
        JSON.stringify(selectorsObj, null, 2),
      );
    } catch (e) {
      console.error("Error al guardar la base de conocimiento local:", e);
    }
  }
}
