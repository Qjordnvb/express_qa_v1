// get-mcp-tools.ts - Get detailed list of MCP tools

import { spawn } from 'child_process';

async function getMcpTools() {
  console.log('🔍 Getting detailed MCP tools list...');
  
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
          if (parsed.result && parsed.result.tools) {
            console.log('\n📋 Available MCP Tools:');
            parsed.result.tools.forEach((tool: any, index: number) => {
              console.log(`\n${index + 1}. ${tool.name}`);
              console.log(`   Description: ${tool.description}`);
              if (tool.inputSchema && tool.inputSchema.properties) {
                console.log('   Parameters:');
                Object.entries(tool.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
                  console.log(`     - ${key}: ${prop.type} ${prop.description ? '- ' + prop.description : ''}`);
                });
              }
            });
          } else {
            console.log('📨 Response:', JSON.stringify(parsed, null, 2));
          }
        } catch (error) {
          console.log('📨 Raw:', line);
        }
      }
    }
  });

  mcpProcess.stderr?.on('data', (data: Buffer) => {
    console.log('🔴 STDERR:', data.toString());
  });

  // Request tools list
  const request = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
  console.log('📤 Requesting tools list...');
  mcpProcess.stdin?.write(JSON.stringify(request) + '\n');

  // Cleanup after 10 seconds
  setTimeout(() => {
    mcpProcess.kill();
    console.log('\n✅ Done');
  }, 10000);
}

getMcpTools().catch(console.error);