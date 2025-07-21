// orchestrator/llm-service.ts
import { ILlmService } from './llms/ILlmService';
import { GoogleGeminiService } from './llms/GoogleGeminiService';
// Esta función actúa como una fábrica que devuelve el servicio de IA correcto.
export function getLlmService(): ILlmService {
  // Lee la variable de entorno. Si no existe, usa 'google' por defecto.
  const provider = process.env.GOOGLE_API_KEY || 'google';
  console.log(`Usando el proveedor de IA: ${provider}`);
  switch (provider.toLowerCase()) {
    case 'google':
      return new GoogleGeminiService();
    default:
      console.warn(`Proveedor de IA no reconocido: "${provider}". Usando Google por defecto.`);
      return new GoogleGeminiService();
  }
}
