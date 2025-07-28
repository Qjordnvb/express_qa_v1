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

// --- NUEVA INTERFAZ para reparaciones fallidas ---
interface FailedRepairRecord {
  testName: string;
  failureContext: string;
  failedRepair: {
    repairType: string;
    attemptedFix: string;
    elementName: string;
    originalSelector: string;
    newSelector: string;
  };
  url: string;
  failedAt: Date;
  attempts: number; // Cuántas veces se intentó esta reparación
}

export class LearningSystem {
  private knowledgeBasePath = path.resolve(__dirname, '../knowledge-base');
  private selectorsDB: Map<string, LearnedSelector> = new Map();
  private failedRepairsDB: Map<string, FailedRepairRecord> = new Map(); // NUEVA base de fallos
  private memoryService: MemoryService;

  constructor() {
    this.loadKnowledge();
    this.memoryService = new MemoryService();
    console.log('📚 Sistema de Aprendizaje inicializado.');
  }

  /**
   * Mejora los assets de la IA con conocimiento previo de los selectores que funcionan.
   * ACTUALIZADO: Ahora también evita reparaciones que ya se sabe que fallan.
   */
  public enhanceAIAssets(aiAssets: AIResponse, pageUrl: string): AIResponse {
    console.log('✨ Mejorando assets con conocimiento previo...');
    const enhanced: AIResponse = JSON.parse(JSON.stringify(aiAssets));
    const allPageObjects = [enhanced.pageObject, ...(enhanced.additionalPageObjects || [])];

    for (const po of allPageObjects) {
      for (const locator of po.locators) {
        const key = `${pageUrl}-${locator.name}`;
        const knowledge = this.selectorsDB.get(key);

        // NUEVA LÓGICA: Verificar reparaciones fallidas conocidas
        const failedRepairs = this.getFailedRepairsForElement(pageUrl, locator.name);

        if (knowledge && knowledge.workingSelectors.length > 0) {
          const knownGoodSelectors = knowledge.workingSelectors.map((s) => this.stringToSelector(s));
          const knownBadSelectors = new Set(knowledge.failedSelectors);

          // NUEVA LÓGICA: Añadir selectores de reparaciones fallidas a la lista de "malos"
          failedRepairs.forEach(repair => {
            knownBadSelectors.add(repair.failedRepair.newSelector);
          });

          const candidateSelectors = locator.selectors.filter(
            (s: Selector) => !knownBadSelectors.has(this.selectorToString(s)),
          );

          // Prioriza los selectores que han funcionado anteriormente
          const finalSelectors = [...knownGoodSelectors, ...candidateSelectors];

          // Elimina duplicados y limita a 5 selectores para no sobrecargar
          locator.selectors = [...new Map(finalSelectors.map((item) => [this.selectorToString(item), item])).values()].slice(0, 5);

          // Log de prevención
          if (failedRepairs.length > 0) {
            console.log(`🚫 Evitando ${failedRepairs.length} reparaciones fallidas conocidas para ${locator.name}`);
          }
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

        // NUEVA LÓGICA: Si esta reparación estaba en la lista de fallidas, la removemos
        this.removeFromFailedRepairs(pageUrl, successfulFix.elementName, successfulFix.newSelector);

        memoryRecord = {
          testName: testName,
          failureContext: analysis.errorMessage,
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
      // Caso 2: El éxito fue en el primer intento
      console.log('...registrando éxito simple en la memoria vectorial.');
      memoryRecord = {
        testName: testName,
        failureContext: 'Ejecución exitosa en el primer intento.',
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

  /**
   * NUEVO MÉTODO: Aprende de una reparación que falló.
   * Esto evita que el agente intente la misma reparación inútil en el futuro.
   */
  public async learnFromFailedRepair(analysis: FailureAnalysis): Promise<void> {
    console.log('🔴 Aprendiendo de reparación fallida...');

    // Buscar la reparación que se intentó aplicar
    const failedFix = analysis.suggestedFixes.find(
      (fix): fix is Extract<SuggestedFix, { type: 'selector_repair' }> =>
        fix.type === 'selector_repair'
    );

    if (!failedFix) {
      console.log('⚠️ No se encontró una reparación de selector para aprender del fallo.');
      return;
    }

    const failureKey = `${analysis.testName}-${failedFix.elementName}`;
    const existingRecord = this.failedRepairsDB.get(failureKey);

    if (existingRecord) {
      // Incrementar contador de intentos
      existingRecord.attempts += 1;
      existingRecord.failedAt = new Date();
      console.log(`📈 Incrementando contador de fallos para ${failedFix.elementName}: ${existingRecord.attempts} intentos`);
    } else {
      // Crear nuevo registro de fallo
      const failedRecord: FailedRepairRecord = {
        testName: analysis.testName,
        failureContext: analysis.errorMessage,
        failedRepair: {
          repairType: 'selector_replacement',
          attemptedFix: failedFix.description,
          elementName: failedFix.elementName,
          originalSelector: failedFix.originalSelector,
          newSelector: failedFix.newSelector,
        },
        url: this.extractUrlFromTestName(analysis.testName), // Método auxiliar
        failedAt: new Date(),
        attempts: 1,
      };

      this.failedRepairsDB.set(failureKey, failedRecord);
      console.log(`📝 Registrando nueva reparación fallida para ${failedFix.elementName}`);
    }

    // IMPORTANTE: También guardar en ChromaDB para memoria a largo plazo
    const memoryRecord: MemoryRecord = {
      testName: analysis.testName,
      failureContext: `REPARACIÓN FALLIDA: ${analysis.errorMessage}`,
      repairedSelector: {
        originalSelector: failedFix.originalSelector,
        newSelector: `FALLIDO: ${failedFix.newSelector}`,
        elementName: failedFix.elementName,
      },
      url: this.extractUrlFromTestName(analysis.testName),
    };

    await this.memoryService.saveSuccessfulRepair(memoryRecord);
    await this.saveKnowledge();

    console.log('✅ Reparación fallida registrada en memoria local y ChromaDB');
  }

  // --- NUEVOS MÉTODOS AUXILIARES ---

  /**
   * Obtiene todas las reparaciones fallidas conocidas para un elemento específico
   */
  private getFailedRepairsForElement(url: string, elementName: string): FailedRepairRecord[] {
    return Array.from(this.failedRepairsDB.values()).filter(
      record => record.url === url && record.failedRepair.elementName === elementName
    );
  }

  /**
   * Remueve una reparación de la lista de fallidas (porque ahora funcionó)
   */
  private removeFromFailedRepairs(url: string, elementName: string, selector: string): void {
    const key = Array.from(this.failedRepairsDB.keys()).find(k => {
      const record = this.failedRepairsDB.get(k);
      return record?.url === url &&
             record.failedRepair.elementName === elementName &&
             record.failedRepair.newSelector === selector;
    });

    if (key) {
      this.failedRepairsDB.delete(key);
      console.log(`🎉 Removiendo reparación de lista de fallidas: ${elementName} -> ${selector}`);
    }
  }

  /**
   * Extrae URL del nombre del test (método auxiliar simple)
   */
  private extractUrlFromTestName(testName: string): string {
    // Implementación simple - en producción esto podría ser más sofisticado
    return 'unknown-url'; // Por ahora, hasta que tengamos un mecanismo mejor
  }

  // --- Métodos Privados Existentes (sin cambios) ---

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
    const failedRepairsPath = path.join(this.knowledgeBasePath, 'failed-repairs.json'); // NUEVO archivo

    try {
      // Cargar selectores existentes
      await fs.access(selectorsPath);
      const data = await fs.readFile(selectorsPath, 'utf8');
      this.selectorsDB = new Map(Object.entries(JSON.parse(data)));
    } catch (error) {
      console.log('No se pudo cargar la base de conocimiento de selectores, iniciando desde cero.');
      this.selectorsDB = new Map();
    }

    try {
      // NUEVO: Cargar reparaciones fallidas
      await fs.access(failedRepairsPath);
      const failedData = await fs.readFile(failedRepairsPath, 'utf8');
      this.failedRepairsDB = new Map(Object.entries(JSON.parse(failedData)));
    } catch (error) {
      console.log('No se pudo cargar la base de reparaciones fallidas, iniciando desde cero.');
      this.failedRepairsDB = new Map();
    }
  }

  private async saveKnowledge(): Promise<void> {
    try {
      await fs.mkdir(this.knowledgeBasePath, { recursive: true });

      // Guardar selectores
      const selectorsObj = Object.fromEntries(this.selectorsDB);
      await fs.writeFile(
        path.join(this.knowledgeBasePath, 'selectors.json'),
        JSON.stringify(selectorsObj, null, 2),
      );

      // NUEVO: Guardar reparaciones fallidas
      const failedRepairsObj = Object.fromEntries(this.failedRepairsDB);
      await fs.writeFile(
        path.join(this.knowledgeBasePath, 'failed-repairs.json'),
        JSON.stringify(failedRepairsObj, null, 2),
      );
    } catch (e) {
      console.error("Error al guardar la base de conocimiento:", e);
    }
  }
}
