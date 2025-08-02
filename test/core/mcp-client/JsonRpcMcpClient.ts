// core/mcp-client/JsonRpcMcpClient.ts
// 🚀 Cliente JSON-RPC para comunicación real con MCP Playwright

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface McpNavigateParams {
  url: string;
  timeout?: number;
}

export interface McpClickParams {
  element: string;
  ref: string;
  button?: 'left' | 'right' | 'middle';
  doubleClick?: boolean;
}

export interface McpTypeParams {
  element: string;
  ref: string;
  text: string;
  slowly?: boolean;
  submit?: boolean;
}

export interface McpScreenshotParams {
  filename?: string;
  fullPage?: boolean;
  raw?: boolean;
  element?: string;
  ref?: string;
}

export interface McpWaitForParams {
  text?: string;
  textGone?: string;
  time?: number;
}

export interface McpSnapshotResult {
  yaml: string;
  elements?: Array<{
    ref: string;
    type: string;
    text?: string;
    role?: string;
    name?: string;
    attributes?: Record<string, any>;
  }>;
}

/**
 * 🎯 Cliente JSON-RPC real para MCP Playwright
 * 
 * Este cliente implementa el protocolo exacto descrito en la guía MCP
 * para comunicarse con el servidor MCP Playwright via stdio
 */
export class JsonRpcMcpClient extends EventEmitter {
  private mcpProcess: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number | string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private buffer = '';

  constructor() {
    super();
    console.log('🔧 JsonRpcMcpClient: Inicializando cliente JSON-RPC para MCP real...');
  }

  /**
   * 🚀 Iniciar servidor MCP Playwright real
   */
  async initialize(): Promise<void> {
    console.log('🌐 Iniciando servidor MCP Playwright real...');
    
    try {
      // Ejecutar el comando exacto de la configuración .claude.json con --isolated
      this.mcpProcess = spawn('npx', [
        '@playwright/mcp@latest',
        '--headless',
        '--browser',
        'chromium',
        '--isolated'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });

      // Configurar listeners para stdout
      this.mcpProcess.stdout?.on('data', (data: Buffer) => {
        this.handleStdoutData(data);
      });

      // Configurar listeners para stderr
      this.mcpProcess.stderr?.on('data', (data: Buffer) => {
        console.error('[MCP-STDERR]', data.toString());
      });

      // Manejar cierre del proceso
      this.mcpProcess.on('close', (code) => {
        console.log(`[MCP] Proceso cerrado con código: ${code}`);
        this.cleanup();
      });

      // Esperar a que el servidor esté listo
      await this.waitForReady();
      
      console.log('✅ Servidor MCP Playwright iniciado correctamente');
      
    } catch (error) {
      console.error('❌ Error iniciando servidor MCP:', error);
      throw error;
    }
  }

  /**
   * 📡 Enviar solicitud JSON-RPC
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    const id = ++this.requestId;
    
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params: params || {}
    };

    console.log(`[MCP-REQUEST] ${method}`, params || 'no params');

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const requestStr = JSON.stringify(request) + '\n';
      this.mcpProcess?.stdin?.write(requestStr);
    });
  }

  /**
   * 🛠️ Llamar a una herramienta MCP
   */
  private async callTool(name: string, toolArguments: any = {}): Promise<any> {
    return this.sendRequest('tools/call', {
      name,
      arguments: toolArguments
    });
  }

  /**
   * 📥 Manejar datos de stdout
   */
  private handleStdoutData(data: Buffer): void {
    this.buffer += data.toString();
    
    // Procesar líneas completas
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response: JsonRpcResponse = JSON.parse(line);
          this.handleResponse(response);
        } catch (error) {
          console.error('[MCP] Error parseando respuesta:', line);
        }
      }
    }
  }

  /**
   * 🔄 Manejar respuesta JSON-RPC
   */
  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;

    this.pendingRequests.delete(response.id);

    if (response.error) {
      console.error(`[MCP-ERROR] ${response.error.message}`, response.error);
      pending.reject(new Error(response.error.message));
    } else {
      console.log(`[MCP-RESPONSE] ID ${response.id}:`, response.result);
      pending.resolve(response.result);
    }
  }

  /**
   * ⏳ Esperar a que el servidor esté listo
   */
  private async waitForReady(): Promise<void> {
    // Intentar obtener información del sistema para verificar capacidades
    try {
      const info = await this.sendRequest('system/info');
      console.log('[MCP] Servidor listo con info:', info);
    } catch (error) {
      // El servidor MCP Playwright no implementa system/info, pero eso es normal
      console.log('[MCP] Servidor MCP Playwright listo (system/info no soportado)');
    }
  }

  // 🎯 MÉTODOS MCP PLAYWRIGHT

  /**
   * 🌐 Navegar a una URL
   */
  async navigate(params: McpNavigateParams): Promise<any> {
    return this.callTool('browser_navigate', { url: params.url });
  }

  /**
   * 📸 Obtener snapshot de la página
   */
  async snapshot(): Promise<McpSnapshotResult> {
    const result = await this.callTool('browser_snapshot', {});
    
    // El resultado viene en result.content si es exitoso
    let yaml = '';
    if (result.content && Array.isArray(result.content)) {
      yaml = result.content.map((item: any) => item.text || '').join('\n');
    } else if (typeof result.content === 'string') {
      yaml = result.content;
    } else if (typeof result === 'string') {
      yaml = result;
    }
    
    const snapshotResult: McpSnapshotResult = {
      yaml,
      elements: []
    };
    
    // Parsear el YAML para extraer elementos con refs
    if (yaml) {
      snapshotResult.elements = this.parseYamlSnapshot(yaml);
    }
    
    return snapshotResult;
  }

  /**
   * 🖱️ Click en elemento
   */
  async click(params: McpClickParams): Promise<any> {
    return this.callTool('browser_click', {
      element: params.element,
      ref: params.ref,
      doubleClick: params.doubleClick,
      button: params.button
    });
  }

  /**
   * ⌨️ Escribir texto
   */
  async type(params: McpTypeParams): Promise<any> {
    return this.callTool('browser_type', {
      element: params.element,
      ref: params.ref,
      text: params.text,
      submit: params.submit,
      slowly: params.slowly
    });
  }

  /**
   * 📷 Tomar screenshot
   */
  async screenshot(params: McpScreenshotParams = {}): Promise<any> {
    return this.callTool('browser_take_screenshot', {
      filename: params.filename,
      fullPage: params.fullPage,
      raw: params.raw,
      element: params.element,
      ref: params.ref
    });
  }

  /**
   * ⏳ Esperar
   */
  async waitFor(params: McpWaitForParams): Promise<any> {
    return this.callTool('browser_wait_for', {
      text: params.text,
      textGone: params.textGone,
      time: params.time
    });
  }

  /**
   * ↩️ Retroceder
   */
  async navigateBack(): Promise<any> {
    return this.callTool('browser_navigate_back', {});
  }

  /**
   * ↪️ Avanzar
   */
  async navigateForward(): Promise<any> {
    return this.callTool('browser_navigate_forward', {});
  }

  /**
   * 🔍 Evaluar JavaScript
   */
  async evaluate(params: { function: string; element?: string; ref?: string }): Promise<any> {
    return this.callTool('browser_evaluate', {
      function: params.function,
      element: params.element,
      ref: params.ref
    });
  }

  /**
   * 🎹 Presionar tecla
   */
  async pressKey(params: { key: string }): Promise<any> {
    return this.callTool('browser_press_key', { key: params.key });
  }

  /**
   * 📑 Listar pestañas
   */
  async tabList(): Promise<any> {
    return this.callTool('browser_tab_list', {});
  }

  /**
   * ➕ Nueva pestaña
   */
  async tabNew(params: { url?: string } = {}): Promise<any> {
    return this.callTool('browser_tab_new', { url: params.url });
  }

  /**
   * 🔄 Seleccionar pestaña
   */
  async tabSelect(params: { index: number }): Promise<any> {
    return this.callTool('browser_tab_select', { index: params.index });
  }

  /**
   * ❌ Cerrar pestaña
   */
  async tabClose(params: { index?: number } = {}): Promise<any> {
    return this.callTool('browser_tab_close', { index: params.index });
  }

  /**
   * 🌐 Obtener requests de red
   */
  async networkRequests(): Promise<any> {
    return this.callTool('browser_network_requests', {});
  }

  /**
   * 📋 Obtener mensajes de consola
   */
  async consoleMessages(): Promise<any> {
    return this.callTool('browser_console_messages', {});
  }

  /**
   * 🔧 Parsear snapshot YAML para extraer elementos
   */
  private parseYamlSnapshot(yaml: string): Array<any> {
    const elements: Array<any> = [];
    const lines = yaml.split('\n');
    
    for (const line of lines) {
      // Buscar elementos con [ref=xxx]
      const refMatch = line.match(/\[ref=([^\]]+)\]/);
      if (refMatch) {
        const ref = refMatch[1];
        
        // Extraer tipo de elemento
        const typeMatch = line.match(/^\s*-\s+(\w+)/);
        const type = typeMatch ? typeMatch[1] : 'unknown';
        
        // Extraer texto (entre comillas o antes de [)
        const textMatch = line.match(/"([^"]+)"|^\s*-\s+\w+\s+([^[]+)/);
        const text = textMatch ? (textMatch[1] || textMatch[2] || '').trim() : '';
        
        // Extraer role
        const roleMatch = line.match(/\[role=([^\]]+)\]/);
        const role = roleMatch ? roleMatch[1] : undefined;
        
        // Extraer otros atributos
        const attributes: Record<string, any> = {};
        const attrMatches = line.matchAll(/\[(\w+)=([^\]]+)\]/g);
        for (const match of attrMatches) {
          if (match[1] !== 'ref' && match[1] !== 'role') {
            attributes[match[1]] = match[2];
          }
        }
        
        elements.push({
          ref,
          type,
          text: text || undefined,
          role,
          name: attributes.name,
          attributes
        });
      }
    }
    
    return elements;
  }

  /**
   * 🧹 Limpiar recursos
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Limpiando cliente MCP...');
    
    // Rechazar todas las solicitudes pendientes
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('MCP client shutting down'));
    }
    this.pendingRequests.clear();

    // Cerrar proceso
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
  }
}

/**
 * 🎯 EJEMPLO DE USO:
 * 
 * const mcpClient = new JsonRpcMcpClient();
 * await mcpClient.initialize();
 * 
 * // Navegar
 * await mcpClient.navigate({ url: 'https://example.com' });
 * 
 * // Obtener snapshot
 * const snapshot = await mcpClient.snapshot();
 * console.log('Elementos encontrados:', snapshot.elements);
 * 
 * // Click en elemento
 * await mcpClient.click({ 
 *   element: 'Login button', 
 *   ref: 'e10' 
 * });
 * 
 * // Cleanup
 * await mcpClient.cleanup();
 */