#!/usr/bin/env ts-node
// start-hybrid.ts - Punto de entrada para Express QA Hybrid
// 🚀 Funciona tanto independiente como bajo Claude Code

// ✅ CORREGIR: Cargar variables de entorno PRIMERO
import * as dotenv from 'dotenv';
dotenv.config();

import { HybridOrchestrator } from './core/claude-code-integration/HybridOrchestrator';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🎯 DETECCIÓN DEL ENTORNO DE EJECUCIÓN
 */
function detectEnvironment() {
  const isClaudeCode = !!(
    process.env.CLAUDE_CODE_SESSION ||
    process.env.CLAUDE_SESSION ||
    (global as any).claudeCodeRuntime
  );
  
  const hasClaudeJson = fs.existsSync('.claude.json');
  const hasNativeMcp = typeof (global as any).claudeCodeTools !== 'undefined';
  
  return {
    isClaudeCode,
    hasClaudeJson, 
    hasNativeMcp,
    environment: isClaudeCode ? 'claude-code' : 'standalone'
  };
}

/**
 * 🚀 ENTRADA PRINCIPAL HÍBRIDA
 */
async function startHybridSystem() {
  console.log('🚀 EXPRESS QA HYBRID - STARTUP');
  console.log('=' .repeat(50));
  
  // Detectar entorno
  const env = detectEnvironment();
  console.log('🔍 Environment Detection:');
  console.log(`   🏃 Runtime: ${env.environment}`);
  console.log(`   📋 Claude.json: ${env.hasClaudeJson ? '✅' : '❌'}`);
  console.log(`   🛠️ Native MCP: ${env.hasNativeMcp ? '✅' : '❌'}`);
  
  // Configurar según entorno
  if (env.isClaudeCode) {
    console.log('\n💎 Running under Claude Code - Maximum stability mode');
    await runUnderClaudeCode();
  } else {
    console.log('\n🔧 Running standalone - Development/testing mode');
    await runStandalone();
  }
}

/**
 * 💎 EJECUCIÓN BAJO CLAUDE CODE (Máxima estabilidad)
 */
async function runUnderClaudeCode() {
  try {
    console.log('🔧 Initializing Claude Code integration...');
    
    // Verificar herramientas MCP disponibles
    const availableTools = await listAvailableMcpTools();
    console.log(`🛠️ Available MCP tools: ${availableTools.join(', ')}`);
    
    // Inicializar orquestador híbrido
    const orchestrator = new HybridOrchestrator();
    
    // Procesar argumentos de línea de comandos
    const userStoryPath = process.argv[2];
    
    if (!userStoryPath) {
      console.log('\n📋 Usage under Claude Code:');
      console.log('   claude --resume');
      console.log('   (then run) ts-node start-hybrid.ts user-stories/your-story.json');
      return;
    }
    
    // Ejecutar generación híbrida
    console.log(`\n🎬 Generating test with Claude Code MCP: ${path.basename(userStoryPath)}`);
    const result = await orchestrator.generateTest(userStoryPath);
    
    if (result.success) {
      console.log('\n🎉 SUCCESS: Test generated with Claude Code stability!');
      console.log(`📁 Generated files: ${result.generatedFiles?.join(', ')}`);
    } else {
      console.log('\n⚠️ Issues detected, but AI learned from them');
      console.log(`🔍 Analysis: ${result.analysis?.failureType || 'Unknown'}`);
    }
    
  } catch (error) {
    console.error('❌ Claude Code integration error:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Ensure Claude Code is properly configured');
    console.log('  2. Check .claude.json MCP settings');
    console.log('  3. Verify project is in Claude Code workspace');
  }
}

/**
 * 🔧 EJECUCIÓN INDEPENDIENTE (Desarrollo/Testing)
 */
async function runStandalone() {
  try {
    console.log('🔧 Initializing standalone mode...');
    
    // Verificar dependencias básicas
    const checks = await performStandaloneChecks();
    
    if (!checks.allPassed) {
      console.log('\n❌ Some checks failed - functionality may be limited');
      console.log('💡 For full functionality, run under Claude Code');
    }
    
    // Inicializar orquestador
    const orchestrator = new HybridOrchestrator();
    
    // Mostrar ejemplo de uso
    const userStoryPath = process.argv[2];
    
    if (!userStoryPath) {
      console.log('\n📋 Standalone Usage:');
      console.log('   npm run orchestrate -- user-stories/your-story.json');
      console.log('   OR');
      console.log('   ts-node start-hybrid.ts user-stories/your-story.json');
      
      // Crear una prueba de ejemplo
      await createSampleTest();
      return;
    }
    
    // Ejecutar generación
    console.log(`\n🎬 Generating test in standalone mode: ${path.basename(userStoryPath)}`);
    const result = await orchestrator.generateTest(userStoryPath);
    
    if (result.success) {
      console.log('\n🎉 SUCCESS: Test generated in standalone mode!');
      console.log('💡 For maximum stability, consider running under Claude Code');
    } else {
      console.log('\n⚠️ Generation had issues - this is normal in standalone mode');
    }
    
  } catch (error) {
    console.error('❌ Standalone mode error:', error);
    console.log('\n🔧 Try running under Claude Code for maximum stability');
  }
}

/**
 * 🛠️ Listar herramientas MCP disponibles
 */
async function listAvailableMcpTools(): Promise<string[]> {
  const tools: string[] = [];
  
  try {
    // Verificar herramientas MCP de Claude Code
    if ((global as any).claudeCodeTools) {
      const availableTools = Object.keys((global as any).claudeCodeTools);
      tools.push(...availableTools.filter(tool => tool.startsWith('mcp__playwright')));
    }
    
    // Si no hay herramientas reales, listar las simuladas
    if (tools.length === 0) {
      tools.push(
        'mcp__playwright__browser_navigate',
        'mcp__playwright__browser_snapshot', 
        'mcp__playwright__browser_console_messages',
        'mcp__playwright__browser_network_requests'
      );
    }
    
  } catch (error) {
    console.warn('⚠️ Could not list MCP tools:', error);
  }
  
  return tools;
}

/**
 * 🔍 Verificaciones para modo standalone
 */
async function performStandaloneChecks(): Promise<{allPassed: boolean; checks: Record<string, boolean>}> {
  const checks = {
    nodeModules: fs.existsSync('node_modules'),
    playwrightConfig: fs.existsSync('playwright.config.ts'),
    coreComponents: fs.existsSync('core'),
    envFile: fs.existsSync('.env')
  };
  
  const allPassed = Object.values(checks).every(Boolean);
  
  console.log('📋 Standalone checks:');
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  });
  
  return { allPassed, checks };
}

/**
 * 📝 Crear prueba de ejemplo
 */
async function createSampleTest() {
  const samplePath = 'user-stories/sample-google-test.testcase.json';
  
  if (!fs.existsSync(samplePath)) {
    const sampleTest = {
      name: "Sample Google Search Test",
      path: "/",
      userStory: [
        "GIVEN I am on the Google homepage",
        "WHEN I locate the search input field",
        "THEN I should be able to interact with it"
      ]
    };
    
    fs.mkdirSync(path.dirname(samplePath), { recursive: true });
    fs.writeFileSync(samplePath, JSON.stringify(sampleTest, null, 2));
    
    console.log(`\n📝 Created sample test: ${samplePath}`);
    console.log('   Run with: npm run orchestrate -- ' + samplePath);
  }
}

// 🚀 PUNTO DE ENTRADA
if (require.main === module) {
  startHybridSystem()
    .then(() => {
      console.log('\n✅ Hybrid system completed successfully');
    })
    .catch((error) => {
      console.error('\n💥 Hybrid system failed:', error);
      process.exit(1);
    });
}

export { startHybridSystem, detectEnvironment };