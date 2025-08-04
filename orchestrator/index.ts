// orchestrator/index.ts - ASEGURAR que estos imports estén al inicio:
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import * as fs from 'fs';
import { execSync, spawn } from 'child_process';  // ← AÑADIR spawn aquí
import { chromium, Page, Browser } from '@playwright/test';
import { getLlmService } from './llm-service';
import { ILlmService } from './llms/ILlmService';
import { LearningSystem } from './learning-system';
import { FailureAnalyzer, FailureAnalysis } from './failure-analyzer';
import { UIPatternDetector, DetectedPattern } from './ui-pattern-detector';
import playwrightConfig from '../playwright.config';
import { AIResponse } from './types/types';
import { MemoryService } from './services/MemoryService';
import { ContextService, RealTimeContext } from './services/ContextService';


interface TestCase {
  name: string;
  path: string;
  userStory: string[];
}

/**
 * EXTRAÍDO DE AIWithMCPService: Explora usando IA inteligente + MCP como brazos
 * Sin hardcodeo - la IA decide todo inteligentemente
 */
async function exploreUserStoryWithIntelligentAI(
  contextService: ContextService,
  llmService: ILlmService,
  userStory: string[],
  baseUrl: string,
  testPath: string
): Promise<RealTimeContext | null> {
  
  console.log('[LOG] 🧠 EXPLORACIÓN INTELIGENTE: IA analizará cada paso y decidirá exploración real...');
  
  try {
    const fullUrl = `${baseUrl}${testPath}`;
    
    // ✅ USAR EL CONTEXTO YA NAVEGADO del análisis estático
    let currentContext = await contextService.getRealTimeContext(fullUrl);
    if (!currentContext) {
      console.warn('[LOG] ⚠️ No se pudo obtener contexto para exploración inteligente');
      return null;
    }
    console.log(`[LOG] ✅ Contexto inicial: ${currentContext.interactiveElements?.length || 0} elementos`);

    // 2. IA analiza cada paso y decide si requiere exploración real
    for (let i = 1; i < userStory.length; i++) {
      const userStep = userStory[i];
      console.log(`[LOG] 🤔 IA analizando paso ${i + 1}: "${userStep}"`);
      
      // ✅ IA DECIDE INTELIGENTEMENTE si este paso requiere exploración real
      const aiDecision = await askAIForExplorationDecision(
        llmService, 
        userStep, 
        currentContext, 
        userStory.slice(i + 1) // Pasos futuros para contexto
      );
      
      if (aiDecision.requiresRealExploration) {
        console.log(`[LOG] 🎯 IA decidió: "${aiDecision.reasoning}"`);
        console.log(`[LOG] 🚀 Ejecutando exploración real...`);
        
        // ✅ IA EJECUTA LA ACCIÓN que decidió
        const actionResult = await executeAIDecision(contextService, aiDecision, currentContext);
        
        if (actionResult.executed) {
          // ✅ CAPTURA INMEDIATA POST-ACCIÓN (200ms para elementos dinámicos)
          console.log('[LOG] ⚡ Capturando elementos dinámicos post-acción...');
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const postActionContext = await contextService.getRealTimeContext(fullUrl);
          console.log(`[LOG] 🎉 Post-acción: ${postActionContext.interactiveElements?.length || 0} elementos detectados`);
          
          // Comparar contextos para detectar elementos nuevos
          const newElements = postActionContext.interactiveElements?.length - currentContext.interactiveElements?.length;
          if (newElements > 0) {
            console.log(`[LOG] ⚡ ${newElements} elementos dinámicos nuevos detectados!`);
          }
          
          // Actualizar contexto para siguientes pasos
          currentContext = postActionContext;
        }
      } else {
        console.log(`[LOG] 🤖 IA decidió NO explorar: "${aiDecision.reasoning}"`);
      }
    }
    
    // Retornar contexto final enriquecido con datos seguros
    return {
      ...currentContext,
      explorationSteps: userStory.length,
      hasRealExperience: true,
      playwrightContext: {
        viewportSize: { width: 1920, height: 1080 },
        userAgent: currentContext.playwrightContext?.userAgent || 'Mozilla/5.0 (intelligent-exploration)'
      }
    };
    
  } catch (error) {
    console.warn('[LOG] ⚠️ Error en exploración inteligente:', error);
    return null;
  }
}

/**
 * IA INTELIGENTE: Decide si un paso requiere exploración real
 */
async function askAIForExplorationDecision(
  llmService: ILlmService,
  userStep: string,
  currentContext: any,
  futureSteps: string[]
): Promise<{requiresRealExploration: boolean, reasoning: string, actionType?: string, targetElement?: any}> {
  
  const prompt = `
Eres una IA experta en análisis de historias de usuario para automatización de pruebas web.

PASO ACTUAL A ANALIZAR:
"${userStep}"

PASOS FUTUROS EN LA HISTORIA:
${futureSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

CONTEXTO ACTUAL DE LA PÁGINA:
${JSON.stringify(currentContext.interactiveElements?.slice(0, 10), null, 2)}

PREGUNTA CLAVE:
¿Este paso actual requiere que EJECUTE REALMENTE la acción para detectar elementos dinámicos que aparecerán después?

CRITERIOS PARA DECIDIR "SÍ":
- El paso implica una acción (click, submit, envío)
- Los pasos futuros mencionan elementos que aparecerán DESPUÉS de esta acción
- La acción puede generar respuestas del servidor (toasts, alerts, mensajes)
- Es necesario ver el resultado real de la acción para generar selectores precisos

CRITERIOS PARA DECIDIR "NO":
- Es solo llenar un campo (input, select)
- Es solo navegación inicial
- Los elementos ya están visibles en el contexto actual
- No hay pasos futuros que dependan del resultado de esta acción

FORMATO DE RESPUESTA (JSON válido):
{
  "requiresRealExploration": true/false,
  "reasoning": "Explicación clara de por qué decidiste explorar o no",
  "actionType": "click|submit|type|none",
  "targetElement": "descripción del elemento objetivo si aplica"
}

EJEMPLOS:
- Paso: "Hago clic en Continuar" + Futuro: "Entonces veo mensaje de error" → SÍ explorar
- Paso: "Ingreso email admin@test.com" + Futuro: "Ingreso contraseña" → NO explorar  
- Paso: "Hago clic en Buscar" + Futuro: "Entonces veo resultados" → SÍ explorar
`;

  try {
    const response = await llmService.getNavigationDecisionFromIA(prompt);
    
    if (response && typeof response === 'object') {
      return {
        requiresRealExploration: response.requiresRealExploration || false,
        reasoning: response.reasoning || 'No reasoning provided',
        actionType: response.actionType,
        targetElement: response.targetElement
      };
    }
    
    return {
      requiresRealExploration: false,
      reasoning: 'No se pudo obtener decisión de IA'
    };
    
  } catch (error) {
    console.warn('[LOG] ⚠️ Error obteniendo decisión de IA:', error);
    return {
      requiresRealExploration: false,
      reasoning: 'Error en análisis de IA'
    };
  }
}

/**
 * Ejecuta la decisión de IA usando MCP via ContextService
 */
async function executeAIDecision(
  contextService: any,
  aiDecision: any,
  context: any
): Promise<{executed: boolean, type?: string}> {
  
  try {
    if (aiDecision.actionType === 'click' || aiDecision.actionType === 'submit') {
      // Buscar el elemento target usando IA inteligente
      const buttons = context.interactiveElements?.filter((el: any) => 
        el.role === 'button' || el.elementType === 'button' || el.htmlAttributes?.type === 'submit'
      ) || [];
      
      if (buttons.length > 0) {
        // Usar el primer botón de submit o el más probable
        const targetButton = buttons.find((btn: any) => 
          btn.htmlAttributes?.type === 'submit' ||
          btn.name?.toLowerCase().includes('continuar') ||
          btn.name?.toLowerCase().includes('submit')
        ) || buttons[0];
        
        console.log(`[LOG] 🎯 Ejecutando ${aiDecision.actionType} en: ${targetButton.name || 'elemento detectado'}`);
        
        // Ejecutar acción real usando el mcpClient del contextService
        const mcpClient = (contextService as any).mcpClient?.mcpClient;
        if (mcpClient) {
          await mcpClient.callTool({
            name: 'browser_click',
            arguments: {
              element: targetButton.name || '',
              ref: targetButton.ref?.toString() || ''
            }
          });
          
          return { executed: true, type: aiDecision.actionType };
        }
      }
    }
    
    return { executed: false };
    
  } catch (error) {
    console.warn('[LOG] ⚠️ Error ejecutando decisión de IA:', error);
    return { executed: false };
  }
}



function buildLLMPrompt(patternsContext: DetectedPattern[], userStoryAsString: string, mcpContext?: RealTimeContext | null): string {
  const patternsString =
    patternsContext.length > 0
      ? `Adicionalmente, un análisis estructural de la página ha detectado los siguientes patrones de UI: ${JSON.stringify(
          patternsContext,
          null,
          2,
        )}. Usa este contexto para generar selectores y pasos más precisos y relevantes.`
      : '';

  // ========== NUEVO: CONTEXTO MCP ESTRUCTURADO ==========

  // INSTRUCCIÓN ESPECÍFICA PARA EVITAR CONTENEDORES
if (mcpContext && mcpContext.interactiveElements.length > 0) {
  console.log('🎯 ELEMENTOS MCP PARA IA:');
  mcpContext.interactiveElements.forEach(el => {
    console.log(`  ${el.role}: "${el.name}"`);
  });
}

  const mcpContextString = mcpContext ? `
**ANÁLISIS MCP EN TIEMPO REAL (DATOS ESTRUCTURADOS PRIORITARIOS):**

**🎯 ELEMENTOS INTERACTIVOS DETECTADOS (${mcpContext.interactiveElements.length}):**
${JSON.stringify(mcpContext.interactiveElements, null, 2)}

**🏗️ ÁRBOL DE ACCESIBILIDAD ESTRUCTURADO:**
${JSON.stringify(mcpContext.accessibilityTree, null, 2).substring(0, 2000)}...

**📱 INFORMACIÓN DE PÁGINA ACTUAL:**
- URL: ${mcpContext.pageInfo.url}
- Título: ${mcpContext.pageInfo.title}
- Timestamp: ${mcpContext.pageInfo.timestamp}

**🖥️ CONTEXTO DE NAVEGADOR:**
- Viewport: ${mcpContext.playwrightContext?.viewportSize ? JSON.stringify(mcpContext.playwrightContext.viewportSize) : 'No disponible'}
- User Agent: ${mcpContext.playwrightContext?.userAgent || 'No disponible'}

**⚡ SCREENSHOT MCP DISPONIBLE:** ${mcpContext.screenshot ? 'SÍ (Buffer MCP complementario)' : 'NO'}

**🚀 INSTRUCCIONES ESPECIALES PARA USAR DATOS MCP:**
1. **PRIORIDAD ABSOLUTA:** Los elementos listados en "Elementos Interactivos Detectados" son la fuente de verdad
2. **ROLES ARIA EXACTOS:** Usa los roles proporcionados (button, textbox, link, etc.) en getByRole
3. **NOMBRES PRECISOS:** Si un elemento tiene 'name', úsalo en getByRole con options: { name: "texto_exacto" }
4. **ELEMENTOS SIN NOMBRE:** Los elementos sin 'name' pueden usar getByRole solo con el rol
5. **VALIDACIÓN CRUZADA:** Combina la información MCP con la imagen para confirmar ubicaciones y apariencia
6. **SELECTORES RESILIENTES:** Genera múltiples selectores basados en los datos MCP + análisis visual
7. **DISABLED/CHECKED:** Considera los estados 'disabled' y 'checked' reportados por MCP

🚨 **DETECCIÓN DE ELEMENTOS DINÁMICOS/TOASTS:**
Si detectas elementos con estas características, son mensajes dinámicos (toasts, alerts, errors):
- role="alert" en datos MCP
- className contiene "Toastify", "toast", "error", "alert", "notification"
- Elementos que aparecen después de acciones (login fallido, formularios)

**SELECTORES PRIORITARIOS PARA TOASTS/ERRORES:**
1. { "type": "getByRole", "value": "alert" }
2. { "type": "css", "value": ".Toastify__toast" }
3. { "type": "css", "value": ".Toastify__toast-body" }
4. { "type": "css", "value": "[role='alert']" }
5. { "type": "css", "value": ".toast" }
6. { "type": "css", "value": ".error-message" }
7. { "type": "getByText", "value": "texto_específico_del_mensaje" }

**EJEMPLO DE USO MCP:**
- MCP detecta: {"role": "button", "name": "Log In", "disabled": false}
- GENERAR: {"type": "getByRole", "value": "button", "options": {"name": "Log In"}}
- MCP detecta: {"role": "textbox", "name": "Email address"}
- GENERAR: {"type": "getByRole", "value": "textbox", "options": {"name": "Email address"}}
- MCP detecta: {"role": "alert", "name": "", "className": "Toastify__toast"}
- GENERAR: {"type": "getByRole", "value": "alert"} + fallbacks CSS

` : '**ANÁLISIS MCP:** No disponible - usando solo análisis visual y patrones detectados.\n';

  return `
    CONTEXTO ESTRUCTURAL DE LA PÁGINA:
    ${patternsString}

    ${mcpContextString}

    CONTEXTO:
    Eres "Visionary QA", un motor de generación de código para pruebas automatizadas con Playwright y TypeScript. Tu única función es analizar los datos de entrada y devolver un objeto JSON estructurado que será usado para generar código de pruebas robusto y mantenible.

    HISTORIA DE USUARIO:
    "${userStoryAsString}"

    TAREA:
   Analiza la IMAGEN ADJUNTA, la HISTORIA DE USUARIO y el ANÁLISIS MCP (si está disponible). Basado en ellos, genera un único objeto JSON que tenga exactamente las siguientes dos propiedades de nivel superior: "pageObject" y "testSteps".

    REGLA DE ORO PARA MANEJO DE MÚLTIPLES IDIOMAS:
    Es posible que la historia de usuario esté en un idioma (ej. español) y la interfaz en la imagen esté en otro (ej. inglés). TU TAREA ES MANEJAR ESTA SITUACIÓN DE FORMA INTELIGENTE.
    1.  IDENTIFICA la intención funcional de la historia de usuario (ej. "hacer clic en Siguiente" significa avanzar).
    2.  BUSCA en la imagen el elemento que CUMPLE ESA FUNCIÓN, incluso si el texto está en otro idioma (ej. un botón con el texto "Next").
    3.  GENERA los selectores basándote en el elemento que encontraste visualmente en la imagen. La historia de usuario te da la intención, la imagen te da la implementación real.

    **REGLA CRÍTICA PARA ELEMENTOS DE BÚSQUEDA:**
- Si hay un elemento 'combobox' con nombre 'Buscar', usarlo en lugar de 'search'
- Los elementos 'search' son generalmente contenedores, no inputs
- Priorizar elementos 'textbox', 'combobox' sobre 'search' para acciones de fill

    EJEMPLO DE RAZONAMIENTO:
    - HU dice: "hago clic en el botón 'Siguiente'".
    - La imagen muestra un botón con el texto "Next".
    - TU CONCLUSIÓN: El usuario quiere hacer clic en el botón "Next".
    - TU ACCIÓN: Genera los selectores para el botón "Next" (ej. getByRole('button', { name: 'Next' })).


   1. **pageObject**: Un objeto que DEBE contener:
      * **className**: String con el nombre de la clase Page Object (ej. "LoginPage", "CheckoutPage").
      * **locators**: Array de objetos, donde cada objeto representa un elemento UI con:
        - "name": String en camelCase (ej. "emailInput", "submitButton", "errorMessage")
        - "elementType": String que indica el tipo ("input", "button", "text", "select", "checkbox", "link", "alert")
        - "actions": Array de strings con las acciones posibles
        - "selectors": Array de objetos con "type", "value" y opcionalmente "options"
        - "waitBefore": (OPCIONAL) Estado a esperar antes de interactuar ("visible", "enabled", "stable")
        - "validateAfter": (OPCIONAL) Boolean indicando si validar después de la acción

   2. **additionalPageObjects** (OPCIONAL, SOLO PARA FLUJOS MULTI-PÁGINA):
       * Si la historia de usuario implica navegar a OTRA página (ej. de la home a resultados de búsqueda), define las páginas subsecuentes aquí.
       * Es un ARRAY de objetos, donde cada objeto tiene la misma estructura que "pageObject".


   3. **testSteps**: Un Array de objetos que describe CADA PASO del flujo completo:

    --- REQUISITOS ESTRICTOS PARA CADA PASO EN "testSteps" ---
    CADA objeto dentro del array "testSteps" DEBE OBLIGATORIAMENTE contener las siguientes propiedades:
      * Usar la convención ACCIÓN + ELEMENTO para el campo "action"
      * Incluir "params" como array (vacío si no hay parámetros)
      * Incluir "waitFor" cuando el elemento pueda no estar disponible inmediatamente
      * Incluir "assert" para validaciones importantes

   REGLA DE ORO PARA LA NAVEGACIÓN:
    La primera línea de la historia de usuario, que generalmente empieza con "DADO", SIEMPRE debe ser el PRIMER paso en el array "testSteps". Este primer paso DEBE tener la acción "navigate".

    EJEMPLO CORRECTO DEL PRIMER PASO:
    {
      "page": "SmartCommsLoginPage", // La página inicial
      "action": "navigate",
      "params": ["/login"] // El path definido en el testcase.json
    }

   REGLA DE ORO DE ESPECIFICIDAD TÉCNICA:
    Si la historia de usuario menciona explícitamente un tipo de elemento HTML (como "input", "div", "span") o un atributo específico (como "id='idSIButton9'"), ESA INSTRUCCIÓN TIENE PRIORIDAD ABSOLUTA.
    - Debes usar ese tipo de elemento en el campo "elementType".
    - Debes generar selectores que correspondan a ese elemento (ej. "css": "input[type='submit']").
    - IGNORA la función semántica si se proporciona un detalle técnico. Si dice "hago clic en el input", el elementType DEBE ser "input", no "button".

    EJEMPLO:
    - HU: "hago clic en el input con id='idSIButton9' y value='Siguiente'"
    - CORRECTO: "elementType": "input", "selectors": [{"type": "css", "value": "input#idSIButton9[value='Siguiente']"}]
    - INCORRECTO: "elementType": "button"

   REGLA DE ORO PARA NOMBRES DE CLASES:
   - El nombre de la clase Page Object DEBE ser específico al contexto de la prueba.
   - Usa el nombre del sitio web o la funcionalidad principal como prefijo.
   - Por ejemplo:
   - Para google.com, la clase debe ser GoogleHomePage.
   - Para una tienda online, EcommerceHomePage.
   - Para una página de login, AuthLoginPage.
   - NUNCA uses el nombre genérico "HomePage" para dos sitios web diferentes. Sé siempre específico.

   REGLAS DE GENERACIÓN DE NOMBRES:
   - Para inputs/textareas: "fill[NombreElemento]" (ej. "fillEmailInput", "fillPasswordField")
   - Para botones: "click[NombreElemento]" (ej. "clickLoginButton", "clickSubmitButton")
   - Para checkboxes: "check[NombreElemento]" o "uncheck[NombreElemento]"
   - Para selects: "select[NombreElemento]" (ej. "selectCountryDropdown")
   - Para elementos de solo lectura: "waitFor[NombreElemento]Visible", "get[NombreElemento]Text", "assert[NombreElemento]Contains"
   - Para links: "click[NombreElemento]Link"

   REGLAS PARA ELEMENTOS SEGÚN TIPO:
   - **inputs** (elementType: "input"):
     * actions: ["fill", "clear", "getValue"]
     * waitBefore: "visible"
     * validateAfter: true (si es campo crítico)

   - **buttons** (elementType: "button"):
     * actions: ["click"]
     * waitBefore: "enabled"
     * validateAfter: true (si causa navegación o cambios importantes)

   - **text/alerts/messages** (elementType: "text" o "alert"):
     * actions: ["waitFor", "assertText", "assertVisible"] (para elementos dinámicos que necesitan validación)
     * waitBefore: "visible"
     * En testSteps usar: "waitFor[Nombre]Visible" y/o "assert[Nombre]Text"

   - **selects/dropdowns** (elementType: "select"):
     * actions: ["select"]
     * waitBefore: "visible"

   CUÁNDO USAR waitFor:
   - Elementos que aparecen después de una acción (mensajes de error, confirmaciones)
   - Después de navegación para esperar elementos de la nueva página
   - Elementos que se cargan dinámicamente
   - Antes de la primera interacción con cualquier elemento crítico

   CUÁNDO USAR assert:
   - Después de hacer clic en botones de navegación (validar URL con "urlContains")
   - Para verificar mensajes de error o éxito (validar texto con "textVisible")
   - Para validar que un valor se ingresó correctamente
   - Para confirmar el estado final de una acción

   REGLA DE ASERCIÓN DE TEXTO:
   - Si la historia de usuario pide validar que un texto es visible en la página (ej. "la página de resultados debe mostrar..."), usa el tipo de aserción "textVisible".

   MAPEO DE INTENCIONES A ASERCIONES (MUY IMPORTANTE):
   - SI la historia dice "...URL debe contener [texto]...", ENTONCES usa 'assert: { "type": "urlContains", "expected": "[texto]" }'.
   - SI la historia dice "...debe mostrar el texto [texto]...", ENTONCES usa 'assert: { "type": "textVisible", "expected": "[texto]" }'.
   - SI la historia dice "...debe ser visible el elemento [nombre]...", ENTONCES usa 'waitFor: { "element": "[nombre]", "state": "visible" }' sin un 'assert'.

   EJEMPLO DE ASERCIÓN "textVisible":
   "assert": { "type": "textVisible", "expected": "Texto a verificar" }

   🚨 PATRÓN ESPECIAL PARA MENSAJES DE ERROR DINÁMICOS:
   Si la historia menciona "ENTONCES debería ver un mensaje de error" con texto específico:
   1. PRIMER PASO: "waitFor[ElementName]Visible" - esperar que aparezca el elemento
   2. SEGUNDO PASO: "assert[ElementName]Text" - verificar el texto específico

   EJEMPLO ESPECÍFICO PARA ERRORES:
   Historia: "ENTONCES debería ver un mensaje de error con el texto 'Las credenciales son incorrectas'"
   GENERAR DOS PASOS SEPARADOS:
   {
     "action": "waitForErrorMessageVisible",
     "params": [],
     "waitFor": { "element": "errorMessage", "state": "visible" }
   },
   {
     "action": "assertErrorMessageText", 
     "params": ["Las credenciales son incorrectas"],
     "assert": { "type": "textVisible", "expected": "Las credenciales son incorrectas" }
   }

   REQUISITOS ESTRICTOS:
   - El JSON debe ser válido (comas correctas, comillas dobles)
   - Los nombres en testSteps deben coincidir EXACTAMENTE con la convención
   - No incluyas explicaciones, solo el JSON
   - Para elementos sin acciones directas, genera los pasos apropiados de espera/aserción
   - Analiza estrictamente las historias de usuario para saber que incluir y que no incluir en el json, hay elementos que no aplican para todos los casos, ejemplo: los mensajes de error.
   - La propiedad "page" en cada "testStep" es OBLIGATORIA y debe apuntar a un "className" definido.
    - Si el flujo es de una sola página, el array "additionalPageObjects" debe ser omitido.
    - Analiza la historia de usuario para determinar si se necesitan múltiples páginas. Una acción como "buscar" o "hacer clic en un enlace de producto" generalmente implica una transición de página.

   EJEMPLO COMPLETO:
   {
     "pageObject": {
       "className": "LoginPage",
       "locators": [
         {
           "name": "emailInput",
           "elementType": "input",
           "actions": ["fill", "clear", "getValue"],
           "selectors": [
             { "type": "getByLabel", "value": "E-Mail Address" },
             { "type": "locator", "value": "#input-email" }
           ],
           "waitBefore": "visible",
           "validateAfter": true
         },
         {
           "name": "passwordInput",
           "elementType": "input",
           "actions": ["fill", "clear"],
           "selectors": [
             { "type": "getByLabel", "value": "Password" },
             { "type": "locator", "value": "#input-password" }
           ],
           "waitBefore": "visible"
         },
         {
           "name": "loginButton",
           "elementType": "button",
           "actions": ["click"],
           "selectors": [
          {
            "type": "locator",
            "value": "input[value='Login']"
          },
          {
            "type": "getByRole",
            "value": "button",
            "options": {
              "name": "Login"
            }
          }
        ],
           "waitBefore": "enabled",
           "validateAfter": true
         },
         {
           "name": "errorMessage",
           "elementType": "alert",
           "actions": ["waitFor", "assertText", "assertVisible"],
           "selectors": [
             { "type": "getByRole", "value": "alert" },
             { "type": "css", "value": ".Toastify__toast" },
             { "type": "css", "value": "[role='alert']" },
             { "type": "css", "value": ".error-message" },
             { "type": "getByText", "value": "texto_específico_del_error" }
           ],
           "waitBefore": "visible"
         }
       ]
     },
     "testSteps": [
       {
         "action": "navigate",
         "params": ["index.php?route=account/login"]
       },
       {
         "action": "fillEmailInput",
         "params": ["invalid@example.com"],
         "waitFor": { "element": "emailInput", "state": "visible" }
       },
       {
         "action": "fillPasswordInput",
         "params": ["wrongPassword123"]
       },
       {
         "action": "clickLoginButton",
         "params": []
       },
       {
         "action": "waitForErrorMessageVisible",
         "params": [],
         "waitFor": { "element": "errorMessage", "state": "visible" }
       },
       {
         "action": "assertErrorMessageText",
         "params": ["string"],
         "assert": { "type": "text", "expected": "string" }
       },
       {
         "action": "assertErrorMessageOneOf",
         "params": [["string"]],
         "assert": {
         "type": "oneOf",
         "expectedOptions": ["string"]
        }
      }
     ]
   }

   EJEMPLO DE FLUJO MULTI-PÁGINA (Home -> SearchResults):
    {
      "pageObject": {
        "className": "HomePage",
        "locators": [
          {
            "name": "searchInput",
            "elementType": "input",
            "actions": ["fill"],
            "selectors": [{ "type": "getByPlaceholder", "value": "Search" }]
          },
          {
            "name": "searchButton",
            "elementType": "button",
            "actions": ["click"],
            "selectors": [{ "type": "locator", "value": "#search button" }]
          }
        ]
      },
      "additionalPageObjects": [
        {
          "className": "SearchResultsPage",
          "locators": [
            {
              "name": "inStockFilter",
              "elementType": "checkbox",
              "actions": ["check"],
              "selectors": [{ "type": "getByLabel", "value": "In Stock" }]
            },
            {
                "name": "productTitle",
                "elementType": "text",
                "actions": [],
                "selectors": [{ "type": "locator", "value": "h1.product-title" }]
            }
          ]
        }
      ],
      "testSteps": [
        {
          "page": "HomePage",
          "action": "navigate",
          "params": ["index.php?route=common/home"]
        },
        {
          "page": "HomePage",
          "action": "fillSearchInput",
          "params": ["MacBook"],
          "waitFor": { "element": "searchInput", "state": "visible" }
        },
        {
          "page": "HomePage",
          "action": "clickSearchButton",
          "params": []
        },
        {
          "page": "SearchResultsPage",
          "action": "waitForProductTitleVisible",
          "params": [],
          "assert": { "type": "urlContains", "expected": "search=MacBook" }
        },
        {
          "page": "SearchResultsPage",
          "action": "checkInStockFilter",
          "params": []
        }
      ]
    }

   IMPORTANTE:
   - Analiza cuidadosamente la imagen para identificar TODOS los elementos relevantes
   - Usa selectores múltiples para mayor resiliencia (preferir selectores semánticos)
   - El flujo de testSteps debe ser lógico y completo según la historia de usuario
   - Incluye validaciones apropiadas al contexto (no sobre-validar)

   MUY IMPORTANTE: MANEJO DE VALIDACIONES CON MÚLTIPLES OPCIONES:
- Cuando la historia de usuario mencione múltiples mensajes posibles, usa "assertOneOf" en lugar de "assert"
- Para elementos que pueden mostrar diferentes textos, incluye un array de opciones en "expectedOptions"
- Analiza muy bien la historia de usuario, y si se especifican ciertos tipos de datos, tomalo para el caso que aplique

EJEMPLO CON MÚLTIPLES OPCIONES:
{
  "action": "assertErrorMessageOneOf",
  "params": [["Warning: No match for E-Mail Address and/or Password.", " Warning: Your account has exceeded allowed number of login attempts. Please try again in 1 hour."]],
  "assert": {
    "type": "oneOf",
    "expectedOptions": ["Warning: No match for E-Mail Address and/or Password.", " Warning: Your account has exceeded allowed number of login attempts. Please try again in 1 hour."]
  }
}

- Esto es solo un ejemplo conceptual, ya que existen muchos sitios webs, con distintos tipos de mensajes, por eso siempre asegurate de leer correctamente la historia de usuario y que ese sea tu punto de partida para todo lo demas.

   REGLAS ADICIONALES PARA ASIGNACIÓN DE ELEMENTOS A PAGE OBJECTS:
   - Cada elemento de UI debe ser asignado únicamente al Page Object de la página donde aparece visualmente en la(s) captura(s) correspondiente(s).
   - Si un paso de prueba ("testStep") requiere interactuar con un elemento en una página específica (por ejemplo, "SearchResultsPage"), ese elemento debe estar definido en el array "locators" del Page Object de esa página.
   - No incluyas elementos de la página de resultados en el Page Object de la página inicial, ni viceversa.
   - No dupliques elementos entre Page Objects. Cada elemento debe estar solo en el Page Object donde aparece.
   - Si tienes dudas sobre a qué página pertenece un elemento, analiza cuidadosamente la secuencia de capturas y el flujo de usuario.

   EJEMPLO DE ASIGNACIÓN CORRECTA:
   Si el filtro "inStockFilter" solo aparece en la página de resultados de búsqueda, debe estar así:
   "additionalPageObjects": [
     {
       "className": "SearchResultsPage",
       "locators": [
         {
           "name": "inStockFilter",
           "elementType": "checkbox",
           "actions": ["check"],
           "selectors": [{ "type": "getByLabel", "value": "In Stock" }]
         }
       ]
     }
   ]
   Y NO en el Page Object de la página inicial.

   REGLAS ADICIONALES PARA SELECTORES:
   - Para cada elemento en "locators", genera al menos 3 selectores de diferentes tipos. Prioriza en este orden:
     1. getByRole (con "name" si es posible)
     2. getByLabel
     3. getByPlaceholder
     4. css
     5. xpath
     6. getByText (solo para elementos de texto)
   - Si el elemento tiene un atributo id o name, incluye un selector css o locator usando ese atributo.
   - No inventes selectores: solo genera selectores que puedan existir razonablemente según la imagen, el contexto y el tipo de elemento.
   - Si tienes acceso al HTML (o fragmento relevante), prioriza selectores que realmente existan en el DOM.
   - Si el elemento no tiene un label visible, omite getByLabel y prioriza otros tipos.
   - No repitas el mismo tipo de selector con valores diferentes; cada tipo debe ser único.
   - El objetivo es maximizar la resiliencia: si un selector falla, los otros deben funcionar.

   EJEMPLO DE LOCATORS PARA UN INPUT:
   {
     "name": "searchInput",
     "elementType": "input",
     "actions": ["fill"],
     "selectors": [
       { "type": "getByRole", "value": "textbox", "options": { "name": "Search" } },
       { "type": "getByPlaceholder", "value": "Search" },
       { "type": "css", "value": "input[name='search']" }
     ]
   }
  `;
}

async function getOrGenerateAssets(
  testCase: TestCase,
  fullDefinitionPath: string,
  llmService: ILlmService,
  contextService: ContextService // ✅ PARÁMETRO AÑADIDO
): Promise<AIResponse> {
  if (fs.existsSync(fullDefinitionPath)) {
    console.log(`[LOG] ℹ️ Usando archivo de assets existente: ${path.basename(fullDefinitionPath)}`);
    return JSON.parse(fs.readFileSync(fullDefinitionPath, 'utf8')) as AIResponse;
  }

  console.log(
    `[LOG] 📝 No se encontró ${path.basename(fullDefinitionPath)}. Generando desde la IA...`,
  );
  const baseURL = playwrightConfig.use?.baseURL;
  if (!baseURL) throw new Error('baseURL no está definida en playwright.config.ts');
  const fullUrl = new URL(testCase.path, baseURL).toString();

  // ========== 1. ANÁLISIS MCP ESTÁTICO ==========
  console.log('[LOG] 🤖 Iniciando análisis MCP estático...');
  let mcpContext: RealTimeContext | null = null;

  try {
    // CLAVE: MCP analiza la página ANTES de generar el código
    mcpContext = await contextService.getRealTimeContext(fullUrl);
    console.log(`[LOG] ✅ MCP análisis estático completado: ${mcpContext?.interactiveElements.length || 0} elementos detectados`);
  } catch (error) {
    console.warn('[LOG] ⚠️ MCP análisis estático falló, continuando con método tradicional:', error);
  }

  // ========== 2. EXPLORACIÓN INTELIGENTE CON IA + MCP (OPCIONAL) ==========
  console.log('[LOG] 🧠 Iniciando exploración inteligente IA + MCP...');
  
  try {
    // ✅ IA EXPLORA INTELIGENTEMENTE usando MCP como brazos
    const intelligentContext = await exploreUserStoryWithIntelligentAI(
      contextService,
      llmService,
      testCase.userStory,
      playwrightConfig.use?.baseURL || 'http://localhost',
      testCase.path
    );
    
    if (intelligentContext?.hasRealExperience) {
      console.log(`[LOG] ✅ Exploración inteligente completada: experiencia real capturada`);
      console.log(`[LOG] 🎯 Elementos post-exploración: ${intelligentContext.interactiveElements?.length || 0}`);
      
      // ✅ USAR EL CONTEXTO ENRIQUECIDO EN LUGAR DEL ESTÁTICO
      mcpContext = intelligentContext;
    } else {
      console.log('[LOG] 🤖 IA decidió usar solo análisis estático');
    }
  } catch (error) {
    console.warn('[LOG] ⚠️ Exploración inteligente falló, usando contexto estático:', error);
  }
  
  console.log('[LOG] ✅ Continuando con generación de assets...');

  // Captura de pantalla tradicional (mantener como respaldo)
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  (global as any).page = page;



  // Simula acciones humanas mínimas
  await page.mouse.move(100, 100);
  await page.waitForTimeout(800);
  await page.setViewportSize({ width: 1920, height: 1080 });

  console.log(`[LOG] 📸 Navegando a ${fullUrl} para captura tradicional...`);
  await page.goto(fullUrl, { waitUntil: 'networkidle' });

  const patternDetector = new UIPatternDetector();
  const detectedPatterns = await patternDetector.detectPatterns(page);
  console.log(
    `[LOG] ✅ Patrones de UI detectados: ${
      detectedPatterns.map((p) => p.type).join(', ') || 'Ninguno'
    }`,
  );

  const screenshotBuffer = await page.screenshot({ fullPage: true });
  await browser.close();
  console.log('[LOG] ✅ Captura de pantalla tomada.');

  // ========== USAR LA FUNCIÓN buildLLMPrompt EXISTENTE ==========
  console.log('[LOG] 🤖 Construyendo prompt híper-enriquecido...');
  const userStoryAsString = Array.isArray(testCase.userStory)
    ? testCase.userStory.join('\n')
    : testCase.userStory;

  // ✅ USAR LA FUNCIÓN EXISTENTE CON EL PARÁMETRO MCP
  const enhancedPrompt = buildLLMPrompt(
    detectedPatterns,
    userStoryAsString,
    mcpContext // ✅ PASAR CONTEXTO MCP
  );

  console.log('[LOG] 🤖 Enviando prompt a la IA para generar assets...');
  const testAssets = await llmService.getTestAssetsFromIA(
    enhancedPrompt,
    screenshotBuffer.toString('base64'),
  );
  if (!testAssets) throw new Error('La IA no pudo generar los assets de prueba');

  fs.writeFileSync(fullDefinitionPath, JSON.stringify(testAssets, null, 2));
  console.log(`✨ Assets de IA guardados en: ${fullDefinitionPath}`);

  return testAssets;
}

async function main() {
  console.log('🚀 Iniciando orquestador v12.0 (MCP Híper-Inteligente)...');

  const learningSystem = new LearningSystem();
  const llmService = getLlmService();
  const contextService = new ContextService();

  // NUEVO: Manejo de señales para limpieza garantizada
  process.on('SIGINT', async () => {
    console.log('\n🛑 Interrupción detectada, limpiando recursos...');
    try {
      await contextService.stopMCP();
    } catch (e) {
      console.warn('Error limpiando MCP:', e);
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Terminación detectada, limpiando recursos...');
    try {
      await contextService.stopMCP();
    } catch (e) {
      console.warn('Error limpiando MCP:', e);
    }
    process.exit(0);
  });

  // NUEVO: Iniciar servidor MCP
  try {
    await contextService.startMCP();
    console.log('✅ Servidor MCP iniciado correctamente');
  } catch (error) {
    console.warn('⚠️ No se pudo iniciar MCP, continuando sin contexto en tiempo real:', error);
  }

  const testCasePath = process.argv[2];
  if (!testCasePath) {
    console.error('Error: La ruta al archivo .testcase.json es obligatoria.');
    process.exit(1);
  }

  const testCase: TestCase = JSON.parse(fs.readFileSync(testCasePath, 'utf-8'));
  console.log(`📋 Caso de prueba leído: "${testCase.name}"`);

  const storiesDir = path.dirname(testCasePath);
  const testCaseName = path.basename(testCasePath, '.testcase.json');
  const assetsDir = path.join(storiesDir, '../generated-assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  const fullDefinitionPath = path.join(assetsDir, `${testCaseName}.ai-assets.json`);
  const fullUrl = new URL(testCase.path, playwrightConfig.use?.baseURL || 'http://localhost').toString();

  let attempt = 0;
  const maxRetries = 1;
  let lastAnalysis: FailureAnalysis | null = null;

  try {
    while (attempt <= maxRetries) {
      if (attempt > 0) {
        console.log(`\n🔄 Reintentando prueba después de auto-reparación (Intento ${attempt + 1})...`);
      }

      // MODIFICADO: Pasar contextService a getOrGenerateAssets
      const testAssets = await getOrGenerateAssets(testCase, fullDefinitionPath, llmService, contextService);
      const enhancedAssets = learningSystem.enhanceAIAssets(testAssets, fullUrl);
      const testFileName = testCase.name.replace(/\s+/g, '-').toLowerCase();
      const testFilePath = `tests/generated/${testFileName}.spec.ts`;

      execSync(`npm run generate:pom -- ${fullDefinitionPath}`, { stdio: 'inherit' });
      execSync(`npm run generate:spec -- ${fullDefinitionPath} ${testCasePath}`, { stdio: 'inherit' });

      // NUEVO: Control total del proceso Playwright
      try {
        console.log('\n🧪 Ejecutando prueba generada...');

        // Ejecutar Playwright en un proceso hijo controlado
        const playwrightProcess = spawn('npx', ['playwright', 'test', testFilePath, '--reporter=list'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdoutData = '';
        let stderrData = '';

        playwrightProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          process.stdout.write(output); // Mostrar en tiempo real
          stdoutData += output;
        });

        playwrightProcess.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          process.stderr.write(output); // Mostrar en tiempo real
          stderrData += output;
        });

        // Esperar a que termine el proceso
        const exitCode = await new Promise<number>((resolve) => {

          playwrightProcess.on('close', (code) => {
            console.log(`\n📊 Playwright terminó con código: ${code}`);
            resolve(code || 0);
          });
        });


        // IMPORTANTE: SIEMPRE proceder al análisis, sin importar el resultado
        if (exitCode === 0) {
          console.log('🎉 ¡Todas las pruebas pasaron exitosamente!');
          break; // Salir del bucle de reintentos - éxito total
        } else {
          console.error('\n🔍 Detectados fallos en las pruebas, procediendo al análisis...');
          throw new Error(`Pruebas fallaron con exit code: ${exitCode}`);
        }

      } catch (playwrightError) {
        console.error('🔍 Iniciando análisis HÍPER-INTELIGENTE con contexto MCP...');

        const failureAnalyzer = new FailureAnalyzer();
        const memoryService = new MemoryService();

        const errorMessage = playwrightError instanceof Error ? playwrightError.message : String(playwrightError);

       // NUEVO: ANÁLISIS DE FALLOS CON NAVEGACIÓN FRESCA MCP
       let realTimeContext: RealTimeContext | null = null;
       try {
         console.log('🔍 [ANÁLISIS] Obteniendo contexto híper-rico con navegación fresca...');

         // CLAVE: Navegación completamente fresca para el análisis
         // Usar URL directa para que MCP haga su propia navegación independiente
         realTimeContext = await contextService.getRealTimeContext(fullUrl);

         if (realTimeContext && realTimeContext.interactiveElements.length > 0) {
           console.log(`✅ [ANÁLISIS] Contexto híper-rico obtenido: ${realTimeContext.interactiveElements.length} elementos interactivos`);
           console.log(`📊 [ANÁLISIS] Datos MCP: ${realTimeContext.mcpConsoleMessages.length} mensajes consola, ${realTimeContext.mcpNetworkRequests.length} peticiones red`);

           if (realTimeContext.screenshot) {
             console.log('📸 [ANÁLISIS] Screenshot MCP disponible para análisis visual');
           }
         } else {
           console.warn('⚠️ [ANÁLISIS] Contexto MCP limitado, usando datos disponibles');
         }

       } catch (contextError) {
         console.warn('⚠️ [ANÁLISIS] Error obteniendo contexto MCP fresco:', contextError);

         // FALLBACK: Crear contexto mínimo funcional
         realTimeContext = {
           domSnapshot: 'Error obteniendo contexto MCP',
           accessibilityTree: {},
           interactiveElements: [],
           eventLog: [],
           consoleErrors: [],
           networkErrors: [],
           mcpConsoleMessages: [],
           mcpNetworkRequests: [],
           pageInfo: {
             url: fullUrl,
             title: 'error-context',
             timestamp: new Date().toISOString(),
           },
           playwrightContext: {
             viewportSize: { width: 1920, height: 1080 },
             userAgent: 'fallback-context',
           },
         };
       }

        const similarMemories = await memoryService.searchSimilarFailures(errorMessage);

        // Obtener reporte detallado (mantener lógica existente)
        let detailedReport = errorMessage;
        try {
          const reportResult = spawn('npx', ['playwright', 'test', testFilePath, '--reporter=json'], {
            stdio: 'pipe',
          });

          let reportData = '';
          reportResult.stdout.on('data', (data: Buffer) => {
            reportData += data.toString();
          });

          await new Promise<void>((resolve) => {
            reportResult.on('close', () => {
              detailedReport = reportData || errorMessage;
              resolve();
            });
          });
        } catch (reportError: any) {
          console.warn('⚠️ No se pudo obtener reporte JSON, usando error básico');
        }

        // ANÁLISIS CON CONTEXTO HÍPER-RICO
        const analysis = await failureAnalyzer.analyzeFailure(
          testFilePath,
          detailedReport,
          fullDefinitionPath,
          fullUrl,
          realTimeContext, // NUEVO: contexto híper-rico con MCP
          similarMemories,
        );
        lastAnalysis = analysis;

        if (similarMemories.length > 0) {
          console.log('✅ ¡Recuerdos encontrados!', similarMemories.length, 'experiencias pasadas');
        } else {
          console.log('🤔 No se encontraron recuerdos similares.');
        }

        await learningSystem.learnFromFailure(enhancedAssets, fullUrl);

        if (attempt < maxRetries) {
          console.log('🔧 Intentando auto-reparación inteligente...');
          const fixed = await failureAnalyzer.applyFixes(analysis, fullDefinitionPath);
          if (fixed) {
            console.log('✅ Auto-reparación aplicada, reintentando prueba...');
            attempt++;
            continue;
          } else {
            // NUEVO: Si applyFixes retornó false, aprender del fallo
            console.log('🔴 Reparación automática falló, aprendiendo del fallo...');
            await learningSystem.learnFromFailedRepair(analysis);
          }
        }

        // NUEVO: También aprender si se agotaron todos los reintentos
        console.log('⚠️ La auto-reparación no fue posible o ya se intentó. El fallo persiste.');
        console.log('🔴 Registrando fallo definitivo en el sistema de aprendizaje híper-inteligente...');
        await learningSystem.learnFromFailedRepair(analysis);

        // NUEVO: Mostrar resumen del análisis híper-rico
        if (realTimeContext && realTimeContext.interactiveElements.length > 0) {
          console.log('\n📊 RESUMEN DEL ANÁLISIS HÍPER-INTELIGENTE:');
          console.log(`   🎯 Elementos interactivos detectados: ${realTimeContext.interactiveElements.length}`);
          console.log(`   🏗️ Árbol de accesibilidad: ${Object.keys(realTimeContext.accessibilityTree).length > 0 ? 'Disponible' : 'Vacío'}`);
          console.log(`   📱 Información de página: ${realTimeContext.pageInfo.title} (${realTimeContext.pageInfo.url})`);
          console.log(`   🔍 Contexto MCP: ${realTimeContext.mcpConsoleMessages.length} logs, ${realTimeContext.mcpNetworkRequests.length} requests`);

          if (analysis.aiDiagnosis) {
            console.log(`   🧠 Diagnóstico IA: ${analysis.aiDiagnosis.rootCause}`);
            console.log(`   💡 Sugerencia: ${analysis.aiDiagnosis.repairSuggestion}`);
          }
        }

        console.log('⚠️ Análisis híper-inteligente completado. El programa terminará normalmente.');
        return; // En lugar de process.exit(1)
      }
    }
  } finally {
    // MODIFICADO: Delay antes de cerrar MCP para que termine el análisis
    try {
      console.log('⏳ Esperando que termine el análisis MCP...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Aumentado a 3 segundos
      await contextService.stopMCP();
      console.log('🧹 Servidor MCP detenido correctamente');
    } catch (error) {
      console.warn('⚠️ Error deteniendo MCP:', error);
    }
  }

  // NUEVO: Solo llegar aquí si todo fue exitoso
  console.log('🎉 ¡Orquestador completado exitosamente!');
}

main().catch(console.error);
