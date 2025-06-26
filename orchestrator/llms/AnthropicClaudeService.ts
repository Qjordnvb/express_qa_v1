// orchestrator/llms/AnthropicClaudeService.ts
import Anthropic from '@anthropic-ai/sdk';
import { ILlmService } from './ILlmService';

export class AnthropicClaudeService implements ILlmService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("La variable de entorno ANTHROPIC_API_KEY no está definida.");
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  async getTestAssetsFromIA(userStory: string[], imageBase64: string, detectedPatterns: any[] = []): Promise<any> {
    console.log("Enviando historia de usuario estructurada (Gherkin), imagen y contexto de UI a Google Gemini...");

    const userStoryAsString = userStory.join('\n');

    const patternsContext = detectedPatterns.length > 0
        ? `Adicionalmente, un análisis estructural de la página ha detectado los siguientes patrones de UI: ${JSON.stringify(detectedPatterns, null, 2)}. Usa este contexto para generar selectores y pasos más precisos y relevantes. Por ejemplo, si detectas un 'form', prioriza los selectores dentro de ese formulario.`
        : '';

    // El prompt es el mismo, ya que define el formato de salida que queremos.
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
      const msg = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307", // Usamos el modelo más rápido de Claude
        max_tokens: 4096,
        system: "Tu única función es devolver un objeto JSON válido basado en la tarea y el ejemplo proporcionados, sin ningún texto adicional o envoltura de markdown.",
        messages: [
          {
            "role": "user",
            "content": [
              {
                "type": "image",
                "source": {
                  "type": "base64",
                  "media_type": "image/png",
                  "data": imageBase64,
                },
              },
              {
                "type": "text",
                "text": prompt
              }
            ],
          }
        ]
      });

      // 1. Obtenemos el primer bloque de contenido.
      const contentBlock = msg.content[0];

      // 2. Verificamos que el bloque exista y sea de tipo 'text'.
      if (contentBlock && contentBlock.type === 'text') {
        const responseText = contentBlock.text;

        // Usamos la misma lógica robusta para extraer el JSON
        const startIndex = responseText.indexOf('{');
        const endIndex = responseText.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1) {
          throw new Error("No se encontró un objeto JSON válido en la respuesta de texto de la IA.");
        }
        const jsonString = responseText.substring(startIndex, endIndex + 1);

        console.log("IA (Claude) ha respondido. Parseando JSON...");
        return JSON.parse(jsonString);
      } else {
        // Si la IA no devuelve un bloque de texto, lanzamos un error claro.
        console.error("La respuesta de la IA no fue un bloque de texto válido. Respuesta recibida:", msg.content);
        throw new Error("La respuesta de la IA no tuvo el formato esperado.");
      }

    } catch (error) {
      console.error("Error al comunicarse con la API de Anthropic:", error);
      throw new Error("No se pudo obtener los activos de prueba desde la IA.");
    }
  }
}
