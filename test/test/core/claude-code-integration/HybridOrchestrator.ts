// core/claude-code-integration/HybridOrchestrator.ts
// 🚀 HYBRID ORCHESTRATOR: The heart of Express QA + Claude Code integration

import { StableMcpService } from './StableMcpService';
import { LearningSystem } from '../intelligent-learning/learning-system';
import { FailureAnalyzer, FailureAnalysis } from '../intelligent-learning/failure-analyzer';
import { MemoryService } from '../intelligent-learning/MemoryService';
import { getLlmService } from '../llm-services/llm-service';
import { AIResponse } from '../types/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * HybridOrchestrator - The main orchestration engine that combines:
 * 
 * ✅ FROM EXPRESS QA:
 * - Advanced AI learning system
 * - Multi-LLM integration (Gemini, Claude, OpenAI)
 * - Intelligent failure analysis and auto-repair
 * - Vector memory with ChromaDB
 * - Dynamic selector generation
 * 
 * ✅ FROM CLAUDE CODE:
 * - Stable MCP infrastructure
 * - Native tool integration
 * - Reliable browser automation
 * - Production-ready configuration
 */
export class HybridOrchestrator {
  // 🧠 EXPRESS QA: Advanced AI Components
  private learningSystem: LearningSystem;
  private failureAnalyzer: FailureAnalyzer;
  private memoryService: MemoryService;
  
  // 💎 CLAUDE CODE: Stable Infrastructure
  private stableMcp: StableMcpService;
  
  // 🔧 Hybrid State
  private isInitialized = false;

  constructor() {
    console.log('🚀 HybridOrchestrator: Initializing Express QA + Claude Code integration...');
    
    // Initialize Express QA AI components
    this.learningSystem = new LearningSystem();
    this.failureAnalyzer = new FailureAnalyzer();
    this.memoryService = new MemoryService();
    
    // Initialize Claude Code stable infrastructure
    this.stableMcp = new StableMcpService();
  }

  /**
   * 🎯 MAIN ORCHESTRATION: Generate AI-powered tests with stable infrastructure
   */
  async generateTest(userStoryPath: string): Promise<GenerationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`🎬 Starting hybrid test generation for: ${userStoryPath}`);
    
    try {
      // 1. Load user story
      const userStory = this.loadUserStory(userStoryPath);
      console.log(`📖 User story loaded: "${userStory.name}"`);

      // 2. Get stable context via Claude Code MCP
      console.log('🔍 Getting stable page context...');
      const stableContext = await this.stableMcp.getRealTimeContext(userStory.fullUrl);

      // 3. Generate AI assets using Express QA's intelligence + stable context
      console.log('🧠 Generating AI assets with hybrid intelligence...');
      const aiAssets = await this.generateAIAssets(userStory, stableContext);

      // 4. Enhance with learning system
      console.log('📚 Enhancing with learned patterns...');
      const enhancedAssets = this.learningSystem.enhanceAIAssets(aiAssets, userStory.fullUrl);

      // 5. Generate code files
      console.log('🔧 Generating test code...');
      await this.generateCodeFiles(enhancedAssets, userStory);

      // 6. Execute test with intelligent monitoring
      console.log('🧪 Executing test with smart monitoring...');
      const executionResult = await this.executeTestWithMonitoring(userStory);

      return {
        success: true,
        userStory,
        aiAssets: enhancedAssets,
        executionResult,
        generatedFiles: this.getGeneratedFilePaths(userStory)
      };

    } catch (error) {
      console.error('❌ Hybrid generation failed:', error);
      
      // 🛡️ INTELLIGENT ERROR HANDLING
      const analysis = await this.handleGenerationFailure(error as Error, userStoryPath);
      
      return {
        success: false,
        error: error as Error,
        analysis: analysis || undefined,
        userStory: this.loadUserStory(userStoryPath)
      };
    }
  }

  /**
   * 🧠 EXPRESS QA: Advanced AI asset generation with stable context
   */
  private async generateAIAssets(userStory: any, stableContext: any): Promise<AIResponse> {
    const llmService = getLlmService();
    
    // 🎯 HYBRID PROMPT: Combine Express QA's AI intelligence with stable MCP data
    const hybridPrompt = this.buildHybridPrompt(userStory, stableContext);
    
    // 🤖 Multi-LLM generation with stable context
    const aiAssets = await llmService.getTestAssetsFromIA(
      hybridPrompt,
      stableContext.screenshot?.toString('base64') || ''
    );

    if (!aiAssets) {
      throw new Error('AI failed to generate test assets');
    }

    // 💾 Save for debugging and future learning
    const assetsPath = this.getAIAssetsPath(userStory);
    fs.writeFileSync(assetsPath, JSON.stringify(aiAssets, null, 2));
    console.log(`💾 AI assets saved: ${assetsPath}`);

    return aiAssets;
  }

  /**
   * 🔧 Generate executable code from AI assets
   */
  private async generateCodeFiles(aiAssets: AIResponse, userStory: any): Promise<void> {
    const assetsPath = this.getAIAssetsPath(userStory);
    
    // Use Express QA's proven code generation tools
    const { execSync } = await import('child_process');
    
    // Generate Page Object Model
    execSync(`npm run generate:pom -- ${assetsPath}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Generate test specification
    execSync(`npm run generate:spec -- ${assetsPath} ${userStory.filePath}`, {
      stdio: 'inherit', 
      cwd: process.cwd()
    });
    
    console.log('✅ Code files generated successfully');
  }

  /**
   * 🧪 Execute test with intelligent monitoring and auto-repair
   */
  private async executeTestWithMonitoring(userStory: any): Promise<ExecutionResult> {
    const testFilePath = this.getTestFilePath(userStory);
    
    console.log(`🧪 Executing test: ${testFilePath}`);
    
    try {
      // 🎯 Execute with Playwright (using stable configuration)
      const { spawn } = await import('child_process');
      
      const playwrightProcess = spawn('npx', ['playwright', 'test', testFilePath, '--reporter=list'], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';
      
      // Mostrar salida en tiempo real Y capturarla
      playwrightProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        process.stdout.write(text); // Mostrar en tiempo real
        output += text; // Capturar para análisis
      });
      
      playwrightProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        process.stderr.write(text); // Mostrar errores en tiempo real
        errorOutput += text;
      });

      const exitCode = await new Promise<number>((resolve) => {
        playwrightProcess.on('close', (code) => resolve(code || 0));
      });

      if (exitCode === 0) {
        console.log('✅ Test executed successfully!');
        return { success: true, output };
      } else {
        console.log('⚠️ Test failed, initiating intelligent repair...');
        const fullOutput = errorOutput || output;
        return await this.handleTestFailure(userStory, fullOutput);
      }

    } catch (error) {
      console.error('❌ Test execution error:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * 🔧 EXPRESS QA: Intelligent test failure handling with stable context
   */
  private async handleTestFailure(userStory: any, output: string): Promise<ExecutionResult> {
    console.log('🧠 Analyzing failure with hybrid intelligence...');
    
    // Get fresh stable context for analysis
    const stableContext = await this.stableMcp.getRealTimeContext(userStory.fullUrl);
    
    // Search similar failures in memory
    const similarMemories = await this.memoryService.searchSimilarFailures(output);
    
    // AI-powered failure analysis
    const analysis = await this.failureAnalyzer.analyzeFailure(
      this.getTestFilePath(userStory),
      output,
      this.getAIAssetsPath(userStory),
      userStory.fullUrl,
      stableContext,
      similarMemories
    );

    console.log(`🔍 Failure analysis completed: ${analysis.failureType}`);
    
    // Attempt auto-repair
    if (analysis.suggestedFixes.length > 0) {
      console.log('🔧 Attempting intelligent auto-repair...');
      
      const repairSuccess = await this.failureAnalyzer.applyFixes(
        analysis, 
        this.getAIAssetsPath(userStory)
      );
      
      if (repairSuccess) {
        console.log('✅ Auto-repair successful, re-executing test...');
        
        // Re-generate code with fixed assets
        await this.generateCodeFiles(
          JSON.parse(fs.readFileSync(this.getAIAssetsPath(userStory), 'utf8')),
          userStory
        );
        
        // Re-execute test
        return await this.executeTestWithMonitoring(userStory);
      }
    }

    // Learn from failure for future improvements
    await this.learningSystem.learnFromFailure(
      JSON.parse(fs.readFileSync(this.getAIAssetsPath(userStory), 'utf8')),
      userStory.fullUrl
    );

    return { 
      success: false, 
      analysis,
      autoRepairAttempted: true 
    };
  }

  /**
   * 🔧 Handle generation failures
   */
  private async handleGenerationFailure(error: Error, userStoryPath: string): Promise<FailureAnalysis | null> {
    console.log('🧠 Analyzing generation failure...');
    
    try {
      // Create minimal analysis for generation failures
      return {
        testName: path.basename(userStoryPath),
        failureType: 'unknown',
        failedStep: 'Generation',
        errorMessage: error.message,
        suggestedFixes: []
      };
    } catch (analysisError) {
      console.error('❌ Failed to analyze generation failure:', analysisError);
      return null;
    }
  }

  /**
   * 🏗️ Build hybrid prompt combining Express QA AI + Claude Code stability
   */
  private buildHybridPrompt(userStory: any, stableContext: any): string {
    // 🎯 CONTEXTO REAL MCP: Usar elementos detectados realmente
    const realElements = stableContext.interactiveElements || [];
    
    // Formatear elementos detectados para el prompt
    const elementsDescription = realElements.map((el: any, index: number) => {
      return `${index + 1}. ${el.type || 'element'} - Text: "${el.text || 'Sin texto'}" - Role: "${el.role || 'N/A'}" - Attributes: ${JSON.stringify(el.attributes || {})}`;
    }).join('\n');

    return `
**ANÁLISIS MCP EN TIEMPO REAL (DATOS ESTRUCTURADOS PRIORITARIOS):**

**🎯 ELEMENTOS INTERACTIVOS DETECTADOS (${realElements.length}):**
${elementsDescription}

**🏗️ INFORMACIÓN DE PÁGINA ACTUAL:**
- URL: ${stableContext.pageInfo?.url || 'N/A'}
- Título: ${stableContext.pageInfo?.title || 'N/A'}
- Timestamp: ${stableContext.pageInfo?.timestamp || 'N/A'}

**🚀 INSTRUCCIONES ESPECIALES PARA USAR DATOS MCP:**
1. **PRIORIDAD ABSOLUTA:** Los elementos listados en "Elementos Interactivos Detectados" son la fuente de verdad para la página actual
2. **ROLES ARIA EXACTOS:** Usa los roles proporcionados (button, textbox, link, etc.) en getByRole
3. **NOMBRES PRECISOS:** Si un elemento tiene 'text', úsalo en getByText o getByRole con options: { name: "texto_exacto" }
4. **SELECTORES RESILIENTES:** Genera múltiples selectores basados en los datos MCP
5. **SELECTORES VÁLIDOS PLAYWRIGHT:** Usa :has-text() en lugar de :contains() para selectores CSS

CONTEXTO:
Eres "Visionary QA", un motor de generación de código para pruebas automatizadas con Playwright y TypeScript. Tu única función es analizar los datos de entrada y devolver un objeto JSON estructurado que será usado para generar código de pruebas robusto y mantenible.

HISTORIA DE USUARIO:
"${Array.isArray(userStory.userStory) ? userStory.userStory.join('\n') : userStory.userStory}"

TAREA CRÍTICA - FLUJO COMPLETO OBLIGATORIO:
Analiza la ANÁLISIS MCP y la HISTORIA DE USUARIO. La historia de usuario describe un FLUJO COMPLETO que DEBES completar hasta el final, no solo la página actual.

**REGLA FUNDAMENTAL:** Si la historia de usuario menciona credenciales (email/password) y un objetivo final (dashboard, confirmación, etc.), DEBES generar additionalPageObjects y testSteps para TODO el flujo, anticipando las páginas que aparecerán después de hacer clic en elementos de la página actual.

**EJEMPLO DE LÓGICA REQUERIDA:**
- HU: "ingreso email → ingreso password → accedo al dashboard"  
- MCP: detecta solo botón "Ingresa por Ab-Inbev"
- **TU DEBES GENERAR:** SmartCommsLoginPage + MicrosoftLoginPage (con email/password) + DashboardPage (con verificación)

Genera un único objeto JSON que tenga exactamente las siguientes propiedades de nivel superior: "pageObject", "additionalPageObjects" (OBLIGATORIO si HU implica múltiples páginas), y "testSteps".

REGLA DE ORO PARA MANEJO DE MÚLTIPLES IDIOMAS:
Es posible que la historia de usuario esté en un idioma (ej. español) y la interfaz esté en otro (ej. inglés). TU TAREA ES MANEJAR ESTA SITUACIÓN DE FORMA INTELIGENTE.
1. IDENTIFICA la intención funcional de la historia de usuario (ej. "hacer clic en Siguiente" significa avanzar).
2. BUSCA en los elementos MCP el que CUMPLE ESA FUNCIÓN, incluso si el texto está en otro idioma.
3. GENERA los selectores basándote en el elemento que encontraste en los datos MCP.

**REGLA CRÍTICA PARA ELEMENTOS DE BÚSQUEDA:**
- Si hay un elemento 'combobox' con nombre 'Buscar', usarlo en lugar de 'search'
- Los elementos 'search' son generalmente contenedores, no inputs
- Priorizar elementos 'textbox', 'combobox' sobre 'search' para acciones de fill

1. **pageObject**: Un objeto que DEBE contener:
   * **className**: String con el nombre de la clase Page Object (ej. "SmartCommsLoginPage", "CheckoutPage").
   * **locators**: Array de objetos, donde cada objeto representa un elemento UI con:
     - "name": String en camelCase (ej. "emailInput", "submitButton", "errorMessage")
     - "elementType": String que indica el tipo ("input", "button", "text", "select", "checkbox", "link", "alert")
     - "actions": Array de strings con las acciones posibles
     - "selectors": Array de objetos con "type", "value" y opcionalmente "options"
     - "waitBefore": (OPCIONAL) Estado a esperar antes de interactuar ("visible", "enabled", "stable")
     - "validateAfter": (OPCIONAL) Boolean indicando si validar después de la acción

2. **additionalPageObjects** (OBLIGATORIO SI LA HU MENCIONA ACCIONES FUTURAS):
    * **CRÍTICO**: Si la historia de usuario menciona credenciales, confirmaciones, dashboard, resultados, etc., DEBES anticipar esas páginas aquí.
    * **EJEMPLO**: HU con email/password → genera MicrosoftLoginPage con campos email/password
    * **EJEMPLO**: HU con "acceder al dashboard" → genera DashboardPage con elementos de verificación
    * Es un ARRAY de objetos, donde cada objeto tiene la misma estructura que "pageObject".

3. **testSteps**: Un Array de objetos que describe CADA PASO del flujo completo HASTA COMPLETAR LA HISTORIA DE USUARIO:

--- REQUISITOS ESTRICTOS PARA CADA PASO EN "testSteps" ---
**DEBES INCLUIR TODOS LOS PASOS NECESARIOS PARA COMPLETAR LA HISTORIA DE USUARIO:**
- Si HU menciona email → incluye fillEmailField  
- Si HU menciona password → incluye fillPasswordField
- Si HU menciona "acceder al dashboard" → incluye verificación del dashboard
- Si HU menciona confirmación → incluye waitFor + assert correspondiente

CADA objeto dentro del array "testSteps" DEBE OBLIGATORIAMENTE contener las siguientes propiedades:
   * **page**: String que apunta a un "className" definido (OBLIGATORIO para multi-página)
   * **action**: String usando la convención ACCIÓN + ELEMENTO (ej: "clickLoginButton", "fillEmailField")
   * **params**: Array (vacío si no hay parámetros, pero si HU especifica credenciales, DEBES usarlas)
   * **waitFor**: (OPCIONAL) cuando el elemento pueda no estar disponible inmediatamente
   * **assert**: (OBLIGATORIO para verificar el objetivo final de la HU)

REGLA DE ORO PARA LA NAVEGACIÓN:
La primera línea de la historia de usuario, que generalmente empieza con "DADO", SIEMPRE debe ser el PRIMER paso en el array "testSteps". Este primer paso DEBE tener la acción "navigate".

REGLA DE ORO PARA NOMBRES DE CLASES:
- El nombre de la clase Page Object DEBE ser específico al contexto de la prueba.
- Usa el nombre del sitio web o la funcionalidad principal como prefijo.
- Para SmartComms, usa "SmartCommsLoginPage", "MicrosoftLoginPage", "SmartCommsDashboardPage".
- NUNCA uses nombres genéricos como "HomePage" para sitios diferentes.

REGLAS DE GENERACIÓN DE NOMBRES (CRÍTICO - USAR NOMBRES EXACTOS):
**IMPORTANTE:** Los nombres de métodos en testSteps DEBEN coincidir EXACTAMENTE con los que genera el POM:
- Si defines un elemento "emailInput" con action "fill", el método será: "fillEmailInput"
- Si defines un elemento "loginButton" con action "click", el método será: "clickLoginButton"  
- Si defines un elemento "submitButton" con action "click", el método será: "clickSubmitButton"

**FÓRMULA EXACTA:** método = [ACCIÓN] + [NOMBRE_ELEMENTO_CAPITALIZADO]
- emailInput + fill = fillEmailInput
- passwordInput + fill = fillPasswordInput  
- loginAbInbevButton + click = clickLoginAbInbevButton
- submitButton + click = clickSubmitButton
- dashboardTitle + waitForVisible = waitForDashboardTitleVisible

**REGLA DE ORO:** El "action" en testSteps = [acción] + [name del locator con primera letra en mayúscula]

MAPEO DE INTENCIONES A ASERCIONES (MUY IMPORTANTE):
- SI la historia dice "...URL debe contener [texto]...", ENTONCES usa 'assert: { "type": "urlContains", "expected": "[texto]" }'.
- SI la historia dice "...debe mostrar el texto [texto]...", ENTONCES usa 'assert: { "type": "textVisible", "expected": "[texto]" }'.
- SI la historia dice "...debe ser visible el elemento [nombre]...", ENTONCES usa 'waitFor: { "element": "[nombre]", "state": "visible" }' sin un 'assert'.
- SI la historia dice "...debería acceder al dashboard...", ENTONCES usa 'assert: { "type": "textVisible", "expected": "Dashboard" }'.

MUY IMPORTANTE: MANEJO DE VALIDACIONES CON MÚLTIPLES OPCIONES:
- Cuando la historia de usuario mencione múltiples mensajes posibles, usa "assertOneOf" en lugar de "assert"
- Para elementos que pueden mostrar diferentes textos, incluye un array de opciones en "expectedOptions"

EJEMPLO CON MÚLTIPLES OPCIONES:
{
  "action": "assertErrorMessageOneOf",
  "params": [["Warning: No match for E-Mail Address and/or Password.", "Warning: Your account has exceeded allowed number of login attempts."]],
  "assert": {
    "type": "oneOf",
    "expectedOptions": ["Warning: No match for E-Mail Address and/or Password.", "Warning: Your account has exceeded allowed number of login attempts."]
  }
}

REQUISITOS ESTRICTOS:
- El JSON debe ser válido (comas correctas, comillas dobles)
- Los nombres en testSteps deben coincidir EXACTAMENTE con la convención
- No incluyas explicaciones, solo el JSON
- Para elementos sin acciones directas, genera los pasos apropiados de espera/aserción
- La propiedad "page" en cada "testStep" es OBLIGATORIA para multi-página
- Si el flujo es de una sola página, el array "additionalPageObjects" debe ser omitido.
- Analiza la historia de usuario para determinar si se necesitan múltiples páginas.

REGLAS ADICIONALES PARA SELECTORES:
- Para cada elemento en "locators", genera al menos 2-3 selectores de diferentes tipos. Prioriza en este orden:
  1. getByRole (con "name" si es posible)
  2. getByText (para elementos con texto)
  3. getByLabel
  4. getByPlaceholder  
  5. css (usando :has-text() en lugar de :contains())
- Si el elemento tiene un atributo id o name, incluye un selector css usando ese atributo.
- No inventes selectores: solo genera selectores que puedan existir según los elementos MCP detectados.

IMPORTANTE PARA EVITAR TRUNCAMIENTO:
- Genera MÁXIMO 2 selectores por elemento (no 3-4)
- NO incluyas "assert": {} vacíos en testSteps
- Usa URLs relativas como "/login" en params, NO URLs completas
- Mantén el JSON lo más compacto posible

GENERA SOLO EL JSON, sin explicaciones adicionales.
    `;
  }

  /**
   * 🔧 Utility methods
   */
  private loadUserStory(userStoryPath: string): any {
    const userStory = JSON.parse(fs.readFileSync(userStoryPath, 'utf8'));
    userStory.filePath = userStoryPath; // Ruta del archivo testcase
    
    // Construir la URL correcta usando el path del testcase y la baseURL del .env
    const baseUrl = process.env.BASE_URL || 'https://www.google.com';
    userStory.fullUrl = new URL(userStory.path, baseUrl).toString();
    
    return userStory;
  }

  private getAIAssetsPath(userStory: any): string {
    const name = path.basename(userStory.filePath, '.testcase.json');
    return path.join('ai-assets', `${name}.ai-assets.json`);
  }

  private getTestFilePath(userStory: any): string {
    const name = userStory.name.replace(/\s+/g, '-').toLowerCase();
    const testFolderName = path.basename(userStory.filePath, '.testcase.json');
    return path.join('tests/generated', testFolderName, `${name}.spec.ts`);
  }

  private getGeneratedFilePaths(userStory: any): string[] {
    return [
      this.getAIAssetsPath(userStory),
      this.getTestFilePath(userStory)
    ];
  }

  /**
   * 🚀 Initialize hybrid system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔧 Initializing hybrid orchestrator...');
    
    // Initialize stable MCP infrastructure
    await this.stableMcp.initialize();
    
    // Initialize Express QA AI systems (they initialize themselves)
    console.log('🧠 Express QA AI systems ready');
    
    this.isInitialized = true;
    console.log('✅ Hybrid orchestrator ready!');
  }

  /**
   * 🧹 Cleanup
   */
  async cleanup(): Promise<void> {
    await this.stableMcp.cleanup();
    console.log('🧹 Hybrid orchestrator cleanup completed');
  }
}

// 🎯 TYPE DEFINITIONS
export interface GenerationResult {
  success: boolean;
  userStory: any;
  aiAssets?: AIResponse;
  executionResult?: ExecutionResult;
  generatedFiles?: string[];
  error?: Error;
  analysis?: FailureAnalysis;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: Error;
  analysis?: FailureAnalysis;
  autoRepairAttempted?: boolean;
}

/**
 * 🎯 USAGE EXAMPLE:
 * 
 * const orchestrator = new HybridOrchestrator();
 * const result = await orchestrator.generateTest('test-generation/user-stories/login.testcase.json');
 * 
 * if (result.success) {
 *   console.log('🎉 Test generated and executed successfully!');
 * } else {
 *   console.log('⚠️ Issues found, but system learned from them for next time');
 * }
 */