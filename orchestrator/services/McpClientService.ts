// orchestrator/services/McpClientService.ts
import { spawn, ChildProcess } from 'child_process';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export interface MCPContext {
  domSnapshot: string;
  accessibilityTree: any;
  interactiveElements: any[];
  domElements?: any[]; // NUEVO: Elementos del DOM con atributos HTML
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
      // Nota: Esto es normal para MCP - muchas respuestas vienen en formato YAML/texto
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

          // Extraer TODOS los atributos [key=value] como lo hace el proyecto test
          const attributes: Record<string, any> = {};
          const attrMatches = trimmed.matchAll(/\[(\w+)=([^\]]+)\]/g);
          for (const match of attrMatches) {
            if (match[1] !== 'ref') {  // ref ya lo tenemos separado
              attributes[match[1]] = match[2];
            }
          }

          // También buscar atributos booleanos [disabled], [checked], etc.
          const booleanAttrs = ['disabled', 'checked', 'expanded', 'required', 'readonly'];
          for (const attr of booleanAttrs) {
            if (trimmed.includes(`[${attr}]`)) {
              attributes[attr] = true;
            }
          }

          currentElement = {
            role: role,
            ref: ref,
            name: nameMatch ? nameMatch[1] : trimmed.replace(/\[.*?\]/g, '').trim(),
            element: role,
            disabled: attributes.disabled || false,
            checked: attributes.checked || false,
            expanded: attributes.expanded || false,
            attributes: attributes  // ¡Esta es la clave!
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

      // ✅ REHABILITADO: Obtener información específica del DOM con atributos HTML
      let jsElements: any[] = [];
      try {
        console.log('[MCP] 🔧 Ejecutando getJavaScriptElementData rehabilitado...');
        jsElements = await this.getJavaScriptElementData();

      } catch (error) {
        console.warn('[MCP] ⚠️ No se pudo obtener información del DOM:', error);
      }

      // Extraer elementos YAML del snapshot
      const accessibilityTree = this.parseAccessibilityTree(snapshotResult);
      const yamlElements = this.extractInteractiveElements(accessibilityTree);

      // ✅ REHABILITADO: Correlacionar YAML + JavaScript para obtener elementos híbridos
      let finalElements: any[] = [];
      if (jsElements.length > 0) {
        console.log('[MCP] 🔗 Correlacionando YAML + JavaScript...');
        finalElements = this.correlateYamlWithJavaScript(yamlElements, jsElements);
      } else {
        console.log('[MCP] ⚠️ Cayendo a solo elementos YAML');
        finalElements = yamlElements;
      }

      // Obtener información de la página
      const pageInfo = await this.getPageInfo();

      const context: MCPContext = {
        domSnapshot: JSON.stringify(accessibilityTree, null, 2),
        accessibilityTree,
        interactiveElements: finalElements, // Usar elementos híbridos (YAML + JS)
        domElements: jsElements, // NUEVO: Elementos JavaScript puros
        consoleMessages: this.parseConsoleMessages(consoleResult),
        networkRequests: this.parseNetworkRequests(networkResult),
        screenshot,
        pageInfo
      };

      console.log(`[MCP] ✅ Contexto híbrido obtenido - ${finalElements.length} elementos MCP enriquecidos`);
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
   * NUEVO: Obtiene HTML snapshot completo sin procesamiento (solución genérica)
   */
  async getHtmlSnapshot(): Promise<string> {
    if (!this.mcpClient) {
      throw new Error('Cliente MCP no inicializado');
    }

    try {
      console.log('[MCP] Obteniendo HTML snapshot completo...');

      // Intentar usar browser_html_snapshot si está disponible
      try {
        const htmlResult = await this.mcpClient.callTool({
          name: 'browser_html_snapshot',
          arguments: {}
        });

        if (htmlResult.content && Array.isArray(htmlResult.content)) {
          const textContent = htmlResult.content.find((item: any) => item.type === 'text');
          if (textContent?.text) {
            console.log('[MCP] ✅ HTML snapshot obtenido con browser_html_snapshot');
            return textContent.text;
          }
        }

      } catch (error) {
        console.log('[MCP] ⚠️ browser_html_snapshot no disponible, usando browser_evaluate...');
      }

      // Fallback: usar browser_evaluate para obtener HTML
      const evalResult = await this.mcpClient.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => document.documentElement.outerHTML`
        }
      });

      if (evalResult.content && Array.isArray(evalResult.content)) {
        const textContent = evalResult.content.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          console.log('[MCP] ✅ HTML snapshot obtenido con browser_evaluate fallback');
          return textContent.text;
        }
      }

      return '';

    } catch (error) {
      console.error('[MCP] ❌ Error obteniendo HTML snapshot:', error);
      return '';
    }
  }

  /**
   * NUEVO: Obtiene contexto híbrido completo sin hardcodeo - correlación automática
   */
  async getCompleteContext(url?: string): Promise<MCPContext & { hybridElements?: any[], rawJavaScriptData?: any[] }> {
    console.log('[MCP] Obteniendo contexto híbrido completo sin hardcodeo...');

    // Obtener contexto básico (ARIA snapshot con refs)
    const basicContext = await this.getRealTimeContext(url);

    // Enriquecer elementos MCP con información de atributos que ya proporciona
    const hybridElements = this.enrichMcpElements(basicContext.interactiveElements);

    console.log(`[MCP] ✅ Contexto híbrido obtenido - ${basicContext.interactiveElements.length} elementos MCP enriquecidos`);

    return {
      ...basicContext,
      hybridElements
    };
  }

  /**
   * NUEVO: Enriquece elementos MCP con atributos que ya proporciona (basado en StableMcpService)
   */
  private enrichMcpElements(mcpElements: any[]): any[] {
    return mcpElements.map((element, index) => {
      // Crear elemento híbrido con datos MCP + detección inteligente
      const hybridElement = {
        // Datos MCP originales
        ref: element.ref,
        role: element.role,
        element: element.element,
        name: element.name,
        text: element.text,
        disabled: element.disabled,
        checked: element.checked,
        expanded: element.expanded,

        // Atributos HTML que MCP ya proporciona (¡esta era la clave!)
        htmlAttributes: {
          type: element.attributes?.type || element.type || '',
          name: element.attributes?.name || element.name || '',
          id: element.attributes?.id || '',
          className: element.attributes?.class || element.attributes?.className || '',
          placeholder: element.attributes?.placeholder || '',
          tagName: element.tagName || this.inferTagName(element),
          ariaLabel: element.attributes?.['aria-label'] || '',
          disabled: element.disabled || false,
          required: element.attributes?.required || false,
          readonly: element.attributes?.readonly || false
        },

        // Generar selectores automáticamente usando la estrategia de StableMcpService
        selectors: this.generatePlaywrightSelectors(element)
      };

      return hybridElement;
    });
  }

  /**
   * Genera selectores de Playwright basado en StableMcpService
   */
  private generatePlaywrightSelectors(element: any): any[] {
    const selectors: any[] = [];

    // Selector basado en role (prioridad alta)
    if (element.role) {
      if (element.name || element.text) {
        selectors.push({
          type: 'getByRole',
          value: element.role,
          options: { name: element.name || element.text }
        });
      } else {
        selectors.push({
          type: 'getByRole',
          value: element.role
        });
      }
    }

    // Selector por ID (muy específico)
    if (element.attributes?.id) {
      selectors.push({
        type: 'css',
        value: `#${element.attributes.id}`
      });
    }

    // Selector por type y tagName (específico para inputs)
    const type = element.attributes?.type || element.type;
    const tagName = element.tagName || this.inferTagName(element);
    if (type && tagName) {
      selectors.push({
        type: 'css',
        value: `${tagName}[type="${type}"]`
      });
    }

    // Selector por name
    const name = element.attributes?.name || element.name;
    if (name) {
      selectors.push({
        type: 'css',
        value: `[name="${name}"]`
      });
    }

    // Selector por placeholder
    const placeholder = element.attributes?.placeholder;
    if (placeholder) {
      selectors.push({
        type: 'getByPlaceholder',
        value: placeholder
      });
    }

    // ✅ NUEVO: Selectores para elementos dinámicos
    if (element.attributes?.dataTestId || element.dataTestId) {
      selectors.push({
        type: 'getByTestId',
        value: element.attributes?.dataTestId || element.dataTestId
      });
    }

    if (element.attributes?.dataCy || element.dataCy) {
      selectors.push({
        type: 'css',
        value: `[data-cy="${element.attributes?.dataCy || element.dataCy}"]`
      });
    }

    if (element.attributes?.dataQa || element.dataQa) {
      selectors.push({
        type: 'css',
        value: `[data-qa="${element.attributes?.dataQa || element.dataQa}"]`
      });
    }

    // Selector por texto
    if (element.text) {
      selectors.push({
        type: 'getByText',
        value: element.text
      });
    }

    return this.validatePlaywrightSelectors(selectors);
  }

  /**
   * Infiere el tagName basado en el role y tipo con convenciones HTML estándar
   */
  private inferTagName(element: any): string {
    const type = element.attributes?.type || element.type;
    const role = element.role?.toLowerCase();

    // Elementos de input por tipo específico
    if (role === 'textbox') {
      if (type === 'textarea') return 'textarea';
      if (type === 'email') return 'input';
      if (type === 'password') return 'input';
      if (type === 'tel') return 'input';
      if (type === 'url') return 'input';
      if (type === 'search') return 'input';
      if (type === 'number') return 'input';
      if (type === 'date') return 'input';
      if (type === 'datetime-local') return 'input';
      if (type === 'time') return 'input';
      if (type === 'week') return 'input';
      if (type === 'month') return 'input';
      if (type === 'color') return 'input';
      return 'input'; // fallback para textbox
    }

    // Elementos de botón
    if (role === 'button') {
      if (type === 'submit') return 'button';
      if (type === 'reset') return 'button';
      if (type === 'button') return 'button';
      return 'button';
    }

    // Elementos de enlace
    if (role === 'link') {
      return 'a';
    }

    // Elementos de selección
    if (role === 'combobox' || role === 'listbox') {
      return 'select';
    }

    // Elementos de checkbox y radio
    if (role === 'checkbox') {
      return 'input';
    }
    if (role === 'radio') {
      return 'input';
    }

    // Elementos semánticos HTML5
    if (role === 'main') return 'main';
    if (role === 'navigation') return 'nav';
    if (role === 'article') return 'article';
    if (role === 'section') return 'section';
    if (role === 'aside') return 'aside';
    if (role === 'header') return 'header';
    if (role === 'footer') return 'footer';
    if (role === 'figure') return 'figure';

    // Elementos de encabezado
    if (role === 'heading') {
      // Intentar inferir nivel si está disponible
      const level = element.attributes?.level || element.attributes?.['aria-level'];
      if (level >= 1 && level <= 6) {
        return `h${level}`;
      }
      return 'h1'; // fallback
    }

    // Elementos de lista
    if (role === 'list') return 'ul';
    if (role === 'listitem') return 'li';

    // Elementos de tabla
    if (role === 'table') return 'table';
    if (role === 'row') return 'tr';
    if (role === 'cell' || role === 'gridcell') return 'td';
    if (role === 'columnheader' || role === 'rowheader') return 'th';

    // Elementos de formulario
    if (role === 'form') return 'form';
    if (role === 'group') return 'fieldset';

    // Elementos de multimedia
    if (role === 'img') return 'img';

    // Elementos de entrada de archivos
    if (type === 'file') return 'input';
    if (type === 'range') return 'input';
    if (type === 'hidden') return 'input';

    // Elementos interactivos
    if (role === 'slider') return 'input';
    if (role === 'spinbutton') return 'input';
    if (role === 'progressbar') return 'progress';
    if (role === 'meter') return 'meter';

    // Elementos de texto
    if (role === 'paragraph') return 'p';
    if (role === 'blockquote') return 'blockquote';
    if (role === 'code') return 'code';
    if (role === 'emphasis') return 'em';
    if (role === 'strong') return 'strong';

    // Elementos de diálogo
    if (role === 'dialog') return 'dialog';
    if (role === 'alertdialog') return 'dialog';

    return 'div'; // fallback
  }

  /**
   * REHABILITADO + MEJORADO: Extrae datos HTML reales + elementos dinámicos usando browser_evaluate
   */
  private async getJavaScriptElementData(): Promise<any[]> {
    if (!this.mcpClient) {
      throw new Error('Cliente MCP no inicializado');
    }

    try {
      console.log('[MCP] 🔧 Ejecutando browser_evaluate rehabilitado...');

      // ✅ SOLUCIÓN EXITOSA: JavaScript directo sin parámetro ref
      const result = await this.mcpClient.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: `() => {
            // Extraer TODOS los elementos interactivos con atributos HTML REALES + ELEMENTOS DINÁMICOS
            const baseSelector = 'input, button, select, textarea, a[href], [role], [tabindex]:not([tabindex="-1"])';
            
            // Selectores adicionales para elementos dinámicos
            const dynamicSelectors = [
              '[data-testid]',
              '[data-cy]', 
              '[data-qa]',
              '[data-automation]',
              '[id*="react"]',
              '[id*="ember"]',
              '[id*="vue"]',
              '[class*="component"]',
              '[class*="widget"]',
              '[aria-live]',
              '[role="status"]',
              '[role="alert"]',
              '.loading',
              '.spinner',
              '.skeleton',
              '[onclick]',
              '[onchange]',
              '[onsubmit]'
            ];
            
            // Combinar selectores base + dinámicos
            const allSelectors = baseSelector + ', ' + dynamicSelectors.join(', ');
            const elements = document.querySelectorAll(allSelectors);

            return Array.from(elements).map((el, index) => {
              // Obtener TODOS los atributos HTML reales
              const rect = el.getBoundingClientRect();

              // Solo elementos visibles
              if (rect.width > 0 && rect.height > 0) {
                return {
                  index: index,
                  tagName: el.tagName.toLowerCase(),

                  // ✅ CRÍTICO: Atributos HTML directos
                  type: el.type || '',
                  name: el.name || '',
                  id: el.id || '',
                  className: el.className || '',
                  placeholder: el.placeholder || '',
                  value: el.value || '',

                  // Atributos ARIA
                  role: el.getAttribute('role') || '',
                  ariaLabel: el.getAttribute('aria-label') || '',
                  ariaLabelledby: el.getAttribute('aria-labelledby') || '',
                  ariaLive: el.getAttribute('aria-live') || '',
                  ariaHidden: el.getAttribute('aria-hidden') || '',

                  // ✅ NUEVO: Atributos para elementos dinámicos
                  dataTestId: el.getAttribute('data-testid') || '',
                  dataCy: el.getAttribute('data-cy') || '',
                  dataQa: el.getAttribute('data-qa') || '',
                  dataAutomation: el.getAttribute('data-automation') || '',

                  // Texto y contenido
                  textContent: el.textContent?.trim().substring(0, 100) || '',
                  innerText: el.innerText?.trim().substring(0, 100) || '',

                  // Propiedades computadas
                  disabled: el.disabled || false,
                  required: el.required || false,
                  readonly: el.readOnly || false,
                  checked: el.checked || false,
                  selected: el.selected || false,

                  // ✅ NUEVO: Detectar elementos dinámicos
                  isDynamic: !!(
                    el.getAttribute('data-testid') ||
                    el.getAttribute('data-cy') ||
                    el.getAttribute('data-qa') ||
                    el.getAttribute('aria-live') ||
                    el.className.includes('loading') ||
                    el.className.includes('spinner') ||
                    el.className.includes('component') ||
                    el.onclick ||
                    el.onchange
                  ),

                  // ✅ NUEVO: Tipo de elemento dinámico
                  dynamicType: el.getAttribute('aria-live') ? 'live-region' :
                              el.className.includes('loading') ? 'loading' :
                              el.className.includes('spinner') ? 'spinner' :
                              el.onclick ? 'interactive' :
                              el.getAttribute('data-testid') ? 'test-target' :
                              'standard',

                  // Posición
                  boundingBox: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                  }
                };
              }
              return null;
            }).filter(el => el !== null);
          }`
        }
      });

      // Parsear respuesta usando método documentado
      if (result && result.content && result.content[0] && result.content[0].text) {
        const textContent = result.content[0].text;

        // Intentar regex primero (método documentado)
        const resultMatch = textContent.match(/### Result\n(.*?)(?:\n\n###|$)/s);
        let jsonData: string;

        if (resultMatch) {
          jsonData = resultMatch[1].trim();
        } else {
          // Fallback: parsing directo
          jsonData = textContent;
        }

        // Verificar si hay errores en el contenido antes de parsear
        if (jsonData.startsWith('Error:') || jsonData.includes('Error:')) {
          console.error('[MCP] ❌ browser_evaluate devolvió error:', jsonData.substring(0, 200));
          return []; // Retornar array vacío en lugar de fallar
        }

        try {
          const htmlElements = JSON.parse(jsonData);
          console.log(`[MCP] ✅ HTML parseado: ${htmlElements.length} elementos`);

          // Debug: Mostrar tipos detectados incluyendo elementos dinámicos
          htmlElements.forEach((el: any) => {
            if (el.type === 'password') {
              console.log(`[MCP] 🔐 PASSWORD detectado: #${el.id}`);
            }
            if (el.type === 'email') {
              console.log(`[MCP] 📧 EMAIL detectado: #${el.id}`);
            }
            if (el.type === 'submit') {
              console.log(`[MCP] 🚀 SUBMIT detectado: "${el.textContent}"`);
            }
            if (el.isDynamic) {
              console.log(`[MCP] ⚡ DINÁMICO detectado: ${el.dynamicType} - ${el.dataTestId || el.dataCy || el.id || el.className}`);
            }
          });

          return htmlElements;

        } catch (parseError) {
          console.error('[MCP] ❌ Error parseando JSON HTML:', parseError);
          console.warn('[MCP] Cayendo a método sin browser_evaluate');
          return [];
        }
      } else {
        console.warn('[MCP] ⚠️ Respuesta inesperada de browser_evaluate');
        return [];
      }

    } catch (error) {
      console.warn('[MCP] ⚠️ Error con browser_evaluate rehabilitado:', error);
      console.warn('[MCP] Cayendo a método sin JavaScript data');
      return [];
    }
  }

  /**
   * NUEVO: Correlaciona elementos YAML con datos JavaScript SIN HARDCODEO
   */
  private correlateYamlWithJavaScript(yamlElements: any[], jsElements: any[]): any[] {
    const hybridElements: any[] = [];

    console.log(`[MCP] 🔗 Correlacionando ${yamlElements.length} elementos YAML con ${jsElements.length} elementos JS...`);

    // Estrategia de correlación completamente genérica
    yamlElements.forEach((yamlEl, yamlIndex) => {
      // Crear elemento híbrido base con datos YAML
      const hybridElement = {
        // Datos YAML (esenciales para MCP)
        ref: yamlEl.ref,
        role: yamlEl.role,
        element: yamlEl.element,
        name: yamlEl.name,
        disabled: yamlEl.disabled,
        checked: yamlEl.checked,
        expanded: yamlEl.expanded,

        // Campos para datos JavaScript (se llenarán si hay correlación)
        htmlType: null,
        htmlName: null,
        htmlId: null,
        placeholder: null,
        className: null,
        htmlAttributes: {},
        boundingBox: null,

        // Selectores generados automáticamente
        selectors: [] as any[]
      };

      // Intentar correlación automática SIN HARDCODEO
      let correlatedJs: any = null;

      // Método 1: Correlación por posición aproximada (elementos en orden similar)
      if (jsElements[yamlIndex]) {
        correlatedJs = jsElements[yamlIndex];
      }

      // Método 2: Correlación por texto exacto si está disponible
      if (!correlatedJs && yamlEl.name) {
        correlatedJs = jsElements.find(jsEl =>
          jsEl.textContent === yamlEl.name ||
          jsEl.innerText === yamlEl.name ||
          jsEl.placeholder === yamlEl.name
        );
      }

      // Método 3: Correlación por tipo de elemento y contexto
      if (!correlatedJs && yamlEl.role) {
        const sameRoleElements = jsElements.filter(jsEl => {
          if (yamlEl.role === 'textbox') return jsEl.tagName === 'input';
          if (yamlEl.role === 'button') return jsEl.tagName === 'button';
          if (yamlEl.role === 'link') return jsEl.tagName === 'a';
          return false;
        });

        // Si hay múltiples del mismo tipo, usar índice relativo
        if (sameRoleElements.length > 0) {
          const yamlSameRoleIndex = yamlElements
            .filter(el => el.role === yamlEl.role)
            .indexOf(yamlEl);

          if (sameRoleElements[yamlSameRoleIndex]) {
            correlatedJs = sameRoleElements[yamlSameRoleIndex];
          } else {
            correlatedJs = sameRoleElements[0]; // Fallback al primero
          }
        }
      }

      // Si encontramos correlación, enriquecer el elemento híbrido
      if (correlatedJs) {
        hybridElement.htmlType = correlatedJs.type;
        hybridElement.htmlName = correlatedJs.name;
        hybridElement.htmlId = correlatedJs.id;
        hybridElement.placeholder = correlatedJs.placeholder;
        hybridElement.className = correlatedJs.className;
        hybridElement.htmlAttributes = {
          type: correlatedJs.type,
          name: correlatedJs.name,
          id: correlatedJs.id,
          className: correlatedJs.className,
          placeholder: correlatedJs.placeholder,
          tagName: correlatedJs.tagName,
          ariaLabel: correlatedJs.ariaLabel,
          disabled: correlatedJs.disabled,
          required: correlatedJs.required,
          readonly: correlatedJs.readonly
        };
        hybridElement.boundingBox = correlatedJs.boundingBox;

        // Generar selectores automáticamente basados en datos disponibles
        hybridElement.selectors = this.generateSelectorsAutomatically(yamlEl, correlatedJs);
      } else {
        // Sin correlación, generar selectores solo con datos YAML
        hybridElement.selectors = this.generateSelectorsFromYaml(yamlEl);
      }

      hybridElements.push(hybridElement);
    });

    console.log(`[MCP] ✅ Correlación completada: ${hybridElements.filter(el => el.htmlType).length}/${hybridElements.length} elementos enriquecidos`);

    return hybridElements;
  }

  /**
   * Valida que los selectores sean compatibles con Playwright
   */
  private validatePlaywrightSelectors(selectors: any[]): any[] {
    const validPlaywrightTypes = [
      'css',
      'getByRole',
      'getByText',
      'getByLabel',
      'getByPlaceholder',
      'getByTestId',
      'getByTitle',
      'getByAltText'
    ];

    const validPlaywrightRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner', 'blockquote',
      'button', 'caption', 'cell', 'checkbox', 'code', 'columnheader', 'combobox',
      'complementary', 'contentinfo', 'definition', 'deletion', 'dialog', 'directory',
      'document', 'emphasis', 'feed', 'figure', 'form', 'grid', 'gridcell',
      'group', 'heading', 'img', 'insertion', 'link', 'list', 'listbox', 'listitem',
      'log', 'main', 'marquee', 'math', 'meter', 'menu', 'menubar', 'menuitem',
      'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 'option',
      'paragraph', 'presentation', 'progressbar', 'radio', 'radiogroup', 'region',
      'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
      'slider', 'spinbutton', 'status', 'strong', 'subscript', 'superscript', 'switch',
      'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox', 'time', 'timer',
      'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
    ];

    return selectors.filter(selector => {
      // Verificar tipo de selector válido
      if (!validPlaywrightTypes.includes(selector.type)) {
        console.warn(`⚠️ Selector type '${selector.type}' no es válido para Playwright`);
        return false;
      }

      // Verificar roles válidos para getByRole
      if (selector.type === 'getByRole') {
        if (!validPlaywrightRoles.includes(selector.value)) {
          console.warn(`⚠️ Role '${selector.value}' no es válido para Playwright getByRole`);
          return false;
        }
      }

      // Verificar que tengan valor
      if (!selector.value || selector.value.trim() === '') {
        console.warn(`⚠️ Selector ${selector.type} no tiene valor válido`);
        return false;
      }

      return true;
    });
  }

  /**
   * NUEVO: Genera selectores automáticamente sin hardcodeo
   */
  private generateSelectorsAutomatically(yamlEl: any, jsEl?: any): any[] {
    const selectors: any[] = [];

    // Selector basado en role YAML (siempre disponible)
    if (yamlEl.role && yamlEl.name) {
      selectors.push({
        type: 'getByRole',
        value: yamlEl.role,
        options: { name: yamlEl.name }
      });
    } else if (yamlEl.role) {
      selectors.push({
        type: 'getByRole',
        value: yamlEl.role
      });
    }

    // Si tenemos datos JavaScript, generar selectores más específicos
    if (jsEl) {
      // Selector por ID (más confiable)
      if (jsEl.id) {
        selectors.push({
          type: 'css',
          value: `#${jsEl.id}`
        });
      }

      // Selector por type y tag (muy específico)
      if (jsEl.type && jsEl.tagName) {
        selectors.push({
          type: 'css',
          value: `${jsEl.tagName}[type="${jsEl.type}"]`
        });
      }

      // Selector por name
      if (jsEl.name) {
        selectors.push({
          type: 'css',
          value: `[name="${jsEl.name}"]`
        });
      }

      // Selector por placeholder
      if (jsEl.placeholder) {
        selectors.push({
          type: 'getByPlaceholder',
          value: jsEl.placeholder
        });
      }

      // ✅ NUEVO: Selectores dinámicos basados en atributos de testing
      if (jsEl.dataTestId) {
        selectors.push({
          type: 'getByTestId',
          value: jsEl.dataTestId
        });
      }

      if (jsEl.dataCy) {
        selectors.push({
          type: 'css',
          value: `[data-cy="${jsEl.dataCy}"]`
        });
      }

      if (jsEl.dataQa) {
        selectors.push({
          type: 'css',
          value: `[data-qa="${jsEl.dataQa}"]`
        });
      }

      // Selector por texto si está disponible
      if (jsEl.textContent) {
        selectors.push({
          type: 'getByText',
          value: jsEl.textContent
        });
      }
    }

    return this.validatePlaywrightSelectors(selectors);
  }

  /**
   * NUEVO: Genera selectores solo con datos YAML
   */
  private generateSelectorsFromYaml(yamlEl: any): any[] {
    const selectors: any[] = [];

    if (yamlEl.role && yamlEl.name) {
      selectors.push({
        type: 'getByRole',
        value: yamlEl.role,
        options: { name: yamlEl.name }
      });
    } else if (yamlEl.role) {
      selectors.push({
        type: 'getByRole',
        value: yamlEl.role
      });
    }

    return this.validatePlaywrightSelectors(selectors);
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
