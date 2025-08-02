// core/claude-code-integration/StableMcpService.ts
// 🚀 HYBRID INTEGRATION: Express QA AI Intelligence + MCP Playwright Engine

import { RealTimeContext } from '../intelligent-learning/failure-analyzer';
import { McpPlaywrightServer, RealBrowserContext } from '../mcp-playwright-engine/McpPlaywrightServer';

/**
 * StableMcpService - Bridge between Express QA's AI system and Real MCP Playwright Engine
 * 
 * This service uses the internal McpPlaywrightServer for real browser automation:
 * - Real Chromium browser navigation
 * - Real DOM analysis and screenshots
 * - Real interactive element detection
 * - Same capabilities as Claude Code's MCP integration
 */
export class StableMcpService {
  private isInitialized = false;
  private mcpEngine: McpPlaywrightServer;

  constructor() {
    console.log('🔧 StableMcpService: Initializing MCP Playwright Engine...');
    this.mcpEngine = new McpPlaywrightServer();
  }

  /**
   * ✅ REAL MCP: Get real-time context using MCP Playwright Engine
   * This makes Express QA equivalent to Claude Code in browser automation
   */
  async getRealTimeContext(url: string): Promise<RealTimeContext> {
    try {
      console.log(`[MCP-ENGINE] 🌐 Getting REAL context for: ${url}`);

      // 🚀 ALWAYS use real browser navigation for ANY URL
      console.log(`[MCP-ENGINE] 🚀 Using REAL browser navigation`);
      return await this.getRealBrowserContext(url);

    } catch (error) {
      console.error('[MCP-ENGINE] ❌ Error getting real context:', error);
      
      // 🛡️ RESILIENCE: Return minimal functional context instead of crashing
      return this.getFallbackContext(url);
    }
  }

  /**
   * 🚀 REAL BROWSER: Use internal MCP Playwright Engine for real context
   */
  private async getRealBrowserContext(url: string): Promise<RealTimeContext> {
    console.log('[MCP-ENGINE] 🎭 Using internal MCP Playwright Engine...');
    
    try {
      // Initialize MCP engine if needed
      await this.mcpEngine.initialize();
      
      // Get real browser context
      const realContext = await this.mcpEngine.analyzeRealContext(url);
      
      // Convert to RealTimeContext format expected by Express QA
      const context: RealTimeContext = {
        domSnapshot: JSON.stringify(realContext.domSnapshot),
        accessibilityTree: realContext.domSnapshot.structure || {},
        interactiveElements: realContext.interactiveElements.map((el: any) => ({
          type: el.tagName,
          text: el.text,
          name: el.attributes?.name,
          role: el.role,
          attributes: el.attributes,
          selectors: el.selectors,
          boundingBox: el.boundingBox
        })),
        eventLog: [],
        consoleErrors: realContext.consoleMessages.filter((msg: any) => msg.type === 'error'),
        networkErrors: realContext.networkRequests.filter((req: any) => req.status >= 400),
        mcpConsoleMessages: realContext.consoleMessages,
        mcpNetworkRequests: realContext.networkRequests,
        pageInfo: {
          url: realContext.url,
          title: realContext.title,
          timestamp: realContext.timestamp,
        },
        playwrightContext: {
          viewportSize: realContext.pageInfo.dimensions,
          userAgent: 'Express QA Hybrid - Real Browser',
        },
        screenshot: realContext.screenshot // Include real screenshot
      };

      console.log(`[MCP-ENGINE] ✅ Real context obtained: ${context.interactiveElements.length} interactive elements`);
      return context;
      
    } catch (error) {
      console.error('[MCP-ENGINE] ❌ Real browser context failed:', error);
      
      // Cleanup browser resources
      await this.mcpEngine.cleanup();
      
      // Fallback
      console.log('[MCP-ENGINE] 🔄 Falling back to fallback context...');
      return this.getFallbackContext(url);
    }
  }

  /**
   * 🛡️ RESILIENCE: Fallback context when MCP fails
   * Express QA's AI can still function with minimal context
   */
  private getFallbackContext(url: string): RealTimeContext {
    return {
      domSnapshot: 'Fallback: MCP unavailable',
      accessibilityTree: {},
      interactiveElements: [],
      eventLog: [],
      consoleErrors: [],
      networkErrors: [],
      mcpConsoleMessages: [],
      mcpNetworkRequests: [],
      pageInfo: {
        url,
        title: 'Fallback Mode',
        timestamp: new Date().toISOString(),
      },
      playwrightContext: {
        viewportSize: { width: 1920, height: 1080 },
        userAgent: 'Fallback Agent',
      },
    };
  }

  /**
   * Initialize MCP Playwright Engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[MCP-ENGINE] 🚀 Initializing MCP Playwright Engine...');
      
      // ✅ NO EXTERNAL SDK NEEDED - Using internal engine
      // MCP Playwright Engine handles all browser automation
      
      this.isInitialized = true;
      console.log('[MCP-ENGINE] ✅ MCP Playwright Engine ready!');
      
    } catch (error) {
      console.error('[MCP-ENGINE] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 📸 Capture screenshot using MCP Playwright Engine
   */
  async captureScreenshot(outputPath: string): Promise<Buffer | null> {
    try {
      console.log(`[MCP-ENGINE] 📸 Capturing screenshot: ${outputPath}`);
      
      // Initialize MCP Engine for screenshot
      await this.mcpEngine.initialize();
      
      // Capture screenshot
      const screenshotBuffer = await this.mcpEngine.captureScreenshot(outputPath);
      
      // Cleanup
      await this.mcpEngine.cleanup();
      
      console.log(`[MCP-ENGINE] ✅ Screenshot captured: ${outputPath}`);
      return screenshotBuffer;
      
    } catch (error) {
      console.warn(`[MCP-ENGINE] ⚠️ Screenshot capture failed: ${error}`);
      await this.mcpEngine.cleanup();
      return null;
    }
  }

  /**
   * Cleanup MCP Playwright Engine
   */
  async cleanup(): Promise<void> {
    try {
      console.log('[MCP-ENGINE] 🧹 Cleaning up MCP Engine...');
      
      await this.mcpEngine.cleanup();
      
      this.isInitialized = false;
      console.log('[MCP-ENGINE] ✅ Cleanup completed');
      
    } catch (error) {
      console.warn('[MCP-ENGINE] ⚠️ Cleanup warning:', error);
    }
  }
}

/**
 * 🎯 USAGE EXAMPLE for Express QA AI Integration:
 * 
 * const stableMcp = new StableMcpService();
 * await stableMcp.initialize();
 * 
 * // Use with Express QA's IntelligentMCPLearner
 * const context = await stableMcp.getRealTimeContext('https://example.com');
 * const discovery = await intelligentLearner.discoverElementIntelligently(
 *   'searchInput', 
 *   'fill', 
 *   context.interactiveElements, 
 *   context
 * );
 */