// test-mcp-simple.ts
// Test minimalista para ver output MCP

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function testMCPSimple() {
  console.log('🔍 TEST MCP MINIMALISTA\n');
  
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['@playwright/mcp']
  });
  
  const client = new Client({
    name: 'test-mcp',
    version: '1.0.0'
  }, {
    capabilities: {}
  });
  
  try {
    await client.connect(transport);
    console.log('✅ MCP conectado');
    
    // Navegar a una página simple
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' }
    });
    
    console.log('✅ Navegación a ejemplo.com');
    
    // Esperar 2 segundos
    await client.callTool({
      name: 'browser_wait_for',
      arguments: { time: 2000 }
    });
    
    // Tomar snapshot
    const snapshot = await client.callTool({
      name: 'browser_snapshot',
      arguments: {}
    });
    
    console.log('\n📸 SNAPSHOT RAW:');
    console.log('Tipo:', typeof snapshot);
    console.log('Keys:', Object.keys(snapshot));
    
    if (snapshot.content && Array.isArray(snapshot.content)) {
      snapshot.content.forEach((item: any, index: number) => {
        console.log(`\nContent[${index}]:`);
        console.log('  Type:', item.type);
        if (item.text) {
          console.log('  Text preview:', item.text.substring(0, 200) + '...');
        }
      });
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    try {
      await client.close();
    } catch (e) {}
  }
}

testMCPSimple().catch(console.error);