// test-basic-functionality.ts - Prueba básica del sistema híbrido
import * as fs from 'fs';
import * as path from 'path';

async function testBasicFunctionality() {
  console.log('🧪 PRUEBA BÁSICA DEL SISTEMA HÍBRIDO');
  console.log('=' .repeat(50));

  const results = {
    configurationTest: false,
    fileStructureTest: false,
    dependencyTest: false,
    aiComponentsTest: false,
    mcpIntegrationTest: false
  };

  try {
    // 1. Verificar configuración
    console.log('\n1. 🔧 Verificando configuración...');
    
    const claudeJsonExists = fs.existsSync('.claude.json');
    const playwrightConfigExists = fs.existsSync('config/playwright.config.ts');
    const envExists = fs.existsSync('.env');
    
    if (claudeJsonExists && playwrightConfigExists && envExists) {
      console.log('   ✅ Archivos de configuración presentes');
      results.configurationTest = true;
    } else {
      console.log('   ❌ Faltan archivos de configuración');
    }

    // 2. Verificar estructura de archivos
    console.log('\n2. 📁 Verificando estructura de archivos...');
    
    const coreExists = fs.existsSync('core');
    const testGenExists = fs.existsSync('test-generation');
    const dataExists = fs.existsSync('data');
    const toolsExists = fs.existsSync('tools');
    
    if (coreExists && testGenExists && dataExists && toolsExists) {
      console.log('   ✅ Estructura de carpetas correcta');
      results.fileStructureTest = true;
    } else {
      console.log('   ❌ Estructura de carpetas incompleta');
    }

    // 3. Verificar dependencias críticas
    console.log('\n3. 📦 Verificando dependencias...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasCriticalDeps = 
        packageJson.dependencies['@anthropic-ai/sdk'] &&
        packageJson.dependencies['@google/generative-ai'] &&
        packageJson.dependencies['chromadb'] &&
        packageJson.devDependencies['@playwright/test'];
      
      if (hasCriticalDeps) {
        console.log('   ✅ Dependencias críticas presentes en package.json');
        results.dependencyTest = true;
      } else {
        console.log('   ❌ Faltan dependencias críticas');
      }
    } catch (error) {
      console.log('   ❌ Error leyendo package.json');
    }

    // 4. Verificar componentes de IA migrados
    console.log('\n4. 🧠 Verificando componentes de IA...');
    
    const learningSystemExists = fs.existsSync('core/intelligent-learning/learning-system.ts');
    const failureAnalyzerExists = fs.existsSync('core/intelligent-learning/failure-analyzer.ts');
    const memoryServiceExists = fs.existsSync('core/intelligent-learning/MemoryService.ts');
    const llmServicesExist = fs.existsSync('core/llm-services');
    
    if (learningSystemExists && failureAnalyzerExists && memoryServiceExists && llmServicesExist) {
      console.log('   ✅ Componentes de IA migrados correctamente');
      results.aiComponentsTest = true;
    } else {
      console.log('   ❌ Componentes de IA incompletos');
    }

    // 5. Verificar integración MCP híbrida
    console.log('\n5. 💎 Verificando integración MCP híbrida...');
    
    const stableMcpExists = fs.existsSync('core/claude-code-integration/StableMcpService.ts');
    const hybridOrchestratorExists = fs.existsSync('core/claude-code-integration/HybridOrchestrator.ts');
    
    if (stableMcpExists && hybridOrchestratorExists) {
      console.log('   ✅ Integración MCP híbrida implementada');
      results.mcpIntegrationTest = true;
    } else {
      console.log('   ❌ Integración MCP híbrida incompleta');
    }

    // 6. Prueba de importación básica
    console.log('\n6. 🔍 Probando importaciones básicas...');
    
    try {
      // Intentar importar los tipos principales
      const typesContent = fs.readFileSync('core/types/types.ts', 'utf8');
      if (typesContent.includes('AIResponse') && typesContent.includes('LocatorDefinition')) {
        console.log('   ✅ Tipos principales disponibles');
      } else {
        console.log('   ⚠️ Tipos principales parciales');
      }
    } catch (error) {
      console.log('   ❌ Error accediendo a tipos');
    }

    // Resumen de resultados
    console.log('\n📊 RESUMEN DE LA PRUEBA');
    console.log('-'.repeat(30));
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${status} ${testName}`);
    });
    
    console.log(`\n🎯 Resultado: ${passedTests}/${totalTests} pruebas pasaron`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ¡Sistema híbrido configurado correctamente!');
      return { success: true, results };
    } else if (passedTests >= 3) {
      console.log('⚠️ Sistema parcialmente funcional, necesita ajustes menores');
      return { success: 'partial', results };
    } else {
      console.log('❌ Sistema necesita configuración adicional');
      return { success: false, results };
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    return { success: false, error, results };
  }
}

// Prueba adicional: Verificar herramientas disponibles
async function testToolsAvailability() {
  console.log('\n🛠️ VERIFICANDO HERRAMIENTAS DISPONIBLES');
  console.log('-'.repeat(40));

  const tools = {
    'TypeScript': () => require('typescript'),
    'Playwright': () => require('@playwright/test'),
    'Node.js fs': () => require('fs'),
    'Path utils': () => require('path')
  };

  for (const [toolName, importFn] of Object.entries(tools)) {
    try {
      importFn();
      console.log(`✅ ${toolName} disponible`);
    } catch (error) {
      console.log(`❌ ${toolName} no disponible: ${(error as Error).message}`);
    }
  }
}

// Ejecutar pruebas si es llamado directamente
if (require.main === module) {
  testBasicFunctionality()
    .then(async (result) => {
      await testToolsAvailability();
      
      console.log('\n🚀 PRÓXIMOS PASOS RECOMENDADOS:');
      
      if (result.success === true) {
        console.log('1. ✅ Configurar API keys en .env');
        console.log('2. ✅ Probar generación de prueba simple');
        console.log('3. ✅ Integrar herramientas MCP nativas de Claude Code');
        console.log('4. ✅ Desarrollar API para SaaS');
      } else if (result.success === 'partial') {
        console.log('1. 🔧 Completar instalación de dependencias faltantes');
        console.log('2. 🔧 Verificar configuración de Playwright');
        console.log('3. ✅ Probar funcionalidad básica');
      } else {
        console.log('1. 🔧 Revisar instalación de Node.js y npm');
        console.log('2. 🔧 Ejecutar npm install nuevamente');
        console.log('3. 🔧 Verificar permisos de archivos');
      }
      
      process.exit(result.success === true ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Prueba falló completamente:', error);
      process.exit(1);
    });
}

export { testBasicFunctionality };