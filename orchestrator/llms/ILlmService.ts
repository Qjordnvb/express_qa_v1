// orchestrator/llms/ILlmService.ts
import { AIResponse } from '../types/types';

export interface ILlmService {
  /**
   * Obtiene los activos de prueba (Page Objects y Pasos de prueba) desde la IA.
   * Acepta el prompt y una imagen opcional en base64.
   */
  getTestAssetsFromIA(content: string, imageBase64?: string): Promise<AIResponse | null>;

  /**
   * Realiza una consulta genérica a la IA que espera una respuesta JSON.
   */
  getStructuredJsonResponse<T>(prompt: string, imageBase64: string): Promise<T | null>;
}
