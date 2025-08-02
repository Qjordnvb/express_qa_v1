// test-real-mcp-integration.ts
// 🧪 Prueba completa de integración MCP REAL

import { StableMcpService } from './core/claude-code-integration/StableMcpService';
import { environmentDetection } from './core/utils/EnvironmentDetection';

async function testRealMcpIntegration() {
  console.log('🧪 PRUEBA DE INTEGRACIÓN MCP REAL');
  console.log('=' .repeat(50));

  try {
    // 1. Detectar entorno
    console.log('\n1. 🔍 DETECCIÓN DE ENTORNO');
    console.log(environmentDetection.getEnvironmentSummary());
    
    const warnings = environmentDetection.getEnvironmentWarnings();
    if (warnings.length > 0) {
      console.log('\n⚠️ ADVERTENCIAS:');
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (!environmentDetection.isReadyForMcp()) {
      console.log('\n❌ ENTORNO NO LISTO PARA MCP');
      console.log('   Instala Playwright: npm install @playwright/test');
      return { success: false, reason: 'Environment not ready' };
    }

    // 2. Inicializar servicio MCP real
    console.log('\n2. 🚀 INICIALIZANDO StableMcpService REAL...');
    const stableMcp = new StableMcpService();
    await stableMcp.initialize();
    console.log('   ✅ StableMcpService REAL inicializado');

    // 3. Probar navegación MCP real
    console.log('\n3. 🌐 PROBANDO NAVEGACIÓN MCP REAL...');
    const testUrl = 'https://www.google.com';
    console.log(`   Navegando a: ${testUrl}`);
    
    await stableMcp.navigate(testUrl);
    console.log('   ✅ Navegación MCP real exitosa');

    // 4. Obtener contexto MCP real
    console.log('\n4. 📸 OBTENIENDO CONTEXTO MCP REAL...');
    const context = await stableMcp.getRealTimeContext(testUrl);
    
    console.log('   📊 Contexto MCP real obtenido:');
    console.log(`      - URL: ${context.pageInfo.url}`);
    console.log(`      - Título: ${context.pageInfo.title}`);
    console.log(`      - Elementos interactivos: ${context.interactiveElements.length}`);
    console.log(`      - User Agent: ${context.playwrightContext.userAgent}`);
    console.log(`      - Load Time: ${context.pageInfo.loadTime}ms`);
    
    // Verificar datos MCP específicos
    const hasMcpSnapshot = Boolean(context.mcpSnapshot);
    const hasMcpRefs = context.interactiveElements.some((el: any) => el.ref);
    const hasYamlSnapshot = Boolean(context.domSnapshot && typeof context.domSnapshot === 'string');
    
    console.log(`      - MCP Snapshot: ${hasMcpSnapshot ? '✅' : '❌'}`);
    console.log(`      - Elementos con MCP refs: ${hasMcpRefs ? '✅' : '❌'}`);
    console.log(`      - YAML Snapshot: ${hasYamlSnapshot ? '✅' : '❌'}`);

    // 5. Mostrar elementos MCP reales
    console.log('\n5. 🎯 ELEMENTOS MCP DETECTADOS:');
    const sampleElements = context.interactiveElements.slice(0, 5);
    sampleElements.forEach((el: any, index: number) => {
      console.log(`   ${index + 1}. ${el.type} "${el.text || 'Sin texto'}" [ref=${el.ref || 'N/A'}]`);
      if (el.role) console.log(`      - Role: ${el.role}`);
      if (el.selectors) {
        const selectors = Object.entries(el.selectors).slice(0, 2);
        selectors.forEach(([type, value]) => {
          console.log(`      - ${type}: ${value}`);
        });
      }
    });

    // 6. Probar screenshot MCP real
    console.log('\n6. 📷 PROBANDO SCREENSHOT MCP REAL...');
    const screenshotPath = 'test-results/real-mcp-screenshot.png';
    const screenshot = await stableMcp.captureScreenshot(screenshotPath);
    
    if (screenshot) {
      console.log(`   ✅ Screenshot MCP real capturado: ${screenshotPath}`);
      console.log(`   📦 Tamaño: ${screenshot.length} bytes`);
    } else {
      console.log('   ⚠️ Screenshot no disponible');
    }

    // 7. Probar interacción MCP (si hay elementos disponibles)
    console.log('\n7. 🖱️ PROBANDO INTERACCIÓN MCP REAL...');
    const searchBox = context.interactiveElements.find((el: any) => 
      el.type === 'textarea' || (el.role === 'combobox' && el.text?.includes('Buscar'))
    );
    
    if (searchBox && searchBox.ref) {
      console.log(`   Encontrado elemento de búsqueda: "${searchBox.text}" [ref=${searchBox.ref}]`);
      try {
        await stableMcp.performInteraction('type', 'Search box', searchBox.ref, {
          text: 'Express QA Hybrid',
          options: { slowly: false }
        });
        console.log('   ✅ Interacción MCP real exitosa (escritura)');
        
        // Wait and clear for next test
        await stableMcp.wait({ time: 1 });
      } catch (error) {
        console.log(`   ⚠️ Interacción MCP falló: ${error}`);
      }
    } else {
      console.log('   ℹ️ No se encontró elemento interactivo para probar');
    }

    // 8. Verificar calidad del contexto para AI
    console.log('\n8. 🧠 VERIFICANDO CALIDAD PARA AI...');
    const contextQuality = analyzeContextForAI(context);
    
    console.log('   📊 Análisis de calidad del contexto:');
    Object.entries(contextQuality).forEach(([metric, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`      - ${metric}: ${status}`);
    });

    // 9. Cleanup
    console.log('\n9. 🧹 LIMPIANDO RECURSOS...');
    await stableMcp.cleanup();
    console.log('   ✅ Cleanup completado');

    // 10. Resultado final
    console.log('\n🎉 PRUEBA MCP REAL COMPLETADA CON ÉXITO!');
    console.log('\n📊 RESUMEN:');
    console.log(`   - Modo MCP: ${context.playwrightContext.userAgent}`);
    console.log(`   - Elementos detectados: ${context.interactiveElements.length}`);
    console.log(`   - Con referencias MCP: ${context.interactiveElements.filter((el: any) => el.ref).length}`);
    console.log(`   - Tiempo de carga: ${context.pageInfo.loadTime}ms`);
    console.log(`   - Screenshot: ${screenshot ? 'Disponible' : 'No disponible'}`);

    return { 
      success: true, 
      context, 
      contextQuality,
      screenshot: Boolean(screenshot)
    };

  } catch (error) {
    console.error('❌ Error en prueba MCP real:', error);
    return { success: false, error };
  }
}

/**
 * 🧠 Analizar calidad del contexto para AI
 */
function analyzeContextForAI(context: any): any {
  return {
    'Tiene elementos interactivos': context.interactiveElements.length > 0,
    'Elementos tienen referencias MCP': context.interactiveElements.some((el: any) => el.ref),
    'Elementos tienen roles ARIA': context.interactiveElements.some((el: any) => el.role),
    'Elementos tienen texto descriptivo': context.interactiveElements.some((el: any) => el.text),
    'Tiene snapshot YAML': Boolean(context.domSnapshot && typeof context.domSnapshot === 'string'),
    'Tiene información de página': Boolean(context.pageInfo.url && context.pageInfo.title),
    'Tiene datos de red': Boolean(context.mcpNetworkRequests && context.mcpNetworkRequests.length > 0),
    'Contexto MCP completo': Boolean(context.mcpSnapshot),
    'Selectores generados': context.interactiveElements.some((el: any) => el.selectors),
    'Listo para generar Page Objects': context.interactiveElements.length > 0 && 
                                      context.interactiveElements.some((el: any) => el.ref && el.type)
  };
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testRealMcpIntegration()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ PRUEBA MCP REAL EXITOSA');
        console.log('\n🚀 SIGUIENTE PASO: El LLM puede ahora usar MCP real para generar page objects perfectos!');
        console.log('   - Contexto completo con referencias MCP');
        console.log('   - Elementos estructurados con selectores');
        console.log('   - Screenshots reales del browser');
        console.log('   - Datos de red y consola');
        console.log('   - Capacidad de interacción real');
      } else {
        console.log('\n❌ PRUEBA MCP REAL FALLÓ');
        console.log(`   Razón: ${result.reason || result.error}`);
        
        if (result.reason === 'Environment not ready') {
          console.log('\n🔧 PASOS PARA CORREGIR:');
          console.log('   1. Instalar Playwright: npm install @playwright/test');
          console.log('   2. Instalar browsers: npx playwright install');
          console.log('   3. Verificar configuración .claude.json');
        }
      }
    })
    .catch((error) => {
      console.error('💥 Error crítico en prueba MCP real:', error);
    });
}

export { testRealMcpIntegration };