// orchestrator/llm-service.ts
import { ILlmService } from "./llms/ILlmService";
import { GoogleGeminiService } from "./llms/GoogleGeminiService";
import { AnthropicClaudeService } from "./llms/AnthropicClaudeService";
import { OpenAIService } from "./llms/OpenAIService";
// Esta función actúa como una fábrica que devuelve el servicio de IA correcto.
export function getLlmService(): ILlmService {
  // Lee la variable de entorno. Si no existe, usa 'google' por defecto.
  const provider = process.env.OPENAI_API_KEY|| 'openai';
  console.log(`Usando el proveedor de IA: ${provider}`);
  switch (provider.toLowerCase()) {
    case 'anthropic':
       return new AnthropicClaudeService();
    case 'google':
      return new GoogleGeminiService();
    case 'openai':
      return new OpenAIService();
    default:
      console.warn(`Proveedor de IA no reconocido: "${provider}". Usando Google por defecto.`);
      return new GoogleGeminiService();

  }
}
