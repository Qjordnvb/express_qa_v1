// test-memory-service.ts - Test MemoryService with Node.js version detection
import { MemoryService } from './core/intelligent-learning/MemoryService';

async function testMemoryService() {
  console.log('🧠 TESTING MEMORY SERVICE');
  console.log('=' .repeat(40));

  try {
    // Test 1: Initialization
    console.log('\n1. 🚀 Inicializando MemoryService...');
    const memoryService = new MemoryService();
    
    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Check if enabled
    console.log('\n2. 🔍 Verificando estado de ChromaDB...');
    const isEnabled = memoryService.isEnabled();
    console.log(`   ChromaDB habilitado: ${isEnabled ? '✅ SÍ' : '❌ NO'}`);
    
    // Test 3: Get memory stats
    console.log('\n3. 📊 Obteniendo estadísticas de memoria...');
    const stats = await memoryService.getMemoryStats();
    console.log('   Estadísticas:', JSON.stringify(stats, null, 2));
    
    // Test 4: Test save operation
    console.log('\n4. 💾 Probando guardado de recuerdo...');
    const testRecord = {
      testName: 'test-memory-functionality',
      failureContext: 'Element not found: button[data-testid="login"]',
      repairedSelector: {
        originalSelector: 'button[data-testid="login"]',
        newSelector: 'button:contains("Login")',
        elementName: 'loginButton'
      },
      url: 'https://example.com/login'
    };
    
    await memoryService.saveSuccessfulRepair(testRecord);
    console.log('   ✅ Guardado completado');
    
    // Test 5: Test search operation
    console.log('\n5. 🔍 Probando búsqueda de recuerdos similares...');
    const results = await memoryService.searchSimilarFailures('Element not found: button');
    console.log(`   Resultados encontrados: ${results.length}`);
    
    if (results.length > 0) {
      console.log('   Primer resultado:', JSON.stringify(results[0], null, 2));
    }
    
    console.log('\n🎉 Test de MemoryService completado!');
    
    return {
      success: true,
      chromaEnabled: isEnabled,
      nodeVersion: process.version,
      stats
    };

  } catch (error) {
    console.error('❌ Error en test MemoryService:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      nodeVersion: process.version
    };
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testMemoryService()
    .then((result) => {
      console.log('\n📋 RESULTADO FINAL:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.success) {
        if (result.chromaEnabled) {
          console.log('\n🎯 PERFECTO: ChromaDB está funcionando correctamente!');
          console.log('   El motor inteligente tiene vector memory completo.');
        } else {
          console.log('\n⚠️  ChromaDB no habilitado - funcionando en modo fallback');
          console.log(`   Node.js actual: ${result.nodeVersion}`);
          console.log('   Se requiere Node.js v20+ para ChromaDB completo');
        }
      } else {
        console.log('\n❌ ERROR: MemoryService no funciona correctamente');
        console.log('   Revisar configuración y dependencias');
      }
    })
    .catch((error) => {
      console.error('💥 Error crítico en test:', error);
    });
}

export { testMemoryService };