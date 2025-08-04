// orchestrator/llms/ILlmService.ts
import { AIResponse } from '../types/types';

// <-- ESTRUCTURA para análisis de fallos
export interface AIFailureAnalysis {
  rootCause: string;
  repairSuggestion: string;
}

// <-- NUEVA: Estructura para decisiones de navegación MCP
export interface AINavigationDecision {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'observe';
  element?: {
    role: string;
    name: string;
    ref: string;
  };
  params?: any[];
  reasoning: string;
  // Propiedades para exploración inteligente
  requiresRealExploration?: boolean;
  actionType?: string;
  targetElement?: string;
}

export interface ILlmService {
  getTestAssetsFromIA(prompt: string, imageBase64: string): Promise<AIResponse | null>;
  getFailureAnalysisFromIA(prompt: string): Promise<AIFailureAnalysis | null>;
  // <-- NUEVO: Método específico para decisiones de navegación
  getNavigationDecisionFromIA(prompt: string): Promise<AINavigationDecision | null>;
}
