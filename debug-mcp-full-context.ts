// debug-mcp-full-context.ts
// Navegue a Membeers y muestre TODO lo que ve MCP

import { MCPClientService } from './orchestrator/services/McpClientService';

async function debugMCPFullContext() {
  console.log('🔍 DEBUG: CONTEXTO COMPLETO DE MCP EN MEMBEERS\n');
  
  const mcpClient = new MCPClientService();
  
  try {
    await mcpClient.startMCPServer();
    console.log('✅ MCP iniciado\n');
    
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    console.log('✅ Navegado a Membeers\n');
    
    // Esperar carga
    await (mcpClient as any).mcpClient.callTool({
      name: 'browser_wait_for',
      arguments: { time: 3000 }
    });
    
    console.log('📊 OBTENIENDO CONTEXTO COMPLETO...\n');
    
    const context = await mcpClient.getRealTimeContext();
    
    console.log('='.repeat(80));
    console.log('📄 INFORMACIÓN DE LA PÁGINA');
    console.log('='.repeat(80));
    console.log(`URL: ${context.pageInfo.url}`);
    console.log(`Título: ${context.pageInfo.title}`);
    console.log('');
    
    console.log('='.repeat(80));
    console.log('🎯 ELEMENTOS INTERACTIVOS (interactiveElements)');
    console.log('='.repeat(80));
    console.log(`Total: ${context.interactiveElements.length}`);
    context.interactiveElements.forEach((el: any, index: number) => {
      console.log(`\n${index + 1}. ELEMENTO:`);
      console.log(`   - role: "${el.role}"`);
      console.log(`   - name: "${el.name}"`);
      console.log(`   - element: "${el.element}"`);
      console.log(`   - ref: "${el.ref}"`);
      if (el.disabled !== undefined) console.log(`   - disabled: ${el.disabled}`);
      if (el.checked !== undefined) console.log(`   - checked: ${el.checked}`);
      if (el.expanded !== undefined) console.log(`   - expanded: ${el.expanded}`);
      // NUEVO: Mostrar información adicional si existe
      if (el.inputType) console.log(`   - inputType: "${el.inputType}"`);
      if (el.placeholder) console.log(`   - placeholder: "${el.placeholder}"`);
      if (el.className) console.log(`   - className: "${el.className}"`);
      if (el.elementId) console.log(`   - elementId: "${el.elementId}"`);
      if (el.tagName) console.log(`   - tagName: "${el.tagName}"`);
      if (el.type) console.log(`   - type: "${el.type}"`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🌐 ELEMENTOS DEL DOM (domElements)');
    console.log('='.repeat(80));
    if (context.domElements && context.domElements.length > 0) {
      console.log(`Total: ${context.domElements.length}`);
      context.domElements.forEach((el: any, index: number) => {
        console.log(`\n${index + 1}. ELEMENTO DOM:`);
        console.log(`   - role: "${el.role}"`);
        console.log(`   - type: "${el.type}"`);
        console.log(`   - name: "${el.name}"`);
        console.log(`   - placeholder: "${el.placeholder}"`);
        console.log(`   - tagName: "${el.tagName}"`);
        console.log(`   - ref: "${el.ref}"`);
        console.log(`   - id: "${el.id}"`);
        if (el.selectors && el.selectors.length > 0) {
          console.log(`   - selectors: ${el.selectors.length} tipos`);
          el.selectors.forEach((sel: any, selIndex: number) => {
            console.log(`     ${selIndex + 1}. ${sel.type}: "${sel.value}"${sel.options ? ` (options: ${JSON.stringify(sel.options)})` : ''}`);
          });
        }
      });
    } else {
      console.log('❌ NO HAY ELEMENTOS DEL DOM - ESTE ES EL PROBLEMA');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ÁRBOL DE ACCESIBILIDAD RAW');
    console.log('='.repeat(80));
    console.log('Tipo:', typeof context.accessibilityTree);
    console.log('Keys:', Object.keys(context.accessibilityTree));
    const treeString = JSON.stringify(context.accessibilityTree, null, 2);
    console.log('Contenido (primeros 2000 chars):');
    console.log(treeString.substring(0, 2000));
    if (treeString.length > 2000) {
      console.log('... (truncado)');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('💬 MENSAJES DE CONSOLA');
    console.log('='.repeat(80));
    console.log(`Total: ${context.consoleMessages.length}`);
    context.consoleMessages.slice(0, 5).forEach((msg: any, index: number) => {
      console.log(`${index + 1}. ${JSON.stringify(msg)}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🌐 PETICIONES DE RED');
    console.log('='.repeat(80));
    console.log(`Total: ${context.networkRequests.length}`);
    context.networkRequests.slice(0, 5).forEach((req: any, index: number) => {
      console.log(`${index + 1}. ${JSON.stringify(req)}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📸 SCREENSHOT');
    console.log('='.repeat(80));
    console.log(`Disponible: ${context.screenshot ? 'Sí' : 'No'}`);
    if (context.screenshot) {
      console.log(`Tamaño: ${context.screenshot.length} bytes`);
    }
    
    await mcpClient.stopMCPServer();
    
  } catch (error) {
    console.error('❌ Error:', error);
    try {
      await mcpClient.stopMCPServer();
    } catch (e) {}
  }
}

debugMCPFullContext().catch(console.error);