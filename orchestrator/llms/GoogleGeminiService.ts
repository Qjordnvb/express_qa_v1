// orchestrator/llms/GoogleGeminiService.ts
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { ILlmService } from './ILlmService';
import { AIResponse } from '../types/types';

export class GoogleGeminiService implements ILlmService {
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('La variable de entorno GEMINI_API_KEY no está definida.');
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    // Configuración del modelo con los parámetros de generación y seguridad
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Modelo que soporta visión
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

