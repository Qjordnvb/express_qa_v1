// orchestrator/services/AIWithMCPService.ts
// Servicio que permite a la IA usar MCP como brazos para navegar e interactuar

import { MCPClientService } from './McpClientService';
import { ILlmService, AINavigationDecision } from '../llms/ILlmService';
import { AIResponse, TestStep, PageObjectDefinition, LocatorDefinition } from '../types/types';

export interface MCPInteractionStep {
  step: string;
  action: 'navigate' | 'click' | 'type' | 'wait' | 'observe';
  element?: {
    role: string;
    name: string;
    ref: string;
  };
  params?: any[];
  result?: {
    success: boolean;
    newUrl?: string;
    newElements?: any[];
    screenshot?: string;
    error?: string;
  };
}

export interface AIExplorationResult {
  steps: MCPInteractionStep[];
  finalContext: any;
  generatedSelectors: any[];
  learnings: string[];
}

export class AIWithMCPService {
  private mcpClient: MCPClientService;
  private llmService: ILlmService;

  constructor(llmService: ILlmService) {
    this.mcpClient = new MCPClientService();
    this.llmService = llmService;
  }

  /**
   * FUNCIÓN PRINCIPAL: IA EXPLORA CON MCP Y DEVUELVE JSON PARA GENERADORES
   */
  async generateAIResponseWithMCP(
    userStory: string[],
    baseUrl: string,
    testPath: string
  ): Promise<AIResponse> {
    
    console.log('\n🚀 [AI-MCP] INICIANDO GENERACIÓN COMPLETA CON MCP...\n');
    
    // 1. IA explora usando MCP como brazos
    const exploration = await this.exploreUserStoryWithMCP(userStory, baseUrl, testPath);
    
    // 2. IA convierte experiencia a JSON que esperan los generadores
    const aiResponse = await this.generateFinalAIResponse(exploration, userStory);
    
    console.log('\n✅ [AI-MCP] JSON FINAL GENERADO PARA LOS GENERADORES');
    console.log(`   - PageObject: ${aiResponse.pageObject.className}`);
    console.log(`   - Locators: ${aiResponse.pageObject.locators.length}`);
    console.log(`   - TestSteps: ${aiResponse.testSteps.length}`);
    
    return aiResponse;
  }

  /**
   * LA IA EXPLORA LA HISTORIA DE USUARIO USANDO MCP COMO BRAZOS
   */
  private async exploreUserStoryWithMCP(
    userStory: string[],
    baseUrl: string,
    testPath: string
  ): Promise<AIExplorationResult> {
    
    console.log('\n🧠 [AI-MCP] LA IA INICIARÁ EXPLORACIÓN CON MCP COMO BRAZOS...\n');
    
    // 1. Iniciar servidor MCP
    await this.mcpClient.startMCPServer();
    console.log('🤖 [AI-MCP] MCP listo como brazos de la IA');
    
    const fullUrl = `${baseUrl}${testPath}`;
    const steps: MCPInteractionStep[] = [];
    
    try {
      // 2. IA NAVEGA (paso 1 siempre es navegación)
      console.log(`🎯 [AI-MCP] IA NAVEGANDO A: ${fullUrl}`);
      
      const navStep: MCPInteractionStep = {
        step: userStory[0], // "DADO que estoy en..."
        action: 'navigate'
      };
      
      await this.mcpClient.navigateToUrl(fullUrl);
      await this.waitAndObserve(3000);
      
      const initialContext = await this.mcpClient.getCompleteContext();
      navStep.result = {
        success: true,
        newUrl: initialContext.pageInfo.url,
        newElements: initialContext.interactiveElements,
        screenshot: initialContext.screenshot?.toString('base64')
      };
      
      steps.push(navStep);
      console.log(`✅ [AI-MCP] IA navegó exitosamente. Elementos disponibles: ${initialContext.interactiveElements.length}`);
      
      // 3. IA PROCESA CADA PASO DE LA HISTORIA INTERACTIVAMENTE
      for (let i = 1; i < userStory.length; i++) {
        const userStep = userStory[i];
        console.log(`\n🤔 [AI-MCP] IA ANALIZANDO PASO ${i + 1}: "${userStep}"`);
        
        // Obtener contexto completo (ARIA + HTML)
        const currentContext = await this.mcpClient.getCompleteContext();
        
        // IA DECIDE QUE HACER basado en el paso y elementos disponibles
        const aiDecision = await this.askAIWhatToDo(
          userStep, 
          currentContext, 
          steps
        );
        
        console.log(`🎯 [AI-MCP] IA DECIDIÓ: ${aiDecision.action} ${aiDecision.element?.name || ''}`);
        
        // EJECUTAR LA DECISIÓN DE LA IA USANDO MCP
        const executionResult = await this.executeMCPAction(aiDecision);
        
        const step: MCPInteractionStep = {
          step: userStep,
          action: aiDecision.action,
          element: aiDecision.element,
          params: aiDecision.params,
          result: executionResult
        };
        
        steps.push(step);
        
        if (executionResult.success) {
          console.log(`✅ [AI-MCP] ACCIÓN EXITOSA: ${aiDecision.action}`);
        } else {
          console.log(`❌ [AI-MCP] ACCIÓN FALLÓ: ${executionResult.error}`);
        }
      }
      
      // 4. CONTEXTO FINAL DESPUÉS DE TODA LA EXPLORACIÓN
      const finalContext = await this.mcpClient.getCompleteContext();
      
      // 5. IA GENERA SELECTORES BASADOS EN LA EXPERIENCIA REAL
      const generatedSelectors = await this.generateSelectorsFromExperience(steps);
      
      // 6. IA APRENDE DE LA EXPERIENCIA
      const learnings = await this.extractLearnings(steps);
      
      console.log('\n🎉 [AI-MCP] EXPLORACIÓN COMPLETADA');
      console.log(`   - Pasos ejecutados: ${steps.length}`);
      console.log(`   - Selectores generados: ${generatedSelectors.length}`);
      console.log(`   - Aprendizajes: ${learnings.length}`);
      
      return {
        steps,
        finalContext,
        generatedSelectors,
        learnings
      };
      
    } finally {
      await this.mcpClient.stopMCPServer();
    }
  }

  /**
   * IA DECIDE QUÉ ACCIÓN TOMAR BASADA EN EL PASO ACTUAL
   */
  private async askAIWhatToDo(
    userStep: string,
    currentContext: any,
    previousSteps: MCPInteractionStep[]
  ): Promise<AINavigationDecision> {
    
    const prompt = `
Eres una IA experta que controla un navegador web a través de MCP (Model Context Protocol) para interactuar con aplicaciones web reales.

PASO ACTUAL DE LA HISTORIA DE USUARIO:
"${userStep}"

CONTEXTO COMPLETO DE LA PÁGINA ACTUAL:
=====================================

📍 INFORMACIÓN DE LA PÁGINA:
- URL: ${currentContext.pageInfo.url}  
- Título: ${currentContext.pageInfo.title}

🎯 ELEMENTOS HÍBRIDOS COMPLETOS (YAML + JAVASCRIPT):
${currentContext.hybridElements && currentContext.hybridElements.length > 0
  ? JSON.stringify(currentContext.hybridElements, null, 2)
  : 'Elementos híbridos no disponibles'
}

📋 ELEMENTOS ARIA ORIGINALES (Referencia):
${JSON.stringify(currentContext.interactiveElements, null, 2)}

⚡ DATOS JAVASCRIPT PUROS (Análisis avanzado):
${currentContext.rawJavaScriptData && currentContext.rawJavaScriptData.length > 0
  ? JSON.stringify(currentContext.rawJavaScriptData.slice(0, 5), null, 2)
  : 'Datos JavaScript no disponibles'
}
- Mensajes de consola: ${JSON.stringify(currentContext.consoleMessages, null, 2)}
- Peticiones de red recientes: ${JSON.stringify(currentContext.networkRequests, null, 2)}

🔄 HISTORIAL DE ACCIONES PREVIAS:
${previousSteps.map(s => `- ${s.action} ${s.element?.name || ''} ${s.result?.success ? '✅' : '❌'}`).join('\n')}

=====================================

INSTRUCCIONES PARA ANÁLISIS INTELIGENTE:

🧠 CAPACIDADES DE LA IA SIN HARDCODEO:
1. **Análisis híbrido**: Combina información ARIA (estructura) con HTML completo (atributos exactos)
2. **Detección directa**: Busca `type="password"`, `type="email"`, `placeholder=""` directamente en el HTML
3. **Matching inteligente**: Correlaciona elementos ARIA con HTML por proximidad y contexto
4. **Flexibilidad total**: No usa reglas hardcodeadas, adapta el análisis a cualquier sitio web

🎯 TAREAS ESPECÍFICAS:
1. **Analiza el paso de la historia de usuario** y determina qué acción específica necesitas realizar
2. **Examina TODOS los elementos disponibles**, no solo los primeros
3. **Usa información adicional** del árbol de accesibilidad, atributos, y contexto para identificar elementos correctamente
4. **Infiere tipos de elementos** cuando la información sea ambigua (ej: un textbox después de "Email" probablemente es un campo de email)
5. **Extrae texto/valores específicos** de la historia de usuario (emails, contraseñas, nombres, etc.)

📝 FORMATO DE RESPUESTA REQUERIDO:
Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:

{
  "action": "click|type|wait|observe",
  "element": {
    "role": "rol_del_elemento",
    "name": "nombre_identificativo",
    "ref": "referencia_mcp"
  },
  "params": ["parámetros_si_aplican"],
  "reasoning": "Explicación clara de tu decisión y cómo identificaste el elemento correcto"
}

🔧 REGLAS PARA ACCIONES:
- **type**: Incluye el texto exacto a escribir en params: ["texto_específico"]
- **click**: Identifica el elemento correcto por rol, nombre, y contexto
- **wait**: Solo si necesitas esperar algo específico: [milisegundos]
- **observe**: Solo si necesitas analizar el estado actual sin actuar

💡 EJEMPLOS DE ANÁLISIS INTELIGENTE:

Ejemplo 1 - Campo de email:
- Paso: "CUANDO ingreso mi email 'admin@example.com' en el campo de Email"
- Si encuentras: {"role": "textbox", "name": "Email", "ref": "e19"}
- Respuesta: {"action": "type", "element": {"role": "textbox", "name": "Email", "ref": "e19"}, "params": ["admin@example.com"], "reasoning": "Encontré el campo de email específico con el nombre exacto. Extraje el email de la historia de usuario."}

Ejemplo 2 - Campo de contraseña usando HTML completo:
- Paso: "Y ingreso mi contraseña '123456' en el campo de contraseña"  
- Si encuentras en HTML: `<input type="password" name="password" placeholder="Contraseña" class="form-control">`
- Y en ARIA: {"role": "textbox", "name": "- textbox", "ref": "e32"}
- Respuesta: {"action": "type", "element": {"role": "textbox", "name": "password field", "ref": "e32"}, "params": ["123456"], "reasoning": "Correlacioné el elemento ARIA textbox [e32] con el HTML input[type='password']. El type='password' en el HTML confirma que es el campo de contraseña correcto."}

Ejemplo 3 - Botón de acción:
- Paso: "Y hago clic en el botón 'Continuar'"
- Si encuentras: {"role": "button", "name": "Continuar", "ref": "e25"}
- Respuesta: {"action": "click", "element": {"role": "button", "name": "Continuar", "ref": "e25"}, "params": [], "reasoning": "Encontré el botón con el nombre exacto 'Continuar' que coincide con la historia de usuario."}

🚨 IMPORTANTE - ANÁLISIS SIN HARDCODEO:
- Usa TANTO la información ARIA COMO el HTML completo para identificar elementos
- Busca atributos HTML exactos: `type="password"`, `type="email"`, `placeholder=""`, `name=""`
- Correlaciona elementos ARIA (con refs) con elementos HTML (con atributos)
- NO uses reglas hardcodeadas, adapta tu análisis al contenido real de la página
- La IA debe ser inteligente para cualquier sitio web, no solo casos específicos
`;

    try {
      // NUEVO: Usar el método específico para decisiones de navegación
      const response = await this.llmService.getNavigationDecisionFromIA(prompt);
      
      if (response) {
        console.log(`✅ [AI-MCP] IA decidió: ${response.action} ${response.element?.name || ''}`);
        return response;
      }
      
      return { 
        action: 'observe', 
        reasoning: 'No response from AI' 
      };
      
    } catch (error) {
      console.error('Error obteniendo decisión de IA:', error);
      return {
        action: 'observe',
        reasoning: 'Error en análisis, observando estado actual'
      };
    }
  }

  /**
   * EJECUTA LA ACCIÓN DECIDIDA POR LA IA USANDO MCP
   */
  private async executeMCPAction(decision: AINavigationDecision): Promise<any> {
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      
      switch (decision.action) {
        case 'click':
          if (decision.element) {
            await mcpClient.callTool({
              name: 'browser_click',
              arguments: {
                element: decision.element.name,
                ref: decision.element.ref.toString()
              }
            });
          }
          break;
          
        case 'type':
          if (decision.element && decision.params && decision.params[0]) {
            await mcpClient.callTool({
              name: 'browser_type',
              arguments: {
                element: decision.element.name,
                ref: decision.element.ref.toString(),
                text: decision.params[0]
              }
            });
          }
          break;
          
        case 'wait':
          await mcpClient.callTool({
            name: 'browser_wait_for',
            arguments: { time: (decision.params && decision.params[0]) || 2000 }
          });
          break;
          
        case 'observe':
          // Solo observar, no hacer nada
          break;
      }
      
      // Esperar un momento y tomar screenshot
      await this.waitAndObserve(1000);
      
      const newContext = await this.mcpClient.getCompleteContext();
      
      return {
        success: true,
        newUrl: newContext.pageInfo.url,
        newElements: newContext.interactiveElements,
        screenshot: newContext.screenshot?.toString('base64')
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * ESPERA Y OBSERVA CAMBIOS
   */
  private async waitAndObserve(ms: number): Promise<void> {
    const mcpClient = (this.mcpClient as any).mcpClient;
    await mcpClient.callTool({
      name: 'browser_wait_for',
      arguments: { time: ms }
    });
  }

  /**
   * GENERA SELECTORES BASADOS EN LA EXPERIENCIA REAL
   */
  private async generateSelectorsFromExperience(steps: MCPInteractionStep[]): Promise<any[]> {
    const selectors: any[] = [];
    
    for (const step of steps) {
      if (step.element && step.result?.success) {
        // Generar múltiples selectores para el elemento que funcionó
        const elementSelectors = {
          name: step.element.name.replace(/\s+/g, ''),
          elementType: step.element.role,
          actions: [step.action],
          selectors: [
            {
              type: "getByRole",
              value: step.element.role,
              options: step.element.name ? { name: step.element.name } : undefined
            },
            {
              type: "css",
              value: `[role="${step.element.role}"]`
            }
          ]
        };
        
        selectors.push(elementSelectors);
      }
    }
    
    return selectors;
  }

  /**
   * EXTRAE APRENDIZAJES DE LA EXPLORACIÓN
   */
  private async extractLearnings(steps: MCPInteractionStep[]): Promise<string[]> {
    const learnings: string[] = [];
    
    for (const step of steps) {
      if (step.result?.success) {
        learnings.push(`✅ ${step.action} en ${step.element?.name} funcionó correctamente`);
      } else {
        learnings.push(`❌ ${step.action} en ${step.element?.name} falló: ${step.result?.error}`);
      }
    }
    
    return learnings;
  }

  /**
   * CONVIERTE LA EXPERIENCIA MCP AL JSON EXACTO QUE ESPERAN LOS GENERADORES
   */
  private async generateFinalAIResponse(
    explorationResult: AIExplorationResult,
    originalUserStory: string[]
  ): Promise<AIResponse> {
    
    console.log('\n🧠 [AI-MCP] GENERANDO JSON FINAL PARA GENERADORES...');
    
    const prompt = `
Eres "Visionary QA", un motor de generación de código para pruebas automatizadas con Playwright y TypeScript. Tu única función es analizar los datos de entrada y devolver un objeto JSON estructurado que será usado para generar código de pruebas robusto y mantenible.

HISTORIA DE USUARIO ORIGINAL:
${originalUserStory.map((step, i) => `${i + 1}. ${step}`).join('\n')}

EXPLORACIÓN REAL EJECUTADA CON MCP:
${JSON.stringify(explorationResult.steps.map(s => ({
  step: s.step,
  action: s.action,
  element: s.element,
  success: s.result?.success,
  error: s.result?.error
})), null, 2)}

ELEMENTOS FINALES DETECTADOS EN LA PÁGINA:
${JSON.stringify(explorationResult.finalContext.interactiveElements.slice(0, 10), null, 2)}

Analiza la EXPLORACIÓN REAL MCP y la HISTORIA DE USUARIO. Basado en ellos, genera un único objeto JSON que tenga exactamente las siguientes propiedades de nivel superior: "pageObject" y "testSteps".

1. **pageObject**: Un objeto que DEBE contener:
   * **className**: String con el nombre de la clase Page Object (ej. "MembeerLoginPage", "AdminDashboardPage").
   * **locators**: Array de objetos, donde cada objeto representa un elemento UI con:
     - "name": String en camelCase (ej. "emailInput", "continuarButton", "errorMessage")
     - "elementType": String que indica el tipo ("input", "button", "text", "select", "checkbox", "link", "alert")
     - "actions": Array de strings con las acciones posibles
     - "selectors": Array de objetos con "type", "value" y opcionalmente "options"
     - "waitBefore": (OPCIONAL) Estado a esperar antes de interactuar ("visible", "enabled", "stable")
     - "validateAfter": (OPCIONAL) Boolean indicando si validar después de la acción

2. **testSteps**: Un Array de objetos que describe CADA PASO del flujo completo:

CADA objeto dentro del array "testSteps" DEBE OBLIGATORIAMENTE contener las siguientes propiedades:
- "page": String que apunta al className definido
- "action": String usando convención ACCIÓN + ELEMENTO (ej. "navigate", "fillEmailInput", "clickContinuarButton")
- "params": Array (vacío si no hay parámetros)
- "waitFor": (OPCIONAL) cuando el elemento pueda no estar disponible inmediatamente
- "assert": (OPCIONAL) para validaciones importantes

REGLA DE ORO PARA LA NAVEGACIÓN:
El PRIMER paso en "testSteps" DEBE tener la acción "navigate".

EJEMPLO DEL PRIMER PASO:
{
  "page": "MembeerLoginPage",
  "action": "navigate", 
  "params": ["/"]
}

REGLAS DE GENERACIÓN DE NOMBRES:
- Para inputs: "fill[NombreElemento]Input" (ej. "fillEmailInput", "fillPasswordInput")
- Para botones: "click[NombreElemento]Button" (ej. "clickContinuarButton", "clickSubmitButton")
- Para checkboxes: "check[NombreElemento]" o "uncheck[NombreElemento]"
- Para selects: "select[NombreElemento]Dropdown"
- Para elementos de solo lectura: "assert[NombreElemento]Visible"

REGLAS PARA ELEMENTOS SEGÚN TIPO:
- **inputs** (elementType: "input"):
  * actions: ["fill", "clear"]
  * waitBefore: "visible"
  * validateAfter: true (si es campo crítico)

- **buttons** (elementType: "button"):
  * actions: ["click"]
  * waitBefore: "enabled"
  * validateAfter: true (si causa navegación)

- **text/alerts** (elementType: "text"):
  * actions: [] (vacío, son solo lectura)
  * waitBefore: "visible"

REGLA CRÍTICA PARA ASERCIONES:  
SOLO agrega "assert" si la historia de usuario EXPLÍCITAMENTE menciona el resultado esperado.

CUÁNDO SÍ USAR assert:
- Si la historia dice "ENTONCES debería navegar a..." → usar "urlContains"
- Si la historia dice "ENTONCES debería mostrar..." → usar "textVisible" 
- Si la historia dice "ENTONCES debería aparecer..." → usar "textVisible"
- Si la historia dice "ENTONCES la URL debe contener..." → usar "urlContains"

CUÁNDO NO USAR assert:
- Si la historia termina en una acción sin mencionar resultado esperado
- Si la historia no dice "ENTONCES" o "debería" 
- Si no estás 100% seguro del resultado esperado

MAPEO DE ASERCIONES (solo si se menciona explícitamente):
- Para validar URL: 'assert: { "type": "urlContains", "expected": "texto_url_específico" }'
- Para validar texto: 'assert: { "type": "textVisible", "expected": "texto_exacto_mencionado" }'

EJEMPLO CORRECTO:
Historia: "Y hago clic en el botón 'Continuar'" → NO agregar assert (no menciona resultado)
Historia: "Y hago clic en el botón 'Continuar' y debería redirigir al dashboard" → SÍ agregar assert urlContains

IMPORTANTE: 
- Usa SOLO los elementos que tuvieron result.success = true en la exploración MCP
- Los params deben ser exactamente los valores que funcionaron en MCP
- El JSON debe ser válido (comas correctas, comillas dobles)
- No incluyas explicaciones, solo el JSON
- La propiedad "page" en cada "testStep" es OBLIGATORIA

EJEMPLO COMPLETO:
{
  "pageObject": {
    "className": "MembeerLoginPage",
    "locators": [
      {
        "name": "emailInput",
        "elementType": "input",
        "actions": ["fill", "clear"],
        "selectors": [
          { "type": "getByRole", "value": "textbox", "options": { "name": "Email" } },
          { "type": "css", "value": "input[type='email']" }
        ],
        "waitBefore": "visible",
        "validateAfter": true
      },
      {
        "name": "continuarButton",
        "elementType": "button",
        "actions": ["click"],
        "selectors": [
          { "type": "getByRole", "value": "button", "options": { "name": "Continuar" } },
          { "type": "css", "value": "button[type='submit']" }
        ],
        "waitBefore": "enabled",
        "validateAfter": true
      }
    ]
  },
  "testSteps": [
    {
      "page": "MembeerLoginPage",
      "action": "navigate",
      "params": ["/"]
    },
    {
      "page": "MembeerLoginPage",
      "action": "fillEmailInput",
      "params": ["test@example.com"],
      "waitFor": { "element": "emailInput", "state": "visible" }
    },
    {
      "page": "MembeerLoginPage",
      "action": "clickContinuarButton",
      "params": [],
      "waitFor": { "element": "continuarButton", "state": "enabled" },
      "assert": { "type": "urlContains", "expected": "dashboard" }
    }
  ]
}
`;

    try {
      const aiResponse = await this.llmService.getTestAssetsFromIA(prompt, '');
      if (!aiResponse) {
        throw new Error('No se pudo obtener respuesta de la IA');
      }
      
      // Validar que tiene la estructura correcta
      if (!aiResponse.pageObject || !aiResponse.testSteps) {
        throw new Error('Respuesta de IA no tiene la estructura correcta');
      }
      
      return aiResponse as AIResponse;
      
    } catch (error) {
      console.error('❌ [AI-MCP] Error generando JSON final:', error);
      
      // Fallback: generar estructura básica
      return {
        pageObject: {
          className: "GeneratedPage",
          locators: explorationResult.generatedSelectors.map(sel => ({
            name: sel.name || 'unknownElement',
            elementType: sel.elementType || 'button',
            actions: sel.actions || ['click'],
            selectors: sel.selectors || []
          }))
        },
        testSteps: explorationResult.steps.map((step, index) => ({
          page: "GeneratedPage",
          action: index === 0 ? "navigate" : `${step.action}Element`,
          params: step.params || []
        }))
      };
    }
  }
}