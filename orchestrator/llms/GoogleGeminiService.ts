// orchestrator/llms/GoogleGeminiService.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ILlmService } from './ILlmService'; // <-- AÑADIDO

const generationConfig = {
  temperature: 0.05, // Hacemos a la IA menos "creativa" para que siga el formato
  topK: 1,
  topP: 1,
  maxOutputTokens: 8192,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export class GoogleGeminiService implements ILlmService { // <-- CLASE QUE IMPLEMENTA LA INTERFAZ
  private model;



  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { throw new Error("La variable de entorno GOOGLE_API_KEY no está definida."); }
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('apiKey', apiKey)
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
  }



  async getTestAssetsFromIA(userStory: string[], imageBase64: string, detectedPatterns: any[] = []): Promise<any> {
    console.log("Enviando historia de usuario estructurada (Gherkin), imagen y contexto de UI a Google Gemini...");

    const userStoryAsString = userStory.join('\n');

    const patternsContext = detectedPatterns.length > 0
      ? `Adicionalmente, un análisis estructural de la página ha detectado los siguientes patrones de UI: ${JSON.stringify(detectedPatterns, null, 2)}. Usa este contexto para generar selectores y pasos más precisos y relevantes. Por ejemplo, si detectas un 'form', prioriza los selectores dentro de ese formulario.`
      : '';

    // El prompt que ya perfeccionamos
    const prompt = `

    CONTEXTO ESTRUCTURAL DE LA PÁGINA:
   ${patternsContext}

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
   - Después de hacer clic en botones de navegación (validar URL)
   - Para verificar mensajes de error o éxito
   - Para validar que un valor se ingresó correctamente
   - Para confirmar el estado final de una acción

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



    try {
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: imageBase64 } }] }],
        generationConfig,
        safetySettings,
      });
      const responseText = result.response.text();
      const startIndex = responseText.indexOf('{');
      const endIndex = responseText.lastIndexOf('}');
      if (startIndex === -1 || endIndex === -1) {
        throw new Error("No se encontró un objeto JSON válido en la respuesta de la IA.");
      }
      const jsonString = responseText.substring(startIndex, endIndex + 1);
      console.log("IA ha respondido. Parseando JSON extraído...");
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error al comunicarse con la API de Google AI:", error);
      throw new Error("No se pudo obtener los activos de prueba desde la IA.");
    }


  }

}

