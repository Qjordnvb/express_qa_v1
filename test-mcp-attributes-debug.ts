// test-mcp-attributes-debug.ts
// Test específico para ver la propiedad attributes de MCP

import { MCPClientService } from './orchestrator/services/McpClientService';

async function testMcpAttributesDebug() {
  console.log('\n🔍 TEST: Debug de attributes en MCP');
  console.log('=' .repeat(50));
  
  const mcpClient = new MCPClientService();
  
  try {
    await mcpClient.startMCPServer();
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 1. Obtener contexto usando nuestro método actual
    console.log('\n🧪 TEST 1: getRealTimeContext()');
    console.log('-' .repeat(30));
    
    const context = await mcpClient.getRealTimeContext();
    console.log(`✅ Elementos obtenidos: ${context.interactiveElements.length}`);
    
    // 2. Inspeccionar cada elemento en detalle
    console.log('\n🔍 INSPECCIÓN DETALLADA DE ELEMENTOS:');
    console.log('-' .repeat(40));
    
    context.interactiveElements.forEach((element, index) => {
      console.log(`\n${index + 1}. ELEMENTO [ref=${element.ref}]:`);
      console.log(`   - typeof element: ${typeof element}`);
      console.log(`   - Object.keys: [${Object.keys(element).join(', ')}]`);
      console.log(`   - Role: "${element.role}"`);
      console.log(`   - Name: "${element.name}"`);
      console.log(`   - Text: "${element.text}"`);
      
      // Buscar específicamente la propiedad attributes
      if (element.attributes) {
        console.log(`   - HAS attributes property!`);
        console.log(`   - typeof attributes: ${typeof element.attributes}`);
        console.log(`   - attributes keys: [${Object.keys(element.attributes).join(', ')}]`);
        console.log(`   - attributes content:`, JSON.stringify(element.attributes, null, 6));
      } else {
        console.log(`   - ❌ NO attributes property`);
      }
      
      // Buscar cualquier otra propiedad que pueda contener atributos
      console.log(`   - ALL PROPERTIES AND VALUES:`);
      for (const [key, value] of Object.entries(element)) {
        console.log(`     * ${key}: ${JSON.stringify(value)}`);
      }
    });
    
    // 3. Probar método directo de snapshot
    console.log('\n🧪 TEST 2: browser_snapshot directo');
    console.log('-' .repeat(30));
    
    const client = (mcpClient as any).mcpClient;
    const snapshotResult = await client.callTool({
      name: 'browser_snapshot',
      arguments: {}
    });
    
    console.log('📄 RESPUESTA COMPLETA:');
    console.log(JSON.stringify(snapshotResult, null, 2));
    
    // 4. Probar si McpToolsWrapper expone más información
    console.log('\n🧪 TEST 3: Comparar con proyecto test');
    console.log('-' .repeat(30));
    
    try {
      const { McpToolsWrapper } = await import('./test/core/mcp-client/McpToolsWrapper.js');
      const wrapper = new McpToolsWrapper();
      await wrapper.initialize();
      await wrapper.navigate('https://admin-dev.membeers.com/');
      await wrapper.waitFor({ time: 2000 });
      
      const testSnapshot = await wrapper.snapshot();
      console.log('📸 SNAPSHOT DEL PROYECTO TEST:');
      console.log(`   - Elements count: ${testSnapshot.elements.length}`);
      
      if (testSnapshot.elements.length > 0) {
        console.log('\n🔍 ELEMENTOS DEL PROYECTO TEST:');
        testSnapshot.elements.forEach((el, idx) => {
          console.log(`\n${idx + 1}. TEST ELEMENT [ref=${el.ref}]:`);
          console.log(`   - Keys: [${Object.keys(el).join(', ')}]`);
          console.log(`   - Role: "${el.role}"`);
          console.log(`   - Type: "${el.type}"`);
          console.log(`   - Text: "${el.text}"`);
          
          if (el.attributes) {
            console.log(`   - ✅ HAS attributes!`);
            console.log(`   - attributes:`, JSON.stringify(el.attributes, null, 6));
          } else {
            console.log(`   - ❌ NO attributes`);
          }
        });
      }
      
      await wrapper.cleanup();
    } catch (error) {
      console.log('⚠️ No se pudo probar McpToolsWrapper:', error.message);
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error);
  } finally {
    await mcpClient.stopMCPServer();
  }
}

if (require.main === module) {
  testMcpAttributesDebug().catch(console.error);
}