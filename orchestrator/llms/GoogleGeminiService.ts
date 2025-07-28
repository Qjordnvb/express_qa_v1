// orchestrator/llms/GoogleGeminiService.ts
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { ILlmService, AIFailureAnalysis } from './ILlmService';
import { AIResponse } from '../types/types';
import { MCPClientService } from '../services/McpClientService';

export class GoogleGeminiService implements ILlmService {
  private model: any;
  private mcpClient: MCPClientService;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('La variable de entorno GEMINI_API_KEY no está definida.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.mcpClient = new MCPClientService();

    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
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
    const imageParts = imageBase64 ? [{ inlineData: { mimeType: 'image/png', data: imageBase64 } }] : [];
    return this.generateStructuredJson(content, imageParts);
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

    // NUEVO: Enriquecer el prompt con contexto MCP si está disponible
    if (url) {
      try {
        console.log('🔍 Obteniendo contexto en tiempo real vía MCP...');
        const mcpContext = await this.mcpClient.getRealTimeContext(url);

        enrichedPrompt = `${prompt}

  **CONTEXTO ADICIONAL EN TIEMPO REAL (MCP):**
  - **Accessibility Tree:**
  \`\`\`
  ${JSON.stringify(mcpContext.accessibilityTree, null, 2)}
  \`\`\`

  - **Interactive Elements:**
  \`\`\`
  ${JSON.stringify(mcpContext.interactiveElements, null, 2)}
  \`\`\`

  - **Console Messages:**
  \`\`\`
  ${JSON.stringify(mcpContext.consoleMessages, null, 2)}
  \`\`\`

  - **Network Requests:**
  \`\`\`
  ${JSON.stringify(mcpContext.networkRequests, null, 2)}
  \`\`\`

  - **Page Info:**
  \`\`\`
  ${JSON.stringify(mcpContext.pageInfo, null, 2)}
  \`\`\`

  **INSTRUCCIÓN ESPECIAL:**
  Usa PRIORITARIAMENTE el contexto MCP para entender el estado actual de la página.
  El accessibility tree te da una vista estructural precisa del DOM.
  Los interactive elements muestran exactamente qué elementos están disponibles.
  Los console messages pueden indicar problemas de JavaScript.
  Los network requests pueden mostrar fallos de comunicación.`;

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
      const jsonText = response.text().replace(/^```json/gm, '').replace(/```$/gm, '').trim();
      return JSON.parse(jsonText) as T;
    } catch (error) {
      console.error('Error al procesar la respuesta de Gemini:', error);
      return null;
    }
  }
}
