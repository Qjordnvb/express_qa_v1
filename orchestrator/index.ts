// orchestrator/index.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import * as fs from 'fs';
import { execSync } from 'child_process';
import { chromium, Page, Browser } from '@playwright/test';
import { getLlmService } from './llm-service';
import { ILlmService } from './llms/ILlmService';
import { LearningSystem } from './learning-system';
import { FailureAnalyzer, FailureAnalysis } from './failure-analyzer';
import { UIPatternDetector, DetectedPattern } from './ui-pattern-detector';
import playwrightConfig from '../playwright.config';
import { AIResponse } from './types/types'; // <-- 1. IMPORTAMOS EL NUEVO TIPO UNIFICADO
import { MemoryService } from './services/MemoryService';

interface TestCase {
  name: string;
  path: string;
  userStory: string[];
}

/**
 * Construye el prompt completo que se enviará al LLM.
 * Esta función ahora centraliza la lógica de creación del prompt.
 * @param patternsContext El contexto de patrones de UI detectados.
 * @param userStoryAsString La historia de usuario como string.
 * @returns El prompt completo listo para ser enviado a la IA.
 */
function buildLLMPrompt(patternsContext: DetectedPattern[], userStoryAsString: string): string {
  const patternsString = patternsContext.length > 0
    ? `Adicionalmente, un análisis estructural de la página ha detectado los siguientes patrones de UI: ${JSON.stringify(patternsContext, null, 2)}. Usa este contexto para generar selectores y pasos más precisos y relevantes.`
    : '';

  return `
    CONTEXTO ESTRUCTURAL DE LA PÁGINA:
    ${patternsString}

    CONTEXTO:
    Eres "Visionary QA", un motor de generación de código para pruebas automatizadas con Playwright y TypeScript. Tu única función es analizar los datos de entrada y devolver un objeto JSON estructurado que será usado para generar código de pruebas robusto y mantenible.

    HISTORIA DE USUARIO:
    "${userStoryAsString}"

    TAREA:
   Analiza la IMAGEN ADJUNTA y la HISTORIA DE USUARIO. Basado en ellas, genera un único objeto JSON que tenga exactamente las siguientes dos propiedades de nivel superior: "pageObject" y "testSteps".

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
     * actions: [] (vacío, son solo lectura)
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
           "actions": [],
           "selectors": [
             { "type": "getByText", "value": "string" },
             { "type": "locator", "value": ".alert-danger" }
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
  fullDefinitionPath: string, // <-- LÍNEA MODIFICADA: Ahora recibe la ruta final
  llmService: ILlmService,
): Promise<AIResponse> { // <-- LÍNEA MODIFICADA: El retorno ya no es opcional
  // USA LA RUTA RECIBIDA, YA NO LA CALCULA AQUÍ
  if (fs.existsSync(fullDefinitionPath)) {
    console.log(
      `[LOG] ℹ️ Usando archivo de assets existente: ${path.basename(fullDefinitionPath)}`,
    );
    return JSON.parse(fs.readFileSync(fullDefinitionPath, 'utf8')) as AIResponse;
  }

  console.log(
    `[LOG] 📝 No se encontró ${path.basename(fullDefinitionPath)}. Generando desde la IA...`,
  );
  const baseURL = playwrightConfig.use?.baseURL;
  if (!baseURL) throw new Error('baseURL no está definida en playwright.config.ts');
  const fullUrl = new URL(testCase.path, baseURL).toString();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  await page.mouse.move(100, 100);
  await page.waitForTimeout(800);

  await page.setViewportSize({ width: 1920, height: 1080 });
  console.log(`[LOG] 📸 Navegando a ${fullUrl} para tomar captura y analizar patrones...`);
  await page.goto(fullUrl, { waitUntil: 'networkidle' });

  const patternDetector = new UIPatternDetector();
  const detectedPatterns = await patternDetector.detectPatterns(page);
  console.log(
    `[LOG] ✅ Patrones de UI detectados: ${detectedPatterns.map((p) => p.type).join(', ') || 'Ninguno'}`,
  );

  const screenshotBuffer = await page.screenshot({ fullPage: true });
  await browser.close();
  console.log('[LOG] ✅ Captura de pantalla tomada.');

  console.log('[LOG] 🤖 Construyendo prompt y enviando a la IA...');
  const userStoryAsString = Array.isArray(testCase.userStory) ? testCase.userStory.join('\n') : testCase.userStory;
  // Se asume que tienes una función buildLLMPrompt
  const prompt = buildLLMPrompt(detectedPatterns, userStoryAsString);

  const testAssets = await llmService.getTestAssetsFromIA(
    prompt,
    screenshotBuffer.toString('base64'),
  );
  if (!testAssets) throw new Error('La IA no pudo generar los assets de prueba');

  // LÍNEA AÑADIDA: Guarda el archivo solo cuando se genera
  fs.writeFileSync(fullDefinitionPath, JSON.stringify(testAssets, null, 2));
  console.log(`✨ Assets de IA guardados en: ${fullDefinitionPath}`);

  return testAssets;
}

async function main() {
  console.log('🚀 Iniciando orquestador v11.0 (Logging en Tiempo Real)...');

  const learningSystem = new LearningSystem();
  const failureAnalyzer = new FailureAnalyzer();
  const llmService = getLlmService();
  const memoryService = new MemoryService();
  const testCasePath = process.argv[2];
  if (!testCasePath) {
    console.error('Error: La ruta al archivo .testcase.json es obligatoria.');
    process.exit(1);
  }
  const testCase: TestCase = JSON.parse(fs.readFileSync(testCasePath, 'utf-8'));
  console.log(`📋 Caso de prueba leído: "${testCase.name}"`);

  // --- LÓGICA DE RUTAS CENTRALIZADA Y CORREGIDA ---
  const storiesDir = path.dirname(testCasePath);
  const testCaseName = path.basename(testCasePath, '.testcase.json');
  const assetsDir = path.join(storiesDir, '../generated-assets'); // Apunta a la carpeta correcta
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  const fullDefinitionPath = path.join(assetsDir, `${testCaseName}.ai-assets.json`);
  const fullUrl = new URL(testCase.path, playwrightConfig.use?.baseURL || 'http://localhost').toString();

  let attempt = 0;
  const maxRetries = 1;
  let lastAnalysis: FailureAnalysis | null = null;

  while (attempt <= maxRetries) {
    if (attempt > 0)
      console.log(
        `\n🔄 Reintentando prueba después de auto-reparación (Intento ${attempt + 1})...`,
      );

    // --- LLAMADA MODIFICADA ---
    // Ahora le pasamos la ruta correcta que calculamos aquí.
    const testAssets = await getOrGenerateAssets(testCase, fullDefinitionPath, llmService);

    // LA LÍNEA `fs.writeFileSync` SE ELIMINA DE AQUÍ PORQUE YA SE GUARDA DENTRO DE `getOrGenerateAssets`
    let enhancedAssets = learningSystem.enhanceAIAssets(testAssets, fullUrl);

    const testFileName = testCase.name.replace(/\s+/g, '-').toLowerCase();
    const testFilePath = `tests/generated/${testFileName}.spec.ts`;

    execSync(`npm run generate:pom -- ${fullDefinitionPath}`, { stdio: 'inherit' });
    execSync(`npm run generate:spec -- ${fullDefinitionPath} ${testCasePath}`, {
      stdio: 'inherit',
    });

    try {
      console.log('\n🧪 Ejecutando prueba generada...');
      execSync(`npx playwright test ${testFilePath}`, { stdio: 'inherit' });

      console.log('\n✅ ¡ÉXITO! La prueba se ha ejecutado correctamente.');
      await learningSystem.learnFromSuccess(testCase.name, enhancedAssets, fullUrl, lastAnalysis || undefined);
      break;
    } catch (error) {
      console.error('\n❌ La prueba falló. Iniciando análisis inteligente...');

      let detailedReport = "";
      try {
        execSync(`npx playwright test "${testFilePath}" --reporter=json`, { stdio: 'pipe', encoding: 'utf8' });
      } catch (reportError: any) {
        detailedReport = reportError.stdout?.toString() || String(reportError);
      }

      const analysis = await failureAnalyzer.analyzeFailure(testFilePath, detailedReport, fullDefinitionPath, fullUrl);
      lastAnalysis = analysis;

      const similarSolutions = await memoryService.searchSimilarFailures(analysis.errorMessage);
      if (similarSolutions.length > 0) {
        console.log('✅ ¡Recuerdos encontrados!', similarSolutions);
      } else {
        console.log('🤔 No se encontraron recuerdos similares.');
      }

      await learningSystem.learnFromFailure(enhancedAssets, fullUrl);

      if (attempt < maxRetries) {
        const fixed = await failureAnalyzer.applyFixes(analysis, fullDefinitionPath);
        if (fixed) {
          attempt++;
          continue;
        }
      }

      console.log('⚠️ La auto-reparación no fue posible o ya se intentó. El fallo persiste.');
      process.exit(1);
    }
  }
}


main().catch(console.error);
