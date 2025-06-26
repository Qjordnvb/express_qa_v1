// orchestrator/llms/OpenAIService.ts
import OpenAI from 'openai';
import { ILlmService } from './ILlmService';

export class OpenAIService implements ILlmService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("La variable de entorno OPENAI_API_KEY no está definida.");
    }
    this.openai = new OpenAI({ apiKey });
  }

  async getTestAssetsFromIA(userStory: string[], imageBase64: string, detectedPatterns: any[] = []): Promise<any> {
    console.log("Enviando historia de usuario estructurada (Gherkin), imagen y contexto de UI a Google Gemini...");

    const userStoryAsString = userStory.join('\n');

    const patternsContext = detectedPatterns.length > 0
        ? `Adicionalmente, un análisis estructural de la página ha detectado los siguientes patrones de UI: ${JSON.stringify(detectedPatterns, null, 2)}. Usa este contexto para generar selectores y pasos más precisos y relevantes. Por ejemplo, si detectas un 'form', prioriza los selectores dentro de ese formulario.`
        : '';

    // El prompt es el mismo, ya que define el formato de salida que queremos.

    const systemPrompt = `Tu única función es devolver un objeto JSON válido y bien estructurado basado en la tarea y el ejemplo. No añadas explicaciones, texto introductorio, ni la envoltura de markdown \`\`\`json. Tu respuesta debe ser directamente el objeto JSON.`;

    const prompt = `

    CONTEXTO ESTRUCTURAL DE LA PÁGINA:
   ${patternsContext}

   CONTEXTO:
   Eres "Visionary QA", un motor de generación de código para pruebas automatizadas con Playwright y TypeScript. Tu única función es analizar los datos de entrada y devolver un objeto JSON estructurado que será usado para generar código de pruebas robusto y mantenible.

   HISTORIA DE USUARIO:
   "${userStoryAsString}"

    TAREA:
    Analiza la IMAGEN ADJUNTA y la HISTORIA DE USUARIO. Basado en ellas, genera un único objeto JSON que tenga exactamente las siguientes dos propiedades de nivel superior: "pageObject" y "testSteps".

    1.  **pageObject**: Un objeto que DEBE contener dos claves:
        * **className**: Un string con el nombre de la clase para el Page Object (ej. "GuestCheckoutPage").
        * **locators**: Un ARRAY de objetos. Cada objeto en el array representa un elemento de la UI y DEBE contener tres claves: "name" (un string en camelCase para la variable), "actions" (un array de strings con las acciones, ej: ["fill", "click"]), y "selectors" (un array de objetos, donde cada objeto define un selector de Playwright con "type" y "value").

    2.  **testSteps**: Un ARRAY de objetos. Cada objeto representa un paso del test y DEBE contener dos claves: "action" (un string con el nombre del método a llamar) y "params" (un array de strings con los parámetros).

    REQUISITOS ESTRICTOS DE FORMATO:
    - Tu respuesta DEBE ser únicamente el objeto JSON.
    - No incluyas explicaciones, texto introductorio, ni la envoltura \`\`\`json.
    - Sigue el siguiente ejemplo de estructura AL PIE DE LA LETRA.

    EJEMPLO DE SALIDA EXACTA ESPERADA:
    {
      "pageObject": {
        "className": "GuestCheckoutPage",
        "locators": [
          {
            "name": "firstNameInput",
            "actions": ["fill"],
            "selectors": [
              { "type": "getByRole", "value": "textbox", "options": { "name": "First Name" } },
              { "type": "locator", "value": "#input-payment-firstname" }
            ]
          },
          {
            "name": "continueButton",
            "actions": ["click"],
            "selectors": [
              { "type": "getByRole", "value": "button", "options": { "name": "Continue" } },
              { "type": "locator", "value": "#button-guest" }
            ]
          }
        ]
      },
      "testSteps": [
        { "action": "navigate", "params": ["index.php?route=checkout/checkout"] },
        { "action": "fillFirstNameInput", "params": ["John"] },
        { "action": "clickContinueButton", "params": [] }
      ]
    }
  `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        max_tokens: 4096,
        temperature: 0.1, // Temperatura baja para respuestas predecibles
        // MEJORA 2: Forzamos la salida en formato JSON.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  "url": `data:image/png;base64,${imageBase64}`
                },
              },
            ],
          },
        ],
      });

      const responseText = response.choices[0].message.content;
      if (!responseText) {
        throw new Error("La respuesta de la IA de OpenAI vino vacía.");
      }

      console.log("IA (OpenAI) ha respondido. Parseando JSON...");
      return JSON.parse(responseText);

    } catch (error) {
      console.error("Error al comunicarse con la API de OpenAI:", error);
      throw new Error("No se pudo obtener los activos de prueba desde la IA.");
    }
  }
}
