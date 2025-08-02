// core/utils/EnvironmentDetection.ts
// 🔍 Detección inteligente del entorno de ejecución

/**
 * 🎯 EnvironmentDetection - Utility para detectar el entorno de ejecución
 * 
 * Detecta si el código se está ejecutando:
 * - Dentro de Claude Code (con herramientas MCP nativas)
 * - Como proceso independiente (requiere JSON-RPC)
 * - En diferentes sistemas operativos
 * - Con diferentes configuraciones
 */
export class EnvironmentDetection {
  private static instance: EnvironmentDetection;
  private detectionResults: any = null;

  private constructor() {}

  static getInstance(): EnvironmentDetection {
    if (!EnvironmentDetection.instance) {
      EnvironmentDetection.instance = new EnvironmentDetection();
    }
    return EnvironmentDetection.instance;
  }

  /**
   * 🔍 Detectar entorno completo
   */
  detectEnvironment(): EnvironmentInfo {
    if (this.detectionResults) {
      return this.detectionResults;
    }

    console.log('🔍 Detectando entorno de ejecución...');

    const info: EnvironmentInfo = {
      isClaudeCode: this.isRunningInClaudeCode(),
      hasMcpNativeTools: this.hasMcpNativeTools(),
      hasClaudeConfig: this.hasClaudeConfig(),
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      workingDirectory: process.cwd(),
      environmentVariables: this.getRelevantEnvVars(),
      mcpCapabilities: this.detectMcpCapabilities(),
      recommendedMode: 'unknown'
    };

    // Determinar modo recomendado
    info.recommendedMode = this.determineRecommendedMode(info);

    this.detectionResults = info;

    console.log('✅ Detección completada:', {
      claudeCode: info.isClaudeCode,
      nativeTools: info.hasMcpNativeTools,
      mode: info.recommendedMode
    });

    return info;
  }

  /**
   * 🎭 Detectar si se ejecuta en Claude Code
   */
  private isRunningInClaudeCode(): boolean {
    // Métodos de detección múltiples
    const indicators = [
      // Variables de entorno específicas de Claude Code
      process.env.CLAUDE_CODE_SESSION,
      process.env.CLAUDE_SESSION_ID,
      process.env.ANTHROPIC_SESSION,
      
      // Argumentos de proceso
      process.argv.some(arg => arg.includes('claude')),
      
      // Proceso padre
      process.env.PPID && this.isParentClaudeProcess(),
      
      // Directorio de trabajo típico de Claude Code
      process.cwd().includes('.claude') || process.cwd().includes('claude-code')
    ];

    return indicators.some(indicator => Boolean(indicator));
  }

  /**
   * 👨‍💻 Verificar si el proceso padre es Claude
   */
  private isParentClaudeProcess(): boolean {
    try {
      const ppid = process.env.PPID || process.ppid;
      if (!ppid) return false;

      // En sistemas Unix, podemos verificar el comando del proceso padre
      if (process.platform !== 'win32') {
        const { execSync } = require('child_process');
        try {
          const command = execSync(`ps -o comm= -p ${ppid}`, { encoding: 'utf8' });
          return command.toLowerCase().includes('claude');
        } catch {
          return false;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 🛠️ Detectar herramientas MCP nativas
   */
  private hasMcpNativeTools(): boolean {
    try {
      // Verificar si existen las funciones MCP en el contexto global
      const mcpFunctions = [
        'mcp__playwright__browser_navigate',
        'mcp__playwright__browser_snapshot',
        'mcp__playwright__browser_click'
      ];

      return mcpFunctions.some(funcName => {
        try {
          return typeof (global as any)[funcName] === 'function';
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  /**
   * ⚙️ Verificar configuración de Claude
   */
  private hasClaudeConfig(): boolean {
    const fs = require('fs');
    const path = require('path');

    const configPaths = [
      '.claude.json',
      'claude.json',
      '.claude/config.json',
      path.join(process.cwd(), '.claude.json'),
      path.join(process.cwd(), 'claude.json')
    ];

    return configPaths.some(configPath => {
      try {
        return fs.existsSync(configPath);
      } catch {
        return false;
      }
    });
  }

  /**
   * 🌍 Obtener variables de entorno relevantes
   */
  private getRelevantEnvVars(): any {
    const relevantVars = [
      'CLAUDE_CODE_SESSION',
      'CLAUDE_SESSION_ID',
      'ANTHROPIC_SESSION',
      'ANTHROPIC_API_KEY',
      'GOOGLE_API_KEY',
      'OPENAI_API_KEY',
      'NODE_ENV',
      'BASE_URL'
    ];

    const vars: any = {};
    for (const varName of relevantVars) {
      if (process.env[varName]) {
        // Ocultar claves API por seguridad
        if (varName.includes('API_KEY')) {
          vars[varName] = `${process.env[varName]?.substring(0, 8)}...`;
        } else {
          vars[varName] = process.env[varName];
        }
      }
    }

    return vars;
  }

  /**
   * 🎭 Detectar capacidades MCP disponibles
   */
  private detectMcpCapabilities(): McpCapabilities {
    const capabilities: McpCapabilities = {
      nativeNavigation: false,
      nativeSnapshot: false,
      nativeInteraction: false,
      jsonRpcAvailable: true, // Siempre podemos intentar JSON-RPC
      playwrightInstalled: false
    };

    // Detectar herramientas nativas específicas
    try {
      capabilities.nativeNavigation = typeof (global as any).mcp__playwright__browser_navigate === 'function';
      capabilities.nativeSnapshot = typeof (global as any).mcp__playwright__browser_snapshot === 'function';
      capabilities.nativeInteraction = typeof (global as any).mcp__playwright__browser_click === 'function';
    } catch {
      // No hay herramientas nativas
    }

    // Verificar si Playwright está instalado
    try {
      require('@playwright/test');
      capabilities.playwrightInstalled = true;
    } catch {
      capabilities.playwrightInstalled = false;
    }

    return capabilities;
  }

  /**
   * 🎯 Determinar modo recomendado de operación
   */
  private determineRecommendedMode(info: EnvironmentInfo): string {
    if (info.isClaudeCode && info.hasMcpNativeTools) {
      return 'native-mcp';
    }
    
    if (info.hasClaudeConfig && info.mcpCapabilities.playwrightInstalled) {
      return 'json-rpc';
    }
    
    if (info.mcpCapabilities.playwrightInstalled) {
      return 'fallback-playwright';
    }
    
    return 'minimal-fallback';
  }

  /**
   * 📊 Obtener resumen del entorno
   */
  getEnvironmentSummary(): string {
    const info = this.detectEnvironment();
    
    return `
🔍 ENTORNO DETECTADO:
- Claude Code: ${info.isClaudeCode ? '✅' : '❌'}
- Herramientas MCP Nativas: ${info.hasMcpNativeTools ? '✅' : '❌'}
- Configuración Claude: ${info.hasClaudeConfig ? '✅' : '❌'}
- Playwright: ${info.mcpCapabilities.playwrightInstalled ? '✅' : '❌'}
- Modo recomendado: ${info.recommendedMode}
- Plataforma: ${info.platform} (${info.architecture})
- Node.js: ${info.nodeVersion}
    `.trim();
  }

  /**
   * 🚀 Verificar si el entorno está listo para MCP
   */
  isReadyForMcp(): boolean {
    const info = this.detectEnvironment();
    return info.hasMcpNativeTools || info.mcpCapabilities.playwrightInstalled;
  }

  /**
   * ⚠️ Obtener advertencias del entorno
   */
  getEnvironmentWarnings(): string[] {
    const info = this.detectEnvironment();
    const warnings: string[] = [];

    if (!info.isClaudeCode && !info.hasClaudeConfig) {
      warnings.push('No se detectó configuración de Claude Code (.claude.json)');
    }

    if (!info.mcpCapabilities.playwrightInstalled) {
      warnings.push('Playwright no está instalado - ejecutar: npm install @playwright/test');
    }

    if (!info.hasMcpNativeTools && info.recommendedMode === 'minimal-fallback') {
      warnings.push('Sin capacidades MCP - funcionalidad limitada');
    }

    if (Object.keys(info.environmentVariables).length === 0) {
      warnings.push('No se encontraron variables de entorno para APIs de LLM');
    }

    return warnings;
  }
}

// 🎯 TIPOS

export interface EnvironmentInfo {
  isClaudeCode: boolean;
  hasMcpNativeTools: boolean;
  hasClaudeConfig: boolean;
  nodeVersion: string;
  platform: string;
  architecture: string;
  workingDirectory: string;
  environmentVariables: any;
  mcpCapabilities: McpCapabilities;
  recommendedMode: string;
}

export interface McpCapabilities {
  nativeNavigation: boolean;
  nativeSnapshot: boolean;
  nativeInteraction: boolean;
  jsonRpcAvailable: boolean;
  playwrightInstalled: boolean;
}

// 🎯 EXPORTAR INSTANCIA SINGLETON
export const environmentDetection = EnvironmentDetection.getInstance();

/**
 * 🎯 EJEMPLO DE USO:
 * 
 * import { environmentDetection } from './EnvironmentDetection';
 * 
 * // Detectar entorno
 * const env = environmentDetection.detectEnvironment();
 * console.log(environmentDetection.getEnvironmentSummary());
 * 
 * // Verificar si está listo para MCP
 * if (environmentDetection.isReadyForMcp()) {
 *   console.log('✅ Listo para MCP');
 * } else {
 *   console.log('❌ MCP no disponible');
 * }
 * 
 * // Mostrar advertencias
 * const warnings = environmentDetection.getEnvironmentWarnings();
 * warnings.forEach(warning => console.warn('⚠️', warning));
 */