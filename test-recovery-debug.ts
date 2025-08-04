/**
 * TEST DE RECUPERACIÓN - Debuggeo Paso a Paso
 * 
 * Objetivo: Recuperar las funcionalidades perdidas de la v4
 * Empezamos por probar la solución documentada de browser_evaluate
 */

import { MCPClientService } from './orchestrator/services/McpClientService';

console.log('🔧 INICIANDO TEST DE RECUPERACIÓN - Debug Paso a Paso\n');

async function testBrowserEvaluateSolution() {
  const mcpClient = new MCPClientService();

  try {
    console.log('1️⃣ Iniciando servidor MCP...');
    await mcpClient.startMCPServer();
    console.log('✅ Servidor MCP iniciado correctamente\n');

    console.log('2️⃣ Navegando a página de prueba...');
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    console.log('✅ Navegación exitosa\n');

    console.log('3️⃣ PROBANDO SOLUCIÓN browser_evaluate DOCUMENTADA...');
    console.log('Solución documentada: Usar getJavaScriptElementData directamente\n');

    // ✅ INTENTEMOS USAR EL MÉTODO EXISTENTE PARA JavaScript
    console.log('Probando método interno getJavaScriptElementData...');
    
    // Como es privado, intentemos usar getCompleteContext que debería incluir JavaScript data
    const context = await mcpClient.getCompleteContext();
    
    console.log('📊 CONTEXTO COMPLETO OBTENIDO:');
    console.log('============================');
    console.log(`- DOM Elements: ${context.domElements?.length || 0}`);
    console.log(`- Interactive Elements: ${context.interactiveElements?.length || 0}`);
    console.log(`- Hybrid Elements: ${context.hybridElements?.length || 0}`);
    console.log(`- Raw JavaScript Data: ${context.rawJavaScriptData?.length || 0}`);
    
    let result = null;
    let htmlElements = [];
    
    // Intentar extraer elementos HTML de diferentes fuentes
    if (context.domElements && context.domElements.length > 0) {
      console.log('\n✅ Encontrados domElements, analizando...');
      htmlElements = context.domElements;
      result = { content: [{ text: JSON.stringify(htmlElements) }] };
    } else if (context.rawJavaScriptData && context.rawJavaScriptData.length > 0) {
      console.log('\n✅ Encontrados rawJavaScriptData, analizando...');
      htmlElements = context.rawJavaScriptData;
      result = { content: [{ text: JSON.stringify(htmlElements) }] };
    } else if (context.hybridElements && context.hybridElements.length > 0) {
      console.log('\n✅ Encontrados hybridElements, analizando...');
      htmlElements = context.hybridElements;
      result = { content: [{ text: JSON.stringify(htmlElements) }] };
    } else {
      console.log('\n⚠️ No se encontraron elementos HTML en el contexto');
      console.log('Vamos a intentar extraer desde interactiveElements...');
      htmlElements = context.interactiveElements || [];
      result = { content: [{ text: JSON.stringify(htmlElements) }] };
    }

    console.log('📊 RESPUESTA COMPLETA DE browser_evaluate:');
    console.log('=====================================');
    console.log(JSON.stringify(result, null, 2));
    console.log('=====================================\n');

    // ✅ PARSING DIRECTO - Los datos ya están en JSON
    console.log('4️⃣ PARSEANDO RESPUESTA DIRECTAMENTE (SIN REGEX)...');
    
    if (result && result.content && result.content[0] && result.content[0].text) {
      const jsonText = result.content[0].text;
      
      try {
        console.log('✅ Parseando JSON directamente...');
        const htmlElements = JSON.parse(jsonText);
        console.log('🎉 ÉXITO! JSON parseado correctamente');
        console.log(`📊 Total elementos encontrados: ${htmlElements.length}\n`);
        
        // Analizar elementos encontrados
        htmlElements.forEach((el, index) => {
          console.log(`${index + 1}. ELEMENTO [${el.htmlAttributes?.tagName || el.element}]:`);
          console.log(`   - ARIA Role: "${el.role}"`);
          console.log(`   - HTML Type: "${el.htmlAttributes?.type || 'N/A'}"`);
          console.log(`   - Name: "${el.name}"`);
          console.log(`   - HTML ID: "${el.htmlAttributes?.id || 'N/A'}"`);
          console.log(`   - HTML TagName: "${el.htmlAttributes?.tagName || 'N/A'}"`);
          console.log(`   - Placeholder: "${el.htmlAttributes?.placeholder || 'N/A'}"`);
          
          // ✅ VERIFICAR DETECCIÓN CRÍTICA: type="password"
          const htmlType = el.htmlAttributes?.type || '';
          if (htmlType === 'password') {
            console.log('   🔐 ¡CAMPO PASSWORD DETECTADO CORRECTAMENTE!');
          }
          if (htmlType === 'email') {
            console.log('   📧 ¡CAMPO EMAIL DETECTADO CORRECTAMENTE!');
          }
          if (htmlType === 'submit') {
            console.log('   🚀 ¡BOTÓN SUBMIT DETECTADO CORRECTAMENTE!');
          }
          
          // Detectar por contexto semántico si no hay type
          if (!htmlType && el.name?.toLowerCase().includes('password')) {
            console.log('   🔍 POSIBLE CAMPO PASSWORD (por contexto semántico)');
          }
          if (!htmlType && el.name?.toLowerCase().includes('email')) {
            console.log('   🔍 POSIBLE CAMPO EMAIL (por contexto semántico)');
          }
          
          console.log(''); // Línea en blanco
        });

        return { success: true, elements: htmlElements };
        
      } catch (parseError) {
        console.log('❌ Error parseando JSON directo:', parseError);
        console.log('Contenido problemático:', jsonText.substring(0, 500));
        return { success: false, error: 'Direct JSON parse failed', rawData: jsonText };
      }
    } else {
      console.log('❌ Estructura de respuesta inesperada');
      return { success: false, error: 'Unexpected response structure', response: result };
    }

  } catch (error) {
    console.log('❌ ERROR EN TEST:', error);
    return { success: false, error: error.message };
  } finally {
    console.log('\n5️⃣ Cerrando servidor MCP...');
    try {
      await mcpClient.stopMCPServer();
      console.log('✅ Servidor MCP cerrado correctamente');
    } catch (closeError) {
      console.log('⚠️ Error cerrando servidor:', closeError);
    }
  }
}

async function runRecoveryTest() {
  console.log('🎯 OBJETIVO: Probar solución documentada de browser_evaluate');
  console.log('📋 ESPERAMOS:');
  console.log('   - ✅ Extracción exitosa de elementos HTML');
  console.log('   - ✅ Detección de type="password"');
  console.log('   - ✅ Detección de type="email"');
  console.log('   - ✅ Parsing JSON exitoso\n');

  const result = await testBrowserEvaluateSolution();

  console.log('\n🏁 RESULTADO FINAL DEL TEST:');
  console.log('============================');
  
  if (result.success) {
    console.log('🎉 TEST EXITOSO!');
    console.log(`📊 Elementos extraídos: ${result.elements.length}`);
    
    // Verificar capacidades críticas
    const passwordFields = result.elements.filter(el => el.type === 'password');
    const emailFields = result.elements.filter(el => el.type === 'email');
    const submitButtons = result.elements.filter(el => el.type === 'submit');
    
    console.log(`🔐 Campos password detectados: ${passwordFields.length}`);
    console.log(`📧 Campos email detectados: ${emailFields.length}`);
    console.log(`🚀 Botones submit detectados: ${submitButtons.length}`);
    
    if (passwordFields.length > 0 || emailFields.length > 0) {
      console.log('✅ SOLUCIÓN browser_evaluate FUNCIONA CORRECTAMENTE!');
      console.log('✅ Podemos continuar con siguiente paso de recuperación');
    } else {
      console.log('⚠️ Funciona parcialmente - no se detectaron tipos específicos');
    }
    
  } else {
    console.log('❌ TEST FALLÓ');
    console.log(`❌ Error: ${result.error}`);
    console.log('🔍 Necesitamos debuggear más la respuesta de MCP');
  }
}

// Ejecutar test
runRecoveryTest().catch(console.error);