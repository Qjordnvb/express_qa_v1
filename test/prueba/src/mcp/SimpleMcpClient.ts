// Simplified MCP Client for testing
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { BROWSER_CONFIG, MCP_LAUNCH_ARGS } from '../config/browser-config';

export interface McpElement {
  text?: string;
  name?: string;
  role?: string;
  ref: string;
  type?: string;
  attributes?: { [key: string]: any };
}

export interface McpSnapshot {
  url?: string;
  title?: string;
  timestamp?: string;
  yaml: string;
  elements: McpElement[];
}

export class SimpleMcpClient extends EventEmitter {
  private mcpProcess: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  private initialized = false;
  private lastKnownSnapshot: McpSnapshot | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('[MCP] 🚀 Starting MCP Playwright server...');
    
    // Start MCP server with standardized config
    console.log(`[MCP] Starting with browser: ${BROWSER_CONFIG.browser}`);
    this.mcpProcess = spawn('npx', MCP_LAUNCH_ARGS, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    this.mcpProcess.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((line: string) => line.trim());
      
      for (const line of lines) {
        console.log('[MCP-STDOUT]', line);
        try {
          const response = JSON.parse(line);
          this.handleResponse(response);
        } catch (error) {
          // Log non-JSON lines for debugging
          console.log('[MCP-NON-JSON]', line);
        }
      }
    });

    this.mcpProcess.stderr?.on('data', (data) => {
      console.log('[MCP] Error:', data.toString());
    });

    // Initialize MCP protocol
    await this.initializeMcp();
    
    this.initialized = true;
    console.log('[MCP] ✅ MCP server ready');
  }

  private async initializeMcp(): Promise<void> {
    console.log('[MCP] 🤝 Starting MCP initialization...');
    
    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'test-mcp-client',
          version: '1.0.0'
        }
      }
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(initRequest.id, { resolve, reject });
      
      console.log('[MCP-INIT] Sending initialize request');
      this.mcpProcess?.stdin?.write(JSON.stringify(initRequest) + '\n');
      
      // Timeout for initialization
      setTimeout(() => {
        if (this.pendingRequests.has(initRequest.id)) {
          this.pendingRequests.delete(initRequest.id);
          reject(new Error('MCP initialization timeout'));
        }
      }, 10000);
    });
  }

  private handleResponse(response: any): void {
    if (response.id && this.pendingRequests.has(response.id)) {
      const { resolve, reject } = this.pendingRequests.get(response.id)!;
      this.pendingRequests.delete(response.id);
      
      if (response.error) {
        reject(new Error(response.error.message));
      } else {
        resolve(response.result);
      }
    }
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      
      this.pendingRequests.set(id, { resolve, reject });
      
      // Use MCP protocol format for tools/call
      const request = {
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: {
          name: method,
          arguments: params || {}
        }
      };

      console.log(`[MCP-REQUEST] ${method}`, params || 'no params');
      
      if (this.mcpProcess?.stdin) {
        this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      } else {
        reject(new Error('MCP process not available'));
      }
      
      // Timeout using config
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout after ${BROWSER_CONFIG.timeout}ms`));
        }
      }, BROWSER_CONFIG.timeout);
    });
  }

  async navigate(url: string): Promise<void> {
    console.log(`[MCP] 🌐 Navigating to: ${url}`);
    await this.sendRequest('browser_navigate', { url });
  }

  async snapshot(): Promise<McpSnapshot> {
    console.log('[MCP] 📸 Taking snapshot...');
    
    try {
      const result = await this.sendRequest('browser_snapshot', {});
      
      // Parse MCP response to extract elements
      const elements = this.parseElementsFromMcpResponse(result);
      
      const snapshot: McpSnapshot = {
        url: this.extractUrl(result),
        title: this.extractTitle(result),
        timestamp: new Date().toISOString(),
        yaml: this.extractYaml(result),
        elements
      };
      
      // Cache successful snapshot
      this.lastKnownSnapshot = snapshot;
      return snapshot;
      
    } catch (error) {
      console.warn('[MCP] ⚠️ Snapshot timeout, using cached data or creating empty snapshot');
      
      if (this.lastKnownSnapshot) {
        console.log(`[MCP] 🔄 Using cached snapshot with ${this.lastKnownSnapshot.elements.length} elements`);
        return this.lastKnownSnapshot;
      }
      
      // Return empty but valid snapshot
      return this.createEmptySnapshot();
    }
  }

  private createEmptySnapshot(): McpSnapshot {
    return {
      url: 'Unknown',
      title: 'Unknown', 
      timestamp: new Date().toISOString(),
      yaml: '',
      elements: []
    };
  }

  async click(element: string, ref: string): Promise<void> {
    console.log(`[MCP] 🖱️ Clicking: ${element} [${ref}]`);
    await this.sendRequest('browser_click', { element, ref });
  }

  async type(element: string, ref: string, text: string): Promise<void> {
    console.log(`[MCP] ⌨️ Typing: "${text}" in ${element} [${ref}]`);
    await this.sendRequest('browser_type', { element, ref, text });
  }

  async wait(time: number): Promise<void> {
    console.log(`[MCP] ⏳ Waiting: ${time}ms`);
    await this.sendRequest('browser_wait_for', { time });
  }

  async waitFor(params: { text?: string; textGone?: string; time?: number }): Promise<void> {
    console.log(`[MCP] ⏳ Waiting for:`, params);
    await this.sendRequest('browser_wait_for', params);
  }

  private parseElementsFromMcpResponse(result: any): McpElement[] {
    const elements: McpElement[] = [];
    
    // Extract elements from MCP response
    if (result?.content?.[0]?.text) {
      const text = result.content[0].text;
      const yamlMatch = text.match(/```yaml\n([\s\S]*?)\n```/);
      
      if (yamlMatch) {
        const yaml = yamlMatch[1];
        this.parseYamlElements(yaml, elements);
      }
    }
    
    return elements;
  }

  private parseYamlElements(yaml: string, elements: McpElement[]): void {
    const lines = yaml.split('\n');
    
    for (const line of lines) {
      const refMatch = line.match(/\[ref=([^\]]+)\]/);
      if (refMatch) {
        const ref = refMatch[1];
        
        // Extract element info
        const textMatch = line.match(/"([^"]+)"/);
        const roleMatch = line.match(/^[^"]*?(\w+)\s/);
        
        elements.push({
          ref,
          text: textMatch?.[1],
          name: textMatch?.[1],
          role: this.mapYamlToRole(line),
          type: 'element'
        });
      }
    }
  }

  private mapYamlToRole(line: string): string {
    if (line.includes('button')) return 'button';
    if (line.includes('textbox')) return 'textbox'; 
    if (line.includes('link')) return 'link';
    if (line.includes('heading')) return 'heading';
    if (line.includes('paragraph')) return 'paragraph';
    if (line.includes('img')) return 'img';
    return 'generic';
  }

  private extractUrl(result: any): string {
    const text = result?.content?.[0]?.text || '';
    const urlMatch = text.match(/Page URL: (.+)/);
    return urlMatch?.[1] || '';
  }

  private extractTitle(result: any): string {
    const text = result?.content?.[0]?.text || '';
    const titleMatch = text.match(/Page Title: (.+)/);
    return titleMatch?.[1] || '';
  }

  private extractYaml(result: any): string {
    const text = result?.content?.[0]?.text || '';
    const yamlMatch = text.match(/```yaml\n([\s\S]*?)\n```/);
    return yamlMatch?.[1] || '';
  }

  async cleanup(): Promise<void> {
    console.log('[MCP] 🧹 Starting cleanup...');
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
    this.initialized = false;
    console.log('[MCP] 🧹 Cleanup completed');
  }
}