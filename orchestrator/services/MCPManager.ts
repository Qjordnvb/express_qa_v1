// orchestrator/services/MCPManager.ts
// Singleton manager para una única instancia MCP compartida por todos los servicios

import { MCPClientService } from './McpClientService';

/**
 * MCPManager - Singleton que gestiona una única instancia MCP compartida
 * 
 * PROBLEMA RESUELTO:
 * - Antes: 4 instancias separadas de MCPClientService creaban sesiones independientes
 * - Ahora: 1 instancia compartida mantiene estado de navegación entre servicios
 * 
 * SERVICIOS QUE LO USAN:
 * - ContextService: Para análisis híbrido MCP + Playwright
 * - AIWithMCPService: Para exploración independiente con IA
 * - index.ts: Para exploración inteligente en orquestación principal
 * - GoogleGeminiService: Ya no necesitará MCP (solo LLM calls)
 */
export class MCPManager {
  private static instance: MCPManager | null = null;
  private mcpClient: MCPClientService;
  private isStarted: boolean = false;

  /**
   * Constructor privado para patrón singleton
   */
  private constructor() {
    console.log('🏗️ [MCPManager] Creando instancia única de MCP...');
    this.mcpClient = new MCPClientService();
  }

  /**
   * Obtiene la instancia única del MCPManager
   */
  public static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
      console.log('✅ [MCPManager] Instancia singleton creada');
    }
    return MCPManager.instance;
  }

  /**
   * Obtiene el cliente MCP compartido
   * IMPORTANTE: Todos los servicios deben usar este método
   */
  public getMCPClient(): MCPClientService {
    return this.mcpClient;
  }

  /**
   * Inicia el servidor MCP de forma centralizada
   * Evita múltiples inicializaciones
   */
  public async startMCP(): Promise<void> {
    if (this.isStarted) {
      console.log('ℹ️ [MCPManager] MCP ya está iniciado, reutilizando instancia');
      return;
    }

    try {
      console.log('🚀 [MCPManager] Iniciando servidor MCP único...');
      await this.mcpClient.startMCPServer();
      this.isStarted = true;
      console.log('✅ [MCPManager] Servidor MCP iniciado exitosamente');
    } catch (error) {
      console.error('❌ [MCPManager] Error iniciando MCP:', error);
      this.isStarted = false;
      throw error;
    }
  }

  /**
   * Detiene el servidor MCP de forma centralizada
   */
  public async stopMCP(): Promise<void> {
    if (!this.isStarted) {
      console.log('ℹ️ [MCPManager] MCP ya está detenido');
      return;
    }

    try {
      console.log('🛑 [MCPManager] Deteniendo servidor MCP...');
      await this.mcpClient.stopMCPServer();
      this.isStarted = false;
      console.log('✅ [MCPManager] Servidor MCP detenido exitosamente');
    } catch (error) {
      console.error('❌ [MCPManager] Error deteniendo MCP:', error);
      throw error;
    }
  }

  /**
   * Verifica si MCP está activo
   */
  public isActive(): boolean {
    return this.isStarted;
  }

  /**
   * Reinicia el servidor MCP en caso de errores
   */
  public async restartMCP(): Promise<void> {
    console.log('🔄 [MCPManager] Reiniciando servidor MCP...');
    
    if (this.isStarted) {
      await this.stopMCP();
    }
    
    await this.startMCP();
    console.log('✅ [MCPManager] Servidor MCP reiniciado exitosamente');
  }

  /**
   * Método de utilidad para debugging
   */
  public getStatus(): { isStarted: boolean; clientExists: boolean } {
    return {
      isStarted: this.isStarted,
      clientExists: !!this.mcpClient
    };
  }

  /**
   * Cleanup para testing - SOLO USAR EN TESTS
   */
  public static resetInstance(): void {
    if (MCPManager.instance) {
      console.log('🧹 [MCPManager] Reseteando instancia para testing...');
      MCPManager.instance = null;
    }
  }
}