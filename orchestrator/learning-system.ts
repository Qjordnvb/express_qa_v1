// orchestrator/learning-system.ts
import * as fs from 'fs';
import * as path from 'path';
import { AIAsserts, FailureAnalysis, Locator } from './failure-analyzer';

interface LearnedSelector {
  url: string;
  elementDescription: string;
  workingSelectors: string[];
  failedSelectors: string[];
  lastUpdated: Date;
  successRate: number;
}

interface TestExecutionHistory {
  testName: string;
  timestamp: Date;
  success: boolean;
  duration: number;
  failureAnalysis?: FailureAnalysis;
  environment: {
    browser: string;
    viewport: string;
    url: string;
  };
}

interface Selector {
  type: string;
  value: string;
  options?: Record<string, unknown>;
}

export class LearningSystem {
  private knowledgeBasePath = path.resolve(__dirname, '../knowledge-base');
  private selectorsDB: Map<string, LearnedSelector> = new Map();
  private executionHistory: TestExecutionHistory[] = [];

  constructor() {
    this.loadKnowledge();
  }

  enhanceAIAssets(aiAssets: AIAsserts, pageUrl: string): AIAsserts {
    console.log('✨ Mejorando assets con conocimiento previo (Lógica de Autoridad)...');
    const enhanced: AIAsserts = JSON.parse(JSON.stringify(aiAssets));

    for (const locator of enhanced.pageObject.locators) {
      const key = `${pageUrl}-${locator.name}`;
      const knowledge = this.selectorsDB.get(key);

      if (knowledge && knowledge.workingSelectors.length > 0) {
        console.log(
          `🧠 Aplicando conocimiento para "${locator.name}". Los selectores que han funcionado se priorizarán.`,
        );
        const knownGoodSelectors = knowledge.workingSelectors.map((s) => this.stringToSelector(s));
        const knownBadSelectors = new Set(knowledge.failedSelectors);

        const candidateSelectors = locator.selectors.filter(
          (s: Selector) => !knownBadSelectors.has(this.selectorToString(s)),
        );

        const finalSelectors = [...knownGoodSelectors, ...candidateSelectors];

        locator.selectors = [
          ...new Map(finalSelectors.map((item) => [this.selectorToString(item), item])).values(),
        ].slice(0, 5);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (locator as any).metadata = {
          enhanced: true,
          confidence: knowledge.successRate,
          lastSuccess: knowledge.lastUpdated,
        };
      }
    }
    return enhanced;
  }

  async learnFromSuccess(testName: string, aiAssets: AIAsserts, pageUrl: string): Promise<void> {
    console.log('🧠 Aprendiendo de ejecución exitosa...');
    for (const locator of aiAssets.pageObject.locators) {
      const key = `${pageUrl}-${locator.name}`;
      const existing = this.selectorsDB.get(key) || this.createNewEntry(pageUrl, locator.name);

      if (locator.selectors.length > 0) {
        const winningSelector = this.selectorToString(locator.selectors[0]);

        if (!existing.workingSelectors.includes(winningSelector)) {
          existing.workingSelectors.unshift(winningSelector);
        }

        const indexInFailed = existing.failedSelectors.indexOf(winningSelector);
        if (indexInFailed > -1) {
          existing.failedSelectors.splice(indexInFailed, 1);
        }
      }
      existing.successRate = this.calculateSuccessRate(existing);
      existing.lastUpdated = new Date();
      this.selectorsDB.set(key, existing);
    }

    this.executionHistory.push({
      testName,
      timestamp: new Date(),
      success: true,
      duration: 0, // Se puede añadir en el futuro
      environment: this.captureEnvironment(pageUrl),
    });

    this.saveKnowledge();
  }

  async learnFromFailure(
    testName: string,
    analysis: FailureAnalysis,
    aiAssets: AIAsserts,
    pageUrl: string,
  ): Promise<void> {
    console.log('🧠 Registrando fallo en la base de conocimiento...');
    const locatorNameMatch = analysis.failedStep.match(
      /^(?:click|fill|waitFor|assert|check|select|clear|get|is)(\w+)/i,
    );

    if (locatorNameMatch && locatorNameMatch[1]) {
      const elementName =
        locatorNameMatch[1].charAt(0).toLowerCase() + locatorNameMatch[1].slice(1);
      const key = `${pageUrl}-${elementName}`;
      const existing = this.selectorsDB.get(key) || this.createNewEntry(pageUrl, elementName);
      const locatorData = aiAssets.pageObject.locators.find(
        (loc: Locator) => loc.name === elementName,
      );

      if (locatorData && locatorData.selectors.length > 0) {
        const failedSelector = this.selectorToString(locatorData.selectors[0]);
        if (!existing.failedSelectors.includes(failedSelector)) {
          existing.failedSelectors.push(failedSelector);
          console.log(`🔴 Registrando selector fallido para "${elementName}": ${failedSelector}`);
        }
      }
      existing.successRate = this.calculateSuccessRate(existing);
      existing.lastUpdated = new Date();
      this.selectorsDB.set(key, existing);
    }
    this.executionHistory.push({
      testName,
      timestamp: new Date(),
      success: false,
      duration: 0,
      failureAnalysis: analysis,
      environment: this.captureEnvironment(pageUrl),
    });
    this.saveKnowledge();
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
    const [type, valueAndOptions] = str.split(/:(.*)/s);
    try {
      const parsed = JSON.parse(valueAndOptions);
      if (parsed.value && parsed.options) {
        return { type, value: parsed.value, options: parsed.options };
      }
    } catch (e) {
      // No es un objeto JSON complejo, es un valor simple
    }
    return { type, value: valueAndOptions };
  }
  private calculateSuccessRate(entry: LearnedSelector): number {
    const total = entry.workingSelectors.length + entry.failedSelectors.length;
    return total > 0 ? (entry.workingSelectors.length / total) * 100 : 100;
  }
  private captureEnvironment(url: string): TestExecutionHistory['environment'] {
    return { browser: process.env.BROWSER || 'chromium', viewport: '1280x720', url: url };
  }

  private loadKnowledge(): void {
    try {
      const selectorsPath = path.join(this.knowledgeBasePath, 'selectors.json');
      if (fs.existsSync(selectorsPath)) {
        const data = fs.readFileSync(selectorsPath, 'utf8');
        this.selectorsDB = new Map(Object.entries(JSON.parse(data)));
      }
    } catch (error) {
      console.log('No se pudo cargar conocimiento previo, iniciando desde cero.');
      this.selectorsDB = new Map();
    }
  }

  private saveKnowledge(): void {
    if (!fs.existsSync(this.knowledgeBasePath)) {
      fs.mkdirSync(this.knowledgeBasePath, { recursive: true });
    }
    const selectorsObj = Object.fromEntries(this.selectorsDB);
    fs.writeFileSync(
      path.join(this.knowledgeBasePath, 'selectors.json'),
      JSON.stringify(selectorsObj, null, 2),
    );
  }
}
