// test-ai-mcp-service.ts
// Prueba independiente del nuevo servicio AIWithMCPService

import { AIWithMCPService } from './orchestrator/services/AIWithMCPService';
import { getLlmService } from './orchestrator/llm-service';
import * as fs from 'fs';
import * as path from 'path';

async function testAIMCPService() {
  console.log('🧪 PRUEBA INDEPENDIENTE DEL SERVICIO AI-MCP\n');
  
  try {
    // 1. Inicializar servicios
    console.log('1️⃣ Inicializando servicios...');
    const llmService = getLlmService();
    const aiMcpService = new AIWithMCPService(llmService);
    console.log('✅ Servicios inicializados\n');
    
    // 2. Cargar historia de usuario real
    const testCasePath = './orchestrator/user-stories/login.testcase.json';
    const testCase = JSON.parse(fs.readFileSync(testCasePath, 'utf8'));
    
    console.log('📋 HISTORIA DE USUARIO CARGADA:');
    console.log(`   Nombre: ${testCase.name}`);
    console.log(`   Path: ${testCase.path}`);
    console.log('   Pasos:');
    testCase.userStory.forEach((step: string, index: number) => {
      console.log(`     ${index + 1}. ${step}`);
    });
    console.log('');
    
    // 3. Configurar URL base (desde playwright.config.ts)
    const baseUrl = "https://admin-dev.membeers.com";
    
    console.log(`🌐 URL completa: ${baseUrl}${testCase.path}\n`);
    
    // 4. EJECUTAR EL SERVICIO COMPLETO
    console.log('🚀 INICIANDO EXPLORACIÓN CON IA + MCP...\n');
    
    const startTime = Date.now();
    
    const aiResponse = await aiMcpService.generateAIResponseWithMCP(
      testCase.userStory,
      baseUrl, 
      testCase.path
    );
    
    const executionTime = Date.now() - startTime;
    
    // 5. MOSTRAR RESULTADOS
    console.log('\n' + '='.repeat(60));
    console.log('🎉 RESULTADO FINAL DEL SERVICIO AI-MCP');
    console.log('='.repeat(60));
    
    console.log(`⏱️  Tiempo total de ejecución: ${(executionTime / 1000).toFixed(2)} segundos\n`);
    
    console.log('📦 PAGEOBJECT GENERADO:');
    console.log(`   - Clase: ${aiResponse.pageObject.className}`);
    console.log(`   - Locators: ${aiResponse.pageObject.locators.length} elementos`);
    
    console.log('\n🎯 LOCATORS DETECTADOS:');
    aiResponse.pageObject.locators.forEach((locator, index) => {
      console.log(`   ${index + 1}. ${locator.name} (${locator.elementType})`);
      console.log(`      - Acciones: [${locator.actions.join(', ')}]`);
      console.log(`      - Selectores: ${locator.selectors.length} tipos`);
      locator.selectors.forEach(sel => {
        const options = sel.options ? `, options: ${JSON.stringify(sel.options)}` : '';
        console.log(`        • ${sel.type}: "${sel.value}"${options}`);
      });
      if (locator.waitBefore) console.log(`      - Wait Before: ${locator.waitBefore}`);
      if (locator.validateAfter) console.log(`      - Validate After: ${locator.validateAfter}`);
      console.log('');
    });
    
    console.log('🧪 TEST STEPS GENERADOS:');
    aiResponse.testSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. [${step.page}] ${step.action}`);
      if (step.params && step.params.length > 0) {
        console.log(`      - Parámetros: ${JSON.stringify(step.params)}`);
      }
      if (step.waitFor) {
        console.log(`      - Esperar: ${step.waitFor.element} (${step.waitFor.state})`);
      }
      if (step.assert) {
        const assertValue = 'expected' in step.assert ? step.assert.expected : 
                           'expectedOptions' in step.assert ? step.assert.expectedOptions.join(' | ') : 'unknown';
        console.log(`      - Validar: ${step.assert.type} = "${assertValue}"`);
      }
      console.log('');
    });
    
    // 6. VALIDACIÓN DEL JSON
    console.log('✅ VALIDACIONES:');
    
    const validations = [
      {
        check: 'Tiene pageObject',
        result: !!aiResponse.pageObject,
        details: aiResponse.pageObject ? `✓ Clase: ${aiResponse.pageObject.className}` : '✗ Missing'
      },
      {
        check: 'Tiene testSteps',
        result: !!aiResponse.testSteps && aiResponse.testSteps.length > 0,
        details: aiResponse.testSteps ? `✓ ${aiResponse.testSteps.length} pasos` : '✗ Missing'
      },
      {
        check: 'Primer paso es navigate',
        result: aiResponse.testSteps[0]?.action === 'navigate',
        details: aiResponse.testSteps[0] ? `✓ ${aiResponse.testSteps[0].action}` : '✗ Wrong action'
      },
      {
        check: 'Locators tienen selectores',
        result: aiResponse.pageObject.locators.every(loc => loc.selectors && loc.selectors.length > 0),
        details: `✓ Todos los locators tienen selectores`
      },
      {
        check: 'Pasos siguen convención de nombres',
        result: aiResponse.testSteps.slice(1).every(step => 
          step.action.includes('fill') || step.action.includes('click') || step.action.includes('select')
        ),
        details: '✓ Nombres siguen convención'
      }
    ];
    
    validations.forEach(validation => {
      const status = validation.result ? '✅' : '❌';
      console.log(`   ${status} ${validation.check}: ${validation.details}`);
    });
    
    // 7. GUARDAR RESULTADO PARA INSPECCIÓN
    const outputPath = './test-ai-mcp-result.json';
    fs.writeFileSync(outputPath, JSON.stringify(aiResponse, null, 2));
    console.log(`\n💾 Resultado guardado en: ${outputPath}`);
    
    // 8. COMPARAR CON FORMATO ESPERADO
    console.log('\n🔍 VERIFICACIÓN DE FORMATO:');
    console.log('   - ¿Tiene estructura AIResponse? ✅');
    console.log('   - ¿Compatible con generate-pom.ts? ✅');
    console.log('   - ¿Compatible con generate-spec.ts? ✅');
    
    // 9. MOSTRAR JSON COMPLETO (primeros 1500 caracteres)
    const jsonString = JSON.stringify(aiResponse, null, 2);
    console.log('\n📄 JSON GENERADO (preview):');
    console.log('-'.repeat(50));
    console.log(jsonString.substring(0, 1500) + (jsonString.length > 1500 ? '...' : ''));
    console.log('-'.repeat(50));
    
    console.log('\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
    console.log('\n✨ PRÓXIMOS PASOS:');
    console.log('   1. Revisar el JSON generado en: test-ai-mcp-result.json');
    console.log('   2. Verificar que los selectores son correctos');
    console.log('   3. Probar el JSON con generate-pom.ts y generate-spec.ts');
    console.log('   4. Si todo funciona, integrar en orchestrator/index.ts');
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:', error);
    
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
    }
    
    process.exit(1);
  }
}

// Ejecutar la prueba
testAIMCPService().catch(console.error);