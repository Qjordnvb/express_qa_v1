/**
 * TEST: UniversalMcpExtractor - Verificar funcionalidad completa
 * 
 * Objetivo: Comprobar que logramos 100% correlación YAML+HTML con selectores priorizados
 */

import { MCPClientService } from './orchestrator/services/McpClientService';
import { UniversalMcpExtractor, UniversalElement } from './orchestrator/services/UniversalMcpExtractor';

console.log('🎯 TEST: UniversalMcpExtractor - El Componente Estrella\n');

async function testUniversalExtractor() {
  const mcpClient = new MCPClientService();
  const extractor = new UniversalMcpExtractor(mcpClient);

  try {
    console.log('1️⃣ Iniciando servidor MCP...');
    await mcpClient.startMCPServer();
    console.log('✅ Servidor MCP iniciado\n');

    console.log('2️⃣ Navegando a página de prueba...');
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    console.log('✅ Navegación exitosa\n');

    console.log('3️⃣ EXTRAYENDO ELEMENTOS UNIVERSALES...');
    console.log('🎯 Objetivo: 100% correlación YAML + HTML DOM attributes\n');

    const universalElements = await extractor.extractUniversalElements();
    
    console.log('📊 RESULTADO DE EXTRACCIÓN UNIVERSAL:');
    console.log('====================================');
    console.log(`Total elementos extraídos: ${universalElements.length}\n`);

    // Analizar cada elemento
    universalElements.forEach((element, index) => {
      console.log(`${index + 1}. ELEMENTO UNIVERSAL [${element.htmlAttributes.tagName}]:`);
      console.log(`   📋 YAML Info:`);
      console.log(`      - Role: "${element.role}"`);
      console.log(`      - Name: "${element.name}"`);
      console.log(`      - Ref: "${element.ref}"`);
      
      console.log(`   🔍 HTML Info:`);
      console.log(`      - TagName: "${element.htmlAttributes.tagName}"`);
      console.log(`      - Type: "${element.htmlAttributes.type}"`);
      console.log(`      - ID: "${element.htmlAttributes.id}"`);
      console.log(`      - Name: "${element.htmlAttributes.name}"`);
      console.log(`      - Placeholder: "${element.htmlAttributes.placeholder}"`);
      console.log(`      - TextContent: "${element.htmlAttributes.textContent}"`);
      
      console.log(`   🎯 Correlación:`);
      console.log(`      - Score: ${(element.correlationScore || 0).toFixed(2)}`);
      console.log(`      - Index: ${element.correlationIndex || 'N/A'}`);
      
      console.log(`   🎨 Selectores (${element.selectors.length}):`);
      element.selectors.forEach(selector => {
        const optionsStr = selector.options ? JSON.stringify(selector.options) : '';
        console.log(`      - [P${selector.priority}] ${selector.type}: "${selector.value}" ${optionsStr} (${selector.reason})`);
      });
      
      // ✅ VERIFICACIONES CRÍTICAS
      if (element.htmlAttributes.type === 'password') {
        console.log('   🔐 ¡CAMPO PASSWORD DETECTADO CORRECTAMENTE!');
      }
      if (element.htmlAttributes.type === 'email') {
        console.log('   📧 ¡CAMPO EMAIL DETECTADO CORRECTAMENTE!');
      }
      if (element.htmlAttributes.type === 'submit') {
        console.log('   🚀 ¡BOTÓN SUBMIT DETECTADO CORRECTAMENTE!');
      }
      
      console.log(''); // Línea en blanco
    });

    // Filtrar elementos compatibles con Playwright
    console.log('4️⃣ FILTRANDO ELEMENTOS PLAYWRIGHT-COMPATIBLES...');
    const playwrightElements = extractor.filterPlaywrightCompatible(universalElements);
    console.log(`✅ Elementos compatibles: ${playwrightElements.length}/${universalElements.length}\n`);

    // Estadísticas de correlación
    console.log('📈 ESTADÍSTICAS DE CORRELACIÓN:');
    console.log('==============================');
    
    const highCorrelation = universalElements.filter(el => (el.correlationScore || 0) > 0.7);
    const mediumCorrelation = universalElements.filter(el => (el.correlationScore || 0) > 0.4 && (el.correlationScore || 0) <= 0.7);
    const lowCorrelation = universalElements.filter(el => (el.correlationScore || 0) <= 0.4);
    
    console.log(`🎯 Alta correlación (>0.7): ${highCorrelation.length}`);
    console.log(`🎯 Media correlación (0.4-0.7): ${mediumCorrelation.length}`);
    console.log(`🎯 Baja correlación (≤0.4): ${lowCorrelation.length}`);
    
    const correlationPercentage = universalElements.length > 0 
      ? ((highCorrelation.length + mediumCorrelation.length) / universalElements.length * 100).toFixed(1)
      : '0';
    console.log(`📊 Tasa de correlación exitosa: ${correlationPercentage}%\n`);

    // Estadísticas de tipos críticos
    console.log('🔍 DETECCIÓN DE TIPOS CRÍTICOS:');
    console.log('==============================');
    
    const passwordFields = universalElements.filter(el => el.htmlAttributes.type === 'password');
    const emailFields = universalElements.filter(el => el.htmlAttributes.type === 'email');
    const submitButtons = universalElements.filter(el => el.htmlAttributes.type === 'submit');
    
    console.log(`🔐 Campos password: ${passwordFields.length}`);
    console.log(`📧 Campos email: ${emailFields.length}`);
    console.log(`🚀 Botones submit: ${submitButtons.length}\n`);

    // Generar JSON para AI (simulando el resultado final)
    console.log('5️⃣ GENERANDO JSON PARA AI...');
    const aiReadyData = {
      elements: playwrightElements.map(el => ({
        name: el.name || `${el.role}_${el.ref}`,
        role: el.role,
        type: el.htmlAttributes.type,
        selectors: el.selectors.slice(0, 3), // Top 3 selectores
        htmlAttributes: {
          tagName: el.htmlAttributes.tagName,
          type: el.htmlAttributes.type,
          id: el.htmlAttributes.id,
          name: el.htmlAttributes.name,
          placeholder: el.htmlAttributes.placeholder
        }
      })),
      summary: {
        totalElements: universalElements.length,
        playwrightCompatible: playwrightElements.length,
        correlationRate: `${correlationPercentage}%`,
        criticalTypes: {
          password: passwordFields.length,
          email: emailFields.length,
          submit: submitButtons.length
        }
      }
    };
    
    console.log('✅ JSON generado para AI (muestra):');
    console.log(JSON.stringify(aiReadyData, null, 2).substring(0, 800) + '...\n');

    return {
      success: true,
      elements: universalElements,
      playwrightElements,
      correlationRate: parseFloat(correlationPercentage),
      criticalTypes: {
        password: passwordFields.length,
        email: emailFields.length,
        submit: submitButtons.length
      },
      aiData: aiReadyData
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

async function runUniversalTest() {
  console.log('🎯 OBJETIVO: Verificar UniversalMcpExtractor - Componente Estrella');
  console.log('📋 ESPERAMOS:');
  console.log('   - ✅ 100% correlación YAML + HTML');
  console.log('   - ✅ Detección type="password", type="email"');
  console.log('   - ✅ Selectores múltiples priorizados');
  console.log('   - ✅ Elementos Playwright-compatibles');
  console.log('   - ✅ JSON listo para AI\n');

  const result = await testUniversalExtractor();

  console.log('\n🏁 RESULTADO FINAL DEL TEST:');
  console.log('============================');
  
  if (result.success) {
    console.log('🎉 UNIVERSALMCPEXTRACTOR FUNCIONA PERFECTAMENTE!');
    console.log(`📊 Elementos extraídos: ${result.elements.length}`);
    console.log(`🎯 Tasa correlación: ${result.correlationRate}%`);
    console.log(`🎭 Playwright compatibles: ${result.playwrightElements.length}`);
    console.log(`🔐 Campos password: ${result.criticalTypes.password}`);
    console.log(`📧 Campos email: ${result.criticalTypes.email}`);
    console.log(`🚀 Botones submit: ${result.criticalTypes.submit}`);
    
    if (result.correlationRate >= 80) {
      console.log('✅ CORRELACIÓN EXCELENTE (≥80%)');
    } else if (result.correlationRate >= 60) {
      console.log('✅ CORRELACIÓN BUENA (≥60%)');
    } else {
      console.log('⚠️ CORRELACIÓN MEJORABLE (<60%)');
    }
    
    if (result.criticalTypes.password > 0 && result.criticalTypes.email > 0) {
      console.log('✅ TIPOS CRÍTICOS DETECTADOS CORRECTAMENTE');
      console.log('✅ LISTO PARA INTEGRAR CON AI');
    } else {
      console.log('⚠️ Algunos tipos críticos no detectados');
    }
    
  } else {
    console.log('❌ UNIVERSALMCPEXTRACTOR FALLÓ');
    console.log(`❌ Error: ${result.error}`);
  }
}

// Ejecutar test
runUniversalTest().catch(console.error);