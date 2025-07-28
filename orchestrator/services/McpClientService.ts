// orchestrator/services/McpClientService.ts
import { spawn, ChildProcess } from 'child_process';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export interface MCPContext {
  domSnapshot: string;
  accessibilityTree: any;
  interactiveElements: any[];
  consoleMessages: any[];
  networkRequests: any[];
  screenshot?: Buffer;
  pageInfo: {
    url: string;
    title: string;
    timestamp: string;
  };
}

export interface MCPElement {
  role: string;
  name?: string;
  element: string;
  ref: number;
  disabled?: boolean;
  checked?: boolean;
  expanded?: boolean;
}

export class MCPClientService {
  private mcpProcess: ChildProcess | null = null;
  private mcpClient: Client | null = null;
  private transport: StdioClientTransport | null = null;

  /**
   * Inicia el servidor MCP usando el protocolo STDIO nativo
   */
  async startMCPServer(): Promise<void> {
    console.log('[MCP] Iniciando servidor MCP con protocolo STDIO nativo...');

    try {
      // ========== NUEVA VERIFICACIÓN DE NAVEGADORES ==========
      console.log('[MCP] 🔍 Verificando instalación de navegadores...');
      await this.verifyBrowserInstallation();

      // Verificar que @playwright/mcp esté disponible
      await this.verifyMCPAvailability();

      // OPCIÓN A: Dejar que StdioClientTransport lance el proceso
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['@playwright/mcp@latest']
      });

      // Crear cliente MCP con sintaxis correcta
      this.mcpClient = new Client({
        name: 'qa-orchestrator',
        version: '1.0.0'
      });

      // Conectar cliente al transporte
      await this.mcpClient.connect(this.transport);

      console.log('[MCP] ✅ Servidor MCP iniciado y conectado exitosamente');

      // Verificar herramientas disponibles
      await this.listAvailableTools();

    } catch (error) {
      console.error('[MCP] ❌ Error iniciando servidor MCP:', error);
      await this.cleanup();
      throw new Error(`No se pudo iniciar el servidor MCP: ${error}`);
    }
  }

  /**
   * NUEVA: Verifica que los navegadores estén instalados para MCP
   */
  private async verifyBrowserInstallation(): Promise<void> {
    console.log('[MCP] Verificando navegadores disponibles...');

    return new Promise((resolve, reject) => {
      // Verificar instalación de Playwright browsers
      const checkProcess = spawn('npx', ['playwright', 'install', '--dry-run'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      checkProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      checkProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      checkProcess.on('close', (code) => {
        console.log('[MCP] 🔍 Browser check output:', output);

        if (code === 0) {
          console.log('[MCP] ✅ Navegadores verificados');
          resolve();
        } else {
          console.warn('[MCP] ⚠️ Algunos navegadores pueden no estar instalados');
          console.log('[MCP] 🔧 Intentando instalar navegadores automáticamente...');

          // Intentar instalación automática
          const installProcess = spawn('npx', ['playwright', 'install', 'chromium'], {
            stdio: 'inherit'
          });

          installProcess.on('close', (installCode) => {
            if (installCode === 0) {
              console.log('[MCP] ✅ Navegadores instalados exitosamente');
              resolve();
            } else {
              reject(new Error('No se pudieron instalar los navegadores necesarios'));
            }
          });
        }
      });

      // Timeout de 30 segundos
      setTimeout(() => {
        checkProcess.kill();
        reject(new Error('Timeout verificando navegadores'));
      }, 30000);
    });
  }

  /**
   * Verifica que @playwright/mcp esté disponible
   */
  private async verifyMCPAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npx', ['@playwright/mcp@latest', '--help'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`@playwright/mcp no está disponible o falló (código: ${code})`));
        }
      });

      testProcess.on('error', (error) => {
        reject(new Error(`Error verificando @playwright/mcp: ${error.message}`));
      });

      // Timeout de 10 segundos
      setTimeout(() => {
        testProcess.kill();
        reject(new Error('Timeout verificando disponibilidad de @playwright/mcp'));
      }, 10000);
    });
  }

  /**
   * Configura los manejadores del transporte MCP
   */
  private setupProcessHandlers(): void {
    // El StdioClientTransport maneja el proceso internamente
    // Solo necesitamos manejar eventos del cliente
    if (this.mcpClient) {
      console.log('[MCP] Cliente conectado, proceso manejado por StdioClientTransport');
    }
  }

  /**
   * Lista las herramientas disponibles en el servidor MCP
   */
  private async listAvailableTools(): Promise<void> {
    if (!this.mcpClient) {
      console.warn('[MCP] Cliente no inicializado, no se pueden listar herramientas');
      return;
    }

    try {
      const tools = await this.mcpClient.listTools();
      console.log(`[MCP] ✅ Herramientas disponibles: ${tools.tools.map(t => t.name).join(', ')}`);
    } catch (error) {
      console.warn('[MCP] ⚠️ No se pudieron listar las herramientas:', error);
    }
  }

  /**
   * Navega a una URL específica
   */
  async navigateToUrl(url: string): Promise<void> {
    if (!this.mcpClient) {
      throw new Error('Cliente MCP no inicializado. Llama a startMCPServer() primero.');
    }

    console.log(`[MCP] Navegando a: ${url}`);

    try {
      await this.mcpClient.callTool({
        name: 'browser_navigate',
        arguments: { url }
      });

      // Esperar a que la página cargue completamente
      await this.waitForPageLoad();

      console.log(`[MCP] ✅ Navegación exitosa a: ${url}`);
    } catch (error) {
      console.error(`[MCP] ❌ Error navegando a ${url}:`, error);
      throw error;
    }
  }

  /**
   * Espera a que la página cargue completamente
   */
  private async waitForPageLoad(timeoutMs: number = 10000): Promise<void> {
    try {
      await this.mcpClient!.callTool({
        name: 'browser_wait_for',
        arguments: { time: 2000 } // Esperar 2 segundos básicos
      });
    } catch (error) {
      console.warn('[MCP] ⚠️ Error esperando carga de página:', error);
    }
  }

  /**
   * NUEVO: Método para hacer parsing seguro de JSON extrayendo solo la parte JSON
   */
  private safeJsonParse(rawText: string, fallback: any = null): any {
    try {
      // Si ya es un objeto, devolverlo tal como está
      if (typeof rawText === 'object') {
        return rawText;
      }

      // Intentar parsing directo primero
      try {
        return JSON.parse(rawText);
      } catch (e) {
        // Si falla, intentar extraer JSON de texto con markdown
      }

      // Buscar patrones de JSON en el texto
      const jsonPatterns = [
        // Patrón para JSON después de "### Result"
        /### Result\s*\n([\s\S]*?)(?=\n###|$)/,
        // Patrón para JSON entre llaves
        /(\{[\s\S]*?\})/,
        // Patrón para arrays JSON
        /(\[[\s\S]*?\])/
      ];

      for (const pattern of jsonPatterns) {
        const match = rawText.match(pattern);
        if (match) {
          try {
            const cleanJson = match[1].trim();
            return JSON.parse(cleanJson);
          } catch (e) {
            // Continuar con el siguiente patrón
            continue;
          }
        }
      }

      // Si no se encuentra JSON válido, intentar extraer datos estructurados
      console.warn('[MCP] ⚠️ No se pudo extraer JSON válido, intentando parsing alternativo');
      return this.parseAlternativeFormat(rawText, fallback);

    } catch (error) {
      console.warn('[MCP] ⚠️ Error en safeJsonParse:', error);
      return fallback;
    }
  }

  /**
   * NUEVO: Método para parsear formatos alternativos cuando JSON falla
   */
  private parseAlternativeFormat(rawText: string, fallback: any): any {
    try {
      // Para accessibility tree, intentar extraer estructura YAML-like
      if (rawText.includes('Page Snapshot:')) {
        return this.parseYamlLikeStructure(rawText);
      }

      // Para mensajes de consola, extraer líneas individuales
      if (rawText.includes('[WARNING]') || rawText.includes('[ERROR]') || rawText.includes('[LOG]')) {
        return this.parseConsoleLines(rawText);
      }

      // Para network requests, extraer peticiones individuales
      if (rawText.includes('[GET]') || rawText.includes('[POST]')) {
        return this.parseNetworkLines(rawText);
      }

      return fallback;
    } catch (error) {
      console.warn('[MCP] ⚠️ Error en parseAlternativeFormat:', error);
      return fallback;
    }
  }

  /**
   * NUEVO: Parsea estructura similar a YAML del accessibility tree
   */
  private parseYamlLikeStructure(rawText: string): any {
    try {
      const snapshotMatch = rawText.match(/Page Snapshot:\s*```yaml\s*([\s\S]*?)\s*```/);
      if (!snapshotMatch) return { elements: [] };

      const yamlContent = snapshotMatch[1];
      const elements: any[] = [];

      // Parsear líneas del YAML para extraer elementos
      const lines = yamlContent.split('\n');
      let currentElement: any = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Detectar elementos con [ref=...]
        const refMatch = trimmed.match(/(\w+).*?\[ref=(\w+)\]/);
        if (refMatch) {
          const [, role, ref] = refMatch;
          const nameMatch = trimmed.match(/"([^"]+)"/);

          currentElement = {
            role: role,
            ref: ref,
            name: nameMatch ? nameMatch[1] : trimmed.replace(/\[.*?\]/g, '').trim(),
            element: role,
            disabled: trimmed.includes('[disabled]'),
            checked: trimmed.includes('[checked]'),
            expanded: trimmed.includes('[expanded]')
          };
          elements.push(currentElement);
        }
      }

      return { elements, raw: rawText };
    } catch (error) {
      console.warn('[MCP] ⚠️ Error parseando estructura YAML:', error);
      return { elements: [], raw: rawText };
    }
  }

  /**
   * NUEVO: Parsea líneas de mensajes de consola
   */
  private parseConsoleLines(rawText: string): any[] {
    try {
      const messages: any[] = [];
      const lines = rawText.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('[WARNING]') || trimmed.includes('[ERROR]') || trimmed.includes('[LOG]')) {
          const levelMatch = trimmed.match(/\[(WARNING|ERROR|LOG)\]/);
          const level = levelMatch ? levelMatch[1] : 'INFO';
          const message = trimmed.replace(/\[.*?\]/, '').trim();

          messages.push({
            level: level.toLowerCase(),
            message,
            timestamp: new Date().toISOString()
          });
        }
      }

      return messages;
    } catch (error) {
      console.warn('[MCP] ⚠️ Error parseando mensajes de consola:', error);
      return [];
    }
  }

  /**
   * NUEVO: Parsea líneas de peticiones de red
   */
  private parseNetworkLines(rawText: string): any[] {
    try {
      const requests: any[] = [];
      const lines = rawText.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        const requestMatch = trimmed.match(/\[(GET|POST|PUT|DELETE)\]\s+(.+?)\s+=>\s+\[(\d+)\]/);

        if (requestMatch) {
          const [, method, url, status] = requestMatch;
          requests.push({
            method,
            url: url.trim(),
            status: parseInt(status),
            timestamp: new Date().toISOString()
          });
        }
      }

      return requests;
    } catch (error) {
      console.warn('[MCP] ⚠️ Error parseando peticiones de red:', error);
      return [];
    }
  }

  /**
   * Obtiene el contexto completo de la página actual
   */
  async getRealTimeContext(url?: string): Promise<MCPContext> {
    if (!this.mcpClient) {
      throw new Error('Cliente MCP no inicializado. Llama a startMCPServer() primero.');
    }

    console.log('[MCP] Obteniendo contexto completo de la página...');

    try {
      // Si se proporciona URL, navegar primero
      if (url) {
        await this.navigateToUrl(url);
      }

      // Obtener snapshot del árbol de accesibilidad
      console.log('[MCP] Obteniendo accessibility tree...');
      const snapshotResult = await this.mcpClient.callTool({
        name: 'browser_snapshot',
        arguments: {}
      });

      // Obtener mensajes de consola
      console.log('[MCP] Obteniendo mensajes de consola...');
      const consoleResult = await this.mcpClient.callTool({
        name: 'browser_console_messages',
        arguments: {}
      });

      // Obtener peticiones de red
      console.log('[MCP] Obteniendo peticiones de red...');
      const networkResult = await this.mcpClient.callTool({
        name: 'browser_network_requests',
        arguments: {}
      });

      // Obtener screenshot (opcional)
      let screenshot: Buffer | undefined;
      try {
        console.log('[MCP] Obteniendo screenshot...');
        const screenshotResult = await this.mcpClient.callTool({
          name: 'browser_take_screenshot',
          arguments: { raw: true, fullPage: true }
        });

        if (screenshotResult.content && Array.isArray(screenshotResult.content)) {
          const imageData = screenshotResult.content.find((item: any) =>
            item.type === 'image' && item.data
          );
          if (imageData) {
            screenshot = Buffer.from(imageData.data, 'base64');
          }
        }
      } catch (error) {
        console.warn('[MCP] ⚠️ No se pudo obtener screenshot:', error);
      }

      // Extraer elementos interactivos del snapshot
      const accessibilityTree = this.parseAccessibilityTree(snapshotResult);
      const interactiveElements = this.extractInteractiveElements(accessibilityTree);

      // Obtener información de la página
      const pageInfo = await this.getPageInfo();

      const context: MCPContext = {
        domSnapshot: JSON.stringify(accessibilityTree, null, 2),
        accessibilityTree,
        interactiveElements,
        consoleMessages: this.parseConsoleMessages(consoleResult),
        networkRequests: this.parseNetworkRequests(networkResult),
        screenshot,
        pageInfo
      };

      console.log(`[MCP] ✅ Contexto obtenido: ${interactiveElements.length} elementos interactivos`);
      return context;

    } catch (error) {
      console.error('[MCP] ❌ Error obteniendo contexto:', error);
      throw error;
    }
  }

  /**
   * Parsea el árbol de accesibilidad del resultado del snapshot - CORREGIDO
   */
  private parseAccessibilityTree(snapshotResult: any): any {
    try {

      if (snapshotResult.content && Array.isArray(snapshotResult.content)) {
        const textContent = snapshotResult.content.find((item: any) => item.type === 'text');
        if (textContent && textContent.text) {
          // Usar el nuevo método de parsing seguro
          return this.safeJsonParse(textContent.text, { elements: [] });
        }
      }
      return snapshotResult.content || snapshotResult;
    } catch (error) {
      console.warn('[MCP] ⚠️ Error parseando accessibility tree:', error);
      return { elements: [] };
    }
  }

  /**
   * Extrae elementos interactivos del árbol de accesibilidad - MEJORADO
   */
  private extractInteractiveElements(accessibilityTree: any): MCPElement[] {

    const elements: MCPElement[] = [];

    // Si el parsing alternativo devolvió elementos directamente
    if (accessibilityTree.elements && Array.isArray(accessibilityTree.elements)) {
      return accessibilityTree.elements.map((el: any, index: number) => ({
        role: el.role || 'unknown',
        name: el.name || 'Sin nombre',
        element: el.element || el.role || '',
        ref: el.ref || index,
        disabled: el.disabled || false,
        checked: el.checked,
        expanded: el.expanded
      }));
    }

    const traverse = (node: any) => {
      if (!node) return;

      // Detectar elementos interactivos por su rol
      const interactiveRoles = [
        'button', 'link', 'textbox', 'combobox', 'checkbox',
        'radio', 'tab', 'menuitem', 'option', 'slider'
      ];

      if (node.role && interactiveRoles.includes(node.role.toLowerCase())) {
        elements.push({
          role: node.role,
          name: node.name || node.text || 'Sin nombre',
          element: node.element || '',
          ref: node.ref || elements.length,
          disabled: node.disabled || false,
          checked: node.checked,
          expanded: node.expanded
        });
      }

      // Continuar traversing en los hijos
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => traverse(child));
      }
    };

    traverse(accessibilityTree);
    return elements;
  }

  /**
   * Parsea mensajes de consola - CORREGIDO
   */
  private parseConsoleMessages(consoleResult: any): any[] {
    try {
      if (consoleResult.content && Array.isArray(consoleResult.content)) {
        const textContent = consoleResult.content.find((item: any) => item.type === 'text');
        if (textContent && textContent.text) {
          // Usar el nuevo método de parsing seguro
          return this.safeJsonParse(textContent.text, []);
        }
      }
      return Array.isArray(consoleResult) ? consoleResult : [];
    } catch (error) {
      console.warn('[MCP] ⚠️ Error parseando mensajes de consola:', error);
      return [];
    }
  }

  /**
   * Parsea peticiones de red - CORREGIDO
   */
  private parseNetworkRequests(networkResult: any): any[] {
    try {
      if (networkResult.content && Array.isArray(networkResult.content)) {
        const textContent = networkResult.content.find((item: any) => item.type === 'text');
        if (textContent && textContent.text) {
          // Usar el nuevo método de parsing seguro
          return this.safeJsonParse(textContent.text, []);
        }
      }
      return Array.isArray(networkResult) ? networkResult : [];
    } catch (error) {
      console.warn('[MCP] ⚠️ Error parseando peticiones de red:', error);
      return [];
    }
  }

  /**
   * Obtiene información básica de la página - CORREGIDO
   */
  private async getPageInfo(): Promise<{ url: string; title: string; timestamp: string }> {
    try {
      // Usar browser_evaluate para obtener URL y título
      const evalResult = await this.mcpClient!.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => ({ url: window.location.href, title: document.title })`
        }
      });

      let pageData = { url: 'unknown', title: 'unknown' };

      if (evalResult.content && Array.isArray(evalResult.content)) {
        const textContent = evalResult.content.find((item: any) => item.type === 'text');
        if (textContent && textContent.text) {
          // Usar el nuevo método de parsing seguro
          pageData = this.safeJsonParse(textContent.text, pageData);
        }
      }

      return {
        url: pageData.url,
        title: pageData.title,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('[MCP] ⚠️ Error obteniendo información de página:', error);
      return {
        url: 'unknown',
        title: 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cierra el servidor MCP de forma limpia
   */
  async stopMCPServer(): Promise<void> {
    console.log('[MCP] Cerrando servidor MCP...');

    try {
      await this.cleanup();
      console.log('[MCP] ✅ Servidor MCP cerrado exitosamente');
    } catch (error) {
      console.warn('[MCP] ⚠️ Error cerrando servidor MCP:', error);
    }
  }

  /**
   * Limpieza completa de recursos
   */
  private async cleanup(): Promise<void> {
    // Cerrar cliente MCP
    if (this.mcpClient) {
      try {
        await this.mcpClient.close();
      } catch (error) {
        console.warn('[MCP] ⚠️ Error cerrando cliente MCP:', error);
      }
      this.mcpClient = null;
    }

    // Cerrar transporte (esto también cierra el proceso interno)
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        console.warn('[MCP] ⚠️ Error cerrando transporte:', error);
      }
      this.transport = null;
    }

    // El proceso es manejado internamente por StdioClientTransport
    this.mcpProcess = null;
  }

  /**
   * Verifica si el cliente MCP está conectado y funcionando
   */
  isConnected(): boolean {
    return !!(this.mcpClient && this.transport);
  }
}
