import { AIAsserts } from '../failure-analyzer';
import { DetectedPattern } from '../ui-pattern-detector';

// Este es el "contrato" que cualquier servicio de IA debe cumplir.
export interface ILlmService {
  getTestAssetsFromIA(
    userStory: string[],
    imageBase64: string,
    detectedPatterns?: DetectedPattern[],
  ): Promise<AIAsserts | null>;
}
