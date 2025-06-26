// Este es el "contrato" que cualquier servicio de IA debe cumplir.
export interface ILlmService {

  getTestAssetsFromIA(userStory: string[], imageBase64: string, detectedPatterns?: any[]): Promise<any>;
}
