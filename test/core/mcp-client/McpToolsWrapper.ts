// core/mcp-client/McpToolsWrapper.ts
// 🎭 Wrapper para usar herramientas MCP nativas cuando están disponibles

import { JsonRpcMcpClient } from './JsonRpcMcpClient';

// Declaración de tipos para las herramientas MCP nativas
declare global {
  // Navegación
  function mcp__playwright__browser_navigate(params: { url: string; timeout?: number }): Promise<any>;
  function mcp__playwright__browser_navigate_back(): Promise<any>;
  function mcp__playwright__browser_navigate_forward(): Promise<any>;
  
  // Captura
  function mcp__playwright__browser_snapshot(): Promise<any>;
  function mcp__playwright__browser_take_screenshot(params: any): Promise<any>;
  
  // Interacción
  function mcp__playwright__browser_click(params: any): Promise<any>;
  function mcp__playwright__browser_type(params: any): Promise<any>;
  function mcp__playwright__browser_hover(params: any): Promise<any>;
  function mcp__playwright__browser_select_option(params: any): Promise<any>;
  function mcp__playwright__browser_drag(params: any): Promise<any>;
  
  // Esperas
  function mcp__playwright__browser_wait_for(params: any): Promise<any>;
  
  // JavaScript
  function mcp__playwright__browser_evaluate(params: any): Promise<any>;
  function mcp__playwright__browser_press_key(params: any): Promise<any>;
  
  // Pestañas
  function mcp__playwright__browser_tab_list(): Promise<any>;
  function mcp__playwright__browser_tab_new(params?: any): Promise<any>;
  function mcp__playwright__browser_tab_select(params: any): Promise<any>;
  function mcp__playwright__browser_tab_close(params?: any): Promise<any>;
  
  // Información
  function mcp__playwright__browser_console_messages(): Promise<any>;
  function mcp__playwright__browser_network_requests(): Promise<any>;
  
  // Otros
  function mcp__playwright__browser_resize(params: any): Promise<any>;
  function mcp__playwright__browser_handle_dialog(params: any): Promise<any>;
  function mcp__playwright__browser_file_upload(params: any): Promise<any>;
}

export interface McpElement {
  ref: string;
  type: string;
  text?: string;
  role?: string;
  name?: string;
  attributes?: Record<string, any>;
  selectors?: {
    css?: string;
    xpath?: string;
    text?: string;
    role?: string;
  };
}

export interface McpSnapshot {
  yaml: string;
  elements: McpElement[];
  url?: string;
  title?: string;
  timestamp?: string;
}

/**
 * 🎯 McpToolsWrapper - Wrapper inteligente para herramientas MCP
 * 
 * Este wrapper detecta automáticamente si las herramientas MCP nativas
 * están disponibles (cuando se ejecuta en Claude Code) y las usa.
 * Si no están disponibles, usa el cliente JSON-RPC.
 */
export class McpToolsWrapper {
  private jsonRpcClient: JsonRpcMcpClient | null = null;
  private isNativeAvailable = false;
  private isInitialized = false;

  constructor() {
    console.log('🎭 McpToolsWrapper: Inicializando wrapper MCP...');
    this.detectNativeTools();
  }

  /**
   * 🔍 Detectar si las herramientas MCP nativas están disponibles
   */
  private detectNativeTools(): void {
    try {
      // Verificar si existe alguna función MCP nativa en el contexto global
      this.isNativeAvailable = typeof mcp__playwright__browser_navigate === 'function';
      
      if (this.isNativeAvailable) {
        console.log('✅ Herramientas MCP nativas detectadas (Claude Code environment)');
      } else {
        console.log('ℹ️ Herramientas MCP nativas no disponibles, usando JSON-RPC client');
      }
    } catch (error) {
      this.isNativeAvailable = false;
      console.log('ℹ️ Entorno sin MCP nativo, usando JSON-RPC client');
    }
  }

  /**
   * 🚀 Inicializar el wrapper
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔧 Inicializando McpToolsWrapper...');
    
    if (!this.isNativeAvailable) {
      // Inicializar cliente JSON-RPC si no hay herramientas nativas
      this.jsonRpcClient = new JsonRpcMcpClient();
      await this.jsonRpcClient.initialize();
    }
    
    this.isInitialized = true;
    console.log('✅ McpToolsWrapper listo');
  }

  /**
   * 🌐 Navegar a una URL
   */
  async navigate(url: string, timeout?: number): Promise<void> {
    console.log(`[MCP] Navegando a: ${url}`);
    
    if (this.isNativeAvailable) {
      await mcp__playwright__browser_navigate({ url, timeout });
    } else {
      await this.jsonRpcClient!.navigate({ url, timeout });
    }
  }

  /**
   * 📸 Obtener snapshot estructurado de la página
   */
  async snapshot(): Promise<McpSnapshot> {
    console.log('[MCP] Obteniendo snapshot de la página...');
    
    let result: any;
    
    if (this.isNativeAvailable) {
      result = await mcp__playwright__browser_snapshot();
    } else {
      result = await this.jsonRpcClient!.snapshot();
    }
    
    // Normalizar resultado
    const snapshot: McpSnapshot = {
      yaml: result.yaml || result,
      elements: [],
      url: result.url,
      title: result.title,
      timestamp: result.timestamp || new Date().toISOString()
    };
    
    // Parsear elementos del YAML
    snapshot.elements = this.parseSnapshotElements(snapshot.yaml);
    
    console.log(`[MCP] Snapshot obtenido: ${snapshot.elements.length} elementos encontrados`);
    
    return snapshot;
  }

  /**
   * 🖱️ Click en elemento
   */
  async click(element: string, ref: string, options?: { 
    button?: 'left' | 'right' | 'middle'; 
    doubleClick?: boolean 
  }): Promise<void> {
    console.log(`[MCP] Click en: "${element}" [ref=${ref}]`);
    
    const params = { element, ref, ...options };
    
    if (this.isNativeAvailable) {
      await mcp__playwright__browser_click(params);
    } else {
      await this.jsonRpcClient!.click(params);
    }
  }

  /**
   * ⌨️ Escribir texto
   */
  async type(element: string, ref: string, text: string, options?: {
    slowly?: boolean;
    submit?: boolean;
  }): Promise<void> {
    console.log(`[MCP] Escribiendo en: "${element}" [ref=${ref}]`);
    
    const params = { element, ref, text, ...options };
    
    if (this.isNativeAvailable) {
      await mcp__playwright__browser_type(params);
    } else {
      await this.jsonRpcClient!.type(params);
    }
  }

  /**
   * 📷 Tomar screenshot
   */
  async screenshot(options?: {
    filename?: string;
    fullPage?: boolean;
    raw?: boolean;
    element?: string;
    ref?: string;
  }): Promise<Buffer | string> {
    console.log('[MCP] Tomando screenshot...');
    
    if (this.isNativeAvailable) {
      return await mcp__playwright__browser_take_screenshot(options || {});
    } else {
      return await this.jsonRpcClient!.screenshot(options);
    }
  }

  /**
   * ⏳ Esperar
   */
  async waitFor(options: {
    text?: string;
    textGone?: string;
    time?: number;
  }): Promise<void> {
    console.log('[MCP] Esperando...', options);
    
    if (this.isNativeAvailable) {
      await mcp__playwright__browser_wait_for(options);
    } else {
      await this.jsonRpcClient!.waitFor(options);
    }
  }

  /**
   * 🔍 Evaluar JavaScript
   */
  async evaluate(func: string, element?: string, ref?: string): Promise<any> {
    console.log('[MCP] Evaluando JavaScript...');
    
    const params = { function: func, element, ref };
    
    if (this.isNativeAvailable) {
      return await mcp__playwright__browser_evaluate(params);
    } else {
      return await this.jsonRpcClient!.evaluate(params);
    }
  }

  /**
   * 🎹 Presionar tecla
   */
  async pressKey(key: string): Promise<void> {
    console.log(`[MCP] Presionando tecla: ${key}`);
    
    if (this.isNativeAvailable) {
      await mcp__playwright__browser_press_key({ key });
    } else {
      await this.jsonRpcClient!.pressKey({ key });
    }
  }

  /**
   * 🌐 Obtener requests de red
   */
  async getNetworkRequests(): Promise<any[]> {
    console.log('[MCP] Obteniendo requests de red...');
    
    if (this.isNativeAvailable) {
      const result = await mcp__playwright__browser_network_requests();
      return result.requests || [];
    } else {
      const result = await this.jsonRpcClient!.networkRequests();
      return result.requests || [];
    }
  }

  /**
   * 📋 Obtener mensajes de consola
   */
  async getConsoleMessages(): Promise<any[]> {
    console.log('[MCP] Obteniendo mensajes de consola...');
    
    if (this.isNativeAvailable) {
      const result = await mcp__playwright__browser_console_messages();
      return result.messages || [];
    } else {
      const result = await this.jsonRpcClient!.consoleMessages();
      return result.messages || [];
    }
  }

  /**
   * 🔧 Parsear elementos del snapshot YAML
   */
  private parseSnapshotElements(yaml: string): McpElement[] {
    const elements: McpElement[] = [];
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
        
        // Extraer name
        const nameMatch = line.match(/\[name=([^\]]+)\]/);
        const name = nameMatch ? nameMatch[1] : undefined;
        
        // Extraer otros atributos
        const attributes: Record<string, any> = {};
        const attrMatches = line.matchAll(/\[(\w+)=([^\]]+)\]/g);
        for (const match of attrMatches) {
          if (match[1] !== 'ref' && match[1] !== 'role' && match[1] !== 'name') {
            attributes[match[1]] = match[2];
          }
        }
        
        // Generar selectores basados en la información disponible
        const selectors: any = {};
        if (role) selectors.role = role;
        if (text) selectors.text = text;
        if (attributes.id) selectors.css = `#${attributes.id}`;
        else if (attributes.class) selectors.css = `.${attributes.class.split(' ')[0]}`;
        
        elements.push({
          ref,
          type,
          text: text || undefined,
          role,
          name,
          attributes,
          selectors
        });
      }
    }
    
    return elements;
  }

  /**
   * 🧹 Limpiar recursos
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Limpiando McpToolsWrapper...');
    
    if (this.jsonRpcClient) {
      await this.jsonRpcClient.cleanup();
      this.jsonRpcClient = null;
    }
    
    this.isInitialized = false;
  }

  /**
   * 🎯 Obtener información sobre el modo de operación
   */
  getOperationMode(): string {
    return this.isNativeAvailable ? 'native-mcp' : 'json-rpc';
  }
}

/**
 * 🎯 EJEMPLO DE USO:
 * 
 * const mcp = new McpToolsWrapper();
 * await mcp.initialize();
 * 
 * // Navegar (usa herramientas nativas si están disponibles)
 * await mcp.navigate('https://example.com');
 * 
 * // Obtener snapshot estructurado
 * const snapshot = await mcp.snapshot();
 * console.log(`Elementos encontrados: ${snapshot.elements.length}`);
 * 
 * // Interactuar con elementos
 * const loginButton = snapshot.elements.find(el => el.text === 'Login');
 * if (loginButton) {
 *   await mcp.click('Login button', loginButton.ref);
 * }
 * 
 * // Cleanup
 * await mcp.cleanup();
 */