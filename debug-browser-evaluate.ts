// debug-browser-evaluate.ts
// Debug específico para entender el error de browser_evaluate

import { MCPClientService } from './orchestrator/services/McpClientService';

async function debugBrowserEvaluate() {
  console.log('\n🔍 DEBUG: browser_evaluate error');
  console.log('=' .repeat(50));
  
  const mcpClient = new MCPClientService();
  
  try {
    await mcpClient.startMCPServer();
    await mcpClient.navigateToUrl('https://admin-dev.membeers.com/');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const client = (mcpClient as any).mcpClient;
    
    // Test 1: Función simple sin arrow functions
    console.log('\n🧪 Test 1: Función simple');
    try {
      const result1 = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: 'function() { return document.title; }'
        }
      });
      console.log('✅ Result 1:', JSON.stringify(result1, null, 2));
    } catch (e) {
      console.log('❌ Error 1:', e.message);
    }
    
    // Test 2: Expression simple
    console.log('\n🧪 Test 2: Expression simple');
    try {
      const result2 = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          expression: 'document.title'
        }
      });
      console.log('✅ Result 2:', JSON.stringify(result2, null, 2));
    } catch (e) {
      console.log('❌ Error 2:', e.message);
    }
    
    // Test 3: Array simple con function
    console.log('\n🧪 Test 3: Array simple con function');
    try {
      const result3 = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: 'function() { var inputs = document.querySelectorAll("input"); return inputs.length; }'
        }
      });
      console.log('✅ Result 3:', JSON.stringify(result3, null, 2));
    } catch (e) {
      console.log('❌ Error 3:', e.message);
    }
    
    // Test 4: Array simple con expression
    console.log('\n🧪 Test 4: Array simple con expression');
    try {
      const result4 = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          expression: 'document.querySelectorAll("input").length'
        }
      });
      console.log('✅ Result 4:', JSON.stringify(result4, null, 2));
    } catch (e) {
      console.log('❌ Error 4:', e.message);
    }
    
    // Test 5: Objeto simple con expression
    console.log('\n🧪 Test 5: Objeto simple con expression');
    try {
      const result5 = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          expression: `{
            title: document.title,
            inputCount: document.querySelectorAll('input').length
          }`
        }
      });
      console.log('✅ Result 5:', JSON.stringify(result5, null, 2));
    } catch (e) {
      console.log('❌ Error 5:', e.message);
    }
    
  } finally {
    await mcpClient.stopMCPServer();
  }
}

if (require.main === module) {
  debugBrowserEvaluate().catch(console.error);
}