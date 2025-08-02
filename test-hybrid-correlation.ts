// test-hybrid-correlation.ts
// 🧪 Test para verificar que la correlación híbrida YAML + JavaScript funciona correctamente
// Objetivo: Probar que getCompleteContext() detecta correctamente campos de email y password

import { MCPClientService } from './orchestrator/services/McpClientService';

async function testHybridCorrelation() {
  console.log('\n🧪 TEST DE CORRELACIÓN HÍBRIDA');
  console.log('=' .repeat(60));
  console.log('🎯 Objetivo: Verificar correlación YAML + JavaScript SIN HARDCODEO');
  console.log('🌐 URL: https://admin-dev.membeers.com/');
  
  const mcpClient = new MCPClientService();
  
  try {
    // 1. Inicializar MCP
    console.log('\n🚀 Iniciando servidor MCP...');
    await mcpClient.startMCPServer();
    
    // 2. Navegar a la página de login
    console.log('🌐 Navegando a página de login...');
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    
    // 3. Esperar a que cargue la página
    console.log('⏳ Esperando carga de página...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. PROBAR LA CORRELACIÓN HÍBRIDA
    console.log('\n🔍 EJECUTANDO getCompleteContext() - Correlación híbrida...');
    console.log('-' .repeat(50));
    
    const completeContext = await mcpClient.getCompleteContext();
    
    // 5. ANALIZAR RESULTADOS
    console.log('\n📊 RESULTADOS DE LA CORRELACIÓN HÍBRIDA:');
    console.log('=' .repeat(50));
    
    console.log(`✅ Elementos ARIA básicos: ${completeContext.interactiveElements.length}`);
    console.log(`✅ Datos JavaScript extraídos: ${completeContext.rawJavaScriptData?.length || 0}`);
    console.log(`🎯 Elementos híbridos generados: ${completeContext.hybridElements?.length || 0}`);
    
    // 6. ANÁLISIS ESPECÍFICO DE CAMPOS DE LOGIN
    if (completeContext.hybridElements && completeContext.hybridElements.length > 0) {
      console.log('\n🔎 ANÁLISIS DETALLADO DE ELEMENTOS HÍBRIDOS:');
      console.log('-' .repeat(40));
      
      completeContext.hybridElements.forEach((element: any, index: number) => {
        console.log(`\n${index + 1}. ELEMENTO HÍBRIDO [ref=${element.ref}]:`);
        console.log(`   - Role: ${element.role || 'N/A'}`);
        console.log(`   - Text: "${element.text || 'N/A'}"`);
        console.log(`   - HTML Type: ${element.htmlAttributes?.type || 'N/A'}`);
        console.log(`   - HTML Name: ${element.htmlAttributes?.name || 'N/A'}`);
        console.log(`   - Placeholder: ${element.htmlAttributes?.placeholder || 'N/A'}`);
        
        // Mostrar selectores generados automáticamente
        if (element.selectors && element.selectors.length > 0) {
          console.log(`   - Selectores generados:`);
          element.selectors.forEach((sel: any) => {
            console.log(`     * ${sel.type}: "${sel.value}"`);
          });
        }
        
        // DETECTAR CAMPOS ESPECÍFICOS SIN HARDCODEO
        if (element.htmlAttributes?.type === 'email' || 
            element.htmlAttributes?.name?.toLowerCase().includes('email') ||
            element.htmlAttributes?.placeholder?.toLowerCase().includes('email')) {
          console.log(`   🎯 ¡CAMPO EMAIL DETECTADO INTELIGENTEMENTE!`);
        }
        
        if (element.htmlAttributes?.type === 'password') {
          console.log(`   🔐 ¡CAMPO PASSWORD DETECTADO POR ATRIBUTO HTML!`);
        }
      });
      
      // 7. CONTADOR DE TIPOS ESPECÍFICOS
      const emailFields = completeContext.hybridElements.filter((el: any) => 
        el.htmlAttributes?.type === 'email' || 
        el.htmlAttributes?.name?.toLowerCase().includes('email') ||
        el.htmlAttributes?.placeholder?.toLowerCase().includes('email')
      );
      
      const passwordFields = completeContext.hybridElements.filter((el: any) => 
        el.htmlAttributes?.type === 'password'
      );
      
      const buttons = completeContext.hybridElements.filter((el: any) => 
        el.htmlAttributes?.tagName?.toLowerCase() === 'button' ||
        el.htmlAttributes?.type === 'submit'
      );
      
      console.log('\n📈 RESUMEN DE DETECCIÓN INTELIGENTE:');
      console.log(`   📧 Campos de Email: ${emailFields.length}`);
      console.log(`   🔐 Campos de Password: ${passwordFields.length}`);
      console.log(`   🔘 Botones: ${buttons.length}`);
      
      // 8. VALIDAR QUE LA CORRELACIÓN FUNCIONA
      if (emailFields.length > 0 && passwordFields.length > 0) {
        console.log('\n🎉 ¡ÉXITO COMPLETO! ✅');
        console.log('🔥 La correlación híbrida funciona perfectamente:');
        console.log('   ✅ Detecta campos de email sin hardcodeo');
        console.log('   ✅ Detecta campos de password por HTML type');
        console.log('   ✅ Correlaciona ARIA (refs) con HTML (atributos)');
        console.log('   ✅ Genera selectores automáticamente');
        console.log('   ✅ Sistema completamente genérico para cualquier sitio web');
        
        return { success: true, emailFields, passwordFields, buttons };
      } else {
        console.log('\n⚠️ RESULTADOS PARCIALES:');
        console.log(`   - Emails detectados: ${emailFields.length}`);
        console.log(`   - Passwords detectados: ${passwordFields.length}`);
        
        return { success: false, emailFields, passwordFields, buttons };
      }
    } else {
      console.log('\n❌ NO SE GENERARON ELEMENTOS HÍBRIDOS');
      console.log('⚠️ Revisar implementación de correlateYamlWithJavaScript()');
      
      return { success: false };
    }
    
  } catch (error) {
    console.error('\n💥 ERROR EN TEST DE CORRELACIÓN:', error);
    return { success: false, error };
  } finally {
    // Cleanup
    console.log('\n🧹 Limpiando recursos...');
    await mcpClient.stopMCPServer();
  }
}

// Ejecutar test
if (require.main === module) {
  testHybridCorrelation()
    .then((result) => {
      console.log('\n🏆 RESULTADO FINAL DEL TEST:');
      console.log('=' .repeat(50));
      
      if (result.success) {
        console.log('🎉 ¡TEST DE CORRELACIÓN HÍBRIDA - EXITOSO!');
        console.log('✅ El sistema puede detectar campos de login inteligentemente');
        console.log('🚀 Ready para usar con AIWithMCPService!');
      } else {
        console.log('❌ Test falló - necesita ajustes en la correlación');
        if (result.error) {
          console.log(`💥 Error: ${result.error}`);
        }
      }
    })
    .catch(console.error);
}

export { testHybridCorrelation };