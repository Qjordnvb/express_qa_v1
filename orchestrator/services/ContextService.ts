// orchestrator/services/ContextService.ts
import { Page } from '@playwright/test';
import { MCPClientService, MCPContext } from './McpClientService';

export interface RealTimeContext {
  // Datos principales del DOM
  domSnapshot: string;
  accessibilityTree: any;
  interactiveElements: any[];

  // Eventos y logs (Playwright)
  eventLog: any[];
  consoleErrors: string[];
  networkErrors: any[];

  // Datos MCP específicos
  mcpConsoleMessages: any[];
  mcpNetworkRequests: any[];

  // Screenshot opcional
  screenshot?: Buffer;

  // Información de página
  pageInfo: {
    url: string;
    title: string;
    timestamp: string;
  };

  // Contexto del navegador
  playwrightContext: {
    viewportSize: any;
    userAgent: string;
  };
}

export class ContextService {
  private mcpClient: MCPClientService;

  constructor() {
    this.mcpClient = new MCPClientService();
  }

  /**
   * Obtiene contexto completo combinando Playwright y MCP
   */
/**
   * Obtiene contexto completo combinando Playwright y MCP
   */
public async getRealTimeContext(pageOrUrl: Page | string): Promise<RealTimeContext | null> {
  try {
    let url: string;
    let playwrightPage: Page | null = null;

    // Determinar si recibimos una Page o una URL
    if (typeof pageOrUrl === 'string') {
      url = pageOrUrl;
      console.log(`[CONTEXT] Usando URL directa: ${url}`);
    } else {
      playwrightPage = pageOrUrl;
      url = playwrightPage.url();
      console.log(`[CONTEXT] Usando Page existente con URL: ${url}`);
    }

    // 1. Obtener contexto vía MCP (navegación fresca independiente)
    let mcpContext: MCPContext | null = null;
    try {
      console.log('[CONTEXT] 🔍 Obteniendo contexto vía MCP...');

      // CLAVE: MCP usa su propia instancia de navegador
      mcpContext = await this.mcpClient.getRealTimeContext(url);
      console.log('✅ [CONTEXT] Contexto MCP obtenido exitosamente');

    } catch (error) {
      console.warn('[CONTEXT] ⚠️ MCP falló, usando solo contexto de Playwright:', error);
      // NO re-lanzar el error, continuar con fallback
    }

    // 2. Obtener contexto de Playwright (si tenemos Page)
    let playwrightContext: any = {
      viewportSize: { width: 1920, height: 1080 },
      userAgent: 'unknown',
      domSnapshot: 'No disponible',
      consoleErrors: [],
      networkErrors: []
    };

    if (playwrightPage) {
      console.log('[CONTEXT] 🎭 Obteniendo contexto de Playwright...');
      playwrightContext = await this.getPlaywrightContext(playwrightPage);
    }

    // 3. Combinar ambos contextos
    const combinedContext: RealTimeContext = {
      // Priorizar datos estructurados de MCP
      domSnapshot: mcpContext?.domSnapshot || playwrightContext.domSnapshot,
      accessibilityTree: mcpContext?.accessibilityTree || {},
      interactiveElements: mcpContext?.interactiveElements || [],

      // Datos híbridos
      eventLog: [], // Placeholder para eventos futuros
      consoleErrors: playwrightContext.consoleErrors || [],
      networkErrors: playwrightContext.networkErrors || [],
      mcpConsoleMessages: mcpContext?.consoleMessages || [],
      mcpNetworkRequests: mcpContext?.networkRequests || [],

      // Screenshot de MCP si está disponible
      screenshot: mcpContext?.screenshot,

      // Información de página
      pageInfo: mcpContext?.pageInfo || {
        url,
        title: 'unknown',
        timestamp: new Date().toISOString(),
      },

      // Contexto de Playwright
      playwrightContext: {
        viewportSize: playwrightContext.viewportSize || { width: 1920, height: 1080 },
        userAgent: playwrightContext.userAgent || 'unknown',
      },
    };

    console.log(`[CONTEXT] ✅ Contexto combinado generado: ${combinedContext.interactiveElements.length} elementos interactivos`);
    return combinedContext;

  } catch (error) {
    console.error('[CONTEXT] ❌ Error crítico obteniendo contexto:', error);

    // NUEVO: En lugar de retornar null, retornar contexto mínimo funcional
    return {
      domSnapshot: 'Error obteniendo DOM snapshot',
      accessibilityTree: {},
      interactiveElements: [],
      eventLog: [],
      consoleErrors: [],
      networkErrors: [],
      mcpConsoleMessages: [],
      mcpNetworkRequests: [],
      pageInfo: {
        url: typeof pageOrUrl === 'string' ? pageOrUrl : 'unknown',
        title: 'error',
        timestamp: new Date().toISOString(),
      },
      playwrightContext: {
        viewportSize: { width: 1920, height: 1080 },
        userAgent: 'error',
      },
    };
  }
}
  /**
   * Obtiene contexto usando solo Playwright (fallback)
   */
  private async getPlaywrightContext(page: Page): Promise<any> {
    const consoleErrors: string[] = [];
    const networkErrors: any[] = [];

    try {
      // Capturar errores de consola actuales
      const logs = await page.evaluate(() => {
        // Obtener logs del console si están disponibles
        return (window as any).__consoleLogs || [];
      });

      // Capturar errores de red (response status)
      // Nota: Esto requiere que se hayan configurado listeners previamente

      // Snapshot del DOM (truncado para performance)
      const domSnapshot = await page.evaluate(() => {
        return document.documentElement.outerHTML.substring(0, 8000);
      });

      // Información básica de la página
      const pageInfo = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title
      }));

      // Viewport y user agent
      const viewportSize = page.viewportSize();
      const userAgent = await page.evaluate(() => navigator.userAgent);

      return {
        domSnapshot,
        consoleErrors: logs.filter((log: any) => log.type === 'error').map((log: any) => log.text),
        networkErrors,
        viewportSize,
        userAgent,
        pageInfo
      };

    } catch (error) {
      console.warn('[CONTEXT] ⚠️ Error obteniendo contexto de Playwright:', error);

      return {
        domSnapshot: 'Error obteniendo contexto de Playwright',
        consoleErrors: [],
        networkErrors: [],
        viewportSize: page.viewportSize() || { width: 1920, height: 1080 },
        userAgent: 'unknown'
      };
    }
  }

  /**
   * Inicia el servidor MCP
   */
  async startMCP(): Promise<void> {
    await this.mcpClient.startMCPServer();
  }

  /**
   * Detiene el servidor MCP
   */
  async stopMCP(): Promise<void> {
    await this.mcpClient.stopMCPServer();
  }
}
