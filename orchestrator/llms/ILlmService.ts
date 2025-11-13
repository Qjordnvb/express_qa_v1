import { AIAsserts } from '../failure-analyzer';
import { DetectedPattern } from '../ui-pattern-detector';
import { DOMElement } from '../dom-extractor';

// Este es el "contrato" que cualquier servicio de IA debe cumplir.
export interface ILlmService {
  getTestAssetsFromIA(
    userStory: string[],
    imageBase64: string,
    detectedPatterns?: DetectedPattern[],
    domElements?: DOMElement[],
  ): Promise<AIAsserts | null>;
}
