// debug-ai-mcp-decision.ts
// Debug específico para entender por qué la IA solo hace observe

import { MCPClientService } from './orchestrator/services/McpClientService';
import { getLlmService } from './orchestrator/llm-service';

async function debugAIDecision() {
  console.log('🔍 DEBUG: ¿Por qué la IA solo hace observe?\n');
  
  const mcpClient = new MCPClientService();
  const llmService = getLlmService();
  
  try {
    // 1. Iniciar MCP y navegar
    await mcpClient.startMCPServer();
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    
    // Esperar carga
    await (mcpClient as any).mcpClient.callTool({
      name: 'browser_wait_for',
      arguments: { time: 3000 }
    });
    
    // 2. Obtener contexto actual
    const context = await mcpClient.getRealTimeContext();
    
    console.log('📋 ELEMENTOS DETECTADOS POR MCP:');
    console.log(`Total: ${context.interactiveElements.length}`);
    context.interactiveElements.forEach((el: any, index: number) => {
      console.log(`${index + 1}. [${el.role}] "${el.name}" (ref: ${el.ref})`);
    });
    
    // 3. Probar el prompt que recibe la IA
    const userStep = "CUANDO ingreso mi email 'admin@serempre.com' en el campo de Email";
    
    const prompt = `
Eres una IA que controla un navegador web a través de MCP para explorar una aplicación.

PASO ACTUAL DE LA HISTORIA DE USUARIO:
"${userStep}"

PÁGINA ACTUAL:
- URL: ${context.pageInfo.url}  
- Título: ${context.pageInfo.title}

ELEMENTOS INTERACTIVOS DISPONIBLES:
${JSON.stringify(context.interactiveElements.slice(0, 15), null, 2)}

PASOS PREVIOS EJECUTADOS:
- navigate ✅

INSTRUCCIONES:
1. Analiza el paso de la historia de usuario
2. Mira los elementos disponibles en la página actual
3. Decide qué acción específica tomar
4. Encuentra el elemento exacto para interactuar

DEVUELVE UN JSON CON ESTA ESTRUCTURA:
{
  "action": "click|type|wait|observe",
  "element": {
    "role": "button|textbox|link|etc",
    "name": "nombre del elemento",
    "ref": "referencia_del_elemento"
  },
  "params": ["parámetros si los hay"],
  "reasoning": "Por qué elegiste esta acción"
}

Para "type", incluye el texto en params: ["texto_a_escribir"]
Para "wait", incluye milisegundos: [2000]
Para "observe", no necesitas element ni params

EJEMPLOS:
- Paso: "CUANDO hago clic en el botón Continuar"
- Elementos disponibles: [{"role": "button", "name": "Continuar", "ref": "e34"}]
- Respuesta: {"action": "click", "element": {"role": "button", "name": "Continuar", "ref": "e34"}, "reasoning": "Encontré el botón Continuar exacto que menciona la historia"}

- Paso: "CUANDO escribo mi email"  
- Elementos disponibles: [{"role": "textbox", "name": "Email", "ref": "e19"}]
- Respuesta: {"action": "type", "element": {"role": "textbox", "name": "Email", "ref": "e19"}, "params": ["test@example.com"], "reasoning": "Campo de email encontrado, usando email de prueba"}

Devuelve SOLO el JSON solicitado, sin explicaciones adicionales.
`;

    console.log('\n📤 PROMPT ENVIADO A LA IA:');
    console.log('-'.repeat(50));
    console.log(prompt.substring(0, 1000) + '...');
    console.log('-'.repeat(50));
    
    // 4. Obtener respuesta directa de la IA
    console.log('\n🤖 OBTENIENDO RESPUESTA DE LA IA...');
    
    const response = await llmService.getFailureAnalysisFromIA(prompt);
    
    console.log('\n📥 RESPUESTA RAW DE LA IA:');
    console.log('Tipo:', typeof response);
    console.log('Contenido:', JSON.stringify(response, null, 2));
    
    // 5. Intentar parsear como lo hace nuestro código
    if (response && response.repairSuggestion) {
      console.log('\n🔧 INTENTANDO PARSEAR repairSuggestion:');
      console.log('Raw text:', response.repairSuggestion);
      
      try {
        const parsed = JSON.parse(response.repairSuggestion);
        console.log('✅ Parsed JSON:', parsed);
        console.log('Acción decidida:', parsed.action);
        console.log('Elemento:', parsed.element);
        console.log('Razonamiento:', parsed.reasoning);
      } catch (e) {
        console.log('❌ Error parsing repairSuggestion:', e);
        
        // Intentar rootCause
        console.log('\n🔧 INTENTANDO PARSEAR rootCause:');
        console.log('Raw text:', response.rootCause);
        
        try {
          const parsed = JSON.parse(response.rootCause);
          console.log('✅ Parsed JSON from rootCause:', parsed);
        } catch (e2) {
          console.log('❌ Error parsing rootCause:', e2);
        }
      }
    }
    
    // 6. ¿Hay elementos de email disponibles?
    console.log('\n🔍 ANÁLISIS DE ELEMENTOS DISPONIBLES:');
    const emailElements = context.interactiveElements.filter((el: any) => 
      el.name?.toLowerCase().includes('email') || 
      el.role === 'textbox'
    );
    
    console.log(`Elementos relacionados con email: ${emailElements.length}`);
    emailElements.forEach((el: any, index: number) => {
      console.log(`  ${index + 1}. [${el.role}] "${el.name}" (ref: ${el.ref})`);
    });
    
    if (emailElements.length === 0) {
      console.log('⚠️ NO HAY ELEMENTOS DE EMAIL DETECTADOS - Esta podría ser la causa');
    }
    
    await mcpClient.stopMCPServer();
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
    try {
      await mcpClient.stopMCPServer();
    } catch (e) {}
  }
}

debugAIDecision().catch(console.error);