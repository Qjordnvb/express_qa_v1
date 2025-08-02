// test-mcp-raw-data.ts
// Test sencillo para ver EXACTAMENTE qué datos expone MCP

import { MCPClientService } from './orchestrator/services/McpClientService';

async function testMcpRawData() {
  console.log('\n🔍 TEST: Datos crudos de MCP');
  console.log('=' .repeat(50));
  console.log('🎯 Objetivo: Ver EXACTAMENTE qué expone MCP');
  
  const mcpClient = new MCPClientService();
  
  try {
    await mcpClient.startMCPServer();
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const client = (mcpClient as any).mcpClient;
    
    // 1. PROBAR browser_snapshot
    console.log('\n🧪 TEST 1: browser_snapshot');
    console.log('-' .repeat(30));
    
    const snapshotResult = await client.callTool({
      name: 'browser_snapshot',
      arguments: {}
    });
    
    console.log('📄 RESPUESTA COMPLETA de browser_snapshot:');
    console.log(JSON.stringify(snapshotResult, null, 2));
    
    // 2. ANALIZAR CONTENIDO DEL SNAPSHOT
    if (snapshotResult.content && Array.isArray(snapshotResult.content)) {
      const textContent = snapshotResult.content.find((item: any) => item.type === 'text');
      
      if (textContent?.text) {
        console.log('\n📝 TEXTO YAML EXTRAÍDO:');
        console.log('-' .repeat(30));
        console.log(textContent.text);
        
        // 3. PARSEAR YAML MANUALMENTE
        console.log('\n🔍 PARSEANDO YAML LÍNEA POR LÍNEA:');
        console.log('-' .repeat(30));
        
        const lines = textContent.text.split('\n');
        let elementCount = 0;
        
        for (const [index, line] of lines.entries()) {
          // Buscar elementos con [ref=xxx]
          const refMatch = line.match(/\[ref=([^\]]+)\]/);
          if (refMatch) {
            elementCount++;
            console.log(`\n${elementCount}. LÍNEA ${index + 1}:`);
            console.log(`   Línea completa: "${line}"`);
            console.log(`   Ref extraído: "${refMatch[1]}"`);
            
            // Extraer TODOS los atributos en [key=value]
            const allMatches = line.matchAll(/\[([^=]+)=([^\]]+)\]/g);
            console.log(`   Todos los atributos encontrados:`);
            
            for (const match of allMatches) {
              console.log(`     ${match[1]}: "${match[2]}"`);
            }
            
            // Extraer texto entre comillas
            const textMatch = line.match(/"([^"]+)"/);
            if (textMatch) {
              console.log(`   Texto: "${textMatch[1]}"`);
            }
            
            // Extraer tipo de elemento (primera palabra después del -)
            const typeMatch = line.match(/^\s*-\s+(\w+)/);
            if (typeMatch) {
              console.log(`   Tipo: "${typeMatch[1]}"`);
            }
          }
        }
        
        console.log(`\n📊 RESUMEN: ${elementCount} elementos encontrados`);
      }
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error);
  } finally {
    await mcpClient.stopMCPServer();
  }
}

if (require.main === module) {
  testMcpRawData().catch(console.error);
}