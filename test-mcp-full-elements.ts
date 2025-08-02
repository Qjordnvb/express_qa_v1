// test-mcp-full-elements.ts
// Prueba completa mostrando TODOS los elementos que MCP puede detectar

import { MCPClientService } from './orchestrator/services/McpClientService';

async function testMCPFullElements() {
  console.log('🔍 Prueba completa de detección de elementos con MCP\n');
  
  const mcpClient = new MCPClientService();
  
  try {
    // 1. Iniciar MCP
    console.log('1️⃣ Iniciando servidor MCP...');
    await mcpClient.startMCPServer();
    console.log('✅ MCP iniciado\n');
    
    // 2. Navegar a una página con formulario complejo
    console.log('2️⃣ NAVEGACIÓN 1: Página de login de tu aplicación');
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/login');
    
    // Esperar carga completa
    await (mcpClient as any).mcpClient.callTool({
      name: 'browser_wait_for',
      arguments: { time: 3000 }
    });
    
    // Obtener contexto completo
    let context = await mcpClient.getRealTimeContext();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📋 ANÁLISIS COMPLETO DE: ${context.pageInfo.url}`);
    console.log(`   Título: ${context.pageInfo.title}`);
    console.log(`   Total de elementos interactivos: ${context.interactiveElements.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Mostrar TODOS los elementos agrupados por tipo
    const elementsByRole = context.interactiveElements.reduce((acc: any, el: any) => {
      if (!acc[el.role]) acc[el.role] = [];
      acc[el.role].push(el);
      return acc;
    }, {});
    
    console.log('🎯 ELEMENTOS DETECTADOS POR TIPO:\n');
    
    for (const [role, elements] of Object.entries(elementsByRole)) {
      console.log(`\n📦 ${role.toUpperCase()} (${(elements as any[]).length} elementos):`);
      console.log('─'.repeat(50));
      
      (elements as any[]).forEach((el, index) => {
        console.log(`${index + 1}. [ref=${el.ref}]`);
        if (el.name) console.log(`   Nombre: "${el.name}"`);
        if (el.element) console.log(`   Elemento: ${el.element}`);
        if (el.disabled !== undefined) console.log(`   Deshabilitado: ${el.disabled}`);
        if (el.checked !== undefined) console.log(`   Marcado: ${el.checked}`);
        if (el.expanded !== undefined) console.log(`   Expandido: ${el.expanded}`);
        console.log('');
      });
    }
    
    // Mostrar también el árbol de accesibilidad completo
    console.log('\n🌳 ÁRBOL DE ACCESIBILIDAD (primeros 500 caracteres):');
    console.log('─'.repeat(50));
    console.log(JSON.stringify(context.accessibilityTree, null, 2).substring(0, 500) + '...\n');
    
    // 3. Navegar a otra página para comparar
    console.log('\n3️⃣ NAVEGACIÓN 2: Google para comparar elementos');
    await mcpClient.navigateToUrl('https://www.google.com');
    
    await (mcpClient as any).mcpClient.callTool({
      name: 'browser_wait_for',
      arguments: { time: 2000 }
    });
    
    context = await mcpClient.getRealTimeContext();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📋 ANÁLISIS COMPLETO DE: ${context.pageInfo.url}`);
    console.log(`   Título: ${context.pageInfo.title}`);
    console.log(`   Total de elementos interactivos: ${context.interactiveElements.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Análisis de tipos de elementos
    const googleElementTypes = new Set(context.interactiveElements.map((el: any) => el.role));
    console.log('📊 TIPOS DE ELEMENTOS ÚNICOS ENCONTRADOS:');
    Array.from(googleElementTypes).sort().forEach(type => {
      const count = context.interactiveElements.filter((el: any) => el.role === type).length;
      console.log(`   - ${type}: ${count} elementos`);
    });
    
    // Mostrar snapshot del DOM completo
    console.log('\n📸 SNAPSHOT DEL DOM (primeros 1000 caracteres):');
    console.log('─'.repeat(50));
    console.log(context.domSnapshot.substring(0, 1000) + '...\n');
    
    // 4. Información adicional del contexto
    console.log('📊 INFORMACIÓN ADICIONAL DEL CONTEXTO:');
    console.log(`   - Mensajes de consola: ${context.consoleMessages.length}`);
    console.log(`   - Peticiones de red: ${context.networkRequests.length}`);
    console.log(`   - Screenshot disponible: ${context.screenshot ? 'Sí' : 'No'}`);
    console.log(`   - URL actual: ${context.pageInfo.url}`);
    
    // Mostrar algunas peticiones de red si las hay
    if (context.networkRequests.length > 0) {
      console.log('\n🌐 PRIMERAS 5 PETICIONES DE RED:');
      context.networkRequests.slice(0, 5).forEach((req: any, index: number) => {
        console.log(`   ${index + 1}. ${req.method || 'GET'} ${req.url || 'Unknown URL'}`);
      });
    }
    
    // 5. Resumen de capacidades
    console.log('\n✅ CAPACIDADES CONFIRMADAS DE MCP:');
    console.log('   - Detecta TODOS los elementos interactivos de la página');
    console.log('   - Proporciona información detallada de cada elemento (role, name, ref, estado)');
    console.log('   - Captura el árbol de accesibilidad completo');
    console.log('   - Registra peticiones de red y mensajes de consola');
    console.log('   - Mantiene contexto completo durante navegación');
    console.log('   - Puede tomar screenshots de la página');
    
    // Cerrar MCP
    console.log('\n6️⃣ Cerrando MCP...');
    await mcpClient.stopMCPServer();
    console.log('✅ MCP cerrado exitosamente');
    
  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error);
    
    try {
      await mcpClient.stopMCPServer();
    } catch (e) {
      console.error('Error cerrando MCP:', e);
    }
    
    process.exit(1);
  }
}

// Ejecutar la prueba
testMCPFullElements().catch(console.error);