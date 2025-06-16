// orchestrator/learning-system.ts
import * as fs from 'fs';
import * as path from 'path';

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
  failureAnalysis?: any; // Guardará el objeto completo de FailureAnalysis
  environment: {
    browser: string;
    viewport: string;
    url: string;
  };
}

export class LearningSystem {
  private knowledgeBasePath = './knowledge-base';
  private selectorsDB: Map<string, LearnedSelector> = new Map();
  private executionHistory: TestExecutionHistory[] = [];

  constructor() {
    this.loadKnowledge();
  }

  /**
   * Aprende de una ejecución exitosa
   */
  async learnFromSuccess(testName: string, aiAssets: any, pageUrl: string) {
    console.log('🧠 Aprendiendo de ejecución exitosa...');

    // Guardar selectores que funcionaron
    for (const locator of aiAssets.pageObject.locators) {
      const key = `${pageUrl}-${locator.name}`;
      const existing = this.selectorsDB.get(key) || this.createNewEntry(pageUrl, locator.name);

      // Actualizar selectores exitosos
      for (const selector of locator.selectors) {
        const selectorString = this.selectorToString(selector);
        if (!existing.workingSelectors.includes(selectorString)) {
          existing.workingSelectors.push(selectorString);
        }
      }

      existing.successRate = this.calculateSuccessRate(existing);
      existing.lastUpdated = new Date();

      this.selectorsDB.set(key, existing);
    }

    this.saveKnowledge();
  }

  /**
   * Aprende de una ejecución fallida
   */
  async learnFromFailure(testName: string, analysis: any, aiAssets: any, pageUrl: string) {
    console.log('🧠 Aprendiendo del análisis de fallo...');

    // Extraer el nombre del elemento desde el paso fallido (ej. "clickLoginButton" -> "loginButton")
    const locatorNameMatch = analysis.failedStep.match(/^(?:click|fill|waitFor|assert|check|select|clear|get|is)(\w+)/i);

    if (locatorNameMatch && locatorNameMatch[1] && analysis.failureType === 'selector') {
      const elementName = locatorNameMatch[1].charAt(0).toLowerCase() + locatorNameMatch[1].slice(1);
      const elementDescription = elementName.replace(/([A-Z])/g, ' $1').trim();
      const key = `${pageUrl}-${elementName}`;

      const existing = this.selectorsDB.get(key) || this.createNewEntry(pageUrl, elementName);

      const locatorData = aiAssets.pageObject.locators.find((loc: any) => loc.name === elementName);

      if (locatorData) {
        const failedSelectors = locatorData.selectors.map((s: any) => this.selectorToString(s));
        // Añadir solo los selectores que no hayan sido marcados como fallidos antes
        failedSelectors.forEach((selectorStr: string) => {
            if (!existing.failedSelectors.includes(selectorStr)) {
                existing.failedSelectors.push(selectorStr);
            }
        });

        existing.successRate = this.calculateSuccessRate(existing);
        existing.lastUpdated = new Date();
        this.selectorsDB.set(key, existing);
        console.log(`📚 Conocimiento actualizado para el elemento fallido: ${elementDescription}`);
      }
    }

    // Guardar historial de ejecución con el análisis completo
    this.executionHistory.push({
      testName,
      timestamp: new Date(),
      success: false,
      duration: 0,
      failureAnalysis: analysis, // <-- MEJORA: Se guarda el objeto completo
      environment: this.captureEnvironment(pageUrl)
    });

    this.saveKnowledge();
  }

  /**
   * Mejora los assets de IA basándose en el conocimiento previo
   */
  enhanceAIAssets(aiAssets: any, pageUrl: string): any {
    console.log('✨ Mejorando assets con conocimiento previo...');

    const enhanced = JSON.parse(JSON.stringify(aiAssets)); // Deep clone

    for (const locator of enhanced.pageObject.locators) {
      const key = `${pageUrl}-${locator.name}`;
      const knowledge = this.selectorsDB.get(key);

      if (knowledge) {
        // Reordenar selectores poniendo los exitosos primero
        const successfulSelectors = knowledge.workingSelectors.map(s =>
          this.stringToSelector(s)
        );

        // Combinar con selectores nuevos (por si hay cambios)
        const combinedSelectors = [
          ...successfulSelectors,
          ...locator.selectors.filter((s: any) =>
            !knowledge.failedSelectors.includes(this.selectorToString(s))
          )
        ];

        locator.selectors = combinedSelectors.slice(0, 5); // Máximo 5 selectores

        // Añadir metadata
        locator.metadata = {
          confidence: knowledge.successRate,
          lastSuccess: knowledge.lastUpdated,
          enhanced: true
        };
      }
    }

    return enhanced;
  }

  /**
   * Genera reporte de aprendizaje
   */
  generateLearningReport(): any {
    const report = {
      totalTests: this.executionHistory.length,
      successRate: this.calculateOverallSuccessRate(),
      mostReliableSelectors: this.getMostReliableSelectors(),
      problematicElements: this.getProblematicElements(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Sugiere mejoras basadas en el historial
   */
  suggestImprovements(testCase: any): string[] {
    const suggestions: string[] = [];
    const url = testCase.path;

    // Buscar patrones de fallo
    const failures = this.executionHistory.filter(h =>
      h.environment.url.includes(url) && !h.success
    );

    if (failures.length > 0) {
      // Analizar horarios de fallo
      const failuresByHour = this.groupFailuresByHour(failures);
      if (this.hasTimePattern(failuresByHour)) {
        suggestions.push('⏰ Los tests fallan más frecuentemente en ciertos horarios. Considera ajustar los timeouts o verificar la carga del servidor.');
      }

      // Analizar elementos problemáticos
      const problematicElements = this.getProblematicElements();
      problematicElements.forEach(element => {
        suggestions.push(`🎯 El elemento "${element.name}" tiene baja tasa de éxito (${element.successRate}%). Considera usar selectores más específicos o data-testid.`);
      });
    }

    return suggestions;
  }

  // Métodos privados de utilidad
  private createNewEntry(url: string, elementName: string): LearnedSelector {
    return {
      url,
      elementDescription: elementName,
      workingSelectors: [],
      failedSelectors: [],
      lastUpdated: new Date(),
      successRate: 0
    };
  }

  private selectorToString(selector: any): string {
    return `${selector.type}:${selector.value}`;
  }

  private stringToSelector(str: string): any {
    const [type, ...valueParts] = str.split(':');
    return { type, value: valueParts.join(':') };
  }

  private calculateSuccessRate(entry: LearnedSelector): number {
    const total = entry.workingSelectors.length + entry.failedSelectors.length;
    return total > 0 ? (entry.workingSelectors.length / total) * 100 : 0;
  }

  private calculateOverallSuccessRate(): number {
    const successful = this.executionHistory.filter(h => h.success).length;
    return this.executionHistory.length > 0
      ? (successful / this.executionHistory.length) * 100
      : 0;
  }

  private getMostReliableSelectors(): any[] {
    return Array.from(this.selectorsDB.values())
      .filter(s => s.successRate > 90)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);
  }

  private getProblematicElements(): any[] {
    return Array.from(this.selectorsDB.values())
      .filter(s => s.successRate < 50)
      .map(s => ({
        name: s.elementDescription,
        successRate: s.successRate,
        url: s.url
      }));
  }



  private captureEnvironment(url: string): any {
    return {
      browser: process.env.BROWSER || 'chromium',
      viewport: '1280x720',
      url: url,
    };
  }

  private groupFailuresByHour(failures: TestExecutionHistory[]): Map<number, number> {
    const byHour = new Map<number, number>();
    failures.forEach(f => {
      const hour = f.timestamp.getHours();
      byHour.set(hour, (byHour.get(hour) || 0) + 1);
    });
    return byHour;
  }

  private hasTimePattern(failuresByHour: Map<number, number>): boolean {
    // Detectar si hay patrones temporales significativos
    const values = Array.from(failuresByHour.values());
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return values.some(v => v > avg * 2);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Basadas en datos reales
    if (this.calculateOverallSuccessRate() < 80) {
      recommendations.push('La tasa de éxito general es baja. Considera revisar la estabilidad de los selectores.');
    }

    const problematic = this.getProblematicElements();
    if (problematic.length > 5) {
      recommendations.push('Hay muchos elementos problemáticos. Considera añadir data-testid a los elementos críticos.');
    }

    return recommendations;
  }

  // Persistencia
  private loadKnowledge(): void {
    try {
      if (fs.existsSync(this.knowledgeBasePath)) {
        const data = fs.readFileSync(path.join(this.knowledgeBasePath, 'selectors.json'), 'utf8');
        const parsed = JSON.parse(data);
        this.selectorsDB = new Map(Object.entries(parsed));

        const historyData = fs.readFileSync(path.join(this.knowledgeBasePath, 'history.json'), 'utf8');
        this.executionHistory = JSON.parse(historyData);
      }
    } catch (error) {
      console.log('No se pudo cargar conocimiento previo, iniciando fresh');
    }
  }

  private saveKnowledge(): void {
    if (!fs.existsSync(this.knowledgeBasePath)) {
      fs.mkdirSync(this.knowledgeBasePath, { recursive: true });
    }

    // Guardar selectores
    const selectorsObj = Object.fromEntries(this.selectorsDB);
    fs.writeFileSync(
      path.join(this.knowledgeBasePath, 'selectors.json'),
      JSON.stringify(selectorsObj, null, 2)
    );

    // Guardar historial
    fs.writeFileSync(
      path.join(this.knowledgeBasePath, 'history.json'),
      JSON.stringify(this.executionHistory, null, 2)
    );

    // Generar reporte
    const report = this.generateLearningReport();
    fs.writeFileSync(
      path.join(this.knowledgeBasePath, 'learning-report.json'),
      JSON.stringify(report, null, 2)
    );
  }
}
