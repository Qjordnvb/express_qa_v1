// orchestrator/llms/ILlmService.ts
import { AIResponse } from '../types/types';

// <-- NUEVO: Definimos la estructura de la respuesta del análisis de fallo
export interface AIFailureAnalysis {
  rootCause: string;
  repairSuggestion: string;
}

export interface ILlmService {
  getTestAssetsFromIA(prompt: string, imageBase64: string): Promise<AIResponse | null>;
  // <-- NUEVO: Añade la firma de este nuevo método
  getFailureAnalysisFromIA(prompt: string): Promise<AIFailureAnalysis | null>;
}
