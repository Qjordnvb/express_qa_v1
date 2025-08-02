// test-mcp-membeers.ts
// Prueba específica con Membeers

import { MCPClientService } from './orchestrator/services/McpClientService';

async function testMembeers() {
  console.log('🔍 Probando MCP con Membeers\n');
  
  const mcpClient = new MCPClientService();
  
  try {
    await mcpClient.startMCPServer();
    console.log('✅ MCP iniciado\n');
    
    // Navegar a Membeers sin /login
    console.log('🌐 Navegando a: https://admin-dev.membeers.com');
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com');
    
    // Esperar carga
    await (mcpClient as any).mcpClient.callTool({
      name: 'browser_wait_for',
      arguments: { time: 5000 }
    });
    
    // Obtener contexto completo
    const context = await mcpClient.getRealTimeContext();
    
    console.log('═════════════════════════════════════════════════');
    console.log(`📋 MEMBEERS ANÁLISIS COMPLETO:`);
    console.log(`   URL: ${context.pageInfo.url}`);
    console.log(`   Título: ${context.pageInfo.title}`);
    console.log(`   Elementos interactivos: ${context.interactiveElements.length}`);
    console.log('═════════════════════════════════════════════════\n');
    
    // Mostrar TODOS los elementos encontrados
    if (context.interactiveElements.length > 0) {
      console.log('🎯 TODOS LOS ELEMENTOS DETECTADOS:\n');
      
      context.interactiveElements.forEach((el: any, index: number) => {
        console.log(`${index + 1}. [${el.role}] ref=${el.ref}`);
        if (el.name) console.log(`   Nombre: "${el.name}"`);
        if (el.element) console.log(`   Elemento: ${el.element}`);
        if (el.disabled !== undefined) console.log(`   Deshabilitado: ${el.disabled}`);
        if (el.checked !== undefined) console.log(`   Marcado: ${el.checked}`);
        console.log('');
      });
    } else {
      console.log('⚠️ No se encontraron elementos interactivos');
      
      // Intentar debugging del árbol
      console.log('\n🔍 DEBUG DEL ÁRBOL DE ACCESIBILIDAD:');
      console.log('Tipo:', typeof context.accessibilityTree);
      console.log('Keys:', Object.keys(context.accessibilityTree));
      console.log('Raw data (primeros 1000 chars):');
      console.log(JSON.stringify(context.accessibilityTree, null, 2).substring(0, 1000));
    }
    
    // Información adicional
    console.log('\n📊 INFORMACIÓN ADICIONAL:');
    console.log(`   - Screenshot disponible: ${context.screenshot ? 'Sí' : 'No'}`);
    console.log(`   - Mensajes de consola: ${context.consoleMessages.length}`);
    console.log(`   - Peticiones de red: ${context.networkRequests.length}`);
    
    // Mostrar mensajes de consola si los hay
    if (context.consoleMessages.length > 0) {
      console.log('\n💬 MENSAJES DE CONSOLA:');
      context.consoleMessages.slice(0, 5).forEach((msg: any, index: number) => {
        console.log(`   ${index + 1}. [${msg.level || 'LOG'}] ${msg.message || JSON.stringify(msg)}`);
      });
    }
    
    await mcpClient.stopMCPServer();
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
    try {
      await mcpClient.stopMCPServer();
    } catch (e) {}
  }
}

testMembeers().catch(console.error);