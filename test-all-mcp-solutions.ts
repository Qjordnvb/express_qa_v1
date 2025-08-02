// test-all-mcp-solutions.ts
// 🧪 Testing de TODAS las soluciones MCP encontradas en URLs
// Objetivo: Que la IA tenga MÁXIMO contexto sin hardcodeo para cualquier sitio

import { MCPClientService } from './orchestrator/services/McpClientService';

interface MCPTestResult {
  method: string;
  success: boolean;
  data: any;
  error?: string;
  dataSize: number;
  hasPasswordInfo: boolean;
  hasTypeAttributes: boolean;
  timeMs: number;
}

interface CompleteContextData {
  ariaSnapshot: any;
  htmlSnapshot?: string;
  evaluateResult?: any;
  consoleMessages: any[];
  networkRequests: any[];
  screenshot: Buffer | undefined;
  pageInfo: any;
  timestamp: string;
}

export class MCPSolutionTester {
  private mcpClient: MCPClientService;

  constructor() {
    this.mcpClient = new MCPClientService();
  }

  /**
   * 🧪 PRUEBA TODAS LAS SOLUCIONES MCP ENCONTRADAS
   */
  async testAllMCPSolutions(url: string): Promise<void> {
    console.log('\n🧪 TESTING TODAS LAS SOLUCIONES MCP SIN HARDCODEO\n');
    console.log(`🎯 Objetivo: IA debe tener máximo contexto para ${url}`);
    console.log(`📋 Métodos a probar:`);
    console.log(`   1. browser_snapshot (ARIA) - Baseline`);
    console.log(`   2. browser_html_snapshot - Desde URL #1`);
    console.log(`   3. browser_evaluate (simple) - Fallback mejorado`);
    console.log(`   4. browser_evaluate (elementos) - Información específica`);
    console.log(`   5. Contexto híbrido completo - Combinación final`);
    
    await this.mcpClient.startMCPServer();
    await this.mcpClient.navigateToUrl(url);
    
    const results: MCPTestResult[] = [];
    
    // === SOLUCIÓN 1: browser_snapshot (ARIA) ===
    results.push(await this.test_browser_snapshot());
    
    // === SOLUCIÓN 2: browser_html_snapshot (URL #1) ===
    results.push(await this.test_browser_html_snapshot());
    
    // === SOLUCIÓN 3: browser_evaluate simple ===
    results.push(await this.test_browser_evaluate_simple());
    
    // === SOLUCIÓN 4: browser_evaluate elementos específicos ===
    results.push(await this.test_browser_evaluate_elements());
    
    // === SOLUCIÓN 5: Contexto híbrido completo ===
    const hybridResult = await this.test_hybrid_complete_context();
    
    // === ANÁLISIS DE RESULTADOS ===
    await this.analyzeResults(results, hybridResult);
    
    await this.mcpClient.stopMCPServer();
  }

  /**
   * 🔬 SOLUCIÓN 1: browser_snapshot (ARIA baseline)
   */
  private async test_browser_snapshot(): Promise<MCPTestResult> {
    const startTime = Date.now();
    console.log('\n📋 TESTING: browser_snapshot (ARIA baseline)');
    
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      const result = await mcpClient.callTool({
        name: 'browser_snapshot',
        arguments: {}
      });
      
      const timeMs = Date.now() - startTime;
      const dataSize = JSON.stringify(result).length;
      const hasPasswordInfo = JSON.stringify(result).toLowerCase().includes('password');
      const hasTypeAttributes = JSON.stringify(result).toLowerCase().includes('type=');
      
      console.log(`✅ browser_snapshot: ${dataSize} chars, password: ${hasPasswordInfo}, type: ${hasTypeAttributes}`);
      
      return {
        method: 'browser_snapshot',
        success: true,
        data: result,
        dataSize,
        hasPasswordInfo,
        hasTypeAttributes,
        timeMs
      };
      
    } catch (error) {
      console.log(`❌ browser_snapshot failed:`, error);
      return {
        method: 'browser_snapshot',
        success: false,
        data: null,
        error: String(error),
        dataSize: 0,
        hasPasswordInfo: false,
        hasTypeAttributes: false,
        timeMs: Date.now() - startTime
      };
    }
  }

  /**
   * 🔬 SOLUCIÓN 2: browser_html_snapshot (de URL #1)
   */
  private async test_browser_html_snapshot(): Promise<MCPTestResult> {
    const startTime = Date.now();
    console.log('\n🌐 TESTING: browser_html_snapshot (URL #1 solution)');
    
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      const result = await mcpClient.callTool({
        name: 'browser_html_snapshot',
        arguments: {}
      });
      
      const timeMs = Date.now() - startTime;
      const dataString = JSON.stringify(result);
      const dataSize = dataString.length;
      const hasPasswordInfo = dataString.toLowerCase().includes('password');
      const hasTypeAttributes = dataString.includes('type="password"') || dataString.includes("type='password'");
      
      console.log(`✅ browser_html_snapshot: ${dataSize} chars, password: ${hasPasswordInfo}, type: ${hasTypeAttributes}`);
      
      return {
        method: 'browser_html_snapshot',
        success: true,
        data: result,
        dataSize,
        hasPasswordInfo,
        hasTypeAttributes,
        timeMs
      };
      
    } catch (error) {
      console.log(`❌ browser_html_snapshot failed:`, error);
      return {
        method: 'browser_html_snapshot',
        success: false,
        data: null,
        error: String(error),
        dataSize: 0,
        hasPasswordInfo: false,
        hasTypeAttributes: false,
        timeMs: Date.now() - startTime
      };
    }
  }

  /**
   * 🔬 SOLUCIÓN 3: browser_evaluate simple (sin complejidad)
   */
  private async test_browser_evaluate_simple(): Promise<MCPTestResult> {
    const startTime = Date.now();
    console.log('\n⚡ TESTING: browser_evaluate simple');
    
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      const result = await mcpClient.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => document.title`
        }
      });
      
      const timeMs = Date.now() - startTime;
      console.log(`✅ browser_evaluate (simple): Works, title = ${JSON.stringify(result)}`);
      
      return {
        method: 'browser_evaluate_simple',
        success: true,
        data: result,
        dataSize: JSON.stringify(result).length,
        hasPasswordInfo: false,
        hasTypeAttributes: false,
        timeMs
      };
      
    } catch (error) {
      console.log(`❌ browser_evaluate (simple) failed:`, error);
      return {
        method: 'browser_evaluate_simple',
        success: false,
        data: null,
        error: String(error),
        dataSize: 0,
        hasPasswordInfo: false,
        hasTypeAttributes: false,
        timeMs: Date.now() - startTime
      };
    }
  }

  /**
   * 🔬 SOLUCIÓN 4: browser_evaluate elementos específicos (minimal)
   */
  private async test_browser_evaluate_elements(): Promise<MCPTestResult> {
    const startTime = Date.now();
    console.log('\n🎯 TESTING: browser_evaluate elementos (minimal)');
    
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      const result = await mcpClient.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            return inputs.map(input => ({
              type: input.type,
              name: input.name,
              placeholder: input.placeholder,
              id: input.id
            }));
          }`
        }
      });
      
      const timeMs = Date.now() - startTime;
      const dataString = JSON.stringify(result);
      const dataSize = dataString.length;
      const hasPasswordInfo = dataString.toLowerCase().includes('password');
      const hasTypeAttributes = dataString.includes('"type":"password"');
      
      console.log(`✅ browser_evaluate (elements): ${dataSize} chars, password: ${hasPasswordInfo}, type: ${hasTypeAttributes}`);
      
      return {
        method: 'browser_evaluate_elements',
        success: true,
        data: result,
        dataSize,
        hasPasswordInfo,
        hasTypeAttributes,
        timeMs
      };
      
    } catch (error) {
      console.log(`❌ browser_evaluate (elements) failed:`, error);
      return {
        method: 'browser_evaluate_elements',
        success: false,
        data: null,
        error: String(error),
        dataSize: 0,
        hasPasswordInfo: false,
        hasTypeAttributes: false,
        timeMs: Date.now() - startTime
      };
    }
  }

  /**
   * 🔬 SOLUCIÓN 5: Contexto híbrido completo
   */
  private async test_hybrid_complete_context(): Promise<CompleteContextData> {
    console.log('\n🚀 TESTING: Contexto híbrido completo (todas las fuentes)');
    
    const startTime = Date.now();
    const contextData: CompleteContextData = {
      ariaSnapshot: null,
      htmlSnapshot: undefined,
      evaluateResult: undefined,
      consoleMessages: [],
      networkRequests: [],
      screenshot: undefined,
      pageInfo: {},
      timestamp: new Date().toISOString()
    };
    
    // 1. ARIA Snapshot (siempre funciona)
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      const ariaResult = await mcpClient.callTool({
        name: 'browser_snapshot',
        arguments: {}
      });
      contextData.ariaSnapshot = ariaResult;
      console.log(`  ✅ ARIA snapshot: ${JSON.stringify(ariaResult).length} chars`);
    } catch (error) {
      console.log(`  ❌ ARIA snapshot failed:`, error);
    }
    
    // 2. HTML Snapshot (si está disponible)
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      const htmlResult = await mcpClient.callTool({
        name: 'browser_html_snapshot',
        arguments: {}
      });
      
      let htmlContent = '';
      if (htmlResult.content && Array.isArray(htmlResult.content)) {
        htmlContent = htmlResult.content.find((item: any) => item.type === 'text')?.text || '';
      } else if (typeof htmlResult === 'string') {
        htmlContent = htmlResult;
      }
      
      contextData.htmlSnapshot = htmlContent;
      console.log(`  ✅ HTML snapshot: ${htmlContent.length} chars`);
    } catch (error) {
      console.log(`  ⚠️ HTML snapshot not available:`, String(error).substring(0, 100));
    }
    
    // 3. Evaluate para elementos específicos (si funciona)
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      const evalResult = await mcpClient.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => {
            const allInputs = Array.from(document.querySelectorAll('input, button, select, textarea'));
            return allInputs.map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.type || null,
              name: el.name || null,
              id: el.id || null,
              placeholder: el.placeholder || null,
              text: el.textContent?.trim().substring(0, 50) || null
            }));
          }`
        }
      });
      contextData.evaluateResult = evalResult;
      console.log(`  ✅ Evaluate result: ${JSON.stringify(evalResult).length} chars`);
    } catch (error) {
      console.log(`  ⚠️ Evaluate not available:`, String(error).substring(0, 100));
    }
    
    // 4. Console y Network (contexto adicional)
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      const [consoleResult, networkResult] = await Promise.all([
        mcpClient.callTool({ name: 'browser_console_messages', arguments: {} }),
        mcpClient.callTool({ name: 'browser_network_requests', arguments: {} })
      ]);
      
      contextData.consoleMessages = this.parseConsoleMessages(consoleResult);
      contextData.networkRequests = this.parseNetworkRequests(networkResult);
      console.log(`  ✅ Console: ${contextData.consoleMessages.length} messages`);
      console.log(`  ✅ Network: ${contextData.networkRequests.length} requests`);
    } catch (error) {
      console.log(`  ⚠️ Console/Network data limited:`, String(error).substring(0, 100));
    }
    
    // 5. Page info básica
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      const pageResult = await mcpClient.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => ({ url: window.location.href, title: document.title })`
        }
      });
      contextData.pageInfo = pageResult;
      console.log(`  ✅ Page info: ${contextData.pageInfo.content?.[0]?.text || 'basic'}`);
    } catch (error) {
      console.log(`  ⚠️ Page info limited`);
    }
    
    const timeMs = Date.now() - startTime;
    console.log(`🏁 Contexto híbrido completado en ${timeMs}ms`);
    
    return contextData;
  }

  /**
   * 📊 ANÁLISIS FINAL DE TODAS LAS SOLUCIONES
   */
  private async analyzeResults(results: MCPTestResult[], hybridContext: CompleteContextData): Promise<void> {
    console.log('\n📊 ANÁLISIS FINAL DE SOLUCIONES MCP\n');
    console.log('=' .repeat(80));
    
    // Tabla de resultados
    console.log('MÉTODO                    | ÉXITO | TAMAÑO | PASSWORD | TYPE | TIEMPO');
    console.log('-'.repeat(80));
    
    results.forEach(result => {
      const success = result.success ? '✅' : '❌';
      const size = result.dataSize.toString().padStart(6);
      const password = result.hasPasswordInfo ? '✅' : '❌';
      const type = result.hasTypeAttributes ? '✅' : '❌';
      const time = `${result.timeMs}ms`.padStart(6);
      
      console.log(`${result.method.padEnd(25)} | ${success}    | ${size} | ${password}       | ${type}  | ${time}`);
    });
    
    console.log('=' .repeat(80));
    
    // Análisis de capacidades
    console.log('\n🔍 ANÁLISIS DE CAPACIDADES:\n');
    
    const workingSolutions = results.filter(r => r.success);
    const passwordSolutions = results.filter(r => r.success && r.hasPasswordInfo);
    const typeSolutions = results.filter(r => r.success && r.hasTypeAttributes);
    
    console.log(`✅ Soluciones funcionando: ${workingSolutions.length}/${results.length}`);
    console.log(`🔐 Detectan info password: ${passwordSolutions.length}/${results.length}`);
    console.log(`🏷️ Detectan type="password": ${typeSolutions.length}/${results.length}`);
    
    // Contexto híbrido summary
    console.log('\n🚀 CONTEXTO HÍBRIDO FINAL:\n');
    console.log(`📋 ARIA snapshot: ${hybridContext.ariaSnapshot ? '✅' : '❌'}`);
    console.log(`🌐 HTML snapshot: ${hybridContext.htmlSnapshot ? '✅' : '❌'} (${hybridContext.htmlSnapshot?.length || 0} chars)`);
    console.log(`⚡ Evaluate result: ${hybridContext.evaluateResult ? '✅' : '❌'}`);
    console.log(`💬 Console messages: ${hybridContext.consoleMessages.length} items`);
    console.log(`🌐 Network requests: ${hybridContext.networkRequests.length} items`);
    
    // Análisis de password detection
    const hasPasswordInAria = JSON.stringify(hybridContext.ariaSnapshot).toLowerCase().includes('password');
    const hasPasswordInHtml = hybridContext.htmlSnapshot?.toLowerCase().includes('password') || false;
    const hasPasswordInEval = JSON.stringify(hybridContext.evaluateResult).toLowerCase().includes('password');
    const hasTypePassword = 
      hybridContext.htmlSnapshot?.includes('type="password"') || 
      JSON.stringify(hybridContext.evaluateResult).includes('"type":"password"') || false;
    
    console.log('\n🔐 DETECCIÓN DE CAMPOS PASSWORD:\n');
    console.log(`   📋 En ARIA: ${hasPasswordInAria ? '✅' : '❌'}`);
    console.log(`   🌐 En HTML: ${hasPasswordInHtml ? '✅' : '❌'}`);
    console.log(`   ⚡ En Evaluate: ${hasPasswordInEval ? '✅' : '❌'}`);
    console.log(`   🏷️ type="password": ${hasTypePassword ? '✅' : '❌'}`);
    
    // Recomendación final
    console.log('\n💡 RECOMENDACIÓN PARA LA IA:\n');
    
    if (typeSolutions.length > 0) {
      console.log(`✅ USAR: ${typeSolutions[0].method} - Detecta type="password" directamente`);
      console.log(`   La IA tendrá información HTML completa para tomar decisiones precisas`);
    } else if (passwordSolutions.length > 0) {
      console.log(`⚠️ USAR: ${passwordSolutions[0].method} - Detecta contexto password`);
      console.log(`   La IA deberá usar contexto semántico para identificar campos`);
    } else if (workingSolutions.length > 0) {
      console.log(`🔄 USAR: Contexto híbrido con ${workingSolutions[0].method} + análisis semántico`);
      console.log(`   La IA deberá ser inteligente con la información disponible`);
    } else {
      console.log(`❌ PROBLEMA: Ninguna solución MCP funciona correctamente`);
      console.log(`   Verificar configuración MCP y versión de @playwright/mcp`);
    }
    
    console.log('\n🧠 ESTRATEGIA FINAL PARA LA IA:');
    console.log(`   1. Usar TODOS los datos disponibles sin hardcodeo`);
    console.log(`   2. Correlacionar información ARIA + HTML + Evaluate cuando esté disponible`);
    console.log(`   3. Usar contexto semántico de la historia de usuario`);
    console.log(`   4. Generar selectores múltiples para máxima robustez`);
    console.log(`   5. La IA debe adaptarse dinámicamente a cualquier sitio web`);
  }

  // Helper methods
  private parseConsoleMessages(consoleResult: any): any[] {
    try {
      if (consoleResult.content && Array.isArray(consoleResult.content)) {
        const textContent = consoleResult.content.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          return JSON.parse(textContent.text);
        }
      }
      return Array.isArray(consoleResult) ? consoleResult : [];
    } catch {
      return [];
    }
  }

  private parseNetworkRequests(networkResult: any): any[] {
    try {
      if (networkResult.content && Array.isArray(networkResult.content)) {
        const textContent = networkResult.content.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          return JSON.parse(textContent.text);
        }
      }
      return Array.isArray(networkResult) ? networkResult : [];
    } catch {
      return [];
    }
  }
}

// Ejecutar test
async function runTest() {
  const tester = new MCPSolutionTester();
  await tester.testAllMCPSolutions('https://admin-dev.membeers.com/');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runTest().catch(console.error);
}