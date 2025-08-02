// debug-mcp-raw-output.ts
// Script para ver EXACTAMENTE qué datos expone MCP sin procesar

import { MCPClientService } from './orchestrator/services/McpClientService';

async function debugMCPRawOutput() {
  console.log('🔍 DEBUG: Analizando datos RAW del MCP\n');
  
  const mcpClient = new MCPClientService();
  
  try {
    // 1. Iniciar MCP
    await mcpClient.startMCPServer();
    console.log('✅ MCP iniciado\n');
    
    // 2. Navegar
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    console.log('✅ Navegación completada\n');
    
    // 3. Esperar carga
    await (mcpClient as any).mcpClient.callTool({
      name: 'browser_wait_for',
      arguments: { time: 3000 }
    });
    
    // 4. Obtener snapshot RAW sin procesamiento
    console.log('📸 OBTENIENDO SNAPSHOT RAW...\n');
    
    const snapshotResult = await (mcpClient as any).mcpClient.callTool({
      name: 'browser_snapshot',
      arguments: {}
    });
    
    console.log('='.repeat(80));
    console.log('📄 SNAPSHOT RAW COMPLETO:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(snapshotResult, null, 2));
    console.log('='.repeat(80));
    
    // 5. Si viene en content[0].text, mostrarlo también
    if (snapshotResult.content && snapshotResult.content[0] && snapshotResult.content[0].text) {
      console.log('\n📝 CONTENIDO TEXTO DEL SNAPSHOT:');
      console.log('-'.repeat(60));
      console.log(snapshotResult.content[0].text);
      console.log('-'.repeat(60));
      
      // 6. Analizar patrones en el texto
      const text = snapshotResult.content[0].text;
      
      console.log('\n🔍 ANÁLISIS DE PATRONES:');
      
      // Buscar elementos con [ref=...]
      const refMatches = text.match(/\[ref=\w+\]/g);
      console.log(`   - Elementos con [ref=...]: ${refMatches ? refMatches.length : 0}`);
      if (refMatches) {
        console.log(`     Ejemplos: ${refMatches.slice(0, 5).join(', ')}`);
      }
      
      // Buscar atributos en corchetes
      const attributeMatches = text.match(/\[[^\]]+\]/g);
      const uniqueAttributes = [...new Set(attributeMatches || [])];
      console.log(`   - Atributos únicos encontrados: ${uniqueAttributes.length}`);
      console.log(`     Tipos: ${uniqueAttributes.slice(0, 10).join(', ')}`);
      
      // Buscar roles/elementos
      const roleMatches = text.match(/^\s*-?\s*(\w+)(?:\s|:)/gm);
      const uniqueRoles = [...new Set((roleMatches || []).map(m => m.trim().replace(/^-?\s*/, '').replace(/[:\s].*/, '')))];
      console.log(`   - Roles/elementos detectados: ${uniqueRoles.length}`);
      console.log(`     Tipos: ${uniqueRoles.slice(0, 15).join(', ')}`);
      
      // Buscar strings entre comillas
      const stringMatches = text.match(/"[^"]+"/g);
      console.log(`   - Strings entre comillas: ${stringMatches ? stringMatches.length : 0}`);
      if (stringMatches) {
        console.log(`     Ejemplos: ${stringMatches.slice(0, 5).join(', ')}`);
      }
    }
    
    await mcpClient.stopMCPServer();
    
  } catch (error) {
    console.error('❌ Error:', error);
    try {
      await mcpClient.stopMCPServer();
    } catch (e) {}
  }
}

debugMCPRawOutput().catch(console.error);