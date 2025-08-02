// orchestrator/failure-analyzer.ts - SISTEMA DE APRENDIZAJE VERDADERAMENTE DINÁMICO
import * as fs from 'fs';
import * as path from 'path';
import { AIResponse, LocatorDefinition as Locator, Selector } from '../types/types';
import { getLlmService } from '../llm-services/llm-service';
import { AIFailureAnalysis } from '../llm-services/ILlmService';
import { MemoryRecord } from './MemoryService';

// Definir interfaces que antes estaban en otros archivos
export interface RealTimeContext {
  domSnapshot: string;
  accessibilityTree: any;
  interactiveElements: MCPElement[];
  eventLog: any[];
  consoleErrors: string[];
  networkErrors: any[];
  mcpConsoleMessages: any[];
  mcpNetworkRequests: any[];
  mcpSnapshot?: any; // ✅ Add MCP snapshot
  screenshot?: Buffer;
  pageInfo: {
    url: string;
    title: string;
    timestamp: string;
    loadTime?: number; // ✅ Add loadTime
  };
  playwrightContext: {
    viewportSize: any;
    userAgent: string;
  };
}

export interface MCPElement {
  role?: string; // ✅ Make role optional
  name?: string;
  disabled?: boolean;
  element?: string;
  type?: string; // ✅ Add type
  text?: string; // ✅ Add text
  ref?: string;  // ✅ Add MCP reference
  attributes?: any; // ✅ Add attributes
  selectors?: any;  // ✅ Add selectors
  boundingBox?: any; // ✅ Add boundingBox
}

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
    }
  | {
      type: 'intelligent_mcp_repair';
      description: string;
      elementName: string;
      discoveredElement: MCPElement;
      generatedSelectors: Selector[];
      learningPattern: ElementPattern;
      confidence: number;
      repaired: boolean;
    };

export interface FailureAnalysis {
  testName: string;
  failureType: 'selector' | 'timing' | 'validation' | 'navigation' | 'unknown';
  failedStep: string;
  errorMessage: string;
  suggestedFixes: SuggestedFix[];
  augmentedPrompt?: string;
  aiDiagnosis?: AIFailureAnalysis | null;
}

// ========== NUEVO: SISTEMA DE PATRONES DE APRENDIZAJE ==========
interface ElementPattern {
  elementFunction: string;        // 'search', 'login', 'submit', etc.
  expectedRoles: string[];        // roles ARIA que típicamente tiene esta función
  commonAttributes: string[];     // atributos comunes para esta función
  namingPatterns: RegExp[];       // patrones en los nombres de elementos
  contextClues: string[];         // pistas del contexto (elementos cercanos, etc.)
  successRate: number;            // qué tan exitoso ha sido este patrón
  lastUsed: Date;                 // cuándo se usó por última vez
  sites: string[];                // en qué sitios ha funcionado
}

interface DiscoveryResult {
  confidence: number;
  element: MCPElement;
  matchReason: string;
  generatedPattern: ElementPattern;
}

// ========== INTELIGENCIA DE APRENDIZAJE DINÁMICO ==========
class IntelligentMCPLearner {
  private knownPatterns: Map<string, ElementPattern> = new Map();
  private discoveryStrategies = [
    this.discoverBySemanticFunction.bind(this),
    this.discoverByNamingConvention.bind(this),
    this.discoverByContextualClues.bind(this),
    this.discoverByInteractionHistory.bind(this)
  ];

  constructor() {
    this.loadKnownPatterns();
  }

  /**
   * NÚCLEO: Descubre automáticamente qué elemento MCP corresponde al elemento fallido
   */
  async discoverElementIntelligently(
    failedElementName: string,
    failedAction: string,
    mcpElements: MCPElement[],
    pageContext: RealTimeContext
  ): Promise<DiscoveryResult | null> {
    console.log(`[INTELLIGENT-MCP] 🧠 Iniciando descubrimiento inteligente para: ${failedElementName}`);
    console.log(`[INTELLIGENT-MCP] 📊 Analizando ${mcpElements.length} elementos MCP disponibles`);

    const discoveries: DiscoveryResult[] = [];

    // Ejecutar todas las estrategias de descubrimiento
    for (const strategy of this.discoveryStrategies) {
      try {
        const result = await strategy(failedElementName, failedAction, mcpElements, pageContext);
        if (result) {
          discoveries.push(result);
          console.log(`[INTELLIGENT-MCP] 💡 Estrategia encontró: ${result.element.role} "${result.element.name}" (confianza: ${result.confidence})`);
        }
      } catch (error) {
        console.warn(`[INTELLIGENT-MCP] ⚠️ Estrategia falló:`, error);
      }
    }

    if (discoveries.length === 0) {
      console.log(`[INTELLIGENT-MCP] ❌ No se encontraron elementos candidatos`);
      return null;
    }

    // Seleccionar el mejor descubrimiento
    const bestDiscovery = discoveries.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    console.log(`[INTELLIGENT-MCP] ✨ Mejor descubrimiento: ${bestDiscovery.element.role} "${bestDiscovery.element.name}"`);
    console.log(`[INTELLIGENT-MCP] 🎯 Razón: ${bestDiscovery.matchReason}`);
    console.log(`[INTELLIGENT-MCP] 📈 Confianza: ${bestDiscovery.confidence}%`);

    // Aprender del descubrimiento exitoso
    await this.learnFromDiscovery(failedElementName, bestDiscovery);

    return bestDiscovery;
  }

  /**
   * ESTRATEGIA 1: Descubrimiento por función semántica
   */
  private async discoverBySemanticFunction(
    elementName: string,
    action: string,
    mcpElements: MCPElement[],
    context: RealTimeContext
  ): Promise<DiscoveryResult | null> {

    // Inferir función del elemento basado en nombre y acción
    const inferredFunction = this.inferElementFunction(elementName, action);
    console.log(`[INTELLIGENT-MCP] 🔍 Función inferida: ${inferredFunction}`);

    // Buscar patrones conocidos para esta función
    const knownPattern = this.knownPatterns.get(inferredFunction);
    let expectedRoles: string[] = [];

    if (knownPattern) {
      expectedRoles = knownPattern.expectedRoles;
      console.log(`[INTELLIGENT-MCP] 📚 Usando patrón conocido: ${expectedRoles.join(', ')}`);
    } else {
      // Inferir roles esperados para funciones comunes
      expectedRoles = this.inferExpectedRoles(inferredFunction);
      console.log(`[INTELLIGENT-MCP] 🤔 Infiriendo roles: ${expectedRoles.join(', ')}`);
    }

    // Buscar elementos que coincidan con los roles esperados
    const candidates = mcpElements.filter(el =>
      expectedRoles.some(role => el.role?.toLowerCase().includes(role.toLowerCase()))
    );

    if (candidates.length === 0) return null;

    // Evaluar candidatos y seleccionar el mejor
    const scoredCandidates = candidates.map(candidate => ({
      element: candidate,
      score: this.calculateSemanticScore(candidate, inferredFunction, knownPattern),
      function: inferredFunction
    }));

    const bestCandidate = scoredCandidates.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    if (bestCandidate.score < 0.3) return null; // Umbral mínimo de confianza

    return {
      confidence: Math.min(bestCandidate.score * 100, 95),
      element: bestCandidate.element,
      matchReason: `Función semántica: ${inferredFunction} → role: ${bestCandidate.element.role}`,
      generatedPattern: this.generatePattern(inferredFunction, bestCandidate.element, context)
    };
  }

  /**
   * ESTRATEGIA 2: Descubrimiento por convenciones de nombres
   */
  private async discoverByNamingConvention(
    elementName: string,
    action: string,
    mcpElements: MCPElement[],
    context: RealTimeContext
  ): Promise<DiscoveryResult | null> {

    const elementWords = this.extractSemanticWords(elementName);
    console.log(`[INTELLIGENT-MCP] 🏷️ Palabras clave extraídas: ${elementWords.join(', ')}`);

    const candidates = mcpElements.filter(el => {
      if (!el.name || el.name === 'Sin nombre') return false;

      const elementNameWords = this.extractSemanticWords(el.name);
      return this.calculateWordSimilarity(elementWords, elementNameWords) > 0.3;
    });

    if (candidates.length === 0) return null;

    const bestMatch = candidates.reduce((best, current) => {
      const currentSimilarity = this.calculateWordSimilarity(
        elementWords,
        this.extractSemanticWords(current.name || '')
      );
      const bestSimilarity = this.calculateWordSimilarity(
        elementWords,
        this.extractSemanticWords(best.name || '')
      );

      return currentSimilarity > bestSimilarity ? current : best;
    });

    const similarity = this.calculateWordSimilarity(
      elementWords,
      this.extractSemanticWords(bestMatch.name || '')
    );

    return {
      confidence: Math.min(similarity * 100, 90),
      element: bestMatch,
      matchReason: `Similitud de nombres: "${elementName}" ≈ "${bestMatch.name}"`,
      generatedPattern: this.generatePattern(this.inferElementFunction(elementName, action), bestMatch, context)
    };
  }

  /**
   * ESTRATEGIA 3: Descubrimiento por pistas contextuales
   */
  private async discoverByContextualClues(
    elementName: string,
    action: string,
    mcpElements: MCPElement[],
    context: RealTimeContext
  ): Promise<DiscoveryResult | null> {

    // Buscar elementos únicos o prominentes que podrían ser el objetivo
    const prominentElements = mcpElements.filter(el => {
      // Elemento tiene nombre descriptivo y no está deshabilitado
      return el.name &&
             el.name !== 'Sin nombre' &&
             el.name.length > 2 &&
             !el.disabled;
    });

    if (prominentElements.length === 0) return null;

    // Para elementos de búsqueda, priorizar elementos con palabras clave
    const searchKeywords = ['search', 'buscar', 'find', 'lookup', 'query'];
    const searchElements = prominentElements.filter(el =>
      searchKeywords.some(keyword =>
        el.name?.toLowerCase().includes(keyword) ||
        el.role?.toLowerCase().includes(keyword)
      )
    );

    if (elementName.toLowerCase().includes('search') && searchElements.length > 0) {
      const bestSearch = searchElements[0]; // El primero suele ser el principal

      return {
        confidence: 85,
        element: bestSearch,
        matchReason: `Contexto de búsqueda: elemento con keywords de búsqueda`,
        generatedPattern: this.generatePattern('search', bestSearch, context)
      };
    }

    // Para botones principales, buscar elementos con roles button prominentes
    if (action.toLowerCase().includes('click')) {
      const primaryButtons = prominentElements.filter(el =>
        el.role === 'button' &&
        el.name &&
        (el.name.length < 20) // Nombres de botón suelen ser cortos
      );

      if (primaryButtons.length > 0) {
        return {
          confidence: 70,
          element: primaryButtons[0],
          matchReason: `Contexto de acción: botón prominente para acción click`,
          generatedPattern: this.generatePattern('click', primaryButtons[0], context)
        };
      }
    }

    return null;
  }

  /**
   * ESTRATEGIA 4: Descubrimiento por historial de interacciones
   */
  private async discoverByInteractionHistory(
    elementName: string,
    action: string,
    mcpElements: MCPElement[],
    context: RealTimeContext
  ): Promise<DiscoveryResult | null> {

    // Esta estrategia usa patrones exitosos del pasado
    const elementFunction = this.inferElementFunction(elementName, action);
    const historicalPattern = this.knownPatterns.get(elementFunction);

    if (!historicalPattern) return null;

    // Buscar elementos que coincidan con patrones históricos exitosos
    const historicalMatches = mcpElements.filter(el => {
      // Coincide con roles históricos exitosos
      if (historicalPattern.expectedRoles.includes(el.role || '')) return true;

      // Coincide con patrones de nombres exitosos
      if (el.name && historicalPattern.namingPatterns.some(pattern => pattern.test(el.name!))) return true;

      return false;
    });

    if (historicalMatches.length === 0) return null;

    const bestHistoricalMatch = historicalMatches[0]; // El primero que coincida con éxito histórico

    return {
      confidence: Math.min(historicalPattern.successRate, 85),
      element: bestHistoricalMatch,
      matchReason: `Historial exitoso: patrón similar funcionó en ${historicalPattern.sites.length} sitios`,
      generatedPattern: historicalPattern
    };
  }

  /**
   * Genera selectores Playwright dinámicamente basados en el elemento descubierto
   */
  generateDynamicSelectors(discoveredElement: MCPElement): Selector[] {
    const selectors: Selector[] = [];

    console.log(`[INTELLIGENT-MCP] 🔧 Generando selectores dinámicos para:`);
    console.log(`[INTELLIGENT-MCP]   Role: ${discoveredElement.role}`);
    console.log(`[INTELLIGENT-MCP]   Name: "${discoveredElement.name}"`);
    console.log(`[INTELLIGENT-MCP]   Disabled: ${discoveredElement.disabled}`);

    // 1. Selector más específico: role + name exacto
    if (discoveredElement.name && discoveredElement.name !== 'Sin nombre' && discoveredElement.role) {
      selectors.push({
        type: 'getByRole',
        value: discoveredElement.role,
        options: { name: discoveredElement.name }
      });
      console.log(`[INTELLIGENT-MCP] ✨ Generado: getByRole('${discoveredElement.role}', { name: '${discoveredElement.name}' })`);
    }

    // 2. Selector de rol solo (más permisivo)
    if (discoveredElement.role) {
      selectors.push({
        type: 'getByRole',
        value: discoveredElement.role
      });
      console.log(`[INTELLIGENT-MCP] ✨ Generado: getByRole('${discoveredElement.role}')`);
    }

    // 3. Selectores específicos por tipo
    if (discoveredElement.name && discoveredElement.name !== 'Sin nombre' && discoveredElement.role) {
      // Para elementos con texto visible
      if (['button', 'link'].includes(discoveredElement.role)) {
        selectors.push({
          type: 'getByText',
          value: discoveredElement.name
        });
        console.log(`[INTELLIGENT-MCP] ✨ Generado: getByText('${discoveredElement.name}')`);
      }

      // Para inputs con labels
      if (['textbox', 'combobox'].includes(discoveredElement.role)) {
        selectors.push({
          type: 'getByLabel',
          value: discoveredElement.name
        });
        console.log(`[INTELLIGENT-MCP] ✨ Generado: getByLabel('${discoveredElement.name}')`);

        selectors.push({
          type: 'getByPlaceholder',
          value: discoveredElement.name
        });
        console.log(`[INTELLIGENT-MCP] ✨ Generado: getByPlaceholder('${discoveredElement.name}')`);
      }
    }

    // 4. Fallback CSS genérico por role
    const cssMap: Record<string, string> = {
      'button': 'button, input[type="submit"], input[type="button"]',
      'textbox': 'input[type="text"], input[type="search"], input:not([type]), textarea',
      'search': 'input[type="search"], [role="search"] input, [role="searchbox"]',
      'combobox': 'select, input[list], [role="combobox"]',
      'link': 'a, [role="link"]',
      'checkbox': 'input[type="checkbox"]'
    };

    const css = discoveredElement.role ? cssMap[discoveredElement.role] : undefined;
    if (css) {
      selectors.push({
        type: 'css',
        value: css
      });
      console.log(`[INTELLIGENT-MCP] ✨ Generado: css('${css}')`);
    }

    console.log(`[INTELLIGENT-MCP] 🎯 Total selectores generados: ${selectors.length}`);
    return selectors;
  }

  // ========== MÉTODOS DE APRENDIZAJE ==========

  /**
   * Aprende de un descubrimiento exitoso
   */
  private async learnFromDiscovery(elementName: string, discovery: DiscoveryResult): Promise<void> {
    const functionName = this.inferElementFunction(elementName, '');

    console.log(`[INTELLIGENT-MCP] 📚 Aprendiendo patrón: ${functionName}`);

    // Actualizar o crear patrón
    const existingPattern = this.knownPatterns.get(functionName);

    if (existingPattern) {
      // Actualizar patrón existente
      existingPattern.expectedRoles = [...new Set([...existingPattern.expectedRoles, discovery.element.role].filter((role): role is string => Boolean(role)))];
      existingPattern.successRate = Math.min(existingPattern.successRate + 0.1, 1.0);
      existingPattern.lastUsed = new Date();
      console.log(`[INTELLIGENT-MCP] 📈 Patrón actualizado: éxito rate ${existingPattern.successRate}`);
    } else {
      // Crear nuevo patrón
      this.knownPatterns.set(functionName, discovery.generatedPattern);
      console.log(`[INTELLIGENT-MCP] 🆕 Nuevo patrón creado para: ${functionName}`);
    }

    // Persistir conocimiento
    await this.saveKnownPatterns();
  }

  /**
   * Genera un nuevo patrón de elemento
   */
  private generatePattern(functionName: string, element: MCPElement, context: RealTimeContext): ElementPattern {
    return {
      elementFunction: functionName,
      expectedRoles: element.role ? [element.role] : [],
      commonAttributes: [],
      namingPatterns: element.name ? [new RegExp(element.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')] : [],
      contextClues: [],
      successRate: 0.8, // Confianza inicial alta
      lastUsed: new Date(),
      sites: [context.pageInfo.url]
    };
  }

  // ========== MÉTODOS AUXILIARES ==========

  private inferElementFunction(elementName: string, action: string): string {
    const combined = (elementName + action).toLowerCase();

    // Mapeo inteligente de funciones
    if (combined.includes('search') || combined.includes('find')) return 'search';
    if (combined.includes('login') || combined.includes('signin')) return 'login';
    if (combined.includes('submit') || combined.includes('send')) return 'submit';
    if (combined.includes('email')) return 'email';
    if (combined.includes('password')) return 'password';
    if (combined.includes('button') || combined.includes('click')) return 'click';
    if (combined.includes('input') || combined.includes('fill')) return 'input';
    if (combined.includes('select') || combined.includes('choose')) return 'select';
    if (combined.includes('check') || combined.includes('toggle')) return 'check';

    return 'generic';
  }

  private inferExpectedRoles(functionName: string): string[] {
    const roleMap: Record<string, string[]> = {
      'search': ['search', 'searchbox', 'textbox', 'combobox'],
      'login': ['button', 'link'],
      'submit': ['button'],
      'email': ['textbox'],
      'password': ['textbox'],
      'click': ['button', 'link'],
      'input': ['textbox', 'combobox'],
      'select': ['combobox', 'listbox'],
      'check': ['checkbox'],
      'generic': ['button', 'textbox', 'link']
    };

    return roleMap[functionName] || roleMap['generic'];
  }

  private calculateSemanticScore(element: MCPElement, functionName: string, knownPattern?: ElementPattern): number {
    let score = 0;

    // Base score por role esperado
    const expectedRoles = knownPattern?.expectedRoles || this.inferExpectedRoles(functionName);
    if (element.role && expectedRoles.includes(element.role)) score += 0.4;

    // Score por calidad del nombre
    if (element.name && element.name !== 'Sin nombre') {
      score += 0.3;
      if (element.name.length > 2 && element.name.length < 50) score += 0.1;
    }

    // Penalizar elementos deshabilitados
    if (element.disabled) score -= 0.2;

    // Bonus por patrones conocidos exitosos
    if (knownPattern && knownPattern.successRate > 0.7) score += 0.2;

    return Math.max(0, Math.min(1, score));
  }

  private extractSemanticWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
      .split(/[\s\-_.,;:()[\]{}]+/)
      .filter(word => word.length > 1)
      .filter(word => !['input', 'button', 'field', 'element'].includes(word)); // Filtrar palabras genéricas
  }

  private calculateWordSimilarity(words1: string[], words2: string[]): number {
    if (words1.length === 0 || words2.length === 0) return 0;

    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return intersection.length / union.length;
  }

  // ========== PERSISTENCIA ==========

  private async loadKnownPatterns(): Promise<void> {
    try {
      const patternsPath = path.resolve(__dirname, '../knowledge-base/intelligent-patterns.json');
      const data = await fs.promises.readFile(patternsPath, 'utf8');
      const patternsObj = JSON.parse(data);

      // Convertir fechas y regex
      this.knownPatterns = new Map(Object.entries(patternsObj).map(([key, pattern]: [string, any]) => [
        key,
        {
          ...pattern,
          lastUsed: new Date(pattern.lastUsed),
          namingPatterns: pattern.namingPatterns.map((p: string) => new RegExp(p, 'i'))
        }
      ]));

      console.log(`[INTELLIGENT-MCP] 📚 Cargados ${this.knownPatterns.size} patrones conocidos`);
    } catch (error) {
      console.log(`[INTELLIGENT-MCP] 🆕 Iniciando con patrones vacíos`);
      this.knownPatterns = new Map();
    }
  }

  private async saveKnownPatterns(): Promise<void> {
    try {
      const knowledgeDir = path.resolve(__dirname, '../knowledge-base');
      await fs.promises.mkdir(knowledgeDir, { recursive: true });

      const patternsObj = Object.fromEntries(
        Array.from(this.knownPatterns.entries()).map(([key, pattern]) => [
          key,
          {
            ...pattern,
            lastUsed: pattern.lastUsed.toISOString(),
            namingPatterns: pattern.namingPatterns.map(p => p.source)
          }
        ])
      );

      const patternsPath = path.join(knowledgeDir, 'intelligent-patterns.json');
      await fs.promises.writeFile(patternsPath, JSON.stringify(patternsObj, null, 2));

      console.log(`[INTELLIGENT-MCP] 💾 Patrones guardados: ${this.knownPatterns.size} elementos`);
    } catch (error) {
      console.error(`[INTELLIGENT-MCP] ❌ Error guardando patrones:`, error);
    }
  }
}

// ========== CLASE PRINCIPAL ACTUALIZADA ==========
export class FailureAnalyzer {
  private intelligentLearner = new IntelligentMCPLearner();

  public async analyzeFailure(
    testPath: string,
    rawResult: string,
    aiAssetsPath: string,
    pageUrl: string,
    realTimeContext: RealTimeContext | null,
    similarMemories: any[] | null,
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
      }
    } catch (e) {
      analysis.failedStep = this.extractFailedStep(rawResult, testPath);
    }

    analysis.failureType = this.categorizeFailure(analysis.errorMessage);

    // Prompt híper-enriquecido con MCP (mantener lógica existente)
    analysis.augmentedPrompt = this.buildHyperEnrichedPrompt(
      analysis.errorMessage,
      realTimeContext,
      similarMemories,
    );

    const llmService = getLlmService();
    const aiAnalysis = await llmService.getFailureAnalysisFromIA(analysis.augmentedPrompt);
    analysis.aiDiagnosis = aiAnalysis;

    if(aiAnalysis) {
        console.log(`ԛ Diagnóstico IA HÍPER-RICO - Causa Raíz: ${aiAnalysis.rootCause}`);
        console.log(`ԛ Diagnóstico IA HÍPER-RICO - Sugerencia: ${aiAnalysis.repairSuggestion}`);
    } else {
        console.warn("⚠️ No se pudo obtener el diagnóstico híper-enriquecido de la IA.");
    }

    const aiAssets: AIResponse = JSON.parse(fs.readFileSync(aiAssetsPath, 'utf8'));

    analysis.suggestedFixes = await this.generateIntelligentFixes(
        analysis.failureType,
        analysis.errorMessage,
        analysis.failedStep,
        aiAssets,
        pageUrl,
        realTimeContext
    );

    return analysis;
  }

  // ========== NUEVO: GENERACIÓN INTELIGENTE DE FIXES ==========
  private async generateIntelligentFixes(
    failureType: FailureAnalysis['failureType'],
    errorMessage: string,
    failedStep: string,
    aiAssets: AIResponse,
    pageUrl: string,
    realTimeContext: RealTimeContext | null
  ): Promise<SuggestedFix[]> {
    const fixes: SuggestedFix[] = [];

    if (failureType === 'selector' && realTimeContext) {
      const locatorNameMatch = failedStep.match(/^(?:click|fill|waitFor|assert|check|select|clear|get|is)(\w+)/i);

      if (locatorNameMatch && locatorNameMatch[1]) {
        const elementName = locatorNameMatch[1].charAt(0).toLowerCase() + locatorNameMatch[1].slice(1);

        console.log(`[INTELLIGENT-MCP] 🎯 Iniciando análisis inteligente para: ${elementName}`);

        // ========== DESCUBRIMIENTO INTELIGENTE ==========
        const discovery = await this.intelligentLearner.discoverElementIntelligently(
          elementName,
          failedStep,
          realTimeContext.interactiveElements,
          realTimeContext
        );

        if (discovery) {
          // Generar selectores dinámicamente basados en el elemento descubierto
          const dynamicSelectors = this.intelligentLearner.generateDynamicSelectors(discovery.element);

          fixes.push({
            type: 'intelligent_mcp_repair',
            description: `Descubrimiento inteligente: ${discovery.matchReason}`,
            elementName,
            discoveredElement: discovery.element,
            generatedSelectors: dynamicSelectors,
            learningPattern: discovery.generatedPattern,
            confidence: discovery.confidence,
            repaired: false
          });

          console.log(`[INTELLIGENT-MCP] ✅ Fix inteligente generado con ${discovery.confidence}% confianza`);
        } else {
          console.log(`[INTELLIGENT-MCP] ❌ No se pudo descubrir elemento inteligentemente`);
        }

        // ========== FALLBACK: LÓGICA EXISTENTE ==========
        const allLocators = [aiAssets.pageObject, ...(aiAssets.additionalPageObjects || [])].flatMap(p => p.locators);
        const locatorData = allLocators.find((loc: Locator) => loc.name === elementName);

        if (locatorData && locatorData.selectors.length > 1) {
          fixes.push({
            type: 'selector',
            description: `Fallback: Reordenar selectores existentes`,
            code: JSON.stringify({ reorder: true }),
            confidence: 0.3, // Menor confianza que el descubrimiento inteligente
          });
        }
      }
    }

    if (fixes.length === 0) {
      fixes.push({
        type: 'retry',
        description: 'Reintentar la prueba sin cambios',
        confidence: 0.2
      });
    }

    return fixes;
  }

  // ========== NUEVO: APLICAR FIXES INTELIGENTES ==========
  public async applyFixes(analysis: FailureAnalysis, aiAssetsPath: string): Promise<boolean> {
    console.log('🧠 Evaluando reparaciones inteligentes...');

    // PRIORIDAD 1: Buscar reparación inteligente MCP
    const intelligentFix = analysis.suggestedFixes.find(
      (f): f is Extract<SuggestedFix, {type: 'intelligent_mcp_repair'}> => f.type === 'intelligent_mcp_repair'
    );

    if (intelligentFix) {
      console.log(`[INTELLIGENT-MCP] 🚀 Aplicando reparación inteligente para: ${intelligentFix.elementName}`);
      console.log(`[INTELLIGENT-MCP] 🎯 Elemento descubierto: ${intelligentFix.discoveredElement.role} "${intelligentFix.discoveredElement.name}"`);
      console.log(`[INTELLIGENT-MCP] 📊 Confianza: ${intelligentFix.confidence}%`);

      const success = await this.applyIntelligentRepair(intelligentFix, aiAssetsPath);
      if (success) {
        intelligentFix.repaired = true;
        console.log(`[INTELLIGENT-MCP] ✅ Reparación inteligente aplicada exitosamente`);
        return true;
      } else {
        console.log(`[INTELLIGENT-MCP] ❌ Reparación inteligente falló, intentando fallback`);
      }
    }

    // PRIORIDAD 2: Fallback a lógica existente
    const selectorFix = analysis.suggestedFixes.find(
      (f): f is Extract<SuggestedFix, {type: 'selector'}> =>
        'confidence' in f && f.type === 'selector' && f.confidence > 0.25
    );

    if (selectorFix && selectorFix.code) {
      console.log(`[INTELLIGENT-MCP] 🔄 Aplicando fallback de reordenamiento`);
      return await this.applyLegacyRepair(analysis, aiAssetsPath, selectorFix);
    }

    console.log('⚠️ No se encontraron correcciones aplicables.');
    return false;
  }

  /**
   * NUEVO: Aplica reparación basada en descubrimiento inteligente
   */
  private async applyIntelligentRepair(
    intelligentFix: Extract<SuggestedFix, {type: 'intelligent_mcp_repair'}>,
    aiAssetsPath: string
  ): Promise<boolean> {
    try {
      const aiAssets: AIResponse = JSON.parse(fs.readFileSync(aiAssetsPath, 'utf8'));

      // Buscar el elemento a reparar
      const allPageObjects = [aiAssets.pageObject, ...(aiAssets.additionalPageObjects || [])];
      let elementFound = false;

      for (const po of allPageObjects) {
        const locatorToFix = po.locators.find(loc => loc.name === intelligentFix.elementName);

        if (locatorToFix) {
          // Guardar selectores originales para debugging
          const originalSelectors = [...locatorToFix.selectors];

          // Reemplazar con selectores generados inteligentemente
          locatorToFix.selectors = intelligentFix.generatedSelectors;

          console.log(`[INTELLIGENT-MCP] 🔄 Actualizando selectores dinámicamente:`);
          console.log(`[INTELLIGENT-MCP]   ❌ Original: ${JSON.stringify(originalSelectors[0])}`);
          console.log(`[INTELLIGENT-MCP]   ✅ Nuevo: ${JSON.stringify(intelligentFix.generatedSelectors[0])}`);
          console.log(`[INTELLIGENT-MCP]   🎯 Fuente: ${intelligentFix.discoveredElement.role} "${intelligentFix.discoveredElement.name}"`);
          console.log(`[INTELLIGENT-MCP]   📚 Patrón: ${intelligentFix.learningPattern.elementFunction}`);

          elementFound = true;
          break;
        }
      }

      if (!elementFound) {
        console.log(`[INTELLIGENT-MCP] ❌ Elemento ${intelligentFix.elementName} no encontrado en assets`);
        return false;
      }

      // Guardar archivo actualizado
      fs.writeFileSync(aiAssetsPath, JSON.stringify(aiAssets, null, 2));
      console.log(`[INTELLIGENT-MCP] 💾 Assets actualizados con selectores dinámicos`);

      return true;
    } catch (error) {
      console.error(`[INTELLIGENT-MCP] ❌ Error aplicando reparación inteligente:`, error);
      return false;
    }
  }

  /**
   * Aplica reparación legacy (reordenamiento) - MANTENER COMO FALLBACK
   */
  private async applyLegacyRepair(
    analysis: FailureAnalysis,
    aiAssetsPath: string,
    fix: Extract<SuggestedFix, {type: 'selector'}>
  ): Promise<boolean> {
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

    const fixAction: any = JSON.parse(fix.code!);

    if (fixAction.reorder === true && locatorToFix.selectors.length > 1) {
      const originalSelector = locatorToFix.selectors[0];
      const failingSelector = locatorToFix.selectors.shift();
      if (failingSelector) locatorToFix.selectors.push(failingSelector);
      const newSelector = locatorToFix.selectors[0];

      const repairInfo: SuggestedFix = {
        type: 'selector_repair',
        description: `Fallback: Se reordenó el selector para priorizar uno que probablemente funcione.`,
        elementName: elementName,
        originalSelector: JSON.stringify(originalSelector),
        newSelector: JSON.stringify(newSelector),
        repaired: true,
      };
      analysis.suggestedFixes.push(repairInfo);

      fs.writeFileSync(aiAssetsPath, JSON.stringify(aiAssets, null, 2));
      console.log(`✅ Reparación legacy aplicada para el elemento "${elementName}".`);
      return true;
    }

    return false;
  }

  // ========== MÉTODOS EXISTENTES (SIN CAMBIOS) ==========

  private buildHyperEnrichedPrompt(
    errorMessage: string,
    context: RealTimeContext | null,
    memories: any[] | null
  ): string {
    const formatJson = (data: any) => JSON.stringify(data, null, 2);

    const mcpContextSection = context ? `
  **CONTEXTO MCP EN TIEMPO REAL (NAVEGACIÓN FRESCA):**

  **🎯 ELEMENTOS INTERACTIVOS ACTUALES (${context.interactiveElements.length}):**
  \`\`\`json
  ${formatJson(context.interactiveElements)}
  \`\`\`

  **🏗️ ÁRBOL DE ACCESIBILIDAD ESTRUCTURADO:**
  \`\`\`json
  ${formatJson(context.accessibilityTree).substring(0, 3000)}...
  \`\`\`

  **🔍 SNAPSHOT DEL DOM (Fragmento Actual):**
  \`\`\`html
  ${context.domSnapshot.substring(0, 2000)}...
  \`\`\`

  **📱 INFORMACIÓN DE PÁGINA ACTUAL:**
  - URL: ${context.pageInfo.url}
  - Título: ${context.pageInfo.title}
  - Timestamp: ${context.pageInfo.timestamp}

  **🖥️ CONTEXTO DE NAVEGADOR:**
  - Viewport: ${formatJson(context.playwrightContext.viewportSize)}
  - User Agent: ${context.playwrightContext.userAgent}

  **🔴 ERRORES DE CONSOLA MCP:**
  \`\`\`json
  ${formatJson(context.mcpConsoleMessages.slice(-5))}
  \`\`\`

  **🌐 PETICIONES DE RED MCP:**
  \`\`\`json
  ${formatJson(context.mcpNetworkRequests.slice(-10))}
  \`\`\`

  **🎭 ERRORES DE CONSOLA PLAYWRIGHT:**
  \`\`\`json
  ${formatJson(context.consoleErrors)}
  \`\`\`

  **📡 ERRORES DE RED PLAYWRIGHT:**
  \`\`\`json
  ${formatJson(context.networkErrors)}
  \`\`\`

  **⚡ SCREENSHOT DISPONIBLE:** ${context.screenshot ? 'SÍ (Buffer MCP)' : 'NO'}

  ` : `**CONTEXTO MCP EN TIEMPO REAL:**
  ❌ No disponible - MCP no pudo conectarse o falló la navegación fresca.
  `;

    const pastMemories = memories && memories.length > 0 ? `
  **🧠 MEMORIA DE REPARACIONES EXITOSAS PASADAS:**
  ${memories.map((mem, i) => `
  - **Recuerdo ${i + 1} (Elemento: ${mem.elementName}):**
    - Error Original: "${mem.failureContext?.substring(0, 100) || 'Fallo similar anterior'}"
    - Solución que funcionó: "Se cambió el selector a '${mem.newSelector}'"
    - URL: ${mem.url || 'unknown'}
  `).join('')}
  ` : `**🧠 MEMORIA DE REPARACIONES EXITOSAS PASADAS:**
  No se encontraron recuerdos relevantes.`;

    const completePrompt = `### 🚀 ANÁLISIS HÍPER-INTELIGENTE DE FALLO DE PRUEBA AUTOMATIZADA ###

  **❌ ERROR ORIGINAL:**
  \`\`\`
  ${errorMessage}
  \`\`\`

  ${mcpContextSection}

  ${pastMemories}

  **🎯 TAREA HÍPER-INTELIGENTE:**

  Actúa como un Ingeniero de QA Senior con superpoderes de análisis. Tienes acceso a:
  1. **Contexto MCP estructurado** (árbol de accesibilidad, elementos interactivos actuales)
  2. **Snapshot fresco del DOM** obtenido mediante navegación independiente
  3. **Memoria de fallos pasados** para evitar errores recurrentes
  4. **Logs de consola y red** tanto de MCP como de Playwright

  **INSTRUCCIONES ESPECÍFICAS:**

  1. **PRIORIDAD MÁXIMA:** Usa el contexto MCP como fuente principal de verdad
     - Los "elementos interactivos" te muestran exactamente qué está disponible AHORA
     - Compara el selector que falló con los elementos realmente presentes
     - Si un elemento no está en la lista MCP, probablemente no existe o no es interactivo

  2. **ANÁLISIS DE SELECTOR:**
     - Si el error menciona un selector específico, búscalo en el árbol de accesibilidad
     - Propón selectores alternativos basados en los elementos MCP detectados
     - Considera que el elemento puede tener un rol ARIA diferente al esperado

  3. **ANÁLISIS DE TIMING:**
     - Revisa los logs de consola para errores de JavaScript que puedan afectar la UI
     - Verifica si hay peticiones de red pendientes que puedan estar afectando el estado
     - Considera si el elemento aparece dinámicamente después de alguna acción

  4. **ANÁLISIS DE ESTADO:**
     - Usa el snapshot del DOM para entender el estado actual de la página
     - Compara con la memoria de fallos para ver si es un problema recurrente
     - Identifica si hay cambios en la estructura de la página desde la generación inicial

  **FORMATO DE RESPUESTA REQUERIDO:**

  Proporciona un análisis conciso en formato JSON con exactamente estas dos claves:

  \`\`\`json
  {
    "rootCause": "Descripción específica de la causa raíz basada en el análisis MCP y contexto híper-rico. Ejemplos: 'El elemento loginButton cambió de role=button a role=link según el árbol de accesibilidad MCP', 'El selector falló porque hay un error JavaScript que impide la renderización del elemento', 'El elemento existe pero está disabled=true según el contexto MCP'",
    "repairSuggestion": "Sugerencia técnica específica y accionable. Ejemplos: 'Actualizar el selector a getByRole(\"link\", {name: \"Login\"}) según los elementos MCP detectados', 'Agregar waitFor para el elemento después de que se resuelva el error de JavaScript', 'Usar force: true en el click ya que el elemento está presente pero disabled'"
  }
  \`\`\`

  **EJEMPLOS DE ANÁLISIS HÍPER-INTELIGENTE:**

  **Ejemplo 1 - Cambio de Rol:**
  - Error: "locator.getByRole('button', {name: 'Submit'}) not found"
  - Contexto MCP muestra: {"role": "link", "name": "Submit", "element": "a"}
  - Diagnóstico: El elemento cambió de button a link
  - Sugerencia: Cambiar a getByRole('link', {name: 'Submit'})

  **Ejemplo 2 - Elemento Dinámico:**
  - Error: "locator.getByRole('textbox', {name: 'Email'}) not found"
  - Logs MCP muestran: Error JS "Cannot read property 'value' of null"
  - Diagnóstico: Error JavaScript impide renderización del formulario
  - Sugerencia: Agregar waitFor visible después de resolver el error JS

  **Ejemplo 3 - Estado Inesperado:**
  - Error: "Element is not clickable"
  - Contexto MCP muestra: {"role": "button", "name": "Save", "disabled": true}
  - Diagnóstico: Elemento presente pero deshabilitado por validación
  - Sugerencia: Verificar campos requeridos antes del click o usar force: true

  **RESPONDE ÚNICAMENTE CON EL OBJETO JSON - NO AGREGUES EXPLICACIONES ADICIONALES.**
  `;

    return completePrompt;
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
}
