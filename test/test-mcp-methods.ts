// test-mcp-methods.ts - Quick test to discover available MCP methods

import { spawn } from 'child_process';

async function testMcpMethods() {
  console.log('🔍 Discovering MCP Playwright methods...');
  
  const mcpProcess = spawn('npx', ['@playwright/mcp', '--headless', '--browser', 'chromium'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let buffer = '';

  mcpProcess.stdout?.on('data', (data: Buffer) => {
    buffer += data.toString();
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line);
          console.log('📨 Received:', parsed);
        } catch (error) {
          console.log('📨 Raw:', line);
        }
      }
    }
  });

  mcpProcess.stderr?.on('data', (data: Buffer) => {
    console.log('🔴 STDERR:', data.toString());
  });

  // Test some common methods
  const testMethods = [
    // Basic navigation
    { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    { jsonrpc: '2.0', id: 2, method: 'browser/navigate', params: { url: 'https://www.google.com' } },
    { jsonrpc: '2.0', id: 3, method: 'browser/get_accessibility_tree' },
    { jsonrpc: '2.0', id: 4, method: 'browser/take_screenshot' }
  ];

  for (const [index, method] of testMethods.entries()) {
    console.log(`\n🧪 Testing method ${index + 1}:`, method.method);
    mcpProcess.stdin?.write(JSON.stringify(method) + '\n');
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Cleanup
  setTimeout(() => {
    mcpProcess.kill();
    console.log('\n✅ Test completed');
  }, 10000);
}

testMcpMethods().catch(console.error);