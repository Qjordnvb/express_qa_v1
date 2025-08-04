/**
 * TEST: Funcionalidad Rehabilitada - Correlación YAML + JavaScript
 * 
 * Objetivo: Verificar que getCompleteContext() ahora use correlateYamlWithJavaScript
 */

import { MCPClientService } from './orchestrator/services/McpClientService';

console.log('🎯 TEST: Funcionalidad Rehabilitada - Correlación Superior\n');

async function testRehabilitatedCorrelation() {
  const mcpClient = new MCPClientService();

  try {
    console.log('1️⃣ Iniciando servidor MCP...');
    await mcpClient.startMCPServer();
    console.log('✅ Servidor MCP iniciado\n');

    console.log('2️⃣ Navegando a página de prueba...');
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    console.log('✅ Navegación exitosa\n');

    console.log('3️⃣ PROBANDO getCompleteContext() REHABILITADO...');
    console.log('🎯 Esperamos: Correlación YAML + JavaScript activada\n');

    const context = await mcpClient.getCompleteContext();
    
    console.log('📊 RESULTADO DEL CONTEXTO REHABILITADO:');
    console.log('======================================');
    console.log(`- Interactive Elements: ${context.interactiveElements?.length || 0}`);
    console.log(`- DOM Elements (JS puro): ${context.domElements?.length || 0}`);
    console.log(`- Hybrid Elements: ${(context as any).hybridElements?.length || 0}`);
    console.log(`- Raw JavaScript Data: ${(context as any).rawJavaScriptData?.length || 0}\n`);

    // Analizar elementos híbridos
    if (context.interactiveElements && context.interactiveElements.length > 0) {
      console.log('📋 ANÁLISIS DE ELEMENTOS HÍBRIDOS:');
      console.log('=================================');
      
      context.interactiveElements.forEach((element: any, index: number) => {
        console.log(`${index + 1}. ELEMENTO [${element.element || element.role}]:`);
        console.log(`   📋 YAML Info:`);
        console.log(`      - Role: "${element.role}"`);
        console.log(`      - Name: "${element.name}"`);
        console.log(`      - Ref: "${element.ref}"`);
        
        console.log(`   🔍 HTML Info (Correlacionado):`);
        console.log(`      - HTML Type: "${element.htmlType || 'N/A'}"`);
        console.log(`      - HTML Name: "${element.htmlName || 'N/A'}"`);
        console.log(`      - HTML ID: "${element.htmlId || 'N/A'}"`);
        console.log(`      - Placeholder: "${element.placeholder || 'N/A'}"`);
        console.log(`      - ClassName: "${element.className || 'N/A'}"`);
        
        console.log(`   🎨 Selectores (${element.selectors?.length || 0}):`);
        if (element.selectors && element.selectors.length > 0) {
          element.selectors.forEach((selector: any) => {
            const optionsStr = selector.options ? JSON.stringify(selector.options) : '';
            console.log(`      - ${selector.type}: "${selector.value}" ${optionsStr}`);
          });
        } else {
          console.log(`      - No selectors generated`);
        }

        // ✅ VERIFICACIONES CRÍTICAS
        if (element.htmlType === 'password') {
          console.log('   🔐 ¡CAMPO PASSWORD CORRELACIONADO CORRECTAMENTE!');
        }
        if (element.htmlType === 'email') {
          console.log('   📧 ¡CAMPO EMAIL CORRELACIONADO CORRECTAMENTE!');
        }
        if (element.htmlType === 'submit') {
          console.log('   🚀 ¡BOTÓN SUBMIT CORRELACIONADO CORRECTAMENTE!');
        }
        
        // Verificar si hay correlación exitosa
        if (element.htmlType || element.htmlId || element.htmlName) {
          console.log('   ✅ CORRELACIÓN EXITOSA');
        } else {
          console.log('   ⚠️ Sin correlación HTML');
        }
        
        console.log(''); // Línea en blanco
      });
    } else {
      console.log('❌ No se encontraron elementos interactivos');
    }

    // Estadísticas de correlación
    console.log('📈 ESTADÍSTICAS DE CORRELACIÓN REHABILITADA:');
    console.log('===========================================');
    
    const elementsWithHtml = context.interactiveElements?.filter((el: any) => 
      el.htmlType || el.htmlId || el.htmlName) || [];
    
    const correlationRate = context.interactiveElements?.length > 0 
      ? (elementsWithHtml.length / context.interactiveElements.length * 100).toFixed(1)
      : '0';
    
    console.log(`🎯 Elementos con correlación HTML: ${elementsWithHtml.length}/${context.interactiveElements?.length || 0}`);
    console.log(`📊 Tasa de correlación: ${correlationRate}%`);
    
    // Detectar tipos críticos
    const passwordFields = elementsWithHtml.filter((el: any) => el.htmlType === 'password');
    const emailFields = elementsWithHtml.filter((el: any) => el.htmlType === 'email');
    const submitButtons = elementsWithHtml.filter((el: any) => el.htmlType === 'submit');
    
    console.log(`🔐 Campos password correlacionados: ${passwordFields.length}`);
    console.log(`📧 Campos email correlacionados: ${emailFields.length}`);
    console.log(`🚀 Botones submit correlacionados: ${submitButtons.length}\n`);

    // Comparar con datos JavaScript puros
    if (context.domElements && context.domElements.length > 0) {
      console.log('🔍 COMPARACIÓN CON DATOS JAVASCRIPT PUROS:');
      console.log('=========================================');
      
      const purePasswordFields = context.domElements.filter((el: any) => el.type === 'password');
      const pureEmailFields = context.domElements.filter((el: any) => el.type === 'email');
      const pureSubmitButtons = context.domElements.filter((el: any) => el.type === 'submit');
      
      console.log(`📊 JavaScript puro detectó:`);
      console.log(`   🔐 Password fields: ${purePasswordFields.length}`);
      console.log(`   📧 Email fields: ${pureEmailFields.length}`);
      console.log(`   🚀 Submit buttons: ${pureSubmitButtons.length}`);
      
      console.log(`📊 Correlación logró transferir:`);
      console.log(`   🔐 Password: ${passwordFields.length}/${purePasswordFields.length}`);
      console.log(`   📧 Email: ${emailFields.length}/${pureEmailFields.length}`);
      console.log(`   🚀 Submit: ${submitButtons.length}/${pureSubmitButtons.length}\n`);
    }

    return {
      success: true,
      correlationRate: parseFloat(correlationRate),
      elementsTotal: context.interactiveElements?.length || 0,
      elementsCorrelated: elementsWithHtml.length,
      criticalTypes: {
        password: passwordFields.length,
        email: emailFields.length,
        submit: submitButtons.length
      },
      jsElementsFound: context.domElements?.length || 0
    };

  } catch (error) {
    console.log('❌ ERROR EN TEST:', error);
    return { success: false, error: error.message };
  } finally {
    try {
      await mcpClient.stopMCPServer();
      console.log('✅ Servidor MCP cerrado');
    } catch (closeError) {
      console.log('⚠️ Error cerrando servidor:', closeError);
    }
  }
}

async function runRehabilitatedTest() {
  console.log('🎯 OBJETIVO: Verificar correlación YAML+JavaScript rehabilitada');
  console.log('📋 ESPERAMOS:');
  console.log('   - ✅ getCompleteContext() usa correlateYamlWithJavaScript()');
  console.log('   - ✅ Elementos híbridos con datos YAML + HTML');
  console.log('   - ✅ Correlación superior al test anterior (>16.7%)');
  console.log('   - ✅ Detección de tipos críticos transferida\n');

  const result = await testRehabilitatedCorrelation();

  console.log('\n🏁 RESULTADO FINAL DEL TEST:');
  console.log('============================');
  
  if (result.success) {
    console.log('🎉 CORRELACIÓN REHABILITADA FUNCIONA!');
    console.log(`📊 Elementos totales: ${result.elementsTotal}`);
    console.log(`🔗 Elementos correlacionados: ${result.elementsCorrelated}`);
    console.log(`📈 Tasa de correlación: ${result.correlationRate}%`);
    console.log(`🔧 Elementos JS detectados: ${result.jsElementsFound}`);
    console.log(`🔐 Campos password: ${result.criticalTypes.password}`);
    console.log(`📧 Campos email: ${result.criticalTypes.email}`);
    console.log(`🚀 Botones submit: ${result.criticalTypes.submit}`);
    
    if (result.correlationRate > 50) {
      console.log('✅ CORRELACIÓN EXCELENTE (>50%)');
    } else if (result.correlationRate > 16.7) {
      console.log('✅ CORRELACIÓN MEJORADA vs test anterior');
    } else {
      console.log('⚠️ Correlación similar - puede necesitar ajustes');
    }
    
    if (result.jsElementsFound > 0) {
      console.log('✅ BROWSER_EVALUATE REHABILITADO FUNCIONA');
    } else {
      console.log('⚠️ browser_evaluate no está funcionando');
    }
    
    if (result.criticalTypes.email > 0 || result.criticalTypes.password > 0) {
      console.log('✅ TIPOS CRÍTICOS DETECTADOS Y CORRELACIONADOS');
      console.log('✅ SISTEMA REHABILITADO EXITOSAMENTE');
    } else {
      console.log('⚠️ Tipos críticos no transferidos en correlación');
    }
    
  } else {
    console.log('❌ CORRELACIÓN REHABILITADA FALLÓ');
    console.log(`❌ Error: ${result.error}`);
  }
}

// Ejecutar test
runRehabilitatedTest().catch(console.error);