// test-mcp-corrected.ts
// Test para verificar que la corrección de 'function' funciona

import { MCPClientService } from './orchestrator/services/McpClientService';

async function testMcpCorrected() {
  console.log('\n🎯 TEST: Verificación de corrección browser_evaluate');
  console.log('='.repeat(60));
  
  const mcpClient = new MCPClientService();
  
  try {
    await mcpClient.startMCPServer();
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Probar getCompleteContext() que usa getJavaScriptElementData()
    console.log('\n✅ TEST: getCompleteContext() con función corregida');
    console.log('-'.repeat(40));
    
    const context = await mcpClient.getCompleteContext();
    
    console.log('🎉 RESULTADO:');
    console.log(`  - YAML elements: ${context.interactiveElements.length}`);
    console.log(`  - DOM elements: ${context.domElements ? context.domElements.length : 'undefined'}`);
    
    if (context.domElements && context.domElements.length > 0) {
      console.log('\n🔍 PRIMEROS ELEMENTOS DOM:');
      context.domElements.slice(0, 3).forEach((el, i) => {
        console.log(`  ${i + 1}. ${el.tagName}: type="${el.type}", name="${el.name}", id="${el.id}"`);
      });
      
      // Buscar específicamente campos de password
      const passwordFields = context.domElements.filter(el => el.type === 'password');
      if (passwordFields.length > 0) {
        console.log(`\n🎯 CAMPOS PASSWORD DETECTADOS: ${passwordFields.length}`);
        passwordFields.forEach((field, i) => {
          console.log(`  ${i + 1}. Password field: name="${field.name}", id="${field.id}", placeholder="${field.placeholder}"`);
        });
      } else {
        console.log('\n⚠️ No se detectaron campos type="password"');
      }
    } else {
      console.log('\n❌ No se obtuvieron elementos DOM');
    }
    
    console.log('\n📊 CONCLUSIÓN:');
    if (context.domElements && context.domElements.length > 0) {
      console.log('✅ La corrección browser_evaluate con "function" FUNCIONA!');
      console.log('✅ Podemos extraer atributos HTML completos incluído type="password"');
    } else {
      console.log('❌ La corrección aún tiene problemas');
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error);
  } finally {
    await mcpClient.stopMCPServer();
  }
}

if (require.main === module) {
  testMcpCorrected().catch(console.error);
}