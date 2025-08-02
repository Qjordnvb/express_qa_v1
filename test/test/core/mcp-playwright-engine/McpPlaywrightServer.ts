// core/mcp-playwright-engine/McpPlaywrightServer.ts
// 🎭 CORE MCP PLAYWRIGHT SERVER - Real Browser Automation
// Reemplaza la simulación con navegación web real

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { BrowserAutomation } from './BrowserAutomation';
import { DomAnalysisEngine } from './DomAnalysisEngine';
import { ScreenshotCapture } from './ScreenshotCapture';

export interface RealBrowserContext {
  url: string;
  title: string;
  timestamp: string;
  screenshot: Buffer;
  domSnapshot: any;
  interactiveElements: any[];
  networkRequests: any[];
  consoleMessages: any[];
  pageInfo: {
    loadTime: number;
    readyState: string;
    dimensions: { width: number; height: number };
  };
}

/**
 * 🎭 McpPlaywrightServer
 * 
 * Servidor MCP interno que proporciona navegación web real
 * para reemplazar la simulación actual del sistema híbrido.
 * 
 * Capacidades:
 * - Navegación real con Chromium
 * - Screenshots y DOM snapshots reales
 * - Análisis contextual de elementos
 * - Captura de network y console logs
 */
export class McpPlaywrightServer {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  
  private browserAutomation: BrowserAutomation;
  private domAnalysis: DomAnalysisEngine;
  private screenshotCapture: ScreenshotCapture;

  constructor() {
    console.log('🎭 McpPlaywrightServer: Initializing real browser automation...');
    
    // Inicializar componentes
    this.browserAutomation = new BrowserAutomation();
    this.domAnalysis = new DomAnalysisEngine();
    this.screenshotCapture = new ScreenshotCapture();
  }

  /**
   * 🚀 Inicializar browser real
   */
  async initialize(): Promise<void> {
    try {
      console.log('🌐 Starting real Chromium browser...');
      
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-plugins'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      this.page = await this.context.newPage();
      
      // Setup logging
      this.page.on('console', msg => {
        console.log(`🖥️ [BROWSER] ${msg.type()}: ${msg.text()}`);
      });

      this.page.on('request', request => {
        console.log(`🌐 [REQUEST] ${request.method()} ${request.url()}`);
      });

      console.log('✅ Real browser initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * 🌐 Navegar a URL real
   */
  async navigate(url: string): Promise<void> {
    if (!this.page) {
      await this.initialize();
    }

    console.log(`🌐 Navigating to real URL: ${url}`);
    
    try {
      await this.page!.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Extra wait to ensure page is fully rendered
      await this.page!.waitForTimeout(2000);
      
      console.log(`✅ Successfully navigated to: ${url}`);
      
    } catch (error) {
      console.error(`❌ Navigation failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * 📸 Tomar screenshot real
   */
  async takeScreenshot(): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log('📸 Taking real screenshot...');
    
    // Wait for page to be fully loaded and visible
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    
    const screenshot = await this.screenshotCapture.capture(this.page);
    console.log('✅ Real screenshot captured');
    
    return screenshot;
  }

  /**
   * 📸 Capturar screenshot y guardar en archivo
   */
  async captureScreenshot(outputPath: string): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`📸 Capturing real screenshot to: ${outputPath}`);
    
    // Ensure page is fully loaded before screenshot
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
    
    const screenshot = await this.screenshotCapture.captureToFile(this.page, outputPath);
    console.log(`✅ Real screenshot saved: ${outputPath}`);
    
    return screenshot;
  }

  /**
   * 🔍 Analizar contexto real del browser
   */
  async analyzeRealContext(url: string): Promise<RealBrowserContext> {
    console.log(`🔍 Analyzing real browser context for: ${url}`);
    
    // Navegar si es necesario
    if (!this.page || this.page.url() !== url) {
      await this.navigate(url);
    }

    const startTime = Date.now();

    try {
      // Capturar datos reales
      const [screenshot, domSnapshot, interactiveElements, title] = await Promise.all([
        this.takeScreenshot(),
        this.domAnalysis.extractDomSnapshot(this.page!),
        this.domAnalysis.findInteractiveElements(this.page!),
        this.page!.title()
      ]);

      const context: RealBrowserContext = {
        url,
        title,
        timestamp: new Date().toISOString(),
        screenshot,
        domSnapshot,
        interactiveElements,
        networkRequests: [], // TODO: Implementar captura
        consoleMessages: [], // TODO: Implementar captura
        pageInfo: {
          loadTime: Date.now() - startTime,
          readyState: await this.page!.evaluate(() => document.readyState),
          dimensions: await this.page!.evaluate(() => ({
            width: window.innerWidth,
            height: window.innerHeight
          }))
        }
      };

      console.log('✅ Real browser context analyzed');
      console.log(`🎯 Found ${interactiveElements.length} real interactive elements`);
      
      return context;
      
    } catch (error) {
      console.error('❌ Context analysis failed:', error);
      throw error;
    }
  }

  /**
   * 🧹 Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up browser resources...');
    
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      console.log('✅ Browser cleanup completed');
      
    } catch (error) {
      console.error('⚠️ Cleanup warning:', error);
    }
  }

  /**
   * 🎯 Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.browser || !this.context || !this.page) {
        return false;
      }
      
      // Test navigation
      await this.page.goto('data:text/html,<h1>Health Check</h1>', { 
        waitUntil: 'domcontentloaded' 
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }
}