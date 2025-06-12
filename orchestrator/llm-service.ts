// orchestrator/llm-service.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) { throw new Error("La variable de entorno GOOGLE_API_KEY no está definida."); }

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Configuración de seguridad para evitar bloqueos
const generationConfig = {
    temperature: 0.2,
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

/**
 * Recibe historia de usuario y una imagen, y devuelve los activos de prueba.
 */
export async function getTestAssetsFromIA(userStory: string, imageBase64: string): Promise<any> {
  console.log("Enviando historia de usuario e imagen a la IA...");

  const prompt = `
    CONTEXTO:
    Eres "Visionary QA", un motor de generación de código para pruebas automatizadas con Playwright y TypeScript. Tu única función es analizar los datos de entrada y devolver un objeto JSON estructurado.

    HISTORIA DE USUARIO:
    "${userStory}"

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
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: imageBase64 } }] }],
      generationConfig,
      safetySettings,
    });

    const responseText = result.response.text();

    // --- LÓGICA DE LIMPIEZA MEJORADA ---
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
      console.error("Respuesta de la IA recibida:", responseText);
      throw new Error("No se encontró un objeto JSON válido en la respuesta de la IA.");
    }

    // Extraemos el substring que contiene solo el objeto JSON.
    const jsonString = responseText.substring(startIndex, endIndex + 1);
    // ------------------------------------

    console.log("IA ha respondido. Parseando JSON extraído...");
    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Error al comunicarse con la API de la IA o al parsear su respuesta:", error);
    throw new Error("No se pudo obtener los activos de prueba desde la IA.");
  }
}
