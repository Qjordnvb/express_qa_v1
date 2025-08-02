// test-mcp-everything-comprehensive.ts
// Test COMPLETO para ver TODO lo que expone MCP con TODOS los métodos disponibles

import { MCPClientService } from './orchestrator/services/McpClientService';

async function testMcpEverythingComprehensive() {
  console.log('\n🔍 TEST COMPREHENSIVE: TODO lo que expone MCP');
  console.log('='.repeat(60));
  console.log('🎯 Objetivo: Ver ABSOLUTAMENTE TODO lo que puede ofrecer MCP');
  
  const mcpClient = new MCPClientService();
  
  try {
    await mcpClient.startMCPServer();
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const client = (mcpClient as any).mcpClient;
    
    // ===============================================
    // 1. PROBAR TODOS LOS MÉTODOS DE SNAPSHOT
    // ===============================================
    
    console.log('\n📸 SECCIÓN 1: TODOS LOS MÉTODOS DE SNAPSHOT');
    console.log('='.repeat(50));
    
    // 1.1 browser_snapshot (método estándar)
    console.log('\n🧪 TEST 1.1: browser_snapshot');
    console.log('-'.repeat(30));
    
    try {
      const snapshotResult = await client.callTool({
        name: 'browser_snapshot',
        arguments: {}
      });
      
      console.log('📄 RESPUESTA browser_snapshot:');
      console.log('  - Type:', typeof snapshotResult);
      console.log('  - Keys:', Object.keys(snapshotResult));
      console.log('  - Content structure:', snapshotResult.content ? snapshotResult.content.map((c: any) => c.type) : 'No content');
      
      // Extraer y analizar YAML
      if (snapshotResult.content) {
        const textContent = snapshotResult.content.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          console.log('  - YAML length:', textContent.text.length);
          console.log('  - First 200 chars:', textContent.text.substring(0, 200));
          
          // Contar elementos
          const refMatches = textContent.text.match(/\[ref=[^\]]+\]/g);
          console.log('  - Elements with refs:', refMatches ? refMatches.length : 0);
          
          // Buscar TODOS los tipos de atributos posibles
          const allAttributes = new Set();
          const attrMatches = textContent.text.matchAll(/\[([^=]+)=[^\]]+\]/g);
          for (const match of attrMatches) {
            allAttributes.add(match[1]);
          }
          console.log('  - Attribute types found:', Array.from(allAttributes));
        }
      }
    } catch (error: any) {
      console.log('❌ browser_snapshot failed:', error.message);
    }
    
    // 1.2 browser_html_snapshot (si existe)
    console.log('\n🧪 TEST 1.2: browser_html_snapshot');
    console.log('-'.repeat(30));
    
    try {
      const htmlResult = await client.callTool({
        name: 'browser_html_snapshot',
        arguments: {}
      });
      
      console.log('📄 RESPUESTA browser_html_snapshot:');
      console.log('  - Type:', typeof htmlResult);
      console.log('  - Keys:', Object.keys(htmlResult));
      
      if (htmlResult.content) {
        const textContent = htmlResult.content.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          console.log('  - HTML length:', textContent.text.length);
          console.log('  - Contains forms:', textContent.text.includes('<form'));
          console.log('  - Contains inputs:', textContent.text.includes('<input'));
          console.log('  - Contains password:', textContent.text.includes('type="password"'));
          console.log('  - First 500 chars:', textContent.text.substring(0, 500));
        }
      }
    } catch (error: any) {
      console.log('❌ browser_html_snapshot failed:', error.message);
    }
    
    // ===============================================
    // 2. PROBAR MÉTODOS DE EVALUATE
    // ===============================================
    
    console.log('\n💻 SECCIÓN 2: MÉTODOS DE JAVASCRIPT EVALUATE');
    console.log('='.repeat(50));
    
    // 2.1 Obtener información básica del DOM
    console.log('\n🧪 TEST 2.1: evaluate - información básica');
    console.log('-'.repeat(30));
    
    try {
      const basicInfo = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          expression: 'document.title + " | " + document.URL + " | " + document.forms.length + " forms"'
        }
      });
      
      console.log('📄 Información básica:', basicInfo);
    } catch (error: any) {
      console.log('❌ evaluate básico failed:', error.message);
    }
    
    // 2.2 Contar todos los elementos interactivos
    console.log('\n🧪 TEST 2.2: evaluate - elementos interactivos');
    console.log('-'.repeat(30));
    
    try {
      const interactiveCount = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          expression: `
            {
              inputs: document.querySelectorAll('input').length,
              buttons: document.querySelectorAll('button').length,
              links: document.querySelectorAll('a').length,
              selects: document.querySelectorAll('select').length,
              textareas: document.querySelectorAll('textarea').length
            }
          `
        }
      });
      
      console.log('📄 Elementos interactivos:', interactiveCount);
    } catch (error: any) {
      console.log('❌ evaluate interactivos failed:', error.message);
    }
    
    // 2.3 Obtener atributos de TODOS los inputs
    console.log('\n🧪 TEST 2.3: evaluate - atributos de inputs');
    console.log('-'.repeat(30));
    
    try {
      const inputAttributes = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          expression: `
            Array.from(document.querySelectorAll('input')).map(input => ({
              type: input.type,
              name: input.name,
              id: input.id,
              placeholder: input.placeholder,
              className: input.className,
              required: input.required,
              value: input.value,
              tagName: input.tagName,
              outerHTML: input.outerHTML.substring(0, 200)
            }))
          `
        }
      });
      
      console.log('📄 Atributos de inputs:');
      if (Array.isArray(inputAttributes.content)) {
        inputAttributes.content.forEach((input: any, index: number) => {
          console.log(`  Input ${index + 1}:`, input);
        });
      } else {
        console.log('  Result:', inputAttributes);
      }
    } catch (error: any) {
      console.log('❌ evaluate inputs failed:', error.message);
    }
    
    // 2.4 Usar ChatGPT proposal: element.getAttribute()
    console.log('\n🧪 TEST 2.4: ChatGPT proposal - getAttribute');
    console.log('-'.repeat(30));
    
    try {
      const attributeTest = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          expression: `
            (() => {
              const inputs = document.querySelectorAll('input');
              const results = [];
              
              inputs.forEach((input, index) => {
                results.push({
                  index: index,
                  type: input.getAttribute('type'),
                  name: input.getAttribute('name'),
                  id: input.getAttribute('id'),
                  placeholder: input.getAttribute('placeholder'),
                  class: input.getAttribute('class'),
                  role: input.getAttribute('role'),
                  'aria-label': input.getAttribute('aria-label'),
                  autocomplete: input.getAttribute('autocomplete')
                });
              });
              
              return results;
            })()
          `
        }
      });
      
      console.log('📄 getAttribute results:');
      if (attributeTest && attributeTest.content) {
        console.log('  Type:', typeof attributeTest.content);
        console.log('  Content:', attributeTest.content);
      } else {
        console.log('  Direct result:', attributeTest);
      }
    } catch (error: any) {
      console.log('❌ getAttribute test failed:', error.message);
    }
    
    // ===============================================
    // 3. MÉTODOS DE ACCESSIBILITY TREE
    // ===============================================
    
    console.log('\n♿ SECCIÓN 3: ACCESSIBILITY TREE METHODS');
    console.log('='.repeat(50));
    
    // 3.1 Intentar browser_accessibility_snapshot
    console.log('\n🧪 TEST 3.1: browser_accessibility_snapshot');
    console.log('-'.repeat(30));
    
    try {
      const accessibilityResult = await client.callTool({
        name: 'browser_accessibility_snapshot',
        arguments: {}
      });
      
      console.log('📄 RESPUESTA accessibility_snapshot:', accessibilityResult);
    } catch (error: any) {
      console.log('❌ accessibility_snapshot failed:', error.message);
    }
    
    // ===============================================
    // 4. PROBAR OTROS MÉTODOS POSIBLES
    // ===============================================
    
    console.log('\n🔧 SECCIÓN 4: OTROS MÉTODOS POSIBLES');
    console.log('='.repeat(50));
    
    // 4.1 Listar todos los tools disponibles
    console.log('\n🧪 TEST 4.1: listar tools disponibles');
    console.log('-'.repeat(30));
    
    try {
      const tools = await client.listTools();
      console.log('📄 Tools disponibles:');
      tools.tools.forEach((tool: any) => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
    } catch (error: any) {
      console.log('❌ listTools failed:', error.message);
    }
    
    // 4.2 Browser console messages
    console.log('\n🧪 TEST 4.2: browser_console_messages');
    console.log('-'.repeat(30));
    
    try {
      const consoleResult = await client.callTool({
        name: 'browser_console_messages',
        arguments: {}
      });
      
      console.log('📄 Console messages:', consoleResult);
    } catch (error: any) {
      console.log('❌ console_messages failed:', error.message);
    }
    
    // 4.3 Network requests
    console.log('\n🧪 TEST 4.3: browser_network_requests');
    console.log('-'.repeat(30));
    
    try {
      const networkResult = await client.callTool({
        name: 'browser_network_requests',
        arguments: {}
      });
      
      console.log('📄 Network requests:', networkResult);
    } catch (error: any) {
      console.log('❌ network_requests failed:', error.message);
    }
    
    // ===============================================
    // 5. CORRELATION TEST CON REF
    // ===============================================
    
    console.log('\n🔗 SECCIÓN 5: CORRELATION TEST CON REF');
    console.log('='.repeat(50));
    
    // 5.1 Obtener snapshot con refs
    console.log('\n🧪 TEST 5.1: correlación usando refs');
    console.log('-'.repeat(30));
    
    try {
      const snapshotForRef = await client.callTool({
        name: 'browser_snapshot',
        arguments: {}
      });
      
      if (snapshotForRef.content) {
        const textContent = snapshotForRef.content.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          // Extraer elementos con ref
          const lines = textContent.text.split('\n');
          const elementsWithRef = [];
          
          for (const line of lines) {
            const refMatch = line.match(/\[ref=([^\]]+)\]/);
            if (refMatch) {
              elementsWithRef.push({
                ref: refMatch[1],
                line: line.trim()
              });
            }
          }
          
          console.log(`📄 Elementos con ref encontrados: ${elementsWithRef.length}`);
          
          // Para cada elemento con ref, intentar obtener sus atributos usando evaluate
          if (elementsWithRef.length > 0) {
            const firstElement = elementsWithRef[0];
            console.log(`🎯 Probando con primer elemento: ${firstElement.line}`);
            
            try {
              const attributesViaRef = await client.callTool({
                name: 'browser_evaluate',
                arguments: {
                  expression: `
                    (() => {
                      // Buscar elemento por varios métodos
                      const allInputs = Array.from(document.querySelectorAll('input, button, select, textarea, a'));
                      
                      return allInputs.map((el, index) => ({
                        index: index,
                        tagName: el.tagName,
                        type: el.getAttribute ? el.getAttribute('type') : null,
                        name: el.getAttribute ? el.getAttribute('name') : null,
                        id: el.getAttribute ? el.getAttribute('id') : null,
                        className: el.getAttribute ? el.getAttribute('class') : null,
                        role: el.getAttribute ? el.getAttribute('role') : null,
                        placeholder: el.getAttribute ? el.getAttribute('placeholder') : null,
                        textContent: el.textContent ? el.textContent.substring(0, 50) : null
                      }));
                    })()
                  `
                }
              });
              
              console.log('📄 Atributos via evaluate:', attributesViaRef);
            } catch (error: any) {
              console.log('❌ evaluate via ref failed:', error.message);
            }
          }
        }
      }
    } catch (error: any) {
      console.log('❌ correlation test failed:', error.message);
    }
    
    // ===============================================
    // 6. RESUMEN FINAL
    // ===============================================
    
    console.log('\n📊 SECCIÓN 6: RESUMEN FINAL');
    console.log('='.repeat(50));
    
    console.log('✅ Métodos probados:');
    console.log('   - browser_snapshot');
    console.log('   - browser_html_snapshot');
    console.log('   - browser_evaluate (múltiples variaciones)');
    console.log('   - browser_accessibility_snapshot');
    console.log('   - browser_console_messages');
    console.log('   - browser_network_requests');
    console.log('   - listTools');
    
    console.log('\n🎯 Estrategias de extracción probadas:');
    console.log('   - YAML parsing de accessibility tree');
    console.log('   - HTML snapshot completo');
    console.log('   - JavaScript DOM queries');
    console.log('   - getAttribute() directo');
    console.log('   - Correlación ref-based');
    
    console.log('\n📋 CONCLUSIÓN:');
    console.log('   Este test muestra ABSOLUTAMENTE TODO lo que MCP puede exponer.');
    console.log('   Los resultados determinarán la estrategia final a implementar.');
    
  } catch (error) {
    console.error('💥 ERROR GENERAL:', error);
  } finally {
    await mcpClient.stopMCPServer();
  }
}

if (require.main === module) {
  testMcpEverythingComprehensive().catch(console.error);
}