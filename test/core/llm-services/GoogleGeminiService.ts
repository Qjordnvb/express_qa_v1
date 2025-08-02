// orchestrator/llms/GoogleGeminiService.ts
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { ILlmService, AIFailureAnalysis } from './ILlmService';
import { AIResponse } from '../types/types';
import { StableMcpService } from '../claude-code-integration/StableMcpService';

export class GoogleGeminiService implements ILlmService {
  private model: any;
  private mcpClient: StableMcpService;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('La variable de entorno GOOGLE_API_KEY no está definida.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.mcpClient = new StableMcpService();

    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 1,
        maxOutputTokens: 32768,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });
  }

  public async getTestAssetsFromIA(content: string, imageBase64?: string): Promise<AIResponse | null> {
    // Skip image if empty or invalid
    if (!imageBase64 || imageBase64.trim() === '' || imageBase64.length < 1000) {
      console.log(`🔍 Screenshot not available or invalid (${imageBase64?.length || 0} chars), generating without visual context`);
      return this.generateStructuredJson(content, []);
    }

    console.log(`📸 Screenshot available: ${imageBase64.length} chars - processing for Google Gemini`);

    // Detect image type from base64 data
    let mimeType = 'image/jpeg'; // MCP screenshots are JPEG by default
    if (imageBase64.startsWith('iVBORw0KGgo')) {
      mimeType = 'image/png';
    } else if (imageBase64.startsWith('/9j/')) {
      mimeType = 'image/jpeg';
    }

    // Validate base64 string
    try {
      // Test if it's valid base64
      Buffer.from(imageBase64, 'base64');
      console.log(`🖼️ Using screenshot with detected MIME type: ${mimeType}, length: ${imageBase64.length}`);
      const imageParts = [{ inlineData: { mimeType, data: imageBase64 } }];
      return this.generateStructuredJson(content, imageParts);
    } catch (error) {
      console.warn('⚠️ Invalid base64 image data, generating without visual context');
      return this.generateStructuredJson(content, []);
    }
  }

  public async getStructuredJsonResponse<T>(prompt: string, imageBase64: string): Promise<T | null> {
    const imagePart = { inlineData: { mimeType: 'image/png', data: imageBase64 } };
    return this.generateStructuredJson(prompt, [imagePart]);
  }

  /**
   * Análisis de fallo MEJORADO con contexto MCP
   * @param prompt El prompt base para el análisis
   * @param url URL de la página donde ocurrió el fallo
   * @returns Análisis enriquecido con contexto en tiempo real
   */
  async getFailureAnalysisFromIA(prompt: string, url?: string): Promise<AIFailureAnalysis | null> {
    console.log('🤖 Enviando prompt de análisis de fallo a la IA...');

    let enrichedPrompt = prompt;

    // 🚀 NUEVO: Enriquecer el prompt con contexto MCP REAL si está disponible
    if (url) {
      try {
        console.log('🔍 Obteniendo contexto REAL en tiempo real vía MCP...');
        const mcpContext = await this.mcpClient.getRealTimeContext(url);

        // 🎯 PROMPT ENRIQUECIDO CON CONTEXTO REAL
        enrichedPrompt = `${prompt}

**CONTEXTO MCP REAL DETECTADO:**
- URL Navegada: ${mcpContext.pageInfo.url}
- Título de Página: ${mcpContext.pageInfo.title}
- Interactive Elements Reales: ${mcpContext.interactiveElements?.length || 0} elementos encontrados
- DOM Snapshot: Disponible (${mcpContext.domSnapshot.length} caracteres)
- Console Errors: ${mcpContext.consoleErrors?.length || 0} errores
- Network Requests: ${mcpContext.mcpNetworkRequests?.length || 0} requests

**ELEMENTOS INTERACTIVOS REALES DETECTADOS:**
${mcpContext.interactiveElements?.slice(0, 10).map((element, index) =>
  `${index + 1}. ${(element as any).role || (element as any).tagName}: "${(element as any).name || (element as any).textContent || (element as any).placeholder || 'Sin nombre'}" (${(element as any).disabled ? 'disabled' : 'enabled'})`
).join('\n') || 'Ninguno detectado'}

**DOM SNAPSHOT (Primeros 500 caracteres):**
${mcpContext.domSnapshot.substring(0, 500)}...

**INSTRUCCIONES BASADAS EN CONTEXTO REAL:**
Usando la información REAL del navegador arriba, genera el JSON con:
1. Locators precisos basados en los elementos reales detectados
2. TestSteps que coincidan con los elementos disponibles
3. Selectores múltiples para robustez

**FORMATO REQUERIDO - IMPORTANTE:**
Genera SOLO el JSON, sin explicaciones adicionales.

\`\`\`json
{
  "pageObject": {
    "className": "LoginPage",
    "locators": [
      {
        "name": "emailField",
        "elementType": "input",
        "actions": ["fill", "clear"],
        "selectors": [
          {"type": "getByRole", "value": "textbox", "options": {"name": "Email"}},
          {"type": "css", "value": "input[type='email']"},
          {"type": "css", "value": "input[name='email']"}
        ]
      }
    ]
  },
  "testSteps": [
    {
      "action": "navigate",
      "params": ["/login"]
    },
    {
      "action": "clickLoginButton",
      "params": []
    }
  ]
}
\`\`\`

**INSTRUCCIÓN ESPECIAL:**
Genera SOLO el JSON válido, sin comentarios, sin explicaciones adicionales. Usa los elementos REALES detectados por MCP.`;

        console.log('✅ Contexto MCP añadido al análisis');

      } catch (error) {
        console.warn('⚠️ No se pudo obtener contexto MCP, usando análisis básico:', error);
      }
    }

    return this.generateStructuredJson(enrichedPrompt);
  }

  /**
   * NUEVO: Método para obtener contexto directo de una URL
   */
  async getPageContext(url: string): Promise<any> {
    try {
      return await this.mcpClient.getRealTimeContext(url);
    } catch (error) {
      console.error('Error obteniendo contexto de página:', error);
      return null;
    }
  }

  private async generateStructuredJson<T>(promptText: string, imageParts: any[] = []): Promise<T | null> {
    console.log('Enviando petición a Google Gemini API...');
    try {
      const result = await this.model.generateContent([promptText, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      // ✅ USAR LÓGICA MEJORADA de simple-ai-test.ts
      let jsonText = '';
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Buscar JSON sin markdown
        const directMatch = text.match(/\{[\s\S]*\}/);
        if (directMatch) {
          jsonText = directMatch[0];
        }
      }

      if (jsonText) {
        // Limpiar el JSON de caracteres problemáticos
        jsonText = jsonText
          .replace(/\/\/.*$/gm, '')           // Remover comentarios (incluso en línea)
          .replace(/,\s*\/\/.*$/gm, ',')      // Remover comentarios después de comas
          .replace(/[\x00-\x1F\x7F]/g, '')    // Remover caracteres de control
          .replace(/,\s*}/g, '}')             // Remover comas finales
          .replace(/,\s*]/g, ']')             // Remover comas finales en arrays
          .replace(/"\s*\n\s*"/g, '"')        // Unir strings partidas
          .trim();

        // 🛠️ REPARACIÓN AUTOMÁTICA DE JSON TRUNCADO
        jsonText = this.repairTruncatedJson(jsonText);

        console.log('🔧 JSON limpiado para parsing');
        console.log('📄 JSON que se va a parsear:', jsonText.substring(0, 200) + '...');

        try {
          return JSON.parse(jsonText) as T;
        } catch (parseError) {
          console.log('❌ Error parsing JSON. Contenido completo:');
          console.log(jsonText);

          // Intentar una segunda reparación más agresiva
          const repairedJson = this.aggressiveJsonRepair(jsonText);
          if (repairedJson) {
            console.log('🔧 Intentando reparación agresiva...');
            console.log('📄 JSON reparado (primeros 300 chars):', repairedJson.substring(0, 300) + '...');
            console.log('📄 JSON reparado (últimos 100 chars):', '...' + repairedJson.slice(-100));
            try {
              return JSON.parse(repairedJson) as T;
            } catch (secondError) {
              console.log('❌ Reparación agresiva también falló');
              console.log('❌ Error específico:', (secondError as Error).message);

              // 🔄 OPCIÓN 4: Retry con JSON parcial
              console.log('🔄 Intentando completar JSON truncado...');
              const completedJson = await this.completePartialJson(jsonText);
              if (completedJson) {
                try {
                  return JSON.parse(completedJson) as T;
                } catch (thirdError) {
                  console.log('❌ JSON completado también falló:', (thirdError as Error).message);
                }
              }
            }
          }

          throw parseError;
        }
      } else {
        console.log('⚠️ No se pudo extraer JSON válido de la respuesta');
        console.log('📄 Respuesta completa:', text.substring(0, 500) + '...');
        return null;
      }

    } catch (error) {
      console.error('Error al procesar la respuesta de Gemini:', error);
      return null;
    }
  }

  /**
   * 🛠️ Reparar JSON truncado automáticamente
   */
  private repairTruncatedJson(jsonText: string): string {
    // Contar llaves y corchetes para detectar truncamiento
    const openBraces = (jsonText.match(/\{/g) || []).length;
    const closeBraces = (jsonText.match(/\}/g) || []).length;
    const openBrackets = (jsonText.match(/\[/g) || []).length;
    const closeBrackets = (jsonText.match(/\]/g) || []).length;

    let repaired = jsonText;

    // Reparar llaves faltantes
    const missingBraces = openBraces - closeBraces;
    if (missingBraces > 0) {
      console.log(`🔧 Agregando ${missingBraces} llaves de cierre faltantes`);
      repaired += '}' .repeat(missingBraces);
    }

    // Reparar corchetes faltantes
    const missingBrackets = openBrackets - closeBrackets;
    if (missingBrackets > 0) {
      console.log(`🔧 Agregando ${missingBrackets} corchetes de cierre faltantes`);
      repaired += ']'.repeat(missingBrackets);
    }

    // Reparar strings incompletas
    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      console.log('🔧 Cerrando string incompleta');
      repaired += '"';
    }

    return repaired;
  }

  /**
   * 🔄 Completar JSON parcial usando retry inteligente
   */
  private async completePartialJson(partialJson: string): Promise<string | null> {
    try {
      console.log('🔄 Detectando punto de truncamiento...');

      // Crear prompt para continuar desde donde se quedó
      const continuePrompt = `
El siguiente JSON está incompleto/truncado. Por favor, COMPLÉTALO desde donde se cortó:

JSON PARCIAL:
${partialJson}

INSTRUCCIONES:
1. Analiza dónde se cortó el JSON
2. Genera SOLO la parte faltante para completarlo
3. NO regeneres lo que ya existe
4. Asegúrate que el resultado final sea JSON válido
5. Responde SOLO con la parte faltante, sin explicaciones

PARTE FALTANTE:`;

      console.log('🔄 Enviando petición para completar JSON...');

      const result = await this.model.generateContent([{
        text: continuePrompt
      }]);

      if (!result.response) {
        console.log('❌ No se recibió respuesta para completar JSON');
        return null;
      }

      let completionText = result.response.text();
      console.log('🔄 Parte faltante recibida:', completionText.substring(0, 200) + '...');

      // Limpiar markdown y caracteres extra de la respuesta
      completionText = completionText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/^\/\/.*$/gm, '') // Remover comentarios
        .trim();

      // Combinar JSON partial + completion limpia
      const combinedJson = partialJson + completionText;

      console.log('🔄 JSON combinado (primeros 300 chars):', combinedJson.substring(0, 300) + '...');
      console.log('🔄 JSON combinado (últimos 100 chars):', '...' + combinedJson.slice(-100));

      return combinedJson;

    } catch (error) {
      console.log('❌ Error completando JSON parcial:', error);
      return null;
    }
  }

  /**
   * 🔧 Reparación agresiva para casos extremos
   */
  private aggressiveJsonRepair(jsonText: string): string | null {
    try {
      // Intentar encontrar el patrón común y repararlo
      let repaired = jsonText;

      // 🔧 LIMPIAR CARACTERES BASURA AL FINAL
      // Remover todo después del último } válido
      const lastValidBrace = repaired.lastIndexOf('}');
      if (lastValidBrace > -1) {
        const afterBrace = repaired.substring(lastValidBrace + 1);
        if (afterBrace.match(/[^\s]/)) {
          console.log('🔧 Removiendo caracteres basura al final:', afterBrace);
          repaired = repaired.substring(0, lastValidBrace + 1);
        }
      }

      // 🔧 REPARAR URLs TRUNCADAS Y MALFORMADAS
      // Buscar patrones como: "params": ["https:    },
      if (repaired.includes('"params": ["https:')) {
        console.log('🔧 Reparando URL truncada en params');
        // Reemplazar cualquier URL truncada con la ruta correcta
        repaired = repaired.replace(
          /"params":\s*\[\s*"https:[^"]*"?\s*(?:,.*?)?\s*\]/g,
          '"params": ["/login"]'
        );
      }

      // 🔧 REPARAR ENTRADAS MALFORMADAS EN PARAMS
      // Caso: "params": ["https:    },
      repaired = repaired.replace(
        /"params":\s*\[\s*"[^"]*"\s*\}\s*,/g,
        '"params": ["/login"]  },'
      );

      // 🔧 REPARAR BLOQUES DE ACCIÓN MALFORMADOS
      repaired = repaired.replace(
        /\{\s*"action":\s*"navigate",\s*"params":\s*\[\s*"https:[^}]*\}/g,
        '{ "action": "navigate", "params": ["/login"] }'
      );

      // Agregar estructura mínima si está muy corrupta
      if (!repaired.includes('"testSteps"')) {
        console.log('🔧 Agregando estructura mínima de testSteps');
        const basicSteps = `
  ],
  "testSteps": [
    {
      "action": "navigate",
      "params": ["/login"]
    },
    {
      "action": "fillEmailField",
      "params": ["example@example.com"]
    },
    {
      "action": "fillPasswordField",
      "params": ["xxxxxxxxxxxxx***$"]
    },
    {
      "action": "clickLoginButton",
      "params": []
    }
  ]
}`;

        // Encontrar donde termina los locators y agregar testSteps
        const locatorsEnd = repaired.lastIndexOf(']');
        if (locatorsEnd > -1) {
          repaired = repaired.substring(0, locatorsEnd + 1) + basicSteps;
        }
      }

      return this.repairTruncatedJson(repaired);
    } catch (error) {
      console.log('❌ Error en reparación agresiva:', error);
      return null;
    }
  }
}
