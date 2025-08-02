// core/mcp-playwright-engine/ScreenshotCapture.ts
// 📸 Screenshot Capture - Real visual context for AI analysis

import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface ScreenshotOptions {
  fullPage?: boolean;
  quality?: number;
  type?: 'png' | 'jpeg';
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ScreenshotResult {
  buffer: Buffer;
  timestamp: string;
  url: string;
  dimensions: {
    width: number;
    height: number;
  };
  path?: string;
}

/**
 * 📸 ScreenshotCapture
 * 
 * Maneja la captura de screenshots reales para:
 * - Análisis visual por AI
 * - Documentación de tests
 * - Debug de elementos
 * - Comparaciones visuales
 */
export class ScreenshotCapture {
  private screenshotDir: string;

  constructor() {
    console.log('📸 ScreenshotCapture: Real visual capture engine initialized');
    
    // Crear directorio para screenshots
    this.screenshotDir = path.join(process.cwd(), 'test-generation', 'screenshots');
    this.ensureScreenshotDir();
  }

  /**
   * 📸 Capturar screenshot principal
   */
  async capture(page: Page, options: ScreenshotOptions = {}): Promise<Buffer> {
    try {
      console.log('📸 Capturing real screenshot...');
      
      const defaultOptions = {
        fullPage: true,
        type: 'png' as const
        // quality no es compatible con PNG, solo con JPEG
      };

      const screenshotOptions = { ...defaultOptions, ...options };
      
      const buffer = await page.screenshot(screenshotOptions);
      
      console.log(`✅ Screenshot captured (${buffer.length} bytes)`);
      return buffer;
      
    } catch (error) {
      console.error('❌ Screenshot capture failed:', error);
      throw error;
    }
  }

  /**
   * 💾 Capturar y guardar screenshot en ruta específica
   */
  async captureToFile(page: Page, outputPath: string, options: ScreenshotOptions = {}): Promise<Buffer> {
    try {
      console.log(`📸 Capturing screenshot to: ${outputPath}`);
      
      // Asegurar que existe el directorio padre
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Capturar screenshot
      const buffer = await this.capture(page, options);
      
      // Guardar archivo
      fs.writeFileSync(outputPath, buffer);
      
      console.log(`✅ Screenshot saved to: ${outputPath}`);
      return buffer;
      
    } catch (error) {
      console.error(`❌ Screenshot save failed for ${outputPath}:`, error);
      throw error;
    }
  }

  /**
   * 💾 Capturar y guardar screenshot con metadata
   */
  async captureAndSave(page: Page, filename?: string, options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const url = page.url();
      const safeUrl = this.sanitizeUrl(url);
      
      const finalFilename = filename || `screenshot-${safeUrl}-${timestamp}.png`;
      const filePath = path.join(this.screenshotDir, finalFilename);
      
      // Capturar screenshot
      const buffer = await this.capture(page, options);
      
      // Obtener dimensiones
      const dimensions = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight
      }));
      
      // Guardar archivo
      fs.writeFileSync(filePath, buffer);
      
      const result: ScreenshotResult = {
        buffer,
        timestamp: new Date().toISOString(),
        url,
        dimensions,
        path: filePath
      };
      
      console.log(`✅ Screenshot saved: ${filePath}`);
      return result;
      
    } catch (error) {
      console.error('❌ Screenshot save failed:', error);
      throw error;
    }
  }

  /**
   * 🎯 Capturar elemento específico
   */
  async captureElement(page: Page, selector: string, filename?: string): Promise<ScreenshotResult> {
    try {
      console.log(`🎯 Capturing element screenshot: ${selector}`);
      
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: 10000 });
      
      const boundingBox = await element.boundingBox();
      if (!boundingBox) {
        throw new Error(`Element not found or not visible: ${selector}`);
      }
      
      const options: ScreenshotOptions = {
        clip: boundingBox,
        type: 'png'
      };
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const elementFilename = filename || `element-${this.sanitizeSelector(selector)}-${timestamp}.png`;
      
      return await this.captureAndSave(page, elementFilename, options);
      
    } catch (error) {
      console.error(`❌ Element screenshot failed for ${selector}:`, error);
      throw error;
    }
  }

  /**
   * 📊 Capturar comparación antes/después
   */
  async captureComparison(page: Page, action: string): Promise<{ before: ScreenshotResult; after: ScreenshotResult }> {
    try {
      console.log(`📊 Capturing comparison for action: ${action}`);
      
      const timestamp = Date.now();
      
      // Screenshot antes
      const before = await this.captureAndSave(page, `before-${action}-${timestamp}.png`);
      
      console.log('⏳ Waiting for action to be performed...');
      // Pequeña espera para que la acción se ejecute
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Screenshot después
      const after = await this.captureAndSave(page, `after-${action}-${timestamp}.png`);
      
      console.log('✅ Comparison screenshots captured');
      return { before, after };
      
    } catch (error) {
      console.error(`❌ Comparison capture failed for ${action}:`, error);
      throw error;
    }
  }

  /**
   * 🧹 Limpiar screenshots antiguos
   */
  async cleanupOldScreenshots(daysOld: number = 7): Promise<void> {
    try {
      console.log(`🧹 Cleaning up screenshots older than ${daysOld} days...`);
      
      const files = fs.readdirSync(this.screenshotDir);
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.screenshotDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      
      console.log(`✅ Cleaned up ${deletedCount} old screenshots`);
      
    } catch (error) {
      console.error('❌ Screenshot cleanup failed:', error);
    }
  }

  /**
   * 📁 Asegurar que existe el directorio de screenshots
   */
  private ensureScreenshotDir(): void {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
      console.log(`📁 Created screenshots directory: ${this.screenshotDir}`);
    }
  }

  /**
   * 🧹 Sanitizar URL para nombre de archivo
   */
  private sanitizeUrl(url: string): string {
    return url
      .replace(/https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  /**
   * 🧹 Sanitizar selector para nombre de archivo
   */
  private sanitizeSelector(selector: string): string {
    return selector
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);
  }
}