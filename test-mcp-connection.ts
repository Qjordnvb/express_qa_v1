// test-mcp-connection.ts
// Script para probar la conexión y funcionalidad básica de MCP

import { MCPClientService } from './orchestrator/services/McpClientService';

async function testMCPConnection() {
  console.log('🧪 Iniciando prueba de conexión MCP...\n');
  
  const mcpClient = new MCPClientService();
  
  try {
    // 1. Iniciar servidor MCP
    console.log('1️⃣ Iniciando servidor MCP...');
    await mcpClient.startMCPServer();
    console.log('✅ Servidor MCP iniciado correctamente\n');
    
    // 2. Navegar a una página de prueba
    console.log('2️⃣ Navegando a Google...');
    await mcpClient.navigateToUrl('https://www.google.com');
    console.log('✅ Navegación exitosa\n');
    
    // 3. Obtener contexto de la página
    console.log('3️⃣ Obteniendo contexto de la página...');
    const context = await mcpClient.getRealTimeContext();
    
    console.log('📋 Información de la página:');
    console.log(`   - URL: ${context.pageInfo.url}`);
    console.log(`   - Título: ${context.pageInfo.title}`);
    console.log(`   - Elementos interactivos encontrados: ${context.interactiveElements.length}`);
    
    // Mostrar algunos elementos interactivos
    console.log('\n🎯 Primeros 5 elementos interactivos:');
    context.interactiveElements.slice(0, 5).forEach((el, index) => {
      console.log(`   ${index + 1}. [${el.role}] ${el.name || 'Sin nombre'} (ref: ${el.ref})`);
    });
    
    // 4. Verificar que podemos obtener un screenshot
    console.log('\n4️⃣ Probando captura de screenshot...');
    const screenshotAvailable = context.screenshot ? 'Sí' : 'No';
    console.log(`   - Screenshot disponible: ${screenshotAvailable}`);
    
    // 5. Cerrar servidor MCP
    console.log('\n5️⃣ Cerrando servidor MCP...');
    await mcpClient.stopMCPServer();
    console.log('✅ Servidor MCP cerrado correctamente');
    
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error);
    
    // Intentar cerrar MCP en caso de error
    try {
      await mcpClient.stopMCPServer();
    } catch (e) {
      console.error('Error adicional al cerrar MCP:', e);
    }
    
    process.exit(1);
  }
}

// Ejecutar la prueba
testMCPConnection().catch(console.error);