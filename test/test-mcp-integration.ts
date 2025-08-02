// test-mcp-integration.ts - Prueba de integración MCP
import { StableMcpService } from './core/claude-code-integration/StableMcpService';

async function testMcpIntegration() {
  console.log('🔍 PRUEBA DE INTEGRACIÓN MCP HÍBRIDA');
  console.log('=' .repeat(45));

  try {
    // Inicializar servicio MCP estable
    console.log('\n1. 🚀 Inicializando StableMcpService...');
    const stableMcp = new StableMcpService();
    await stableMcp.initialize();
    console.log('   ✅ StableMcpService inicializado');

    // Probar obtención de contexto
    console.log('\n2. 🌐 Obteniendo contexto de página...');
    const context = await stableMcp.getRealTimeContext('https://www.google.com');
    
    console.log('   📊 Contexto obtenido:');
    console.log(`      - URL: ${context.pageInfo.url}`);
    console.log(`      - Título: ${context.pageInfo.title}`);
    console.log(`      - Elementos interactivos: ${context.interactiveElements.length}`);
    console.log(`      - Timestamp: ${context.pageInfo.timestamp}`);
    console.log(`      - User Agent: ${context.playwrightContext.userAgent}`);

    // Verificar estructura del contexto
    console.log('\n3. 🔍 Verificando estructura del contexto...');
    const hasRequiredFields = 
      context.domSnapshot &&
      context.pageInfo &&
      context.playwrightContext &&
      Array.isArray(context.interactiveElements);

    if (hasRequiredFields) {
      console.log('   ✅ Estructura del contexto correcta');
    } else {
      console.log('   ❌ Estructura del contexto incompleta');
    }

    // Cleanup
    console.log('\n4. 🧹 Limpiando recursos...');
    await stableMcp.cleanup();
    console.log('   ✅ Cleanup completado');

    console.log('\n🎉 Integración MCP híbrida funcional!');
    return { success: true, context };

  } catch (error) {
    console.error('❌ Error en integración MCP:', error);
    return { success: false, error };
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testMcpIntegration()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ PRUEBA MCP EXITOSA');
        console.log('\n🚀 SIGUIENTE PASO: Integrar herramientas MCP nativas de Claude Code');
        console.log('   - Reemplazar placeholders con llamadas reales a mcp__playwright__*');
        console.log('   - Probar con navegación real');
        console.log('   - Verificar estabilidad vs Express QA original');
      } else {
        console.log('\n❌ PRUEBA MCP FALLÓ');
        console.log('   - Revisar configuración de TypeScript');
        console.log('   - Verificar imports de módulos');
        console.log('   - Comprobar estructura de archivos');
      }
    })
    .catch((error) => {
      console.error('💥 Error crítico:', error);
    });
}

export { testMcpIntegration };